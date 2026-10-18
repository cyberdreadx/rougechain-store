// Sends the sign-in code email through Resend (https://resend.com), in the store's six languages.

import { HttpError } from "./http.mjs";

const WORDS = {
  en: {
    subject: (c) => `${c} is your RougeChain Store code`,
    line: (c) => `Your RougeChain Store sign-in code is ${c}`,
    heading: "Your sign-in code:",
    once: "It works once, for the next 10 minutes.",
    ignore: "If you didn't ask for it, you can ignore this email. Nobody can sign in without the code.",
  },
  es: {
    subject: (c) => `${c} es tu código de RougeChain Store`,
    line: (c) => `Tu código para entrar en RougeChain Store es ${c}`,
    heading: "Tu código para entrar:",
    once: "Funciona una sola vez, durante los próximos 10 minutos.",
    ignore: "Si no lo pediste, puedes ignorar este correo. Nadie puede entrar sin el código.",
  },
  ru: {
    subject: (c) => `${c} — ваш код для RougeChain Store`,
    line: (c) => `Ваш код для входа в RougeChain Store: ${c}`,
    heading: "Ваш код для входа:",
    once: "Код действует один раз в течение 10 минут.",
    ignore: "Если вы его не запрашивали, просто проигнорируйте это письмо. Без кода войти никто не сможет.",
  },
  ja: {
    subject: (c) => `RougeChain Store のログインコード：${c}`,
    line: (c) => `RougeChain Store のログインコードは ${c} です`,
    heading: "ログインコード：",
    once: "このコードは1回限り、10分間有効です。",
    ignore: "お心当たりがない場合は、このメールを無視してください。コードがなければ誰もログインできません。",
  },
  zh: {
    subject: (c) => `你的 RougeChain Store 验证码：${c}`,
    line: (c) => `你的 RougeChain Store 登录验证码是 ${c}`,
    heading: "你的登录验证码：",
    once: "此验证码仅可使用一次，10 分钟内有效。",
    ignore: "如果你没有申请验证码，请忽略此邮件。没有验证码，任何人都无法登录。",
  },
  ko: {
    subject: (c) => `RougeChain Store 로그인 코드: ${c}`,
    line: (c) => `RougeChain Store 로그인 코드: ${c}`, // no particle after the number: it depends on how the last digit sounds
    heading: "로그인 코드:",
    once: "이 코드는 10분 동안 한 번만 사용할 수 있어요.",
    ignore: "요청하지 않으셨다면 이 메일은 무시하셔도 돼요. 코드가 없으면 아무도 로그인할 수 없어요.",
  },
};
const HTML_LANG = { zh: "zh-CN" };

export const EMAIL_LANGS = Object.keys(WORDS);

export function codeEmail(code, lang = "en") {
  const w = WORDS[lang] || WORDS.en;
  const subject = w.subject(code);
  const text = [w.line(code), "", w.once, w.ignore, "", "RougeChain Technologies · store.rougechain.io"].join("\n");
  const html = `<!doctype html><html lang="${WORDS[lang] ? HTML_LANG[lang] || lang : "en"}"><body style="margin:0;padding:24px;background:#07080d;font-family:Segoe UI,Arial,sans-serif;color:#f0f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#10121b;border:1px solid #252839;border-top:3px solid #d5243e">
<tr><td style="padding:24px 24px 8px;font:700 14px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase"><span style="color:#d5243e">ROUGECHAIN</span> STORE</td></tr>
<tr><td style="padding:8px 24px 0;font-size:15px;line-height:1.5;color:#c9cedd">${w.heading}</td></tr>
<tr><td style="padding:10px 24px 6px;font:700 34px/1.1 Consolas,Menlo,monospace;letter-spacing:8px;color:#ffffff">${code}</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:13px;line-height:1.55;color:#9095a8">${w.once} ${w.ignore}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/**
 * Sends `code` to `to`. Without RESEND_API_KEY, `netlify dev` prints the code to the terminal
 * instead; anywhere else that is an error, so codes are never logged in production.
 */
export async function sendCode(cfg, { to, code, lang }, isDev) {
  if (!cfg.resendKey) {
    if (isDev) {
      console.log(`[accounts] sign-in code for ${to}: ${code}`);
      return;
    }
    throw new HttpError(503, "Email sign-in isn't set up yet. Use your RougeChain wallet for now.");
  }
  const { subject, text, html } = codeEmail(code, lang);
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
