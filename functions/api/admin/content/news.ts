import { requireAdmin, jsonError } from "../../../lib/admin-auth";
import type { PagesEnv } from "../../../lib/env";
import {
  deleteNewsArticle,
  ensureUniqueSlug,
  listNewsArticles,
  readNewsArticle,
  requireNewsDb,
  upsertNewsArticle,
} from "../../../lib/news-db";
import { makeNewsSlug, validateNewsInput } from "../../../lib/news";

interface ContentContext {
  request: Request;
  env: PagesEnv;
}

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function onRequestGet(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug")?.trim();

  try {
    const db = requireNewsDb(context.env);
    if (slug) {
      const article = await readNewsArticle(db, slug, false);
      if (!article) {
        return jsonError("記事が見つかりません。", 404);
      }
      return jsonOk({ ok: true, article });
    }

    const articles = await listNewsArticles(db, false);
    return jsonOk({ ok: true, articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "読み込みに失敗しました。";
    return jsonError(message, 500);
  }
}

export async function onRequestPost(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError("JSON の形式が正しくありません。");
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!payload) return jsonError("リクエストが不正です。");

  try {
    const db = requireNewsDb(context.env);
    const requestedSlug = typeof payload.slug === "string" ? payload.slug.trim() : "";
    const existing = requestedSlug ? await readNewsArticle(db, requestedSlug, false) : null;

    const article = validateNewsInput(
      {
        slug: requestedSlug || undefined,
        title: typeof payload.title === "string" ? payload.title : undefined,
        date: typeof payload.date === "string" ? payload.date : undefined,
        summary: typeof payload.summary === "string" ? payload.summary : undefined,
        draft: payload.draft === true,
        body: typeof payload.body === "string" ? payload.body : undefined,
      },
      existing?.slug,
    );

    if (!article) {
      return jsonError("タイトル・日付・本文を確認してください。");
    }

    const clientSha = typeof payload.sha === "string" ? payload.sha.trim() : "";
    if (existing && clientSha && existing.sha && clientSha !== existing.sha) {
      return jsonError("他の編集と競合しました。再読み込みしてから保存してください。", 409);
    }

    if (!existing) {
      const baseSlug = article.slug || makeNewsSlug(article.date, article.title);
      article.slug = await ensureUniqueSlug(db, baseSlug);
    }

    const saved = await upsertNewsArticle(db, article);
    return jsonOk({
      ok: true,
      article: saved,
      message: saved.draft ? "下書きを保存しました。公開サイトには出ていません。" : "保存しました。公開サイトにすぐ反映されます。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存に失敗しました。";
    return jsonError(message, 500);
  }
}

export async function onRequestDelete(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError("JSON の形式が正しくありません。");
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const slug = typeof payload?.slug === "string" ? payload.slug.trim() : "";
  if (!slug) return jsonError("slug が必要です。");

  try {
    const db = requireNewsDb(context.env);
    const existing = await readNewsArticle(db, slug, false);
    if (!existing) {
      return jsonError("記事が見つかりません。", 404);
    }

    const clientSha = typeof payload?.sha === "string" ? payload.sha.trim() : "";
    if (clientSha && existing.sha && clientSha !== existing.sha) {
      return jsonError("他の編集と競合しました。再読み込みしてから削除してください。", 409);
    }

    await deleteNewsArticle(db, slug);
    return jsonOk({
      ok: true,
      message: "削除しました。公開サイトからすぐ消えます。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "削除に失敗しました。";
    return jsonError(message, 500);
  }
}
