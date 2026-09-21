import { requireAdmin, jsonError } from "../../../../lib/admin-auth";
import type { PagesEnv } from "../../../../lib/env";
import { getGitHubFileSha, writeGitHubBinaryFile } from "../../../../lib/github";
import {
  MAX_NEWS_IMAGE_BYTES,
  mimeFromNewsImageFile,
  newsImageExtForMime,
  newsImageFilename,
  newsImagePrefix,
  newsImagePublicPath,
  newsImageRepoPath,
} from "../../../../lib/news";

interface ContentContext {
  request: Request;
  env: PagesEnv;
}

async function shortHash(bytes: Uint8Array, length = 10): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

export async function onRequestPost(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return jsonError("アップロードの形式が正しくありません。");
  }

  const slug = typeof form.get("slug") === "string" ? String(form.get("slug")).trim() : "";
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return jsonError("画像ファイルを選択してください。");
  }
  if (file.size > MAX_NEWS_IMAGE_BYTES) {
    return jsonError("画像は 10MB 以下にしてください。");
  }

  const mime = mimeFromNewsImageFile(file);
  const ext = newsImageExtForMime(mime);
  if (!ext) {
    return jsonError("画像は JPEG / PNG / WebP / GIF のみです。");
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const filename = newsImageFilename(newsImagePrefix(slug), await shortHash(bytes), ext);
    const repoPath = newsImageRepoPath(filename);
    const existingSha = await getGitHubFileSha(context.env, repoPath);
    await writeGitHubBinaryFile(
      context.env,
      repoPath,
      bytes,
      existingSha || undefined,
      `admin: upload news image ${filename} (${auth.username})`,
    );

    return Response.json({
      ok: true,
      url: newsImagePublicPath(filename),
      message: "画像をアップロードしました。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました。";
    return jsonError(message, 500);
  }
}
