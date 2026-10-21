import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/downloads.js", import.meta.url), "utf8");
function page(config) {
  const navigations = [];
  const button = { attributes: {}, disabled: false, textContent: "", setAttribute(k, v) { this.attributes[k] = v; }, addEventListener(type, handler) { this[type] = handler; } };
  const status = { textContent: "" };
  const store = { downloads: { "gltch-runner-demo": config } };
  const context = {
    URL,
    window: { STORE: store, location: { assign(url) { navigations.push(url); } } },
    document: { querySelectorAll(selector) { return selector === "[data-demo-download]" ? [button] : [status]; } },
  };
  vm.runInNewContext(source, context);
  return { button, status, navigations, store, click() { button.click({ preventDefault() {} }); } };
}

test("unpublished, absent and invalid download destinations cannot navigate", () => {
  for (const config of [undefined, {}, { published: false, url: "https://cdn.example/demo.zip" },
    ...["", "javascript:alert(1)", "data:text/html,test", "http://cdn.example/demo.zip", "file:///C:/demo.zip", "https://user:secret@cdn.example/demo.zip", "/downloads/demo.zip"].map(url => ({ published: true, url }))]) {
    const p = page(config);
    assert.equal(p.button.disabled, true);
    assert.equal(p.button.attributes["aria-disabled"], "true");
    p.click(); // Even a forced activation cannot bypass an unavailable configuration.
    assert.deepEqual(p.navigations, []);
    assert.equal(p.status.textContent, "The demo download is being prepared.");
  }
});

test("published demo supplies its real version/size and navigates only after activation", () => {
  const config = { published: true, url: "https://cdn.example/demo4.zip", version: "0.2.0-demo.4", bytes: 3853683482 };
  const p = page(config);
  assert.equal(p.button.disabled, false);
  assert.equal(p.button.attributes["aria-disabled"], "false");
  assert.equal(p.button.textContent, "Download free demo");
  assert.equal(p.status.textContent, "Windows x64 · 0.2.0-demo.4 · 3.85 GB");
  assert.deepEqual(p.navigations, []);
  p.click();
  assert.deepEqual(p.navigations, [config.url]);
  config.published = false;
  p.click();
  assert.equal(p.navigations.length, 1, "An old enabled control cannot download an unpublished build");
});

test("service worker leaves game archives and entitlement downloads to the network", () => {
  const handlers = {};
  const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  vm.runInNewContext(worker, { URL, self: { location: { origin: "https://store.rougechain.io" }, addEventListener(name, fn) { handlers[name] = fn; } } });
  for (const path of ["/game.zip", "/game.exe", "/game.pck", "/downloads/demo", "/downloads/paid?token=fixture", "/api/download"]) {
    let intercepted = false;
    handlers.fetch({ request: { method: "GET", url: "https://store.rougechain.io" + path }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, path);
  }
});
