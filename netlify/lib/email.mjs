// Sends the sign-in code email through Resend (https://resend.com).

import { HttpError } from "./http.mjs";

export function codeEmail(code) {
  const subject = `${code} is your RougeChain Store code`;
  const text = [
    `Your RougeChain Store sign-in code is ${code}`,
    "",
    "It works once, for the next 10 minutes.",
    "If you didn't ask for it, you can ignore this email. Nobody can sign in without the code.",
    "",
    "RougeChain Technologies · store.rougechain.io",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#07080d;font-family:Segoe UI,Arial,sans-serif;color:#f0f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#10121b;border:1px solid #252839;border-top:3px solid #d5243e">
<tr><td style="padding:24px 24px 8px;font:700 14px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase"><span style="color:#d5243e">ROUGECHAIN</span> STORE</td></tr>
<tr><td style="padding:8px 24px 0;font-size:15px;line-height:1.5;color:#c9cedd">Your sign-in code:</td></tr>
<tr><td style="padding:10px 24px 6px;font:700 34px/1.1 Consolas,Menlo,monospace;letter-spacing:8px;color:#ffffff">${code}</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:13px;line-height:1.55;color:#9095a8">It works once, for the next 10 minutes. If you didn't ask for it, you can ignore this email. Nobody can sign in without the code.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/**
 * Sends `code` to `to`. Without RESEND_API_KEY, `netlify dev` prints the code to the terminal
 * instead; anywhere else that is an error, so codes are never logged in production.
 */
export async function sendCode(cfg, { to, code }, isDev) {
  if (!cfg.resendKey) {
    if (isDev) {
      console.log(`[accounts] sign-in code for ${to}: ${code}`);
      return;
    }
    throw new HttpError(503, "Email sign-in isn't set up yet. Use your RougeChain wallet for now.");
  }
  const { subject, text, html } = codeEmail(code);
  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: cfg.emailFrom, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error("[accounts] Resend unreachable:", e?.name || e);
    throw new HttpError(502, "We couldn't send the email. Try again in a minute.");
  }
  if (!res.ok) {
    let reason = "";
    try {
      reason = (await res.json())?.name || "";
    } catch {
      // no body
    }
    console.error("[accounts] Resend refused the email:", res.status, reason);
    throw new HttpError(502, "We couldn't send the email. Try again in a minute.");
  }
}
