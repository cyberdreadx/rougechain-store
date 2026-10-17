// Small HTTP helpers for the accounts API: JSON replies, the session cookie, request bodies.

export const COOKIE = "__Host-rc_session";
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/** An error whose message is safe to show the visitor. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(status, body, cookies = []) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

export function readCookie(req, name) {
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}

export function clearedCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** The request's JSON object body. Only `application/json` is read, so a plain HTML form can't post here. */
export async function readJson(req, limit = 32 * 1024) {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Send the request as JSON.");
  }
  const text = await req.text();
  if (text.length > limit) throw new HttpError(413, "That request is too large.");
  try {
    const v = JSON.parse(text || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
    // fall through
  }
  throw new HttpError(400, "That request isn't valid JSON.");
}
