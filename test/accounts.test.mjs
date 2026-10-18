// The accounts API end to end, in memory: email codes, passwords, Sign-In with RougeChain
// (real ML-DSA-65 keys and signatures from @rougechain/sdk), linking, lists and the guards.
// Run with `npm test`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Wallet, signMessage } from "@rougechain/sdk";
import { handle, settings } from "../netlify/lib/accounts.mjs";
import { memoryStore } from "../netlify/lib/store.mjs";

const ORIGIN = "https://store.rougechain.io";

/** A browser talking to the API: it keeps the session cookie and collects the emails sent. */
function browser({ store = memoryStore(), clock = { t: Date.parse("2026-10-17T12:00:00Z") }, deploy = "production", env = {} } = {}) {
  const mails = [];
  const deps = { store, cfg: settings(env), now: () => clock.t, mail: async (m) => mails.push(m) };
  const b = {
    cookie: null,
    mails,
    store,
    clock,
    lastCode: () => mails.at(-1)?.code,
    async call(method, path, body, { origin = ORIGIN, url = ORIGIN, ip = "203.0.113.7", type = "application/json" } = {}) {
      const headers = new Headers();
      if (method === "POST") {
        if (type) headers.set("content-type", type);
        if (origin) headers.set("origin", origin);
      }
      if (b.cookie) headers.set("cookie", `__Host-rc_session=${b.cookie}`);
      const req = new Request(`${url}/api${path}`, {
        method,
        headers,
        body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body ?? {})) : undefined,
      });
      const res = await handle(req, { ip, deploy: { context: deploy } }, deps);
      const set = res.headers.get("set-cookie");
      if (set) b.cookie = /__Host-rc_session=([^;]*)/.exec(set)[1] || null;
      return { status: res.status, body: await res.json(), setCookie: set };
    },
    async emailSignIn(email, password) {
      assert.equal((await b.call("POST", "/auth/email/code", { email })).status, 200);
      return b.call("POST", "/auth/email/verify", { email, code: b.lastCode(), ...(password ? { password } : {}) });
    },
    async walletSignIn(wallet, intent) {
      const ch = await b.call("POST", "/auth/wallet/challenge", { publicKey: wallet.publicKey, intent });
      assert.equal(ch.status, 200, JSON.stringify(ch.body));
      const signature = signMessage(wallet.privateKey, ch.body.message);
      const res = await b.call("POST", "/auth/wallet/verify", { message: ch.body.message, signature, publicKey: wallet.publicKey });
      return { ...res, message: ch.body.message, signature };
    },
  };
  return b;
}

test("an emailed code makes an account and signs in", async () => {
  const b = browser();
  const me = await b.call("GET", "/account");
  assert.equal(me.body.account, null);

  const sent = await b.call("POST", "/auth/email/code", { email: "  Neo@Example.com " });
  assert.equal(sent.status, 200);
  assert.equal(b.mails.length, 1);
  assert.equal(b.mails[0].to, "neo@example.com");
  assert.match(b.mails[0].code, /^\d{6}$/);

  const ok = await b.call("POST", "/auth/email/verify", { email: "neo@example.com", code: b.lastCode() });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.account.email, "neo@example.com");
  assert.equal(ok.body.account.hasPassword, false);
  assert.match(ok.body.account.id, /^acc_[0-9a-f]{24}$/);
  assert.match(ok.setCookie, /^__Host-rc_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000$/);

  const again = await b.call("GET", "/account");
  assert.equal(again.body.account.id, ok.body.account.id);

  // the session token is stored only as a hash
  assert.ok(![...b.store.map.keys()].some((k) => k.includes(b.cookie)));
});

test("the code email goes out in the language the visitor reads the store in", async () => {
  const b = browser();
  await b.call("POST", "/auth/email/code", { email: "alma@example.com", lang: "es" });
  b.clock.t += 61_000;
  await b.call("POST", "/auth/email/code", { email: "alma@example.com", lang: "ru" });
  b.clock.t += 61_000;
  await b.call("POST", "/auth/email/code", { email: "alma@example.com", lang: "klingon" });
  for (const lang of ["ja", "zh", "ko"]) {
    b.clock.t += 61_000;
    await b.call("POST", "/auth/email/code", { email: "alma@example.com", lang });
  }
  assert.deepEqual(b.mails.map((m) => m.lang), ["es", "ru", "en", "ja", "zh", "ko"]);
});

test("a code works once, and the same email always reaches the same account", async () => {
  const b = browser();
  const first = await b.emailSignIn("trinity@example.com");
  const code = b.lastCode();
  const reuse = await b.call("POST", "/auth/email/verify", { email: "trinity@example.com", code });
  assert.equal(reuse.status, 400);

  b.clock.t += 61_000;
  const second = await b.emailSignIn("trinity@example.com");
  assert.equal(second.body.account.id, first.body.account.id);
});

test("five wrong guesses use the code up", async () => {
  const b = browser();
  await b.call("POST", "/auth/email/code", { email: "morpheus@example.com" });
  const right = b.lastCode();
  const wrong = right === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) {
    const r = await b.call("POST", "/auth/email/verify", { email: "morpheus@example.com", code: wrong });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /isn't right/);
  }
  const late = await b.call("POST", "/auth/email/verify", { email: "morpheus@example.com", code: right });
  assert.equal(late.status, 400);
  assert.match(late.body.error, /Too many wrong codes/);
});

test("codes expire after 10 minutes and can't be re-sent within a minute", async () => {
  const b = browser();
  await b.call("POST", "/auth/email/code", { email: "oracle@example.com" });
  const soon = await b.call("POST", "/auth/email/code", { email: "oracle@example.com" });
  assert.equal(soon.status, 429);
  assert.equal(soon.body.codeSent, true);
  b.clock.t += 10 * 60_000 + 1;
  const late = await b.call("POST", "/auth/email/verify", { email: "oracle@example.com", code: b.lastCode() });
  assert.equal(late.status, 400);
  assert.match(late.body.error, /expired/);
});

test("bad email addresses are refused before anything is sent", async () => {
  const b = browser();
  for (const email of ["", "nope", "a@b", "a b@example.com", "x@example.com\r\nBcc: y@example.com", 42]) {
    const r = await b.call("POST", "/auth/email/code", { email });
    assert.equal(r.status, 400, String(email));
  }
  assert.equal(b.mails.length, 0);
});

test("a password set with a code signs in; wrong ones and unknown emails get the same answer", async () => {
  const b = browser();
  const made = await b.emailSignIn("switch@example.com", "correct horse battery");
  assert.equal(made.status, 200, JSON.stringify(made.body));
  assert.equal(made.body.account.hasPassword, true);
  await b.call("POST", "/auth/signout", {});
  assert.equal((await b.call("GET", "/account")).body.account, null);

  const ok = await b.call("POST", "/auth/email/password", { email: "Switch@Example.com", password: "correct horse battery" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.account.id, made.body.account.id);

  const wrong = await b.call("POST", "/auth/email/password", { email: "switch@example.com", password: "wrong horse battery" });
  const nobody = await b.call("POST", "/auth/email/password", { email: "nobody@example.com", password: "wrong horse battery" });
  assert.equal(wrong.status, 401);
  assert.equal(nobody.status, 401);
  assert.equal(wrong.body.error, nobody.body.error);

  const short = await b.emailSignIn("apoc@example.com", "short");
  assert.equal(short.status, 400);
  assert.match(short.body.error, /10 characters/);
});

test("password logins are rate limited per email", async () => {
  const b = browser();
  let last;
  for (let i = 0; i < 11; i++) last = await b.call("POST", "/auth/email/password", { email: "dozer@example.com", password: `guess-number-${i}` }, { ip: `198.51.100.${i}` });
  assert.equal(last.status, 429);
});

test("changing a password needs the current one", async () => {
  const b = browser();
  await b.emailSignIn("tank@example.com", "first password here");
  const noCurrent = await b.call("POST", "/account/password", { password: "second password here" });
  assert.equal(noCurrent.status, 400);
  const ok = await b.call("POST", "/account/password", { current: "first password here", password: "second password here" });
  assert.equal(ok.status, 200);
  await b.call("POST", "/auth/signout", {});
  assert.equal((await b.call("POST", "/auth/email/password", { email: "tank@example.com", password: "first password here" })).status, 401);
  assert.equal((await b.call("POST", "/auth/email/password", { email: "tank@example.com", password: "second password here" })).status, 200);
});

test("a RougeChain wallet signs in with a Sign-In with RougeChain message", async () => {
  const b = browser();
  const wallet = Wallet.generate();
  const res = await b.walletSignIn(wallet);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.match(res.body.account.wallet.address, /^rouge1[a-z0-9]+$/);
  assert.equal(res.body.account.email, null);

  const lines = res.message.split("\n");
  assert.equal(lines[0], "store.rougechain.io wants you to sign in with your RougeChain account:");
  assert.equal(lines[1], res.body.account.wallet.address);
  assert.ok(lines.includes("URI: https://store.rougechain.io/"));
  assert.ok(lines.includes("Chain ID: rougechain-mainnet-1"));

  await b.call("POST", "/auth/signout", {});
  const again = await b.walletSignIn(wallet);
  assert.equal(again.body.account.id, res.body.account.id);
});

test("a signed wallet message can't be replayed, altered or signed by another key", async () => {
  const b = browser();
  const wallet = Wallet.generate();
  const first = await b.walletSignIn(wallet);
  assert.equal(first.status, 200);
  const replay = await b.call("POST", "/auth/wallet/verify", { message: first.message, signature: first.signature, publicKey: wallet.publicKey });
  assert.equal(replay.status, 401);

  const ch = await b.call("POST", "/auth/wallet/challenge", { publicKey: wallet.publicKey });
  const thief = Wallet.generate();
  const forged = await b.call("POST", "/auth/wallet/verify", { message: ch.body.message, signature: signMessage(thief.privateKey, ch.body.message), publicKey: thief.publicKey });
  assert.equal(forged.status, 401);

  const ch2 = await b.call("POST", "/auth/wallet/challenge", { publicKey: wallet.publicKey });
  const altered = ch2.body.message.replace("Sign in to the RougeChain Store.", "Sign in to the RougeChain Store!");
  const tampered = await b.call("POST", "/auth/wallet/verify", { message: altered, signature: signMessage(wallet.privateKey, ch2.body.message), publicKey: wallet.publicKey });
  assert.equal(tampered.status, 401);

  const late = await b.call("POST", "/auth/wallet/challenge", { publicKey: wallet.publicKey });
  b.clock.t += 10 * 60_000 + 1;
  const expired = await b.call("POST", "/auth/wallet/verify", { message: late.body.message, signature: signMessage(wallet.privateKey, late.body.message), publicKey: wallet.publicKey });
  assert.equal(expired.status, 401);
  assert.match(expired.body.error, /expired/);

  const bogus = await b.call("POST", "/auth/wallet/challenge", { publicKey: "abc" });
  assert.equal(bogus.status, 400);
});

test("one signed wallet message sent twice at once signs in only once", async () => {
  const store = memoryStore();
  const a = browser({ store });
  const b = browser({ store });
  const wallet = Wallet.generate();
  const ch = await a.call("POST", "/auth/wallet/challenge", { publicKey: wallet.publicKey });
  const body = { message: ch.body.message, signature: signMessage(wallet.privateKey, ch.body.message), publicKey: wallet.publicKey };
  const results = await Promise.all([a.call("POST", "/auth/wallet/verify", body), b.call("POST", "/auth/wallet/verify", body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
});

test("email and wallet link into one account, and each signs in to it", async () => {
  const b = browser();
  const wallet = Wallet.generate();
  const made = await b.emailSignIn("niobe@example.com");
  const linked = await b.walletSignIn(wallet, "link");
  assert.equal(linked.status, 200, JSON.stringify(linked.body));
  assert.equal(linked.body.account.id, made.body.account.id);
  assert.match(linked.message, /Link this wallet to your RougeChain Store account\./);

  await b.call("POST", "/auth/signout", {});
  const viaWallet = await b.walletSignIn(wallet);
  assert.equal(viaWallet.body.account.id, made.body.account.id);
  assert.equal(viaWallet.body.account.email, "niobe@example.com");

  // the other way round: a wallet account adds an email
  const c = browser({ store: b.store, clock: b.clock });
  const w2 = Wallet.generate();
  const walletFirst = await c.walletSignIn(w2);
  await c.call("POST", "/auth/email/code", { email: "ghost@example.com" });
  const added = await c.call("POST", "/auth/email/verify", { email: "ghost@example.com", code: c.lastCode(), intent: "link", password: "ghost in the shell" });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(added.body.account.id, walletFirst.body.account.id);
  assert.equal(added.body.account.hasPassword, true);
});

test("an email or wallet that belongs to another account can't be linked", async () => {
  const store = memoryStore();
  const clock = { t: Date.parse("2026-10-17T12:00:00Z") };
  const a = browser({ store, clock });
  const b = browser({ store, clock });
  const wallet = Wallet.generate();
  await a.walletSignIn(wallet);
  await a.call("POST", "/auth/email/code", { email: "taken@example.com" });
  await a.call("POST", "/auth/email/verify", { email: "taken@example.com", code: a.lastCode(), intent: "link" });

  await b.emailSignIn("other@example.com");
  const stealWallet = await b.walletSignIn(wallet, "link");
  assert.equal(stealWallet.status, 409);

  const w2 = Wallet.generate();
  const c = browser({ store, clock });
  await c.walletSignIn(w2);
  await c.call("POST", "/auth/email/code", { email: "taken@example.com" });
  const stealEmail = await c.call("POST", "/auth/email/verify", { email: "taken@example.com", code: c.lastCode(), intent: "link" });
  assert.equal(stealEmail.status, 409);
});

test("a sign-in method can be removed only while another remains", async () => {
  const b = browser();
  const wallet = Wallet.generate();
  await b.emailSignIn("cypher@example.com", "steak is not real");
  assert.equal((await b.call("POST", "/account/unlink", { method: "email" })).status, 400);
  await b.walletSignIn(wallet, "link");
  const gone = await b.call("POST", "/account/unlink", { method: "email" });
  assert.equal(gone.status, 200);
  assert.equal(gone.body.account.email, null);
  assert.equal(gone.body.account.hasPassword, false);
  assert.equal((await b.call("POST", "/account/unlink", { method: "wallet" })).status, 400);

  // the freed email can start a new account
  const c = browser({ store: b.store, clock: b.clock });
  const fresh = await c.emailSignIn("cypher@example.com");
  assert.notEqual(fresh.body.account.id, gone.body.account.id);
});

test("the wishlist and follows are saved to the account", async () => {
  const b = browser();
  await b.emailSignIn("mouse@example.com");
  const saved = await b.call("POST", "/account/lists", { wishlist: ["gltch-runner", "gltch-runner"], follows: ["gltch-runner"] });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.account.wishlist, ["gltch-runner"]);
  assert.deepEqual((await b.call("GET", "/account")).body.account.follows, ["gltch-runner"]);
  assert.equal((await b.call("POST", "/account/lists", { wishlist: ["<script>"] })).status, 400);
  assert.equal((await b.call("POST", "/account/lists", { wishlist: Array.from({ length: 101 }, (_, i) => `p${i}`) })).status, 400);

  b.cookie = null;
  assert.equal((await b.call("POST", "/account/lists", { wishlist: [] })).status, 401);
});

test("signing out ends the session on the server", async () => {
  const b = browser();
  await b.emailSignIn("seraph@example.com");
  const token = b.cookie;
  const out = await b.call("POST", "/auth/signout", {});
  assert.match(out.setCookie, /Max-Age=0/);
  b.cookie = token;
  assert.equal((await b.call("GET", "/account")).body.account, null);
});

test("sessions end after 30 days", async () => {
  const b = browser();
  await b.emailSignIn("merovingian@example.com");
  b.clock.t += 30 * 24 * 60 * 60_000 + 1;
  assert.equal((await b.call("GET", "/account")).body.account, null);
});

test("POSTs must come from the store's own origin, as JSON", async () => {
  const b = browser();
  const noOrigin = await b.call("POST", "/auth/email/code", { email: "a@example.com" }, { origin: null });
  const evil = await b.call("POST", "/auth/email/code", { email: "a@example.com" }, { origin: "https://evil.example" });
  const form = await b.call("POST", "/auth/email/code", "email=a@example.com", { type: "application/x-www-form-urlencoded" });
  assert.equal(noOrigin.status, 400);
  assert.equal(evil.status, 400);
  assert.equal(form.status, 415);
  assert.equal(b.mails.length, 0);
  assert.equal((await b.call("GET", "/nothing-here")).status, 404);
});

test("previews and netlify dev use their own address; production only the configured ones", async () => {
  const preview = "https://deploy-preview-7--rougechain-store.netlify.app";
  const p = browser({ deploy: "deploy-preview" });
  const ok = await p.call("POST", "/auth/wallet/challenge", { publicKey: Wallet.generate().publicKey }, { origin: preview, url: preview });
  assert.equal(ok.status, 200);
  assert.match(ok.body.message, /^deploy-preview-7--rougechain-store\.netlify\.app wants you/);

  const prod = browser({ deploy: "production" });
  const no = await prod.call("POST", "/auth/wallet/challenge", { publicKey: Wallet.generate().publicKey }, { origin: preview, url: preview });
  assert.equal(no.status, 400);

  const custom = browser({ env: { STORE_ORIGINS: "https://shop.example.com" } });
  const yes = await custom.call("POST", "/auth/wallet/challenge", { publicKey: Wallet.generate().publicKey }, { origin: "https://shop.example.com" });
  assert.equal(yes.status, 200);
});

test("the API says which sign-in methods are ready", async () => {
  assert.equal((await browser().call("GET", "/account")).body.methods.email, false);
  assert.equal((await browser({ env: { RESEND_API_KEY: "re_test" } }).call("GET", "/account")).body.methods.email, true);
  assert.equal((await browser({ deploy: "dev" }).call("GET", "/account")).body.methods.email, true);
});
