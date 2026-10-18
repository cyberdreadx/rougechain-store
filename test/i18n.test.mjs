// Every English text the store shows has a Spanish and a Russian line in public/i18n.js:
// the pages' text and attributes, what the scripts write, and what the accounts server says.
// When this fails it lists the missing English; add each one to T in public/i18n.js.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { codeEmail } from "../netlify/lib/email.mjs";

const PUB = new URL("../public/", import.meta.url);
const read = (f) => readFileSync(new URL(f, PUB), "utf8");

// Names and things that stay as they are in every language.
const KEEP = new Set([
  "ROUGECHAIN", "STORE", "GLTCH RUNNER", "Gltch Runner", "RougeChain Store", "RougeChain Technologies",
  "© 2026 RougeChain Technologies", "Gltch Runner · RougeChain Store", "FPS", "WINDOWS", "MONOEDGE",
  "Kestrel Garden", "Dead Signal", "Neon Row", "Helix Yard", "Sublevel 9", "Apex Terraces", "Neontown",
  "Byte Street", "Skyline Reach", "Fire Range", "Gun Game", "Godot 4.7", "NVIDIA GeForce RTX 4090, 24 GB",
  "Qwalla Browser", "Oct 16, 2026", // dates are formatted for the reader by i18n.js
  "notify", "Get notified", // "notify" is a mode name in a condition
]);

function dictionary() {
  const sandbox = {
    window: {},
    location: { search: "", pathname: "/", hash: "" },
    navigator: { languages: ["en"] },
    history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout() {},
    document: {
      readyState: "complete", title: "", head: { appendChild() {} },
      documentElement: { classList: { add() {}, remove() {} } },
      querySelectorAll: () => [], querySelector: () => null, addEventListener() {},
    },
  };
  vm.runInNewContext(read("i18n.js"), sandbox);
  return sandbox.window.I18N.dict;
}
const T = dictionary();

const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();
const wordy = (s) => /[A-Za-z]/.test(s) && !/^[\d\s.,·$%+\-–—:/()]+$/.test(s);

function htmlStrings(file) {
  const src = read(file);
  const out = new Set();
  const title = /<title>([^<]*)<\/title>/.exec(src);
  if (title) out.add(norm(title[1]));
  const desc = /<meta name="description" content="([^"]*)"/.exec(src);
  if (desc) out.add(norm(desc[1]));
  const body = src.slice(src.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  for (const m of body.matchAll(/>([^<]+)</g)) out.add(norm(m[1]));
  for (const m of body.matchAll(/\s(?:alt|aria-label|placeholder|title)="([^"]+)"/g)) out.add(norm(m[1]));
  return [...out].filter(Boolean);
}

/** String literals passed to t()/tr() (one level of nested parentheses), and to account.js's helpers that translate. */
function scriptStrings(src) {
  const out = new Set();
  const lit = /"((?:[^"\\]|\\.)*)"/g;
  for (const m of src.matchAll(/\b(?:t|tr)\(((?:[^()"]|"(?:[^"\\]|\\.)*"|\([^()]*\))*)\)/g)) {
    for (const s of m[1].matchAll(lit)) out.add(s[1]);
  }
  const helpers = [
    /\bnote\([^,]+,\s*"((?:[^"\\]|\\.)*)"/g,
    /\bbusy\([^,]+,\s*true,\s*"((?:[^"\\]|\\.)*)"/g,
    /\btitle:\s*(?:has \? )?"((?:[^"\\]|\\.)*)"/g,
    /\btitle:\s*has \? "[^"]*" : "((?:[^"\\]|\\.)*)"/g,
    /\bchanged\(d,\s*(?:method === "email" \? )?"((?:[^"\\]|\\.)*)"/g,
    /\bchanged\(d,\s*method === "email" \? "[^"]*" : "((?:[^"\\]|\\.)*)"/g,
    /\blabel\("((?:[^"\\]|\\.)*)"\)/g,
    /\bnew Error\("((?:[^"\\]|\\.)*)"\)/g,
    /\breturn "((?:[^"\\]|\\.)*)";/g,
    /\brow\("\w+",\s*"((?:[^"\\]|\\.)*)"/g,
  ];
  for (const re of helpers) for (const m of src.matchAll(re)) out.add(m[1]);
  for (const m of src.matchAll(/\? "(Add email|Set|Add wallet)" : "(None|Not set)"/g)) { out.add(m[1]); out.add(m[2]); }
  // markup and attribute values written alongside the text are not text
  return [...out].map((s) => s.replace(/\\"/g, '"').replace(/\\'/g, "'")).filter((s) => !/[<>]|' \+|\+ '/.test(s) && !/^[a-z_]+$/.test(s));
}

function serverStrings() {
  const out = new Set();
  for (const f of ["accounts.mjs", "http.mjs", "email.mjs"]) {
    const src = readFileSync(new URL(`../netlify/lib/${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/new HttpError\(\d+,\s*"((?:[^"\\]|\\.)*)"/g)) out.add(m[1]);
    for (const m of src.matchAll(/\blimit\([^;]*?,\s*"((?:[^"\\]|\\.)*)"\);/g)) out.add(m[1]);
    for (const m of src.matchAll(/message = "((?:[^"\\]|\\.)*)"/g)) out.add(m[1]);
    const we = /const WALLET_ERRORS = \{([\s\S]*?)\};/.exec(src);
    if (we) for (const m of we[1].matchAll(/:\s*"((?:[^"\\]|\\.)*)"/g)) out.add(m[1]);
  }
  return [...out];
}

function missing(strings) {
  return [...new Set(strings)].filter((s) => wordy(s) && !KEEP.has(s) && !T[s]);
}

test("every key has a Spanish and a Russian line with the same {slots}", () => {
  const bad = [];
  for (const [en, tr] of Object.entries(T)) {
    if (!Array.isArray(tr) || tr.length !== 2 || tr.some((s) => typeof s !== "string" || !s.trim())) { bad.push(`${en}: needs [es, ru]`); continue; }
    const slots = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const s of tr) if (slots(s) !== slots(en)) bad.push(`${en}: {slots} differ in "${s}"`);
    if (en !== en.replace(/\s+/g, " ").trim()) bad.push(`${en}: key has extra whitespace`);
  }
  assert.deepEqual(bad, []);
});

test("the pages' text is all translated", () => {
  const pages = readdirSync(PUB).filter((f) => f.endsWith(".html"));
  assert.ok(pages.length >= 4);
  const gaps = pages.flatMap((f) => missing(htmlStrings(f)).map((s) => `${f}: ${s}`));
  assert.deepEqual(gaps, []);
});

test("what the scripts write is all translated", () => {
  const sources = ["store.js", "account.js", "app.js"].map(read);
  for (const f of ["index.html", "gltch-runner.html"]) sources.push(...[...read(f).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]));
  const found = sources.flatMap(scriptStrings);
  assert.ok(found.length > 80, `found only ${found.length} strings: the extractor is broken`);
  assert.deepEqual(missing(found), []);
  // the product kind and the game page's generated text
  assert.ok(T["Early Access · Windows"]);
  for (const s of ["Pistol", "SMG", "Assault rifle", "Shotgun", "Sniper rifle", "Rocket launcher", "EM sniper rifle", "Plasma rifle", "Story", "Arena", "Day Two"]) assert.ok(T[s], s);
});

test("what the accounts server says is all translated", () => {
  const found = serverStrings();
  assert.ok(found.length > 30, `found only ${found.length} messages: the extractor is broken`);
  assert.deepEqual(missing(found), []);
});

test("the sign-in code email comes in the reader's language", () => {
  assert.match(codeEmail("123456", "es").subject, /^123456 es tu código/);
  assert.match(codeEmail("123456", "ru").text, /Ваш код для входа в RougeChain Store: 123456/);
  assert.match(codeEmail("123456", "ru").html, /<html lang="ru">/);
  assert.match(codeEmail("123456", "xx").subject, /^123456 is your RougeChain Store code$/);
});
