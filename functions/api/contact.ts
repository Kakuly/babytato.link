import type { PagesEnv } from "../lib/env";

interface ContactContext {
  request: Request;
  env: PagesEnv;
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

function formatWebhookText(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
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

  const webhookUrl = env.CONTACT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return jsonResponse(
      request,
      { ok: false, message: "お問い合わせの受付設定が完了していません。" },
      503,
    );
  }

  const text = formatWebhookText({ name, email, subject, message });
  const payload = isDiscordWebhook(webhookUrl)
    ? { content: text }
    : { text };

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const detail = await webhookResponse.text().catch(() => "");
      console.error("contact webhook failed", webhookResponse.status, detail.slice(0, 200));
      return jsonResponse(
        request,
        { ok: false, message: "送信に失敗しました。しばらくしてから再度お試しください。" },
        502,
      );
    }
  } catch (error) {
    console.error("contact webhook error", error);
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
