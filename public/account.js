// RougeChain Store accounts: the Sign in button in the store bar and its panel. Load it after store.js.
//
// One screen at a time:
//   start      "Continue with RougeChain wallet", or an email and Continue
//   code       the 6-digit code we emailed (signs in by itself once 6 digits are in). It also makes
//              new accounts, so there's no separate sign-up. "Use password instead" is a link.
//   password   for people who set one; this browser remembers they prefer it
//   account    a short list: Email, Wallet, Password. Each row opens its own screen.
//
// The wallet button does what fits the device: with a wallet (the extension 1.8+, or Qwalla's
// browser) it signs in; on a phone without one it opens this page in Qwalla (qwalla:// link); on a
// computer without one it says how to get one. The server half is netlify/functions/api.mjs
// (/api/*). Where there is no API, such as a static preview, Sign in stays hidden.
(function () {
  var RC = window.RC, bar = document.querySelector(".bar-right");
  if (!RC || !bar) return;
  var WALLET_URL = "https://chromewebstore.google.com/detail/rougechain-wallet/ilkbgjgphhaolfdjkfefdfiifipmhakj";
  var QWALLA_URL = "https://qwalla.io";
  var PHONE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  var account = null, emailOn = true, email = "", lastSent = null, flash = null;
  // i18n.js translates; without it, the English with its {slots} filled
  var t = window.I18N ? window.I18N.t : function (s, v) { return v ? s.replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; }) : s; };
  var LANG = window.I18N ? window.I18N.lang : "en";

  // ---- styles (the page's colours where it has them, like store.js)
  var UI = "var(--ui,var(--display,'Rajdhani',sans-serif))";
  var css = document.createElement("style");
  css.textContent = [
    ".rc-panel.rc-acct{grid-template-rows:auto 1fr;overflow-y:auto}",
    ".rc-acct header{justify-content:flex-start!important;gap:6px}",
    ".rc-acct header .rc-x{margin-left:auto}",
    ".rc-acct h2:focus{outline:none}",
    ".rc-back{display:grid;place-items:center;border:0;background:none;color:var(--text,#f0f4f6);width:34px;height:34px;padding:0;margin-left:-9px;cursor:pointer}",
    ".rc-back svg{width:20px;height:20px}",
    ".rc-view{display:grid;gap:16px;align-content:start}",
    ".rc-lede{margin:0;font-size:15px;color:var(--text,#f0f4f6)}",
    ".rc-lede b{font-weight:600;overflow-wrap:anywhere}",
    ".rc-wallet{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 14px;border:1px solid var(--line,#252839);border-radius:2px;background:var(--panel-hi,#171a27);color:var(--text,#f0f4f6);font:700 15px/1 " + UI + ";letter-spacing:.06em;text-transform:uppercase;text-decoration:none;cursor:pointer}",
    ".rc-wallet:hover{border-color:var(--crimson,#d5243e)}",
    ".rc-wallet[disabled]{opacity:.65;cursor:progress}",
    ".rc-wallet img{width:22px;height:22px}",
    ".rc-or{display:flex;align-items:center;gap:12px;color:var(--muted,#9095a8);font:600 12px/1 " + UI + ";letter-spacing:.16em;text-transform:uppercase}",
    ".rc-or::before,.rc-or::after{content:'';flex:1;height:1px;background:var(--line,#252839)}",
    ".rc-form .rc-go{margin-top:4px}",
    ".rc-note{margin:0;font-size:13px;color:var(--muted,#9095a8)}",
    ".rc-note:empty{display:none}",
    ".rc-note a{color:var(--text,#f0f4f6);text-decoration:underline}",
    ".rc-note.rc-err{color:#ff7d8f}",
    ".rc-note.rc-ok{color:var(--cyan,#38e1ff)}",
    ".rc-code{text-align:center;font:400 28px/1 var(--mono,monospace)!important;letter-spacing:.45em;padding-left:.45em!important}",
    ".rc-code::placeholder{color:var(--line,#252839);opacity:1}",
    ".rc-links{margin:0;display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px}",
    ".rc-link{border:0;background:none;padding:0;font:inherit;color:var(--muted,#9095a8);text-decoration:underline;text-underline-offset:3px;cursor:pointer}",
    ".rc-link:hover{color:var(--text,#f0f4f6)}",
    ".rc-link.rc-danger{color:#ff7d8f}",
    ".rc-who{display:grid;gap:4px}",
    ".rc-who b{font:700 19px/1.2 " + UI + ";letter-spacing:.03em;overflow-wrap:anywhere}",
    ".rc-who span{font-size:13px;color:var(--muted,#9095a8)}",
    ".rc-alist{display:grid;border:1px solid var(--line,#252839);background:var(--panel-hi,#171a27)}",
    ".rc-arow{display:grid;grid-template-columns:84px minmax(0,1fr) 14px;gap:10px;align-items:center;width:100%;padding:13px 12px;border:0;border-top:1px solid var(--line,#252839);background:none;color:inherit;font:inherit;text-align:left}",
    ".rc-arow:first-child{border-top:0}",
    "button.rc-arow{cursor:pointer}",
    "button.rc-arow:hover{background:rgba(255,255,255,.035)}",
    ".rc-arow .k{font:600 12px/1 " + UI + ";letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#9095a8)}",
    ".rc-arow .v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 14px/1.3 var(--body,system-ui,sans-serif);letter-spacing:0;text-transform:none}",
    ".rc-arow .v.rc-mono{font-family:var(--mono,monospace)}",
    ".rc-arow .v.rc-dim{color:var(--muted,#9095a8)}",
    ".rc-arow .c{color:var(--muted,#9095a8);font:400 18px/1 var(--mono,monospace)}",
    ".rc-mono{font-family:var(--mono,monospace)}",
    ".rc-full{margin:0;padding:10px 11px;font:400 13px/1.5 var(--mono,monospace);overflow-wrap:anywhere;background:var(--ink,#07080d);border:1px solid var(--line,#252839)}",
    ".rc-hide{display:none}"
  ].join("");
  document.head.appendChild(css);

  // ---- the store bar button and the panel
  var top = document.createElement("button");
  top.className = "pill-btn"; top.id = "account-top"; top.type = "button"; top.hidden = true; top.textContent = t("Sign in");
  bar.appendChild(top);

  var panel = document.createElement("section");
  panel.className = "rc-panel rc-acct";
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "rc-acct-h");
  panel.hidden = true;
  panel.innerHTML =
    '<header><button class="rc-back" type="button" aria-label="' + t("Back") + '" hidden><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg></button>' +
    '<h2 id="rc-acct-h" tabindex="-1">' + t("Sign in") + '</h2><button class="rc-x" type="button" aria-label="' + t("Close") + '">×</button></header>' +
    '<div class="rc-view"></div>';
  RC.panel.mount(panel);
  var view = panel.querySelector(".rc-view"), title = panel.querySelector("h2"), back = panel.querySelector(".rc-back"), backTo = null;
  back.addEventListener("click", function () { if (backTo) show(backTo); });

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel) { return view.querySelector(sel); }
  function short(a) { return a.length > 22 ? a.slice(0, 12) + "…" + a.slice(-6) : a; }

  // ---- talking to /api
  function api(path, body) {
    var opts = { credentials: "same-origin", headers: {} };
    if (body !== undefined) { opts.method = "POST"; opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch("/api" + path, opts).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (r.ok && d) return d;
        var e = new Error(t((d && d.error) || "Something went wrong. Try again in a minute.")); // the server speaks English
        e.status = r.status; e.data = d || {};
        if (r.status === 401 && account && path.indexOf("/auth/") !== 0) { setAccount(null); if (!panel.hidden) show("start"); }
        throw e;
      });
    });
  }

  // this browser remembers the last email, and whether its owner signs in with a password
  function pref() { try { return JSON.parse(localStorage.getItem("rc-signin") || "null") || {}; } catch (e) { return {}; } }
  function setPref(p) { try { localStorage.setItem("rc-signin", JSON.stringify(p)); } catch (e) {} }

  function note(el, text, kind) { if (!el) return; el.className = "rc-note" + (kind ? " rc-" + kind : ""); el.textContent = text ? t(text) : ""; }
  function noteHtml(el, html, kind) { el.className = "rc-note" + (kind ? " rc-" + kind : ""); el.innerHTML = html; }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.setAttribute("data-label", btn.innerHTML); if (label) btn.textContent = t(label); btn.disabled = true; }
    else { btn.disabled = false; if (btn.hasAttribute("data-label")) btn.innerHTML = btn.getAttribute("data-label"); }
  }

  /** Emails a code, unless one went to the same address less than a minute ago (that one still works). */
  function sendCode(to, force) {
    if (!force && lastSent && lastSent.email === to && Date.now() - lastSent.at < 60000) return Promise.resolve();
    return api("/auth/email/code", { email: to, lang: LANG }).then(
      function (d) { email = d.email; lastSent = { email: d.email, at: Date.now() }; },
      function (e) { if (!force && e.data.codeSent) { email = to; return; } throw e; });
  }

  // ---- the screens
  function show(name, message) {
    var v = VIEWS[name]();
    title.textContent = t(v.title);
    backTo = v.back || null; back.hidden = !backTo;
    view.innerHTML = v.html;
    if (v.wire) v.wire();
    var n = view.querySelector("[data-msg]");
    if (message && n) note(n, message, "ok");
    var first = v.focus && $(v.focus);
    (first || title).focus({ preventScroll: true });
  }

  function walletButton() {
    var label = t(!window.rougechain && PHONE ? "Continue with Qwalla" : "Continue with RougeChain wallet");
    return '<button class="rc-wallet" type="button" data-wallet><img src="icons/ring-64.png" alt=""><span>' + label + "</span></button>";
  }
  function codeField() {
    return '<input class="rc-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="' + t("6-digit code") + '" required>';
  }
  function username(value) {
    return '<input class="rc-hide" type="email" autocomplete="username" value="' + esc(value) + '" tabindex="-1" aria-hidden="true">';
  }

  var VIEWS = {
    start: function () {
      return {
        title: "Sign in",
        html:
          '<p class="rc-lede">' + t("Sign in or create your store account.") + '</p>' +
          walletButton() +
          '<p class="rc-note" data-wallet-note></p>' +
          (emailOn
            ? '<div class="rc-or" aria-hidden="true">' + t("or") + '</div>' +
              '<form class="rc-form" data-email novalidate>' +
                '<label for="rc-signin-email">' + t("Email") + '</label>' +
                '<input id="rc-signin-email" type="email" autocomplete="email" placeholder="' + t("you@example.com") + '" value="' + esc(email || pref().email || "") + '">' +
                '<p class="rc-note" data-msg></p>' +
                '<button class="rc-go" type="submit">' + t("Continue") + '</button>' +
              "</form>"
            : ""),
        wire: function () {
          var wb = $("[data-wallet]");
          wb.addEventListener("click", function () { walletGo("signin", wb, $("[data-wallet-note]")); });
          var form = $("[data-email]");
          if (!form) return;
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var to = $("#rc-signin-email").value.trim().toLowerCase(), btn = form.querySelector(".rc-go"), msg = $("[data-msg]");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { note(msg, "Enter your email address.", "err"); $("#rc-signin-email").focus(); return; }
            email = to;
            var p = pref();
            if (p.method === "password" && p.email === to) { show("password"); return; }
            busy(btn, true, "Sending code…");
            sendCode(to).then(function () { show("code"); }, function (err) { busy(btn, false); note(msg, err.message, "err"); });
          });
        }
      };
    },

    code: function () {
      return {
        title: "Check your email",
        back: "start",
        focus: ".rc-code",
        html:
          '<p class="rc-lede">' + t("Enter the 6-digit code we sent to {email}.", { email: "<b>" + esc(email) + "</b>" }) + "</p>" +
          '<form class="rc-form" data-check>' + codeField() + '<p class="rc-note" data-msg></p></form>' +
          '<p class="rc-links"><button class="rc-link" type="button" data-resend>' + t("Send a new code") + '</button>' +
          '<button class="rc-link" type="button" data-use-password>' + t("Use password instead") + '</button></p>',
        wire: function () {
          codeInput($(".rc-code"), $("[data-msg]"), function (code) {
            return api("/auth/email/verify", { email: email, code: code }).then(function (d) {
              var p = pref();
              setPref({ email: email, method: p.email === email ? p.method : "code" });
              signedIn(d);
            });
          });
          $("[data-resend]").addEventListener("click", function () {
            var msg = $("[data-msg]");
            sendCode(email, true).then(function () { note(msg, "New code sent.", "ok"); $(".rc-code").focus(); }, function (err) { note(msg, err.message, "err"); });
          });
          $("[data-use-password]").addEventListener("click", function () { show("password"); });
        }
      };
    },

    password: function () {
      return {
        title: "Enter your password",
        back: "start",
        focus: "#rc-pass",
        html:
          '<p class="rc-lede">' + t("Signing in as {email}.", { email: "<b>" + esc(email) + "</b>" }) + "</p>" +
          '<form class="rc-form" data-password>' + username(email) +
            '<label for="rc-pass">' + t("Password") + '</label><input id="rc-pass" type="password" autocomplete="current-password" required>' +
            '<p class="rc-note" data-msg></p>' +
            '<button class="rc-go" type="submit">' + t("Sign in") + '</button>' +
          "</form>" +
          '<p class="rc-links"><button class="rc-link" type="button" data-use-code>' + t("Email me a code instead") + '</button></p>',
        wire: function () {
          var form = $("[data-password]");
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = form.querySelector(".rc-go");
            busy(btn, true, "Signing in…");
            api("/auth/email/password", { email: email, password: $("#rc-pass").value }).then(function (d) {
              setPref({ email: email, method: "password" });
              signedIn(d);
            }, function (err) { busy(btn, false); note($("[data-msg]"), err.message, "err"); $("#rc-pass").select(); });
          });
          $("[data-use-code]").addEventListener("click", function (ev) {
            var b = ev.currentTarget;
            busy(b, true, "Sending code…");
            sendCode(email).then(function () { show("code"); }, function (err) { busy(b, false); note($("[data-msg]"), err.message, "err"); });
          });
        }
      };
    },

    account: function () {
      var a = account;
      var rows =
        row("email", "Email", a.email || (emailOn ? "Add email" : "None"), !a.email, a.email ? !!a.wallet : emailOn) +
        row("wallet", "Wallet", a.wallet ? short(a.wallet.address) : "Add wallet", !a.wallet, true, !!a.wallet) +
        (a.email ? row("password", "Password", a.hasPassword ? "Set" : "Not set", !a.hasPassword, true) : "");
      return {
        title: "Your account",
        html:
          '<div class="rc-who"><b class="' + (a.email ? "" : "rc-mono") + '">' + esc(a.email || short(a.wallet.address)) + "</b>" +
          "<span>" + t("Your wishlist, follows and purchases stay with this account.") + "</span></div>" +
          '<div class="rc-alist">' + rows + "</div>" +
          '<p class="rc-note" data-msg></p>' +
          '<p class="rc-links"><button class="rc-link" type="button" data-signout>' + t("Sign out") + '</button></p>',
        wire: function () {
          var on = function (sel, fn) { var el = $(sel); if (el) el.addEventListener("click", fn); };
          on("[data-row=email]", function () { show(account.email ? "email" : "addEmail"); });
          on("[data-row=password]", function () { show("password-set"); });
          on("[data-row=wallet]", function (e) {
            if (account.wallet) { show("wallet"); return; }
            var r = e.currentTarget;
            walletGo("link", null, $("[data-msg]"), function (wait) { r.disabled = wait; r.querySelector(".v").textContent = t(wait ? "Check your wallet…" : "Add wallet"); });
          });
          $("[data-signout]").addEventListener("click", function () {
            api("/auth/signout", {}).then(function () {
              setAccount(null);
              RC.setLists({ wishlist: [], follows: [] });
              RC.panel.close();
              label("Signed out");
            }, function (err) { note($("[data-msg]"), err.message, "err"); });
          });
        }
      };
    },

    email: function () {
      return {
        title: "Email",
        back: "account",
        html:
          '<p class="rc-lede"><b>' + esc(account.email) + "</b></p>" +
          '<p class="rc-note">' + t("You can also sign in with your wallet, so this email can be removed. Removing it also removes your password.") + '</p>' +
          '<p class="rc-note" data-msg></p>' +
          '<p class="rc-links"><button class="rc-link rc-danger" type="button" data-remove>' + t("Remove email") + '</button></p>',
        wire: function () { $("[data-remove]").addEventListener("click", function () { unlink("email"); }); }
      };
    },

    wallet: function () {
      return {
        title: "Wallet",
        back: "account",
        html:
          '<p class="rc-full">' + esc(account.wallet.address) + "</p>" +
          '<p class="rc-note">' + t("This RougeChain wallet signs you in. Signing in never moves funds.") + '</p>' +
          '<p class="rc-note" data-msg></p>' +
          (account.email ? '<p class="rc-links"><button class="rc-link rc-danger" type="button" data-remove>' + t("Remove wallet") + '</button></p>' : ""),
        wire: function () { var r = $("[data-remove]"); if (r) r.addEventListener("click", function () { unlink("wallet"); }); }
      };
    },

    addEmail: function () {
      return {
        title: "Add email",
        back: "account",
        focus: "#rc-add-email",
        html:
          '<form class="rc-form" data-add novalidate>' +
            '<label for="rc-add-email">' + t("Email") + '</label><input id="rc-add-email" type="email" autocomplete="email" placeholder="' + t("you@example.com") + '">' +
            '<p class="rc-note" data-msg></p>' +
            '<button class="rc-go" type="submit">' + t("Continue") + '</button>' +
          "</form>",
        wire: function () {
          var form = $("[data-add]");
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var to = $("#rc-add-email").value.trim().toLowerCase(), btn = form.querySelector(".rc-go");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { note($("[data-msg]"), "Enter an email address.", "err"); return; }
            busy(btn, true, "Sending code…");
            sendCode(to).then(function () { email = to; show("addEmailCode"); }, function (err) { busy(btn, false); note($("[data-msg]"), err.message, "err"); });
          });
        }
      };
    },

    addEmailCode: function () {
      return {
        title: "Check your email",
        back: "addEmail",
        focus: ".rc-code",
        html:
          '<p class="rc-lede">' + t("Enter the 6-digit code we sent to {email}.", { email: "<b>" + esc(email) + "</b>" }) + "</p>" +
          '<form class="rc-form" data-check>' + codeField() + '<p class="rc-note" data-msg></p></form>',
        wire: function () {
          codeInput($(".rc-code"), $("[data-msg]"), function (code) {
            return api("/auth/email/verify", { email: email, code: code, intent: "link" }).then(function (d) { changed(d, "Email added."); });
          });
        }
      };
    },

    "password-set": function () {
      var has = account.hasPassword;
      return {
        title: has ? "Change password" : "Set a password",
        back: "account",
        focus: has ? "#rc-cur" : "#rc-new",
        html:
          '<form class="rc-form" data-setpw>' + username(account.email) +
            (has ? '<label for="rc-cur">' + t("Current password") + '</label><input id="rc-cur" type="password" autocomplete="current-password" required>' : "") +
            '<label for="rc-new">' + t("New password") + '</label><input id="rc-new" type="password" autocomplete="new-password" minlength="10" required>' +
            '<p class="rc-note">' + t("At least 10 characters.") + '</p>' +
            '<p class="rc-note" data-msg></p>' +
            '<button class="rc-go" type="submit">' + t("Save password") + '</button>' +
          "</form>" +
          (has ? '<p class="rc-links"><button class="rc-link" type="button" data-forgot>' + t("Forgot it? Reset it with an email code") + '</button></p>' : ""),
        wire: function () {
          var form = $("[data-setpw]");
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = form.querySelector(".rc-go");
            busy(btn, true, "Saving…");
            api("/account/password", { current: has ? $("#rc-cur").value : "", password: $("#rc-new").value })
              .then(function (d) { setPref({ email: account.email, method: "password" }); changed(d, "Password saved."); },
                function (err) { busy(btn, false); note($("[data-msg]"), err.message, "err"); });
          });
          var f = $("[data-forgot]");
          if (f) f.addEventListener("click", function () {
            busy(f, true, "Sending code…");
            sendCode(account.email).then(function () { email = account.email; show("password-reset"); }, function (err) { busy(f, false); note($("[data-msg]"), err.message, "err"); });
          });
        }
      };
    },

    "password-reset": function () {
      return {
        title: "Reset password",
        back: "password-set",
        focus: ".rc-code",
        html:
          '<p class="rc-lede">' + t("Enter the code we sent to {email}, then your new password.", { email: "<b>" + esc(email) + "</b>" }) + "</p>" +
          '<form class="rc-form" data-reset>' + username(email) + codeField() +
            '<label for="rc-new">' + t("New password") + '</label><input id="rc-new" type="password" autocomplete="new-password" minlength="10" required>' +
            '<p class="rc-note" data-msg></p>' +
            '<button class="rc-go" type="submit">' + t("Save password") + '</button>' +
          "</form>",
        wire: function () {
          var form = $("[data-reset]"), code = $(".rc-code");
          code.addEventListener("input", function () { code.value = code.value.replace(/\D/g, "").slice(0, 6); if (code.value.length === 6) $("#rc-new").focus(); });
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = form.querySelector(".rc-go");
            busy(btn, true, "Saving…");
            api("/auth/email/verify", { email: email, code: code.value, password: $("#rc-new").value })
              .then(function (d) { setAccount(d.account); setPref({ email: email, method: "password" }); changed(d, "Password saved."); },
                function (err) { busy(btn, false); note($("[data-msg]"), err.message, "err"); });
          });
        }
      };
    }
  };

  function row(name, key, value, dim, clickable, mono) {
    var inner = '<span class="k">' + t(key) + '</span><span class="v' + (dim ? " rc-dim" : "") + (mono ? " rc-mono" : "") + '">' + esc(t(value)) + "</span>";
    return clickable
      ? '<button class="rc-arow" type="button" data-row="' + name + '">' + inner + '<span class="c" aria-hidden="true">›</span></button>'
      : '<div class="rc-arow">' + inner + "<span></span></div>";
  }

  /** A 6-digit code field that submits itself once it's full. */
  function codeInput(input, msg, submit) {
    var checking = false;
    function go() {
      if (checking || input.value.length !== 6) return;
      checking = true; input.disabled = true; note(msg, "Checking…");
      submit(input.value).catch(function (err) {
        checking = false; input.disabled = false; input.value = ""; note(msg, err.message, "err"); input.focus();
      });
    }
    input.addEventListener("input", function () { input.value = input.value.replace(/\D/g, "").slice(0, 6); go(); });
    input.form.addEventListener("submit", function (e) { e.preventDefault(); go(); });
  }

  function unlink(method) {
    var msg = $("[data-msg]");
    api("/account/unlink", { method: method }).then(function (d) { changed(d, method === "email" ? "Email removed." : "Wallet removed."); }, function (err) { note(msg, err.message, "err"); });
  }

  // ---- the wallet button
  function qwallaLink() {
    return "qwalla:///(tabs)/browser?url=" + encodeURIComponent(location.origin + location.pathname + "#sign-in");
  }
  /** Opens this page in Qwalla. If nothing happened a moment later, Qwalla probably isn't installed. */
  function openQwalla(msg) {
    var left = false;
    var leave = function () { left = true; };
    document.addEventListener("visibilitychange", leave, { once: true });
    window.addEventListener("pagehide", leave, { once: true });
    location.href = qwallaLink();
    setTimeout(function () {
      if (!left && document.visibilityState === "visible") {
        noteHtml(msg, t("Qwalla didn't open.") + ' <a href="' + QWALLA_URL + '" target="_blank" rel="noopener">' + t("Get Qwalla") + "</a> " + t("for iPhone or Android, then try again."));
      }
    }, 1800);
  }
  function walletError(e) {
    var m = (e && e.message) || "";
    if (e && e.status) return m;
    if (/denied|rejected|declined|cancel/i.test(m)) return "Cancelled in your wallet. Nothing was signed.";
    if (/locked|not set up/i.test(m)) return "Unlock your wallet, then try again.";
    if (/timed out/i.test(m)) return "Your wallet didn't answer in time. Try again.";
    return m || "Your wallet couldn't sign in. Try again.";
  }
  /** Signs in (or links) with the wallet in this browser. `btn`, or `onBusy`, shows that it's waiting. */
  function walletGo(intent, btn, msg, onBusy) {
    var p = window.rougechain, challenge;
    var wait = function (on) { if (onBusy) onBusy(on); else busy(btn, on, "Check your wallet…"); };
    note(msg, "");
    if (!p || !p.isRougeChain) {
      if (PHONE) { openQwalla(msg); return; }
      noteHtml(msg, t("Add the {ext} to Chrome, Edge or Brave, or use {qwalla}. Then reload this page.", {
        ext: '<a href="' + WALLET_URL + '" target="_blank" rel="noopener">' + t("RougeChain Wallet extension") + "</a>",
        qwalla: '<a href="' + QWALLA_URL + '" target="_blank" rel="noopener">Qwalla Browser</a>'
      }));
      return;
    }
    if (typeof p.signMessage !== "function") { note(msg, "Update your wallet to sign in (RougeChain Wallet 1.8 or later, or the latest Qwalla), then reload this page."); return; }
    wait(true);
    Promise.resolve()
      .then(function () { return p.connect(); })
      .then(function (c) {
        if (!c || !c.publicKey) throw new Error("Your wallet didn't share its public key.");
        return api("/auth/wallet/challenge", { publicKey: c.publicKey, intent: intent });
      })
      .then(function (d) { challenge = d.message; return p.signMessage({ message: challenge }); })
      .then(function (s) { return api("/auth/wallet/verify", { message: challenge, signature: s.signature, publicKey: s.publicKey }); })
      .then(function (d) { if (intent === "link") changed(d, "Wallet added."); else signedIn(d); })
      .catch(function (e) { wait(false); note(msg, walletError(e), "err"); });
  }

  // ---- state
  function union(a, b) { var out = (a || []).slice(); (b || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); return out; }

  // `merge`: just signed in here, so what this browser saved before joins the account's lists.
  function setAccount(a, merge) {
    account = a; RC.account = a;
    if (a) {
      var mine = RC.lists();
      var lists = merge ? { wishlist: union(a.wishlist, mine.wishlist), follows: union(a.follows, mine.follows) } : { wishlist: a.wishlist, follows: a.follows };
      RC.setLists(lists);
      if (merge && (lists.wishlist.length !== a.wishlist.length || lists.follows.length !== a.follows.length)) saveLists();
    }
    label();
  }
  /** The store bar button's text; `text` shows for a moment, then it goes back to Sign in / Account. */
  function label(text) {
    clearTimeout(flash);
    top.textContent = t(text || (account ? "Account" : "Sign in"));
    if (text) flash = setTimeout(function () { label(); }, 2500);
  }
  function signedIn(d) {
    setAccount(d.account, true);
    RC.panel.close();
    label("Signed in ✓");
  }
  function changed(d, text) { account = d.account; RC.account = d.account; show("account", text); }

  var saveTimer = null;
  function saveLists() {
    if (!account) return;
    api("/account/lists", RC.lists()).then(function (d) { account = d.account; RC.account = d.account; }).catch(function () {});
  }
  document.addEventListener("rc:lists", function () { clearTimeout(saveTimer); saveTimer = setTimeout(saveLists, 500); });

  function openPanel(from) {
    show(account ? "account" : "start");
    RC.panel.open(panel, from && from.nodeType ? from : top);
    title.focus({ preventScroll: true });
  }
  top.addEventListener("click", function () { openPanel(top); });
  RC.openAccount = openPanel; // app.js's Account tab

  api("/account").then(function (d) {
    emailOn = !!(d.methods && d.methods.email);
    setAccount(d.account, false);
    top.hidden = false;
    // Arrived from the Qwalla link: go straight to sign-in.
    if (location.hash === "#sign-in") {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      openPanel();
    }
  }).catch(function () { /* no accounts API here: leave sign-in out */ });
})();
