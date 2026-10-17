// Where accounts live: the Netlify Blobs store "rc-auth", read with strong consistency. Deploy
// previews, branch deploys and `netlify dev` use "rc-auth-preview" instead, so they never touch
// real accounts.
//
//   account/<id>            the account: email, password hash, wallet, wishlist, follows
//   email/<sha256(email)>   -> account id
//   wallet/<rouge1 address> -> account id
//   session/<sha256(token)> -> { account, method, at, exp }   (the browser holds the token, never stored)
//   code/<sha256(email)>    -> the latest emailed code (HMAC only), its expiry
//   try/<code id>/<n>       one marker per guess at that code, so guesses are counted atomically
//   nonce/<nonce>           -> a wallet sign-in waiting for its signature
//   nonce-used/<nonce>      marks a nonce spent
//   rate/<sha256(key)>      rate-limit counters
//   config/secret           the HMAC key for codes when AUTH_SECRET isn't set

import { getStore } from "@netlify/blobs";

export function blobStore(name = "rc-auth") {
  const s = getStore({ name, consistency: "strong" });
  return {
    get: (key) => s.get(key, { type: "json" }),
    put: async (key, value) => {
      await s.setJSON(key, value);
    },
    /** Writes only if the key is new. True when this call created it. */
    create: async (key, value) => (await s.setJSON(key, value, { onlyIfNew: true })).modified === true,
    remove: (key) => s.delete(key),
  };
}

/** The same interface in memory, for tests and local servers. */
export function memoryStore() {
  const m = new Map();
  return {
    get: async (key) => (m.has(key) ? JSON.parse(m.get(key)) : null),
    put: async (key, value) => {
      m.set(key, JSON.stringify(value));
    },
    create: async (key, value) => {
      if (m.has(key)) return false;
      m.set(key, JSON.stringify(value));
      return true;
    },
    remove: async (key) => {
      m.delete(key);
    },
    map: m,
  };
}
