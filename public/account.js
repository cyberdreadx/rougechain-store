// RougeChain Store accounts: the Sign in button in the store bar and its panel. Load it after store.js.
// Two ways in, both to the same account once linked:
//   Email               a password, or a 6-digit code we email (the code also makes new accounts and resets passwords)
//   RougeChain wallet   the wallet signs a one-time Sign-In with RougeChain message (extension 1.8 or later)
// The server half is netlify/functions/api.mjs (/api/*). Where there is no API, such as a static
// preview, the Sign in button stays hidden and the store works as before.
(function () {
  var RC = window.RC, bar = document.querySelector(".bar-right");
  if (!RC || !bar) return;
  var WALLET_URL = "https://chromewebstore.google.com/detail/rougechain-wallet/ilkbgjgphhaolfdjkfefdfiifipmhakj";
  var account = null, sentTo = "", resetting = false, emailOn = true;

  // ---- styles (the page's colours where it has them, like store.js)
  var css = document.createElement("style");
  css.textContent = [
    ".rc-panel.rc-acct{grid-template-rows:auto 1fr;overflow-y:auto}",
    ".rc-acct-body{display:grid;gap:14px;align-content:start}",
    ".rc-acct [hidden]{display:none!important}",
    ".rc-tabs{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:3px;background:var(--ink,#07080d);border:1px solid var(--line,#252839)}",
    ".rc-tabs button{border:0;background:none;color:var(--muted,#9095a8);padding:10px 6px;font:700 14px/1.1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.07em;text-transform:uppercase;cursor:pointer;border-radius:2px}",
    ".rc-tabs button:hover{color:var(--text,#f0f4f6)}",
    ".rc-tabs button[aria-selected=true]{background:var(--panel-hi,#171a27);color:var(--text,#f0f4f6);box-shadow:inset 0 -2px 0 var(--crimson,#d5243e)}",
    ".rc-pane{display:grid;gap:12px}",
    ".rc-form label span{margin-left:6px;font-weight:500;letter-spacing:0;text-transform:none}",
    ".rc-form .rc-go{margin-top:4px}",
    ".rc-code{font:400 22px/1 var(--mono,monospace)!important;letter-spacing:.3em}",
    ".rc-alt,.rc-hint{margin:0;font-size:13px;color:var(--muted,#9095a8)}",
    ".rc-hint a{color:var(--text,#f0f4f6);text-decoration:underline}",
    ".rc-link{border:0;background:none;padding:0;font:inherit;color:var(--text,#f0f4f6);text-decoration:underline;text-underline-offset:2px;cursor:pointer}",
    ".rc-link:hover{color:var(--crimson,#d5243e)}",
    ".rc-msg{margin:0;font-size:13.5px;color:var(--text,#f0f4f6)}",
    ".rc-msg:empty{display:none}",
    ".rc-msg.rc-err{color:#ff7d8f}",
    ".rc-msg.rc-ok{color:var(--cyan,#38e1ff)}",
    ".rc-ids{margin:0;display:grid;gap:8px}",
    ".rc-ids>div{display:grid;gap:5px;padding:10px 11px;background:var(--panel-hi,#171a27);border:1px solid var(--line,#252839)}",
    ".rc-ids dt{font:600 12px/1 var(--ui,var(--display,'Rajdhani',sans-serif));letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#9095a8)}",
    ".rc-ids dd{margin:0;display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px;min-width:0;font-size:14px}",
    ".rc-ids dd span{min-width:0;overflow-wrap:anywhere}",
    ".rc-ids .rc-addr{font-family:var(--mono,monospace)}",
    ".rc-ids .rc-none{color:var(--muted,#9095a8)}",
    ".rc-sub{padding-left:12px;border-left:2px solid var(--crimson,#d5243e)}",
    ".rc-go.rc-quiet{background:var(--panel-hi,#171a27);border:1px solid var(--line,#252839);color:var(--text,#f0f4f6)}"
  ].join("");
  document.head.appendChild(css);

  // ---- the store bar button and the panel
  var top = document.createElement("button");
  top.className = "pill-btn"; top.id = "account-top"; top.type = "button"; top.hidden = true; top.textContent = "Sign in";
  bar.appendChild(top);

  var codeInput = 'inputmode="numeric" autocomplete="one-time-code" required maxlength="7" class="rc-code"';
  var panel = document.createElement("section");
  panel.className = "rc-panel rc-acct";
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "rc-acct-h");
  panel.hidden = true;
  panel.innerHTML =
    '<header><h2 id="rc-acct-h">Sign in</h2><button class="rc-x" type="button" aria-label="Close">×</button></header>' +
    '<div class="rc-acct-body">' +
      '<div class="rc-acct-body" data-view="out">' +
        '<div class="rc-tabs" role="tablist" aria-label="How to sign in">' +
          '<button type="button" role="tab" id="rc-tab-email" aria-controls="rc-pane-email" aria-selected="true">Email</button>' +
          '<button type="button" role="tab" id="rc-tab-wallet" aria-controls="rc-pane-wallet" aria-selected="false" tabindex="-1">RougeChain wallet</button>' +
        '</div>' +
        '<div class="rc-pane" id="rc-pane-email" role="tabpanel" aria-labelledby="rc-tab-email">' +
          '<p class="rc-what" data-email-off hidden>Email sign-in opens soon. Use your RougeChain wallet for now.</p>' +
          '<form class="rc-form" data-step="password">' +
            '<label for="rc-a-email">Email</label><input id="rc-a-email" type="email" required autocomplete="username" placeholder="you@example.com">' +
            '<label for="rc-a-pass">Password</label><input id="rc-a-pass" type="password" required autocomplete="current-password">' +
            '<button class="rc-go" type="submit">Sign in</button>' +
            '<p class="rc-alt">New here, or forgot your password? <button class="rc-link" type="button" data-go="code">Email me a code</button></p>' +
          '</form>' +
          '<form class="rc-form" data-step="code" hidden>' +
            '<label for="rc-c-email">Email</label><input id="rc-c-email" type="email" required autocomplete="email" placeholder="you@example.com">' +
            '<button class="rc-go" type="submit">Email me a code</button>' +
            '<p class="rc-alt">The code signs you in, and makes your account if you don\'t have one yet. <button class="rc-link" type="button" data-go="password">Use my password instead</button></p>' +
          '</form>' +
          '<form class="rc-form" data-step="check" hidden>' + '<input type="email" autocomplete="username" data-username tabindex="-1" aria-hidden="true" style="display:none">' +
            '<p class="rc-what">We sent a 6-digit code to <b data-sent-to></b>. It works for 10 minutes.</p>' +
            '<label for="rc-code">Code</label><input id="rc-code" ' + codeInput + '>' +
            '<label for="rc-new-pass">New password<span>(optional)</span></label><input id="rc-new-pass" type="password" autocomplete="new-password" minlength="10">' +
            '<p class="rc-hint">Set one to sign in with a password next time, or to replace a forgotten one. At least 10 characters.</p>' +
            '<button class="rc-go" type="submit">Sign in</button>' +
            '<p class="rc-alt"><button class="rc-link" type="button" data-act="resend">Send a new code</button> · <button class="rc-link" type="button" data-go="code">Use a different email</button></p>' +
          '</form>' +
        '</div>' +
        '<div class="rc-pane" id="rc-pane-wallet" role="tabpanel" aria-labelledby="rc-tab-wallet" hidden>' +
          '<p class="rc-what">Your RougeChain wallet signs a one-time message that proves it\'s yours. Nothing goes on chain and no funds can move.</p>' +
          '<button class="rc-go" type="button" data-act="wallet">Sign in with RougeChain wallet</button>' +
          '<p class="rc-alt">First time? Signing in makes your store account.</p>' +
        '</div>' +
      '</div>' +
      '<div class="rc-acct-body" data-view="in" hidden>' +
        '<dl class="rc-ids">' +
          '<div><dt>Email</dt><dd data-show="email"></dd></div>' +
          '<div data-row="password"><dt>Password</dt><dd data-show="password"></dd></div>' +
          '<div><dt>RougeChain wallet</dt><dd data-show="wallet"></dd></div>' +
        '</dl>' +
        '<form class="rc-form rc-sub" data-sub="add-email" hidden>' +
          '<label for="rc-l-email">Email to add</label><input id="rc-l-email" type="email" required autocomplete="email" placeholder="you@example.com">' +
          '<button class="rc-go" type="submit">Email me a code</button>' +
        '</form>' +
        '<form class="rc-form rc-sub" data-sub="add-email-check" hidden>' +
          '<p class="rc-what">We sent a 6-digit code to <b data-sent-to></b>.</p>' +
          '<label for="rc-l-code">Code</label><input id="rc-l-code" ' + codeInput + '>' +
          '<button class="rc-go" type="submit">Add email</button>' +
        '</form>' +
        '<form class="rc-form rc-sub" data-sub="password" hidden>' + '<input type="email" autocomplete="username" data-username tabindex="-1" aria-hidden="true" style="display:none">' +
          '<label for="rc-p-cur" data-cur>Current password</label><input id="rc-p-cur" type="password" autocomplete="current-password" data-cur>' +
          '<label for="rc-p-code" data-reset>Code from the email</label><input id="rc-p-code" data-reset ' + codeInput.replace(" required", "") + '>' +
          '<label for="rc-p-new">New password</label><input id="rc-p-new" type="password" autocomplete="new-password" required minlength="10">' +
          '<p class="rc-hint">At least 10 characters.</p>' +
          '<button class="rc-go" type="submit">Save password</button>' +
          '<p class="rc-alt" data-cur><button class="rc-link" type="button" data-act="forgot">Forgot it? Email me a code</button></p>' +
        '</form>' +
        '<p class="rc-fine">Your wishlist and follows are saved to this account. Purchases you make while signed in are linked to it.</p>' +
        '<button class="rc-go rc-quiet" type="button" data-act="signout">Sign out</button>' +
      '</div>' +
      '<p class="rc-msg" role="status" aria-live="polite"></p>' +
      '<p class="rc-hint" data-wallet-help hidden></p>' +
    '</div>';
  RC.panel.mount(panel);

  function $(sel) { return panel.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(panel.querySelectorAll(sel)); }
  var msg = $(".rc-msg"), help = $("[data-wallet-help]");

  // ---- talking to /api
  function api(path, body) {
    var opts = { credentials: "same-origin", headers: {} };
    if (body !== undefined) { opts.method = "POST"; opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch("/api" + path, opts).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (r.ok && d) return d;
        var e = new Error((d && d.error) || "Something went wrong. Try again in a minute.");
        e.status = r.status;
        if (r.status === 401 && account && path.indexOf("/auth/") !== 0) setAccount(null);
        throw e;
      });
    });
  }

  function say(text, kind) { msg.textContent = text || ""; msg.className = "rc-msg" + (kind ? " rc-" + kind : ""); }
  function fail(e) { say(e && e.message ? e.message : String(e), "err"); }
  function busy(on) { $$("button:not(.rc-x), input").forEach(function (el) { el.disabled = on; }); }
  function run(promise) { busy(true); return promise.catch(fail).then(function () { busy(false); }); }

  // ---- signed out: tabs and the email steps
  function tab(name) {
    ["email", "wallet"].forEach(function (t) {
      var b = $("#rc-tab-" + t), on = t === name;
      b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      $("#rc-pane-" + t).hidden = !on;
    });
    say(""); help.hidden = true;
  }
  $$("[role=tab]").forEach(function (b, i, all) {
    b.addEventListener("click", function () { tab(b.id.slice(7)); });
    b.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var next = all[(i + 1) % all.length]; next.click(); next.focus();
    });
  });

  function step(name) {
    if (!emailOn) return;
    $$("[data-step]").forEach(function (f) { f.hidden = f.getAttribute("data-step") !== name; });
    var email = $("#rc-a-email").value || $("#rc-c-email").value;
    if (name === "password") $("#rc-a-email").value = email;
    if (name === "code") $("#rc-c-email").value = email;
  }
  $$("[data-go]").forEach(function (b) { b.addEventListener("click", function () { say(""); step(b.getAttribute("data-go")); }); });

  function sendCode(email, then) {
    say("Sending your code…");
    return api("/auth/email/code", { email: email }).then(function (d) {
      sentTo = d.email;
      $$("[data-sent-to]").forEach(function (b) { b.textContent = d.email; });
      var u = $("[data-step=check] [data-username]"); if (u) u.value = d.email;
      say("Code sent. Check your inbox, and your spam folder if it isn't there.");
      then();
    });
  }

  $("[data-step=password]").addEventListener("submit", function (e) {
    e.preventDefault();
    run(api("/auth/email/password", { email: $("#rc-a-email").value, password: $("#rc-a-pass").value }).then(signedIn));
  });
  $("[data-step=code]").addEventListener("submit", function (e) {
    e.preventDefault();
    run(sendCode($("#rc-c-email").value, function () { step("check"); $("#rc-code").focus(); }));
  });
  $("[data-step=check]").addEventListener("submit", function (e) {
    e.preventDefault();
    var body = { email: sentTo, code: $("#rc-code").value };
    if ($("#rc-new-pass").value) body.password = $("#rc-new-pass").value;
    run(api("/auth/email/verify", body).then(signedIn));
  });
  $("[data-act=resend]").addEventListener("click", function () { run(sendCode(sentTo, function () { $("#rc-code").focus(); })); });

  // ---- RougeChain wallet
  function walletProblem() {
    var p = window.rougechain;
    if (!p || !p.isRougeChain) {
      return 'No RougeChain wallet found in this browser. <a href="' + WALLET_URL + '" target="_blank" rel="noopener">Get the RougeChain Wallet extension</a> for Chrome, Edge or Brave, then reload this page.';
    }
    if (typeof p.signMessage !== "function") {
      return "Your RougeChain wallet needs an update to sign in (version 1.8 or later). Update it, then reload this page.";
    }
    return "";
  }
  function walletError(e) {
    var m = (e && e.message) || "";
    if (e && e.status) return m;
    if (/denied|rejected|declined/i.test(m)) return "You declined in your wallet. Nothing was signed.";
    if (/locked|not set up/i.test(m)) return "Unlock your RougeChain wallet, then try again.";
    if (/timed out/i.test(m)) return "Your wallet didn't answer in time. Try again.";
    return m || "Your wallet couldn't sign in. Try again.";
  }
  function walletFlow(intent) {
    var problem = walletProblem();
    help.hidden = !problem; help.innerHTML = problem;
    if (problem) { say(""); return; }
    var p = window.rougechain, challenge;
    say("Waiting for your wallet…");
    busy(true);
    Promise.resolve()
      .then(function () { return p.connect(); })
      .then(function (c) {
        if (!c || !c.publicKey) throw new Error("Your wallet didn't share its public key.");
        return api("/auth/wallet/challenge", { publicKey: c.publicKey, intent: intent });
      })
      .then(function (d) { challenge = d.message; say("Approve the sign-in in your wallet."); return p.signMessage({ message: challenge }); })
      .then(function (s) { return api("/auth/wallet/verify", { message: challenge, signature: s.signature, publicKey: s.publicKey }); })
      .then(function (d) { if (intent === "link") changed(d, "Wallet linked."); else signedIn(d); })
      .catch(function (e) { say(walletError(e), "err"); })
      .then(function () { busy(false); });
  }
  $("#rc-pane-wallet [data-act=wallet]").addEventListener("click", function () { walletFlow("signin"); });

  // ---- signed in: what the account has, and changing it
  function short(addr) { return addr.length > 22 ? addr.slice(0, 12) + "…" + addr.slice(-6) : addr; }
  function row(name, text, cls, actions) {
    var dd = $("[data-show=" + name + "]");
    dd.textContent = "";
    var s = document.createElement("span"); s.textContent = text; if (cls) s.className = cls; dd.appendChild(s);
    if (name === "wallet" && account.wallet) s.title = account.wallet.address;
    var box = document.createElement("span");
    actions.forEach(function (a, i) {
      if (i) box.appendChild(document.createTextNode(" · "));
      var b = document.createElement("button"); b.type = "button"; b.className = "rc-link"; b.textContent = a[0];
      b.addEventListener("click", a[1]); box.appendChild(b);
    });
    if (actions.length) dd.appendChild(box);
  }
  function sub(name) {
    $$("[data-sub]").forEach(function (f) { f.hidden = f.getAttribute("data-sub") !== name; });
    var f = name && $("[data-sub=" + name + "]");
    if (f) { f.reset(); var first = f.querySelector("input:not([hidden])"); if (first) first.focus(); }
  }
  function paintAccount() {
    var a = account;
    row("email", a.email || "None yet", a.email ? "" : "rc-none",
      a.email ? (a.wallet ? [["Remove", function () { unlink("email"); }]] : []) : emailOn ? [["Add email", function () { say(""); sub("add-email"); }]] : []);
    $("[data-row=password]").hidden = !a.email;
    row("password", a.hasPassword ? "Set" : "None (you sign in with email codes)", a.hasPassword ? "" : "rc-none",
      [[a.hasPassword ? "Change" : "Set a password", function () { say(""); passwordForm(); }]]);
    row("wallet", a.wallet ? short(a.wallet.address) : "None yet", a.wallet ? "rc-addr" : "rc-none",
      a.wallet ? (a.email ? [["Remove", function () { unlink("wallet"); }]] : []) : [["Link wallet", function () { say(""); sub(""); walletFlow("link"); }]]);
  }
  function passwordForm() {
    resetting = false;
    sub("password");
    paintPasswordForm();
  }
  function paintPasswordForm() {
    $("[data-sub=password] [data-username]").value = account.email || "";
    $$("[data-sub=password] [data-cur]").forEach(function (el) { el.hidden = !account.hasPassword || resetting; });
    $$("[data-sub=password] [data-reset]").forEach(function (el) { el.hidden = !resetting; });
    $("#rc-p-code").required = resetting;
    var first = $(resetting ? "#rc-p-code" : account.hasPassword ? "#rc-p-cur" : "#rc-p-new"); first.focus();
  }

  $("[data-sub=add-email]").addEventListener("submit", function (e) {
    e.preventDefault();
    run(sendCode($("#rc-l-email").value, function () { sub("add-email-check"); }));
  });
  $("[data-sub=add-email-check]").addEventListener("submit", function (e) {
    e.preventDefault();
    run(api("/auth/email/verify", { email: sentTo, code: $("#rc-l-code").value, intent: "link" }).then(function (d) { changed(d, "Email added."); }));
  });
  $("[data-act=forgot]").addEventListener("click", function () {
    run(sendCode(account.email, function () { resetting = true; paintPasswordForm(); }));
  });
  $("[data-sub=password]").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("#rc-p-new").value;
    var done = function (d) { if (resetting) setAccount(d.account); changed(d, "Password saved."); };
    run(resetting
      ? api("/auth/email/verify", { email: account.email, code: $("#rc-p-code").value, password: pw }).then(done)
      : api("/account/password", { current: $("#rc-p-cur").value, password: pw }).then(done));
  });

  function unlink(method) {
    var what = method === "email" ? "Remove " + account.email + " from your account? You'll sign in with your wallet only."
      : "Remove this wallet from your account? You'll sign in with your email only.";
    if (!window.confirm(what)) return;
    run(api("/account/unlink", { method: method }).then(function (d) { changed(d, method === "email" ? "Email removed." : "Wallet removed."); }));
  }
  $("[data-act=signout]").addEventListener("click", function () {
    run(api("/auth/signout", {}).then(function () {
      setAccount(null);
      RC.setLists({ wishlist: [], follows: [] });
      say("You're signed out.");
    }));
  });

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
    paint();
  }
  function signedIn(d) {
    $$("[data-step] input").forEach(function (i) { i.value = ""; });
    step("password");
    setAccount(d.account, true);
    say("You're signed in.", "ok");
  }
  function changed(d, text) { account = d.account; RC.account = d.account; sub(""); help.hidden = true; paint(); say(text, "ok"); }
  function paint() {
    top.textContent = account ? "Account" : "Sign in";
    $("#rc-acct-h").textContent = account ? "Your account" : "Sign in";
    $("[data-view=out]").hidden = !!account;
    $("[data-view=in]").hidden = !account;
    if (account) paintAccount(); else sub("");
  }

  var saveTimer = null;
  function saveLists() {
    if (!account) return;
    api("/account/lists", RC.lists()).then(function (d) { account = d.account; RC.account = d.account; }).catch(function () {});
  }
  document.addEventListener("rc:lists", function () { clearTimeout(saveTimer); saveTimer = setTimeout(saveLists, 500); });

  top.addEventListener("click", function (e) { say(""); help.hidden = true; RC.panel.open(panel, e.currentTarget); });

  api("/account").then(function (d) {
    if (!d.methods || !d.methods.email) {
      emailOn = false;
      $("[data-email-off]").hidden = false;
      $$("[data-step]").forEach(function (f) { f.remove(); });
      tab("wallet");
    }
    setAccount(d.account, false);
    top.hidden = false;
  }).catch(function () { /* no accounts API here: leave sign-in out */ });
})();
