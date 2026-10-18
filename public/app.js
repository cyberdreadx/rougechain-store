// RougeChain Store as an app. Load it last, after store.js and account.js; app.css has the looks.
//   - the service worker (sw.js): the store installs to a home screen and opens without a connection
//   - on a phone: a bottom tab bar (Store, Wishlist, Cart, Account) that mirrors the store bar,
//     sheets you swipe down to close, swipes between screenshots, a compact title with Add to cart
//     once the game's title scrolls away, and a light buzz when something is added (Android)
//   - "Get the app", once: Android's install prompt, or how to Add to Home Screen on an iPhone
//   - #cart and #wishlist open those sheets (the app's shortcuts); account.js handles #sign-in
(function () {
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && (location.protocol === "https:" || local)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  var RC = window.RC;
  if (!RC) return;

  function mq(q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; }
  var phone = mq("(max-width: 760px)"), coarse = mq("(pointer: coarse)");
  var standalone = mq("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add("rc-standalone");
  function buzz() { if (coarse.matches && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} } }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var ICON = {
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
    wish: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.4l2.2 11h10.6L20.5 7H6.4"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.9-3.7 3.9-5.8 7.5-5.8s6.6 2.1 7.5 5.8"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v8h14v-8"/></svg>'
  };

  // ---- the tab bar
  var home = /(^|\/)(index\.html)?$/.test(location.pathname);
  var tabs = document.createElement("nav");
  tabs.className = "rc-tabbar"; tabs.setAttribute("aria-label", "Store");
  tabs.innerHTML =
    '<a href="index.html" data-tab="home"' + (home ? ' aria-current="page"' : "") + ">" + ICON.store + "<span>Store</span></a>" +
    '<button type="button" data-tab="wish">' + ICON.wish + '<span>Wishlist</span><b class="rc-badge" data-rc-count="wish"></b></button>' +
    '<button type="button" data-tab="cart">' + ICON.cart + '<span>Cart</span><b class="rc-badge" data-rc-count="cart"></b></button>' +
    '<button type="button" data-tab="account" hidden>' + ICON.user + '<span data-label>Sign in</span></button>';
  document.body.appendChild(tabs);
  if (RC.paintCounts) RC.paintCounts();

  tabs.querySelector("[data-tab=home]").addEventListener("click", function (e) {
    if (!home) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  tabs.querySelector("[data-tab=wish]").addEventListener("click", function (e) { RC.openWishlist(e.currentTarget); });
  tabs.querySelector("[data-tab=cart]").addEventListener("click", function (e) { RC.openCart(e.currentTarget); });
  var accountTab = tabs.querySelector("[data-tab=account]"), accountTop = document.getElementById("account-top");
  accountTab.addEventListener("click", function (e) { if (RC.openAccount) RC.openAccount(e.currentTarget); });
  // the Account tab says what account.js's store bar button says, and shows when it does
  function mirror() { accountTab.hidden = accountTop.hidden; accountTab.querySelector("[data-label]").textContent = accountTop.textContent; }
  if (accountTop) {
    mirror();
    new MutationObserver(mirror).observe(accountTop, { attributes: true, attributeFilter: ["hidden"], childList: true, characterData: true, subtree: true });
  }

  // ---- sheets: drag down to close
  var scrim = document.querySelector(".rc-scrim");
  function scrolls(el) { var o = getComputedStyle(el).overflowY; return (o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight; }
  function draggable(panel) {
    var y0 = 0, x0 = 0, t0 = 0, h = 0, can = false, drag = false;
    function reset() {
      panel.style.transition = panel.style.transform = "";
      if (scrim) scrim.style.transition = scrim.style.opacity = "";
    }
    panel.addEventListener("touchstart", function (e) {
      can = false; drag = false;
      if (!phone.matches || e.touches.length !== 1 || (e.target.closest && e.target.closest("input, textarea, select"))) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = Date.now();
      can = true;
      // only from the top of whatever is scrolling under the finger
      for (var el = e.target; el && el !== panel.parentNode; el = el.parentElement) {
        if (el.nodeType === 1 && scrolls(el) && el.scrollTop > 0) { can = false; break; }
        if (el === panel) break;
      }
    }, { passive: true });
    panel.addEventListener("touchmove", function (e) {
      if (!can) return;
      var dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
      if (!drag) {
        if (dy < -4 || Math.abs(dx) > 12) { can = false; return; }
        if (dy < 8 || Math.abs(dx) > dy) return;
        drag = true; h = panel.offsetHeight || 1;
        panel.style.transition = "none";
        if (scrim) scrim.style.transition = "none";
      }
      e.preventDefault();
      var d = Math.max(0, dy - 8);
      panel.style.transform = "translateY(" + d + "px)";
      if (scrim) scrim.style.opacity = String(1 - Math.min(1, d / h) * 0.85);
    }, { passive: false });
    function end(e) {
      if (!drag) return;
      drag = false; can = false;
      var dy = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : y0) - y0;
      var fast = dy / Math.max(1, Date.now() - t0) > 0.55;
      panel.style.transition = "transform .22s cubic-bezier(.2,.9,.25,1)";
      if (scrim) scrim.style.transition = "opacity .22s ease";
      if (dy > h * 0.28 || (fast && dy > 30)) {
        panel.style.transform = "translateY(100%)";
        if (scrim) scrim.style.opacity = "0";
        setTimeout(function () { RC.panel.close(true); reset(); }, 220);
      } else {
        panel.style.transform = "";
        if (scrim) scrim.style.opacity = "";
        setTimeout(reset, 240);
      }
    }
    panel.addEventListener("touchend", end);
    panel.addEventListener("touchcancel", end);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".rc-panel"), draggable);

  // ---- swipes
  /** Calls left()/right() on a sideways swipe over `el`, and stops the tap that ends a swipe. */
  function swipe(el, left, right) {
    var x0 = 0, y0 = 0, t0 = 0, swiped = false;
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); swiped = false;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - t0 < 800) {
        (dx < 0 ? left : right)();
        swiped = true;
      }
    }, { passive: true });
    // the finger's own tap after a swipe; clicks our callbacks make are let through
    el.addEventListener("click", function (e) {
      if (swiped && e.isTrusted) { e.preventDefault(); e.stopPropagation(); }
      swiped = false;
    }, true);
  }
  // the game page's screenshots
  var stage = document.querySelector(".stage"), prev = document.getElementById("prev"), next = document.getElementById("next");
  if (stage && prev && next) swipe(stage, function () { next.click(); }, function () { prev.click(); });
  // the homepage's featured game
  var art = document.querySelector(".f-art"), minis = document.getElementById("minis");
  if (art && minis) {
    var step = function (d) {
      var all = minis.children, at = 0;
      for (var i = 0; i < all.length; i++) if (all[i].getAttribute("aria-current") === "true") at = i;
      if (all.length) all[(at + d + all.length) % all.length].click();
    };
    swipe(art, function () { step(1); }, function () { step(-1); });
  }

  // ---- the game page: its title and Add to cart in the bar, once the real ones are out of view
  var title = document.querySelector("h1.title"), buy = document.querySelector(".buy [data-add]"), barIn = document.querySelector(".bar-in");
  if (title && buy && barIn && "IntersectionObserver" in window) {
    var mini = document.createElement("div");
    mini.className = "rc-mini";
    mini.innerHTML = "<b></b><button type=\"button\"></button>";
    mini.querySelector("b").textContent = title.textContent;
    var miniBtn = mini.querySelector("button");
    var paintMini = function () {
      var now = document.querySelector(".buy [data-price] .now");
      miniBtn.textContent = buy.textContent === "Get notified" ? "Notify me" : "Add · " + (now ? now.textContent : "");
    };
    paintMini();
    miniBtn.addEventListener("click", function () { buy.click(); });
    barIn.appendChild(mini);
    var seen = { title: true, buy: false };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target === title ? "title" : "buy"] = en.isIntersecting; });
      var on = !seen.title && !seen.buy;
      mini.classList.toggle("on", on);
      barIn.classList.toggle("rc-mini-on", on);
      mini.setAttribute("aria-hidden", on ? "false" : "true");
      miniBtn.tabIndex = on ? 0 : -1;
    }, { rootMargin: "-60px 0px 0px 0px" });
    io.observe(title); io.observe(buy.closest(".buy") || buy);
  }

  // ---- a light buzz when something is saved or added
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-add], [data-wish], [data-follow], .rc-wish-add");
    if (t) buzz();
  }, true);

  // ---- #cart and #wishlist (the installed app's shortcuts)
  function route() {
    var h = location.hash;
    if (h !== "#cart" && h !== "#wishlist") return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (h === "#cart") RC.openCart(); else RC.openWishlist();
  }
  route();
  window.addEventListener("hashchange", route);

  // ---- "Get the app", once, from the second visit, on a phone, not inside an app already
  var ua = navigator.userAgent;
  var iPhone = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var iosSafari = iPhone && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  var inWallet = !!(window.rougechain && window.rougechain.capabilities); // Qwalla's own browser
  var visits = (parseInt(get("rc-visits") || "0", 10) || 0) + 1;
  set("rc-visits", String(visits));
  var prompt = null, hint = null;
  function dismiss() { set("rc-app-hint", "done"); if (hint) hint.hidden = true; }
  function offer() {
    if (hint || standalone || inWallet || get("rc-app-hint") || visits < 2 || !phone.matches) return;
    if (!prompt && !iosSafari) return;
    hint = document.createElement("div");
    hint.className = "rc-install"; hint.setAttribute("role", "region"); hint.setAttribute("aria-label", "Get the app");
    hint.innerHTML = '<img src="icons/apple-touch-icon.png" alt="">' +
      (prompt
        ? "<p><b>Get the app</b>The store on your home screen.</p><button class=\"rc-get\" type=\"button\">Install</button>"
        : "<p><b>Get the app</b>Tap Share " + ICON.share + " then Add to Home Screen.</p>") +
      '<button class="rc-nope" type="button" aria-label="Not now">×</button>';
    hint.querySelector(".rc-nope").addEventListener("click", dismiss);
    var get_ = hint.querySelector(".rc-get");
    if (get_) get_.addEventListener("click", function () {
      prompt.prompt();
      prompt.userChoice.then(function () { dismiss(); prompt = null; }, dismiss);
    });
    document.body.appendChild(hint);
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); prompt = e; setTimeout(offer, 1500); });
  window.addEventListener("appinstalled", dismiss);
  if (iosSafari) setTimeout(offer, 1500);
})();
