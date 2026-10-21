// Free demo delivery is separate from paid checkout. Unpublished or invalid
// configuration never turns a placeholder into a working download button.
(function () {
  var S = window.STORE || {};
  var t = window.I18N ? window.I18N.t : function (s, vars) {
    return s.replace(/\{(\w+)\}/g, function (match, key) { return vars && key in vars ? vars[key] : match; });
  };
  function demoUrl(config) {
    if (!config || config.published !== true || typeof config.url !== "string") return "";
    try {
      var url = new URL(config.url);
      if (url.protocol !== "https:" || url.username || url.password) return "";
      return url.href;
    } catch (_) { return ""; }
  }
  var config = S.downloads && S.downloads["gltch-runner-demo"];
  var url = demoUrl(config);
  document.querySelectorAll("[data-demo-download]").forEach(function (button) {
    button.disabled = !url;
    button.setAttribute("aria-disabled", String(!url));
    button.textContent = t("Download free demo");
    button.addEventListener("click", function (event) {
      event.preventDefault();
      // Re-check at activation as well: stale/offline controls cannot bypass the gate.
      var current = S.downloads && S.downloads["gltch-runner-demo"];
      var destination = demoUrl(current);
      if (destination) window.location.assign(destination);
    });
  });
  document.querySelectorAll("[data-demo-status]").forEach(function (node) {
    if (!url) { node.textContent = t("The demo download is being prepared."); return; }
    var version = typeof config.version === "string" ? config.version : "";
    var bytes = Number(config.bytes);
    node.textContent = version && Number.isFinite(bytes) && bytes > 0
      ? t("Windows x64 · {version} · {size} GB", { version: version, size: (bytes / 1000000000).toFixed(2) })
      : t("Windows x64 · ZIP download");
  });
}());
