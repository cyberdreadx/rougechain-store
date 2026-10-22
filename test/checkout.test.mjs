import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/store.js", import.meta.url), "utf8");
const paidProject = "https://cyberdreadx.itch.io/paid-project-fixture";
const demoProject = "https://cyberdreadx.itch.io/gltch-runner-demo-v01";

function page(checkout, account = null) {
  class Element {
    constructor() {
      this.nodes = new Map(); this.hidden = true; this.disabled = false; this.textContent = "";
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    querySelector(selector) {
      if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
      return this.nodes.get(selector);
    }
    querySelectorAll() { return []; }
    addEventListener(event, callback) { this[event] = callback; }
    appendChild() {}
    focus() {}
    setAttribute() {}
  }
  const made = [], navigations = [], storage = new Map([["rc-cart", '["gltch-runner"]']]);
  const store = { checkout: { "gltch-runner": checkout }, downloads: { "gltch-runner-demo": { url: demoProject } } };
  const location = { set href(value) { navigations.push(value); } };
  const window = { STORE: store, location };
  const document = {
    head: new Element(), body: new Element(), documentElement: new Element(),
    createElement() { const e = new Element(); made.push(e); return e; },
    querySelectorAll() { return []; }, getElementById() { return null; }, addEventListener() {},
  };
  vm.runInNewContext(source, {
    window, document, URL, setTimeout, clearTimeout,
    localStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); } },
  });
  window.RC.account = account;
  window.RC.openCart();
  const cart = made[1].querySelector(".rc-cart");
  return {
    store, window, navigations, pay: cart.querySelector(".rc-pay"), note: cart.querySelector(".rc-note"),
    refresh() { window.RC.openCart(); }, click() { cart.querySelector(".rc-pay").click(); },
  };
}

test("paid itch.io checkout uses the project page without forwarding store identity", () => {
  const p = page({ provider: "itch.io", published: true, url: paidProject }, { id: "private-account-id", email: "private@example.test" });
  assert.equal(p.window.RC.mode("gltch-runner"), "buy");
  assert.equal(p.pay.disabled, false);
  assert.equal(p.pay.textContent, "Continue on itch.io");
  assert.equal(p.note.textContent, "You pay and download on itch.io. Your purchase is managed there.");
  assert.doesNotMatch(p.note.textContent, /store account|library|Stripe/);
  assert.deepEqual(p.navigations, []);
  p.click();
  assert.deepEqual(p.navigations, [paidProject]);
});

test("unpublished or malformed checkout cannot navigate even through forced activation", () => {
  const badUrls = [
    "", "javascript:alert(1)", "http://cyberdreadx.itch.io/paid-game", "/paid-game",
    "https://example.com/paid-game", "https://cyberdreadx.itch.io.example.com/paid-game",
    "https://itch.io/paid-game", "https://cyberdreadx.itch.io/", "https://user:secret@cyberdreadx.itch.io/paid-game",
    "https://cyberdreadx.itch.io:8443/paid-game", "https://cyberdreadx.itch.io/paid-game/download/key",
    "https://cyberdreadx.itch.io/paid-game?key=private", "https://cyberdreadx.itch.io/paid-game#download",
    "https://cyberdreadx.itch.io/build.zip", demoProject, `${demoProject}/`,
  ];
  for (const config of [undefined, "", {}, { provider: "itch.io", url: paidProject },
    { provider: "itch.io", published: false, url: paidProject },
    { provider: "unknown", published: true, url: paidProject },
    paidProject, // A bare string remains Stripe-only, never an inferred third-party provider.
    ...badUrls.map(url => ({ provider: "itch.io", published: true, url }))]) {
    const p = page(config);
    assert.equal(p.window.RC.mode("gltch-runner"), "preview", JSON.stringify(config));
    assert.equal(p.pay.disabled, true, JSON.stringify(config));
    p.click();
    assert.deepEqual(p.navigations, [], JSON.stringify(config));
  }
});

test("activation rechecks provider and publication status instead of trusting an old enabled button", () => {
  const config = { provider: "itch.io", published: true, url: paidProject };
  const p = page(config);
  config.published = false;
  p.click();
  assert.deepEqual(p.navigations, []);
  config.published = true; config.url = "https://foreign.example/paid-game";
  p.click();
  assert.deepEqual(p.navigations, []);
});

test("legacy Stripe links preserve checkout routing and only Stripe receives account hints", () => {
  const link = "https://buy.stripe.com/test_fixture?locale=en";
  const guest = page(link);
  assert.equal(guest.pay.disabled, false);
  guest.click();
  assert.deepEqual(guest.navigations, [link]);
  const signedIn = page(link, { id: "buyer123", email: "buyer@example.test" });
  assert.equal(signedIn.pay.textContent, "Continue to payment");
  assert.equal(signedIn.note.textContent, "You pay on Stripe's secure checkout page.");
  signedIn.click();
  const url = new URL(signedIn.navigations[0]);
  assert.equal(url.origin, "https://buy.stripe.com");
  assert.equal(url.searchParams.get("locale"), "en");
  assert.equal(url.searchParams.get("client_reference_id"), "buyer123");
  assert.equal(url.searchParams.get("prefilled_email"), "buyer@example.test");
  for (const value of ["javascript:alert(1)", "https://buy.stripe.com.evil.test/test_fixture", "http://buy.stripe.com/test_fixture"]) {
    const p = page(value); p.click();
    assert.equal(p.pay.disabled, true);
    assert.deepEqual(p.navigations, []);
  }
});

test("cart repaint changes provider copy and explicit Stripe objects use the release gate", () => {
  const p = page({ provider: "itch.io", published: true, url: paidProject });
  p.store.checkout["gltch-runner"] = { provider: "stripe", published: true, url: "https://buy.stripe.com/test_fixture" };
  p.refresh();
  assert.equal(p.pay.textContent, "Continue to payment");
  assert.equal(p.note.textContent, "You pay on Stripe's secure checkout page.");
  p.store.checkout["gltch-runner"].published = false;
  p.refresh();
  assert.equal(p.pay.disabled, true);
});

test("checked-in configuration routes Early Access to its public paid project without store identity", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(new URL("../public/store-config.js", import.meta.url), "utf8"), sandbox);
  const configured = sandbox.window.STORE.checkout["gltch-runner"];
  assert.equal(configured.provider, "itch.io");
  assert.equal(configured.url, "https://cyberdreadx.itch.io/gltch-runner-early-access");
  assert.equal(configured.published, true);
  const p = page(configured, { id: "private-account-id", email: "private@example.test" });
  assert.equal(p.window.RC.mode("gltch-runner"), "buy");
  assert.equal(p.pay.disabled, false);
  p.click();
  assert.deepEqual(p.navigations, ["https://cyberdreadx.itch.io/gltch-runner-early-access"]);
  const destination = new URL(p.navigations[0]);
  assert.equal(destination.search, "");
  assert.equal(destination.hash, "");
});
