// Hashing for passwords, emailed codes and session tokens.

import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** A random URL-safe token: 32 bytes = 43 characters. */
export const newToken = () => randomBytes(32).toString("base64url");

export const newId = (prefix) => prefix + randomBytes(12).toString("hex");

export function sameText(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---- passwords: scrypt at OWASP's recommended cost (N=2^17, r=8, p=1: 128 MiB, a few hundred ms)

const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_BYTES = 32;
const DUMMY_SALT = Buffer.alloc(16);

function derive(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_BYTES, { N: n, r, p, maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/** True if `password` matches `stored`. With nothing stored it still does the work, so timing doesn't say whether an account exists. */
export async function checkPassword(password, stored) {
  const parts = typeof stored === "string" ? stored.split("$") : [];
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    await derive(password, DUMMY_SALT, N, R, P);
    return false;
  }
  const [, n, r, p, salt, key] = parts;
  const want = Buffer.from(key, "base64");
  const got = await derive(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  return got.length === want.length && timingSafeEqual(got, want);
}

// ---- emailed codes: six digits, stored only as an HMAC

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const codeHash = (secret, email, code) => createHmac("sha256", secret).update(`${email}\n${code}`).digest("hex");

export const newSecret = () => randomBytes(32).toString("hex");
