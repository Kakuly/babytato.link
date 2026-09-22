import { requireAdmin, jsonError } from "../../../lib/admin-auth";
import type { PagesEnv } from "../../../lib/env";
import { readGitHubFile, writeGitHubFile } from "../../../lib/github";
import {
  SOCIAL_LINKS_PATH,
  parseSocialLinks,
  serializeSocialLinks,
  validateSocialLinksInput,
} from "../../../lib/social-links";

interface ContentContext {
  request: Request;
  env: PagesEnv;
}

export async function onRequestGet(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  try {
    const file = await readGitHubFile(context.env, SOCIAL_LINKS_PATH);
    if (!file) {
      return jsonError("social-links.json が見つかりません。", 404);
    }
    const links = parseSocialLinks(file.content);
    return Response.json({ ok: true, links, sha: file.sha || undefined });
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
  const links = validateSocialLinksInput(payload?.links ?? payload);
  if (!links) {
    return jsonError("各 SNS は空欄（非表示）か https:// で始まる URL を入力してください。");
  }

  try {
    const existing = await readGitHubFile(context.env, SOCIAL_LINKS_PATH);
    if (!existing) {
      return jsonError("social-links.json が見つかりません。", 404);
    }

    const clientSha = typeof payload?.sha === "string" ? payload.sha.trim() : "";
    if (clientSha && existing.sha && clientSha !== existing.sha) {
      return jsonError("他の編集と競合しました。再読み込みしてから保存してください。", 409);
    }

    const content = serializeSocialLinks(links);
    const result = await writeGitHubFile(
      context.env,
      SOCIAL_LINKS_PATH,
      content,
      existing.sha || undefined,
      `admin: update SNS links (${auth.username})`,
    );

    return Response.json({
      ok: true,
      links,
      sha: result.sha,
      message: "保存しました。Cloudflare Pages の再ビルドが始まります。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存に失敗しました。";
    return jsonError(message, 500);
  }
}
