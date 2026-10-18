// RougeChain Store in English, Spanish, Russian, Japanese, Chinese (Simplified) and Korean.
// Load it in <head>, before the other scripts.
//
//   - The language: ?lang=en|es|ru|ja|zh|ko (then remembered), else the one chosen before, else
//     the device's language, else English. <html lang> follows it (zh-CN for Chinese), which also
//     makes phones pick the right Chinese, Japanese or Korean glyphs from their own fonts.
//   - The words are in public/i18n/<lang>.js, one file per language: "English": "translation".
//     Only the reader's file is downloaded, here in <head>, before the page's scripts run.
//   - Once the page is parsed, every text, alt, aria-label, placeholder and title whose English is
//     in the file is swapped for the translation, and so are the <title> and description. Anything
//     not in the file stays English. The page stays hidden for that moment, so nobody sees it change.
//   - Scripts translate what they write with I18N.t("English text", { name: value }).
//   - [data-langs] (the footers) gets the links to every language.
//
// Adding English text anywhere? Add its line to every file in public/i18n; `npm test` lists any
// text that has none.
(function () {
  var LANGS = { en: "English", es: "Español", ru: "Русский", ja: "日本語", zh: "中文", ko: "한국어" };
  var HTML_LANG = { zh: "zh-CN" };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var codes = Object.keys(LANGS).join("|");

  function choose() {
    var q = new RegExp("[?&]lang=(" + codes + ")(?:&|$)").exec(location.search);
    if (q) {
      set("rc-lang", q[1]);
      try {
        var rest = location.search.replace(new RegExp("([?&])lang=(" + codes + ")(&|$)"), function (m, a, l, b) { return b ? a : ""; });
        history.replaceState(null, "", location.pathname + (rest === "?" ? "" : rest) + location.hash);
      } catch (e) {}
      return q[1];
    }
    var saved = get("rc-lang");
    if (saved && LANGS[saved]) return saved;
    var prefs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < prefs.length; i++) {
      var l = String(prefs[i]).slice(0, 2).toLowerCase();
      if (LANGS[l]) return l;
    }
    return "en";
  }
  var lang = choose();
  var root = document.documentElement;
  root.lang = HTML_LANG[lang] || lang;
  if (lang !== "en") {
    var hide = document.createElement("style");
    hide.textContent = "html.i18n-wait body{visibility:hidden}";
    document.head.appendChild(hide);
    root.classList.add("i18n-wait");
    // the words, before the page's own scripts (this runs in <head>, while the page is being read)
    var base = (document.currentScript && document.currentScript.src || "i18n.js").replace(/i18n\.js(\?.*)?$/, "");
    document.write('<script src="' + base + "i18n/" + lang + '.js"><\/script>');
  }
  // Chinese and Japanese don't put spaces between words, so none are kept around their text.
  var tight = lang === "ja" || lang === "zh";

  function words() { return (lang !== "en" && window.I18N_WORDS) || {}; }
  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function fill(s, vars) {
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m; }) : s;
  }
  /** The translation of an English string (with {name} slots filled from vars), or the English. */
  function t(s, vars) {
    var hit = words()[norm(s)];
    return fill(typeof hit === "string" ? hit : s, vars);
  }

  var ATTRS = ["alt", "aria-label", "placeholder", "title"];
  /** Translates the text and attributes under `node` that the language file knows. */
  function apply(node) {
    var W = words();
    if (lang === "en" || !node) return;
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), texts = [];
    for (var n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
    texts.forEach(function (n) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest("[translate=no]"))) return;
      var raw = n.nodeValue, hit = W[norm(raw)];
      if (typeof hit !== "string") return;
      n.nodeValue = tight ? hit : raw.match(/^\s*/)[0] + hit + raw.match(/\s*$/)[0];
    });
    ATTRS.forEach(function (a) {
      (node.querySelectorAll ? node.querySelectorAll("[" + a + "]") : []).forEach(function (el) {
        var hit = W[norm(el.getAttribute(a))];
        if (typeof hit === "string") el.setAttribute(a, hit);
      });
    });
    // dates in the reader's language
    (node.querySelectorAll ? node.querySelectorAll("time[datetime]") : []).forEach(function (el) {
      try {
        el.textContent = new Intl.DateTimeFormat(root.lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(el.getAttribute("datetime") + "T12:00:00"));
      } catch (e) {}
    });
  }

  function reveal() { root.classList.remove("i18n-wait"); }
  function ready() {
    if (lang !== "en") {
      apply(document.body);
      var W = words();
      if (typeof W[norm(document.title)] === "string") document.title = W[norm(document.title)];
      var d = document.querySelector('meta[name="description"]');
      if (d && typeof W[norm(d.content)] === "string") d.content = W[norm(d.content)];
    }
    // the language links
    document.querySelectorAll("[data-langs]").forEach(function (box) {
      box.setAttribute("translate", "no");
      box.innerHTML = Object.keys(LANGS).map(function (l) {
        var hl = HTML_LANG[l] || l;
        return '<a href="?lang=' + l + '" hreflang="' + hl + '" lang="' + hl + '"' + (l === lang ? ' aria-current="true"' : "") + ">" + LANGS[l] + "</a>";
      }).join(" · ");
    });
    reveal();
  }
  if (lang !== "en") setTimeout(reveal, 2500); // never leave the page hidden
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();

  window.I18N = {
    lang: lang, langs: LANGS, t: t, apply: apply,
    get dict() { return words(); }
  };
})();
