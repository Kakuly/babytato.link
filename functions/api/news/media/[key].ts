import { jsonError } from "../../../lib/admin-auth";
import type { PagesEnv } from "../../../lib/env";

interface MediaContext {
  request: Request;
  env: PagesEnv;
  params: { key?: string };
}

const KEY_RE = /^[a-z0-9][a-z0-9.-]{0,120}$/;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function onRequestGet(context: MediaContext): Promise<Response> {
  const key = context.params.key?.trim() ?? "";
  if (!KEY_RE.test(key)) {
    return jsonError("画像キーが不正です。", 400);
  }

  const bucket = context.env.MEDIA;
  if (!bucket) {
    return jsonError("R2 (MEDIA) が未設定です。", 404);
  }

  const object = await bucket.get(key);
  if (!object?.body) {
    return jsonError("画像が見つかりません。", 404);
  }

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (typeof object.writeHttpMetadata === "function") {
    object.writeHttpMetadata(headers);
  }
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", object.httpMetadata?.contentType || MIME_BY_EXT[ext] || "application/octet-stream");
  }

  return new Response(object.body, { headers });
}
