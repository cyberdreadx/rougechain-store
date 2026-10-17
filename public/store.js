// RougeChain Store: the catalogue, prices, wishlist, cart and checkout, shared by every page.
// store-config.js says what is on sale and how:
//   a product with a Stripe Payment Link  ->  "Add to cart"; the cart's "Continue to payment" goes to Stripe
//   none, but an email signup is set      ->  "Get notified" opens the signup form
//   neither (a preview)                   ->  "Add to cart"; the cart says checkout isn't open yet
// Wishlist, follows and the cart are kept in this browser (localStorage). account.js adds sign-in:
// while someone is signed in, their wishlist and follows are saved to their account too, and checkout
// tells Stripe which account is buying.
(function () {
  var S = window.STORE || {};

  // ---- what the store sells (prices in cents)
  var PRODUCTS = {
    "gltch-runner": { name: "Gltch Runner", kind: "Early Access · Windows", was: 3000, now: 2000, pic: "img/capsule.jpg", page: "gltch-runner.html" }
  };

  function money(c) { return "$" + (c / 100).toFixed(2); }
  function off(p) { return Math.round((1 - p.now / p.was) * 100); }
  function link(id) { return (S.checkout && S.checkout[id]) || ""; }
  function mode(id) { return link(id) ? "buy" : S.signupAction ? "notify" : "preview"; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function read(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v.filter(function (x) { return PRODUCTS[x]; }) : []; }
    catch (e) { return []; }
  }
  function write(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {} }
  function has(key, id) { return read(key).indexOf(id) >= 0; }
  function put(key, id, on) { var l = read(key).filter(function (x) { return x !== id; }); if (on) l.push(id); write(key, l); }

  // ---- the panels: cart and signup, with their own styles (they use the page's colours where it has them)
  var css = document.createElement("style");
  css.textContent = [
    ".rc-scrim{position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:40}",
    ".rc-panel{position:fixed;top:0;right:0;bottom:0;z-index:41;width:min(420px,100%);background:var(--panel,#10121b);border-left:1px solid var(--line,#252839);color:var(--text,#f0f4f6);",
    "padding:calc(18px + env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) 18px;display:grid;grid-template-rows:auto 1fr auto;gap:14px;box-shadow:-20px 0 40px rgba(0,0,0,.5)}",
    ".rc-panel.rc-notify{grid-template-rows:auto auto auto 1fr}",
    ".rc-panel header{display:flex;justify-content:space-between;align-items:center}",
    ".rc-panel h2{margin:0;font:700 20px/1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.12em;text-transform:uppercase}",
    ".rc-x{border:1px solid var(--line,#252839);background:var(--panel-hi,#171a27);color:inherit;width:34px;height:34px;cursor:pointer;font:400 18px/1 var(--mono,monospace)}",
    ".rc-lines{display:grid;gap:10px;align-content:start;overflow-y:auto}",
    ".rc-line{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:10px;align-items:center;background:var(--panel-hi,#171a27);border:1px solid var(--line,#252839);padding:8px}",
    ".rc-line img{width:96px;aspect-ratio:460/215;object-fit:cover}",
    ".rc-line b{display:block;font:700 15px/1.15 var(--ui,var(--display,'Rajdhani',sans-serif))}",
    ".rc-line span{font-size:12px;color:var(--muted,#9095a8)}",
    ".rc-amt{font:400 14px/1 var(--mono,monospace);text-align:right;color:var(--text,#f0f4f6)!important}",
    ".rc-amt s{display:block;font-size:11px;color:var(--muted,#9095a8)}",
    ".rc-rm{grid-column:2/4;justify-self:start;border:0;background:none;color:var(--muted,#9095a8);font:600 13px/1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.05em;text-transform:uppercase;cursor:pointer;padding:2px 0}",
    ".rc-rm:hover{color:var(--crimson,#d5243e)}",
    ".rc-empty{margin:0;color:var(--muted,#9095a8)}",
    ".rc-total{display:grid;gap:10px;border-top:1px solid var(--line,#252839);padding-top:12px}",
    ".rc-row{display:flex;justify-content:space-between;font:600 15px/1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.06em;text-transform:uppercase}",
    ".rc-row span:last-child{font-family:var(--mono,monospace);letter-spacing:0}",
    ".rc-note{margin:0;font-size:13px;color:var(--amber,#ffb648)}",
    ".rc-go{display:inline-flex;justify-content:center;align-items:center;gap:8px;border:0;padding:11px 14px;font:700 15px/1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.07em;text-transform:uppercase;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--crimson,#d5243e),#692f96);border-radius:2px}",
    ".rc-go:hover{filter:brightness(1.1)}",
    ".rc-go[disabled]{opacity:.45;cursor:not-allowed;filter:none}",
    ".rc-what{margin:0;color:var(--text,#f0f4f6)}",
    ".rc-form{display:grid;gap:8px}",
    ".rc-form label{font:600 13px/1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#9095a8)}",
    ".rc-form input{background:var(--ink,#07080d);border:1px solid var(--line,#252839);color:var(--text,#f0f4f6);padding:10px 11px;font:inherit;border-radius:2px}",
    ".rc-fine{margin:0;font-size:12.5px;color:var(--muted,#9095a8)}",
    ".rc-fine a{color:inherit;text-decoration:underline}"
  ].join("");
  document.head.appendChild(css);

  var shell = document.createElement("div");
  shell.innerHTML =
    '<div class="rc-scrim" hidden></div>' +
    '<section class="rc-panel rc-cart" role="dialog" aria-modal="true" aria-labelledby="rc-cart-h" hidden>' +
      '<header><h2 id="rc-cart-h">Your cart</h2><button class="rc-x" type="button" aria-label="Close the cart">×</button></header>' +
      '<div class="rc-lines"></div>' +
      '<div class="rc-total"><div class="rc-row"><span>Estimated total</span><span class="rc-sum">—</span></div>' +
      '<p class="rc-note"></p><button class="rc-go rc-pay" type="button">Continue to payment</button></div>' +
    '</section>' +
    '<section class="rc-panel rc-notify" role="dialog" aria-modal="true" aria-labelledby="rc-notify-h" hidden>' +
      '<header><h2 id="rc-notify-h">Get notified</h2><button class="rc-x" type="button" aria-label="Close">×</button></header>' +
      '<p class="rc-what"></p>' +
      '<form class="rc-form" method="post" target="_blank">' +
        '<label for="rc-email">Email</label><input id="rc-email" type="email" required autocomplete="email" placeholder="you@example.com">' +
        '<button class="rc-go" type="submit">Sign me up</button></form>' +
      '<p class="rc-fine">We only use your address to tell you about RougeChain releases. Every email has an unsubscribe link.</p>' +
    '</section>';
  document.body.appendChild(shell);
  var scrim = shell.querySelector(".rc-scrim");
  var cart = shell.querySelector(".rc-cart");
  var notify = shell.querySelector(".rc-notify");
  if (S.privacyUrl) notify.querySelector(".rc-fine").insertAdjacentHTML("beforeend", ' <a href="' + esc(S.privacyUrl) + '">Privacy policy</a>');

  var opened = null, opener = null;
  function open(panel, from) { if (opened) close(); opened = panel; opener = from || null; panel.hidden = false; scrim.hidden = false; panel.querySelector(".rc-x").focus(); }
  function close() { if (!opened) return; opened.hidden = true; scrim.hidden = true; opened = null; if (opener && opener.focus) opener.focus(); }
  function mount(panel) {
    shell.appendChild(panel);
    panel.querySelectorAll(".rc-x").forEach(function (x) { x.addEventListener("click", close); });
  }
  scrim.addEventListener("click", close);
  shell.querySelectorAll(".rc-x").forEach(function (x) { x.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && opened) close(); });

  // ---- the wishlist and follow buttons repaint through these when the lists change
  var painters = [];
  function paintLists() { painters.forEach(function (p) { p(); }); paintCounts(); }
  function listsChanged() { document.dispatchEvent(new CustomEvent("rc:lists")); }

  // ---- counts in the store bar
  function paintCounts() {
    var w = document.getElementById("wish-count"), c = document.getElementById("cart-count");
    if (w) w.textContent = String(read("rc-wish").length);
    if (c) c.textContent = String(read("rc-cart").length);
  }

  // ---- the cart
  function paintCart() {
    var items = read("rc-cart"), lines = cart.querySelector(".rc-lines"), sum = 0;
    lines.innerHTML = items.length ? "" : '<p class="rc-empty">Your cart is empty.</p>';
    items.forEach(function (id) {
      var p = PRODUCTS[id]; sum += p.now;
      var row = document.createElement("div");
      row.className = "rc-line";
      row.innerHTML = '<img src="' + p.pic + '" alt=""><div><b>' + esc(p.name) + '</b><span>' + esc(p.kind) + '</span></div>' +
        '<span class="rc-amt">' + (p.was > p.now ? '<s>' + money(p.was) + '</s>' : '') + money(p.now) + '</span><button class="rc-rm" type="button">Remove</button>';
      row.querySelector(".rc-rm").addEventListener("click", function () { put("rc-cart", id, false); paintCounts(); paintCart(); });
      lines.appendChild(row);
    });
    cart.querySelector(".rc-sum").textContent = items.length ? money(sum) : "—";
    var pay = cart.querySelector(".rc-pay"), note = cart.querySelector(".rc-note");
    var live = items.length > 0 && items.every(function (id) { return link(id); });
    if (!items.length) { pay.disabled = true; note.textContent = ""; }
    else if (!live) { pay.disabled = true; note.textContent = "Checkout isn't open yet. Until it is, keep things on your wishlist."; }
    else if (items.length > 1) { pay.disabled = true; note.textContent = "For now, buy one item at a time."; }
    else { pay.disabled = false; note.textContent = "You pay on Stripe's secure checkout page." + (window.RC && window.RC.account ? " The purchase is saved to your store account." : ""); }
  }
  function openCart(from) { paintCart(); open(cart, from); }
  // Signed in: Stripe gets the account id (it shows as the payment's client reference ID) and the email.
  function payUrl(id) {
    var url = link(id), who = window.RC && window.RC.account;
    if (!url || !who) return url;
    try {
      var u = new URL(url);
      u.searchParams.set("client_reference_id", who.id);
      if (who.email) u.searchParams.set("prefilled_email", who.email);
      return u.toString();
    } catch (e) { return url; }
  }
  cart.querySelector(".rc-pay").addEventListener("click", function () {
    var items = read("rc-cart");
    if (items.length === 1 && link(items[0])) window.location.href = payUrl(items[0]);
  });

  // ---- signup, while a product isn't on sale
  function openNotify(id, from) {
    var form = notify.querySelector(".rc-form");
    notify.querySelector(".rc-what").textContent = PRODUCTS[id].name + " isn't on sale yet. Leave your email and we'll tell you when it is.";
    form.action = S.signupAction;
    form.querySelector("#rc-email").name = S.signupField || "email";
    form.querySelectorAll("input[type=hidden]").forEach(function (h) { h.remove(); });
    var extra = S.signupHidden || {};
    Object.keys(extra).forEach(function (k) {
      var h = document.createElement("input"); h.type = "hidden"; h.name = k; h.value = extra[k]; form.appendChild(h);
    });
    open(notify, from);
  }
  notify.querySelector(".rc-form").addEventListener("submit", function () { setTimeout(close, 400); });

  // ---- what the page asks for: prices, buy buttons, wishlist and follow toggles, the cart button
  document.querySelectorAll("[data-price]").forEach(function (box) {
    var p = PRODUCTS[box.getAttribute("data-price")]; if (!p) return;
    var d = box.querySelector(".disc"), w = box.querySelector(".was"), n = box.querySelector(".now");
    if (d) { d.hidden = !(p.was > p.now); d.textContent = "-" + off(p) + "%"; d.setAttribute("aria-label", off(p) + " percent off"); }
    if (w) { w.hidden = !(p.was > p.now); w.innerHTML = '<span class="visually-hidden">Was </span>' + money(p.was); }
    if (n) n.textContent = money(p.now);
  });
  document.querySelectorAll("[data-add]").forEach(function (b) {
    var id = b.getAttribute("data-add"); if (!PRODUCTS[id]) return;
    b.textContent = mode(id) === "notify" ? "Get notified" : "Add to cart";
    b.addEventListener("click", function (e) {
      if (mode(id) === "notify") { openNotify(id, e.currentTarget); return; }
      put("rc-cart", id, true); paintCounts(); openCart(e.currentTarget);
    });
  });
  document.querySelectorAll("[data-wish]").forEach(function (b) {
    var id = b.getAttribute("data-wish");
    function paint() { var on = has("rc-wish", id); b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "♥ On your wishlist" : "♡ Add to wishlist"; }
    b.addEventListener("click", function () { put("rc-wish", id, !has("rc-wish", id)); paint(); paintCounts(); listsChanged(); });
    painters.push(paint); paint();
  });
  document.querySelectorAll("[data-follow]").forEach(function (b) {
    var id = b.getAttribute("data-follow");
    function paint() { var on = has("rc-follow", id); b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "Following" : "Follow"; }
    b.addEventListener("click", function () { put("rc-follow", id, !has("rc-follow", id)); paint(); listsChanged(); });
    painters.push(paint); paint();
  });
  var cartTop = document.getElementById("cart-top");
  if (cartTop) cartTop.addEventListener("click", function (e) { openCart(e.currentTarget); });

  // ---- footer: contact and policies, where they are set
  document.querySelectorAll("[data-contact]").forEach(function (el) {
    if (S.contactEmail) el.innerHTML = 'Contact: <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a>';
  });
  document.querySelectorAll("[data-legal]").forEach(function (el) {
    var parts = [];
    if (S.termsUrl) parts.push('<a href="' + esc(S.termsUrl) + '">Terms</a>');
    if (S.refundUrl) parts.push('<a href="' + esc(S.refundUrl) + '">Refunds</a>');
    if (S.privacyUrl) parts.push('<a href="' + esc(S.privacyUrl) + '">Privacy</a>');
    el.innerHTML = parts.join(" · ");
  });

  paintCounts();
  window.RC = {
    products: PRODUCTS, mode: mode, openCart: openCart,
    clearCart: function () { write("rc-cart", []); paintCounts(); },
    // for account.js
    account: null,
    panel: { mount: mount, open: open, close: close },
    lists: function () { return { wishlist: read("rc-wish"), follows: read("rc-follow") }; },
    setLists: function (l) { write("rc-wish", l.wishlist || []); write("rc-follow", l.follows || []); paintLists(); }
  };
})();
