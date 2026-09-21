import { requireAdmin, jsonError } from "../../../lib/admin-auth";
import type { PagesEnv } from "../../../lib/env";
import {
  DISCOGRAPHY_PATH,
  MAX_JACKET_BYTES,
  jacketExtForMime,
  jacketPublicPath,
  jacketRepoPath,
  isAllowedJacketMime,
  isValidReleaseId,
  parseDiscography,
  serializeDiscography,
  validateDiscographyInput,
} from "../../../lib/discography";
import { getGitHubFileSha, readGitHubFile, writeGitHubBinaryFile, writeGitHubFile } from "../../../lib/github";

interface ContentContext {
  request: Request;
  env: PagesEnv;
}

export async function onRequestGet(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  try {
    const file = await readGitHubFile(context.env, DISCOGRAPHY_PATH);
    if (!file) {
      return jsonError("discography.json が見つかりません。", 404);
    }
    const discography = parseDiscography(file.content);
    return Response.json({ ok: true, discography, sha: file.sha || undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "読み込みに失敗しました。";
    return jsonError(message, 500);
  }
}

export async function onRequestPut(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError("JSON の形式が正しくありません。");
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const discography = validateDiscographyInput(payload?.discography ?? payload);
  if (!discography) {
    return jsonError("タイトル・ジャケット・種別を確認してください。id は英小文字・数字・ハイフンのみです。");
  }

  try {
    const existing = await readGitHubFile(context.env, DISCOGRAPHY_PATH);
    if (!existing) {
      return jsonError("discography.json が見つかりません。", 404);
    }

    const clientSha = typeof payload?.sha === "string" ? payload.sha.trim() : "";
    if (clientSha && existing.sha && clientSha !== existing.sha) {
      return jsonError("他の編集と競合しました。再読み込みしてから保存してください。", 409);
    }

    const content = serializeDiscography(discography);
    const result = await writeGitHubFile(
      context.env,
      DISCOGRAPHY_PATH,
      content,
      existing.sha || undefined,
      `admin: update discography (${auth.username})`,
    );

    return Response.json({
      ok: true,
      discography,
      sha: result.sha,
      message: "保存しました。Cloudflare Pages の再ビルドが始まります。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存に失敗しました。";
    return jsonError(message, 500);
  }
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

  const id = typeof form.get("id") === "string" ? String(form.get("id")).trim() : "";
  const file = form.get("file");

  if (!isValidReleaseId(id)) {
    return jsonError("ジャケット用の id が不正です。");
  }
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("画像ファイルを選択してください。");
  }
  if (file.size > MAX_JACKET_BYTES) {
    return jsonError("ジャケットは 10MB 以下にしてください。");
  }

  const mime = file.type || "";
  if (!isAllowedJacketMime(mime)) {
    return jsonError("ジャケットは JPEG / PNG / WebP / GIF のみです。");
  }

  const ext = jacketExtForMime(mime);
  if (!ext) {
    return jsonError("対応していない画像形式です。");
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const repoPath = jacketRepoPath(id, ext);
    const existingSha = await getGitHubFileSha(context.env, repoPath);
    await writeGitHubBinaryFile(
      context.env,
      repoPath,
      bytes,
      existingSha || undefined,
      `admin: upload jacket ${id}.${ext} (${auth.username})`,
    );

    return Response.json({
      ok: true,
      img: jacketPublicPath(id, ext),
      message: "ジャケットをアップロードしました。保存すると一覧に反映されます。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました。";
    return jsonError(message, 500);
  }
}
