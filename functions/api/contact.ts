import type { PagesEnv } from "../lib/env";

interface ContactContext {
  request: Request;
  env: PagesEnv;
}

interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 5;
const rateBuckets = new Map<string, number[]>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISCORD_CONTENT_MAX = 1900;

const FIELD_LIMITS = {
  name: { min: 1, max: 120 },
  email: { min: 5, max: 254 },
  subject: { min: 0, max: 200 },
  message: { min: 10, max: 5000 },
} as const;

function cleanText(value: unknown, maxLen: number): string {
  return String(value ?? "")
    .trim()
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .slice(0, maxLen);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([
    "https://babytato.link",
    "https://www.babytato.link",
    "http://127.0.0.1:4322",
    "http://localhost:4322",
    "http://127.0.0.1:8788",
    "http://localhost:8788",
  ]);
  if (!allowed.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(
  request: Request,
  body: unknown,
  status: number,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (bucket.length >= MAX_REQUESTS) {
    rateBuckets.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return true;
}

function isDiscordWebhook(url: string): boolean {
  return /discord(?:app)?\.com\/api\/webhooks/i.test(url);
}

function formatWebhookText(payload: ContactPayload): string {
  const subject = payload.subject || "（なし）";
  const header = [
    "[babytato.link] お問い合わせ",
    "",
    `お名前: ${payload.name}`,
    `メール: ${payload.email}`,
    `件名: ${subject}`,
    "",
  ].join("\n");

  const remaining = DISCORD_CONTENT_MAX - header.length - 20;
  const message =
    remaining > 0 && payload.message.length > remaining
      ? `${payload.message.slice(0, remaining)}\n…（省略）`
      : payload.message;

  return `${header}${message}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEmailSubject(payload: ContactPayload): string {
  const subject = payload.subject || "（件名なし）";
  return `[babytato.link] ${subject}`;
}

function formatEmailText(payload: ContactPayload): string {
  const subject = payload.subject || "（なし）";
  return [
    "[babytato.link] お問い合わせ",
    "",
    `お名前: ${payload.name}`,
    `メール: ${payload.email}`,
    `件名: ${subject}`,
    "",
    payload.message,
  ].join("\n");
}

function formatEmailHtml(payload: ContactPayload): string {
  const subject = payload.subject || "（なし）";
  return [
    "<p><strong>[babytato.link] お問い合わせ</strong></p>",
    `<p>お名前: ${escapeHtml(payload.name)}<br>`,
    `メール: ${escapeHtml(payload.email)}<br>`,
    `件名: ${escapeHtml(subject)}</p>`,
    `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(payload.message)}</pre>`,
  ].join("\n");
}

function resendConfigured(env: PagesEnv): boolean {
  return Boolean(
    env.RESEND_API_KEY?.trim() &&
      env.RESEND_FROM?.trim() &&
      env.CONTACT_TO_EMAIL?.trim(),
  );
}

async function sendViaResend(
  env: PagesEnv,
  payload: ContactPayload,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const apiKey = env.RESEND_API_KEY!.trim();
  const from = env.RESEND_FROM!.trim();
  const to = env.CONTACT_TO_EMAIL!.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject: formatEmailSubject(payload),
      text: formatEmailText(payload),
      html: formatEmailHtml(payload),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, status: response.status, detail };
  }

  return { ok: true };
}

async function sendViaWebhook(
  webhookUrl: string,
  payload: ContactPayload,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const text = formatWebhookText(payload);
  const body = isDiscordWebhook(webhookUrl) ? { content: text } : { text };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, status: response.status, detail };
  }

  return { ok: true };
}

export async function onRequestOptions(context: ContactContext): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context.request),
  });
}

export async function onRequestPost(context: ContactContext): Promise<Response> {
  const { request, env } = context;

  if (!checkRateLimit(clientIp(request))) {
    return jsonResponse(
      request,
      { ok: false, message: "送信回数が多すぎます。しばらくしてから再度お試しください。" },
      429,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      request,
      { ok: false, message: "JSON の形式が正しくありません。" },
      400,
    );
  }

  if (cleanText(body.website, 200)) {
    return jsonResponse(
      request,
      { ok: true, message: "送信しました。内容を確認のうえご返信します。" },
      200,
    );
  }

  const name = cleanText(body.name, FIELD_LIMITS.name.max);
  const email = cleanText(body.email, FIELD_LIMITS.email.max);
  const subject = cleanText(body.subject, FIELD_LIMITS.subject.max);
  const message = cleanText(body.message, FIELD_LIMITS.message.max);

  if (name.length < FIELD_LIMITS.name.min) {
    return jsonResponse(request, { ok: false, message: "お名前を入力してください。" }, 400);
  }
  if (email.length < FIELD_LIMITS.email.min) {
    return jsonResponse(request, { ok: false, message: "メールアドレスを入力してください。" }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse(
      request,
      { ok: false, message: "メールアドレスの形式が正しくありません。" },
      400,
    );
  }
  if (message.length < FIELD_LIMITS.message.min) {
    return jsonResponse(
      request,
      { ok: false, message: "メッセージは10文字以上で入力してください。" },
      400,
    );
  }

  const payload: ContactPayload = { name, email, subject, message };
  const useResend = resendConfigured(env);
  const webhookUrl = env.CONTACT_WEBHOOK_URL?.trim();

  if (!useResend && !webhookUrl) {
    return jsonResponse(
      request,
      { ok: false, message: "お問い合わせの受付設定が完了していません。" },
      503,
    );
  }

  try {
    if (useResend) {
      const result = await sendViaResend(env, payload);
      if (!result.ok) {
        console.error("contact resend failed", result.status, result.detail.slice(0, 200));
        return jsonResponse(
          request,
          { ok: false, message: "送信に失敗しました。しばらくしてから再度お試しください。" },
          502,
        );
      }
    } else {
      const result = await sendViaWebhook(webhookUrl!, payload);
      if (!result.ok) {
        console.error("contact webhook failed", result.status, result.detail.slice(0, 200));
        return jsonResponse(
          request,
          { ok: false, message: "送信に失敗しました。しばらくしてから再度お試しください。" },
          502,
        );
      }
    }
  } catch (error) {
    console.error("contact delivery error", error);
    return jsonResponse(
      request,
      { ok: false, message: "送信に失敗しました。しばらくしてから再度お試しください。" },
      502,
    );
  }

  return jsonResponse(
    request,
    { ok: true, message: "送信しました。内容を確認のうえご返信します。" },
    200,
  );
}
