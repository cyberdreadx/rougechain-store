/* No animation loop, scroll handler, fake progress, or delayed content.
   Observe only the storefront's existing panels, and stop while not visible. */
(function () {
  "use strict";
  if (window.RCStoreMotion) return;
  var root = document.documentElement;
  var preference = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var panels = Array.from(document.querySelectorAll(".featured, .hero, .demo, .dept, .card:not(.blank), .feature, .update, .soon-shelf, .welcome, .title-row"));
  var entered = new Set();
  var observer = null;
  var suspended = false;
  var destroyed = false;

  function active() {
    return !destroyed && !suspended && !document.hidden && !(preference && preference.matches);
  }
  function finishEntrance(event) {
    if (event.animationName === "rc-arrive") event.target.classList.remove("rc-motion-enter");
  }
  function sync() {
    if (destroyed) return;
    var running = active();
    root.classList.toggle("rc-motion-ready", running);
    root.classList.toggle("rc-motion-paused", !running);
    if (observer) observer.disconnect();
    panels.forEach(function (panel) {
      panel.classList.remove("rc-motion-visible");
      if (!running) panel.classList.remove("rc-motion-enter");
      if (running && observer) observer.observe(panel);
    });
  }
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(function (entries) {
      if (!active()) return;
      entries.forEach(function (entry) {
        entry.target.classList.toggle("rc-motion-visible", entry.isIntersecting);
        if (entry.isIntersecting && !entered.has(entry.target)) {
          entered.add(entry.target);
          entry.target.classList.add("rc-motion-enter");
        }
      });
    }, { threshold: 0.04 });
  }
  function suspend() { suspended = true; sync(); }
  function resume() { suspended = false; sync(); }
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("animationend", finishEntrance);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", resume);
  if (preference) {
    if (preference.addEventListener) preference.addEventListener("change", sync);
    else if (preference.addListener) preference.addListener(sync);
  }
  window.RCStoreMotion = {
    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      if (observer) observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("animationend", finishEntrance);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("pageshow", resume);
      if (preference) {
        if (preference.removeEventListener) preference.removeEventListener("change", sync);
        else if (preference.removeListener) preference.removeListener(sync);
      }
      panels.forEach(function (panel) { panel.classList.remove("rc-motion-visible", "rc-motion-enter"); });
      entered.clear();
      root.classList.remove("rc-motion-ready", "rc-motion-paused");
      delete window.RCStoreMotion;
    }
  };
  sync();
})();
