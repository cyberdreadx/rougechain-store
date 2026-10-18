// The store's accounts API, served at /api/* by netlify/functions/api.mjs.
//
// An account can have an email (signed in to with an emailed code, or a password once one is set)
// and a RougeChain wallet (Sign-In with RougeChain: the wallet signs a one-time message with its
// ML-DSA-65 key, checked here with verifySignIn from @rougechain/sdk). Either one signs in to the
// same account once both are linked. The account also keeps the wishlist and follows.
//
//   GET  /api/account                 who is signed in: { account | null, methods, chainId }
//   POST /api/auth/email/code         { email, lang? }                   emails a 6-digit code (lang: en es ru ja zh ko)
//   POST /api/auth/email/verify       { email, code, password?, intent? } signs in (or links), sets a password
//   POST /api/auth/email/password     { email, password }                signs in with a password
//   POST /api/auth/wallet/challenge   { publicKey, intent? }             the sign-in message to sign
//   POST /api/auth/wallet/verify      { message, signature, publicKey }  signs in (or links)
//   POST /api/auth/signout
//   POST /api/account/lists           { wishlist, follows }
//   POST /api/account/password        { current?, password }
//   POST /api/account/unlink          { method: "email" | "wallet" }
//
// Every POST must come from one of the store's own origins (the Origin header) and be JSON.
// Errors are { error } with a message meant for the visitor; 401 always means "signed out".

import { createSignInMessage, parseSignInMessage, pubkeyToAddress, verifySignIn } from "@rougechain/sdk";
import { randomBytes } from "node:crypto";
import { EMAIL_LANGS, sendCode } from "./email.mjs";
import { COOKIE, HttpError, SESSION_MS, clearedCookie, json, readCookie, readJson, sessionCookie } from "./http.mjs";
import * as S from "./secrets.mjs";
import { blobStore } from "./store.mjs";

const MIN = 60_000;
const CODE_MS = 10 * MIN;
const CODE_GUESSES = 5;
const CODE_COOLDOWN_MS = MIN;
const NONCE_MS = 10 * MIN;
const MAX_LIST = 100;

export function settings(env = process.env) {
  return {
    // The addresses the store is served from. Wallet sign-in messages name one of these.
    origins: (env.STORE_ORIGINS || "https://store.rougechain.io")
      .split(",")
      .map((s) => s.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    chainId: env.ROUGECHAIN_CHAIN_ID || "rougechain-mainnet-1",
    resendKey: env.RESEND_API_KEY || "",
    emailFrom: env.AUTH_EMAIL_FROM || "RougeChain Store <login@rougechain.io>",
    secret: env.AUTH_SECRET || "",
  };
}

const isDev = (context) => context?.deploy?.context === "dev";
const isPreview = (context) => Boolean(context?.deploy?.context) && context.deploy.context !== "production";

/** The request's origin if it is one of the store's own, else null. */
function storeOrigin(req, context, cfg) {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  if (cfg.origins.includes(origin)) return origin;
  // Deploy previews, branch deploys and `netlify dev` are also allowed to use their own address.
  const deploy = context?.deploy?.context;
  if (deploy && deploy !== "production" && origin === new URL(req.url).origin) return origin;
  return null;
}

export async function handle(req, context = {}, deps = {}) {
  const cfg = deps.cfg || settings();
  const x = {
    req,
    context,
    cfg,
    db: deps.store || blobStore(isPreview(context) ? "rc-auth-preview" : "rc-auth"),
    now: deps.now || Date.now,
    mail: deps.mail || ((msg) => sendCode(cfg, msg, isDev(context))),
    ip: context.ip || req.headers.get("x-nf-client-connection-ip") || "unknown",
    origin: null,
    body: null,
    cookies: [],
  };
  const path = new URL(req.url).pathname.replace(/^\/api/, "").replace(/\/+$/, "");
  const route = ROUTES[`${req.method} ${path}`];
  if (!route) return json(404, { error: "Not found." });
  try {
    if (req.method === "POST") {
      x.origin = storeOrigin(req, context, cfg);
      // (not 403: `netlify dev` treats a 403 from a function as "try a static file" and answers 404)
      if (!x.origin) throw new HttpError(400, "That request didn't come from the store.");
      x.body = await readJson(req);
    }
    return json(200, await route(x), x.cookies);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message, ...e.extra }, x.cookies);
    console.error("[accounts]", e);
    return json(500, { error: "Something went wrong on our side. Try again in a minute." });
  }
}

// ---- accounts

function view(a) {
  return {
    id: a.id,
    email: a.email,
    hasPassword: Boolean(a.password),
    wallet: a.wallet ? { address: a.wallet.address } : null,
    wishlist: a.wishlist,
    follows: a.follows,
  };
}

async function save(x, account) {
  account.updatedAt = new Date(x.now()).toISOString();
  await x.db.put(`account/${account.id}`, account);
}

/** The account an email or wallet index points to, made (with `init`) if there is none yet. */
async function accountAt(x, indexKey, init) {
  let id = await x.db.get(indexKey);
  if (!id) {
    const fresh = S.newId("acc_");
    id = (await x.db.create(indexKey, fresh)) ? fresh : await x.db.get(indexKey);
  }
  let account = await x.db.get(`account/${id}`);
  if (!account) {
    const at = new Date(x.now()).toISOString();
    account = { id, createdAt: at, updatedAt: at, email: null, emailVerifiedAt: null, password: null, wallet: null, wishlist: [], follows: [] };
    init(account);
    await x.db.put(`account/${id}`, account);
  }
  return account;
}

/** Points an email or wallet index at this account. False if another account already has it. */
async function claim(x, indexKey, accountId) {
  if (await x.db.create(indexKey, accountId)) return true;
  return (await x.db.get(indexKey)) === accountId;
}

// ---- sessions

async function currentSession(x) {
  const token = readCookie(x.req, COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const key = `session/${S.sha256(token)}`;
  const session = await x.db.get(key);
  if (!session || session.exp <= x.now()) return null;
  const account = await x.db.get(`account/${session.account}`);
  return account ? { key, session, account } : null;
}

async function requireSession(x) {
  const s = await currentSession(x);
  if (!s) throw new HttpError(401, "You're signed out. Sign in again.");
  return s;
}

async function startSession(x, accountId, method) {
  const old = readCookie(x.req, COOKIE);
  if (old) await x.db.remove(`session/${S.sha256(old)}`);
  const token = S.newToken();
  const now = x.now();
  await x.db.put(`session/${S.sha256(token)}`, { account: accountId, method, at: now, exp: now + SESSION_MS });
  x.cookies.push(sessionCookie(token));
}

// ---- limits

async function limit(x, key, max, windowMs, message = "Too many tries. Wait a few minutes, then try again.") {
  const k = `rate/${S.sha256(key)}`;
  const now = x.now();
  let r = await x.db.get(k);
  if (!r || r.reset <= now) r = { n: 0, reset: now + windowMs };
  r.n += 1;
  await x.db.put(k, r);
  if (r.n > max) throw new HttpError(429, message);
}

async function codeSecret(x) {
  if (x.cfg.secret) return x.cfg.secret;
  const stored = await x.db.get("config/secret");
  if (stored) return stored;
  const fresh = S.newSecret();
  return (await x.db.create("config/secret", fresh)) ? fresh : x.db.get("config/secret");
}

// ---- input

function cleanEmail(v) {
  const email = typeof v === "string" ? v.trim().toLowerCase() : "";
  const part = "[^\\s@<>()\\[\\]\",;:\\\\\\x00-\\x1f\\x7f]+";
  if (email.length > 254 || !new RegExp(`^${part}@${part}\\.${part}$`).test(email)) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  return email;
}

function cleanNewPassword(v, email) {
  if (typeof v !== "string" || v.length < 10) throw new HttpError(400, "Use at least 10 characters for your password.");
  if (v.length > 200) throw new HttpError(400, "That password is too long. Use 200 characters at most.");
  if (email && v.trim().toLowerCase() === email) throw new HttpError(400, "Don't use your email address as your password.");
  return v;
}

function cleanList(v) {
  if (!Array.isArray(v) || v.length > MAX_LIST) throw new HttpError(400, "That list isn't valid.");
  const out = [];
  for (const id of v) {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new HttpError(400, "That list isn't valid.");
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

const intentOf = (body) => (body.intent === "link" ? "link" : "signin");

// ---- email

async function emailCode(x) {
  const email = cleanEmail(x.body.email);
  await limit(x, `code-ip:${x.ip}`, 20, 60 * MIN);
  await limit(x, `code-email:${email}`, 6, 60 * MIN, "We've sent a lot of codes to this address. Wait an hour, then try again.");
  const key = `code/${S.sha256(email)}`;
  const prev = await x.db.get(key);
  if (prev && x.now() - prev.sentAt < CODE_COOLDOWN_MS) {
    throw new HttpError(429, "We just sent you a code. Wait a minute before asking for another.", { codeSent: true });
  }
  const code = S.newCode();
  await x.db.put(key, { id: S.newId(""), h: S.codeHash(await codeSecret(x), email, code), exp: x.now() + CODE_MS, sentAt: x.now() });
  try {
    await x.mail({ to: email, code, lang: EMAIL_LANGS.includes(x.body.lang) ? x.body.lang : "en" });
  } catch (e) {
    await x.db.remove(key);
    throw e;
  }
  return { sent: true, email };
}

/** Checks an emailed code and spends it. Each guess takes one of five slots, written atomically. */
async function spendCode(x, email, code) {
  const key = `code/${S.sha256(email)}`;
  const rec = await x.db.get(key);
  if (!rec || rec.exp <= x.now()) throw new HttpError(400, "That code has expired. Ask for a new one.");
  let slot = false;
  for (let n = 1; n <= CODE_GUESSES && !slot; n++) slot = await x.db.create(`try/${rec.id}/${n}`, 1);
  if (!slot) {
    await x.db.remove(key);
    throw new HttpError(400, "Too many wrong codes. Ask for a new one.");
  }
  if (!S.sameText(rec.h, S.codeHash(await codeSecret(x), email, code))) {
    throw new HttpError(400, "That code isn't right. Check the email and try again.");
  }
  await x.db.remove(key);
}

async function emailVerify(x) {
  const email = cleanEmail(x.body.email);
  const code = String(x.body.code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from the email.");
  const password = x.body.password ? cleanNewPassword(x.body.password, email) : null;
  const intent = intentOf(x.body);
  const linking = intent === "link" ? await requireSession(x) : null;
  if (linking?.account.email) throw new HttpError(400, "This account already has an email.");
  await limit(x, `verify-ip:${x.ip}`, 60, 60 * MIN);
  await spendCode(x, email, code);

  const at = new Date(x.now()).toISOString();
  const indexKey = `email/${S.sha256(email)}`;
  if (linking) {
    const account = linking.account;
    if (!(await claim(x, indexKey, account.id))) {
      throw new HttpError(409, "That email already has its own store account. Use a different email, or sign in with that one.");
    }
    account.email = email;
    account.emailVerifiedAt = at;
    if (password) account.password = await S.hashPassword(password);
    await save(x, account);
    return { account: view(account) };
  }
  const account = await accountAt(x, indexKey, (a) => {
    a.email = email;
    a.emailVerifiedAt = at;
  });
  if (password) {
    account.password = await S.hashPassword(password);
    await save(x, account);
  }
  await startSession(x, account.id, "email");
  return { account: view(account) };
}

async function emailPassword(x) {
  const email = cleanEmail(x.body.email);
  const password = typeof x.body.password === "string" ? x.body.password : "";
  if (!password || password.length > 200) throw new HttpError(400, "Enter your password.");
  await limit(x, `password-ip:${x.ip}`, 30, 15 * MIN);
  await limit(x, `password-email:${email}`, 10, 15 * MIN, "Too many password tries for this email. Wait 15 minutes, or sign in with an email code.");
  const id = await x.db.get(`email/${S.sha256(email)}`);
  const account = id ? await x.db.get(`account/${id}`) : null;
  const ok = await S.checkPassword(password, account?.password ?? null);
  if (!ok || !account) throw new HttpError(401, "That email and password don't match. No password yet? Sign in with an email code.");
  await startSession(x, account.id, "password");
  return { account: view(account) };
}

// ---- RougeChain wallet (Sign-In with RougeChain)

const WALLET_ERRORS = {
  malformed_message: "The sign-in message was changed before it was signed. Try again.",
  invalid_signature: "The wallet's signature didn't check out. Try again.",
  address_mismatch: "Your wallet switched accounts partway through. Try again.",
  domain_mismatch: "That sign-in was made for a different site.",
  nonce_mismatch: "That sign-in has expired or was already used. Try again.",
  chain_id_mismatch: "That sign-in was for a different RougeChain network.",
  issued_in_future: "Your device's clock looks wrong. Check it, then try again.",
  expired: "That sign-in has expired. Try again.",
  too_old: "That sign-in has expired. Try again.",
};

async function walletChallenge(x) {
  const publicKey = typeof x.body.publicKey === "string" ? x.body.publicKey.toLowerCase() : "";
  if (!/^[0-9a-f]{3904}$/.test(publicKey)) throw new HttpError(400, "Your wallet sent a public key the store can't read.");
  await limit(x, `wallet-ip:${x.ip}`, 60, 10 * MIN);
  const intent = intentOf(x.body);
  let account = null;
  if (intent === "link") {
    const s = await requireSession(x);
    if (s.account.wallet) throw new HttpError(400, "This account already has a wallet.");
    account = s.account.id;
  }
  const nonce = randomBytes(16).toString("hex");
  const now = x.now();
  const message = createSignInMessage({
    domain: new URL(x.origin).host,
    address: await pubkeyToAddress(publicKey),
    uri: `${x.origin}/`,
    statement: intent === "link" ? "Link this wallet to your RougeChain Store account." : "Sign in to the RougeChain Store.",
    nonce,
    issuedAt: new Date(now).toISOString(),
    expirationTime: new Date(now + NONCE_MS).toISOString(),
    chainId: x.cfg.chainId,
  });
  await x.db.put(`nonce/${nonce}`, { exp: now + NONCE_MS, origin: x.origin, intent, account });
  return { message };
}

async function walletVerify(x) {
  const { message, signature, publicKey } = x.body;
  if (typeof message !== "string" || typeof signature !== "string" || typeof publicKey !== "string") {
    throw new HttpError(400, "Send the signed message, the signature and the public key.");
  }
  await limit(x, `wallet-ip:${x.ip}`, 60, 10 * MIN);
  const expired = new HttpError(401, WALLET_ERRORS.expired);

  // The nonce must be one we issued, still fresh, and it is spent now, before anything else is checked.
  const nonce = parseSignInMessage(message)?.nonce;
  const rec = nonce ? await x.db.get(`nonce/${nonce}`) : null;
  if (!rec || rec.exp <= x.now()) throw expired;
  if (!(await x.db.create(`nonce-used/${nonce}`, x.now()))) throw expired;
  await x.db.remove(`nonce/${nonce}`);
  if (rec.origin !== x.origin) throw new HttpError(401, WALLET_ERRORS.domain_mismatch);

  const result = await verifySignIn({
    message,
    signature,
    publicKey,
    expectedDomain: new URL(rec.origin).host,
    expectedNonce: nonce,
    expectedChainId: x.cfg.chainId,
    now: x.now(),
    maxAgeMs: NONCE_MS,
  });
  if (!result.valid) throw new HttpError(401, WALLET_ERRORS[result.error] || WALLET_ERRORS.invalid_signature);
  const wallet = { address: result.address, publicKey: result.publicKey };
  const indexKey = `wallet/${wallet.address}`;

  if (rec.intent === "link") {
    const s = await requireSession(x);
    if (s.account.id !== rec.account) throw new HttpError(401, "You signed in as someone else meanwhile. Try again.");
    if (s.account.wallet) throw new HttpError(400, "This account already has a wallet.");
    if (!(await claim(x, indexKey, s.account.id))) {
      throw new HttpError(409, "That wallet already has its own store account. Use a different wallet, or sign in with that one.");
    }
    s.account.wallet = wallet;
    await save(x, s.account);
    return { account: view(s.account) };
  }
  const account = await accountAt(x, indexKey, (a) => {
    a.wallet = wallet;
  });
  await startSession(x, account.id, "wallet");
  return { account: view(account) };
}

// ---- the signed-in account

async function getAccount(x) {
  const s = await currentSession(x);
  return {
    account: s ? view(s.account) : null,
    methods: { email: Boolean(x.cfg.resendKey) || isDev(x.context), wallet: true },
    chainId: x.cfg.chainId,
  };
}

async function signOut(x) {
  const token = readCookie(x.req, COOKIE);
  if (token) await x.db.remove(`session/${S.sha256(token)}`);
  x.cookies.push(clearedCookie());
  return { account: null };
}

async function saveLists(x) {
  const { account } = await requireSession(x);
  if (x.body.wishlist !== undefined) account.wishlist = cleanList(x.body.wishlist);
  if (x.body.follows !== undefined) account.follows = cleanList(x.body.follows);
  await save(x, account);
  return { account: view(account) };
}

async function setPassword(x) {
  const { account } = await requireSession(x);
  if (!account.email) throw new HttpError(400, "Add an email first. A password signs in with your email.");
  const password = cleanNewPassword(x.body.password, account.email);
  if (account.password) {
    await limit(x, `password-change:${account.id}`, 10, 15 * MIN);
    const current = typeof x.body.current === "string" ? x.body.current : "";
    if (!(await S.checkPassword(current, account.password))) {
      throw new HttpError(400, "Your current password isn't right.");
    }
  }
  account.password = await S.hashPassword(password);
  await save(x, account);
  return { account: view(account) };
}

async function unlink(x) {
  const { account } = await requireSession(x);
  if (x.body.method === "email") {
    if (!account.email) return { account: view(account) };
    if (!account.wallet) throw new HttpError(400, "Link a wallet first, so you can still sign in.");
    await x.db.remove(`email/${S.sha256(account.email)}`);
    account.email = null;
    account.emailVerifiedAt = null;
    account.password = null;
  } else if (x.body.method === "wallet") {
    if (!account.wallet) return { account: view(account) };
    if (!account.email) throw new HttpError(400, "Add an email first, so you can still sign in.");
    await x.db.remove(`wallet/${account.wallet.address}`);
    account.wallet = null;
  } else {
    throw new HttpError(400, "Say which sign-in to remove: email or wallet.");
  }
  await save(x, account);
  return { account: view(account) };
}

const ROUTES = {
  "GET /account": getAccount,
  "POST /auth/email/code": emailCode,
  "POST /auth/email/verify": emailVerify,
  "POST /auth/email/password": emailPassword,
  "POST /auth/wallet/challenge": walletChallenge,
  "POST /auth/wallet/verify": walletVerify,
  "POST /auth/signout": signOut,
  "POST /account/lists": saveLists,
  "POST /account/password": setPassword,
  "POST /account/unlink": unlink,
};
