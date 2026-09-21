import { requireAdmin, jsonError } from "../../../lib/admin-auth";
import type { PagesEnv } from "../../../lib/env";
import {
  deleteGitHubFile,
  listGitHubDirectory,
  readGitHubFile,
  writeGitHubFile,
} from "../../../lib/github";
import {
  NEWS_DIR,
  makeNewsSlug,
  newsFilePath,
  parseNewsMarkdown,
  serializeNewsMarkdown,
  slugFromFilename,
  validateNewsInput,
  type NewsArticle,
  type NewsListItem,
} from "../../../lib/news";

interface ContentContext {
  request: Request;
  env: PagesEnv;
}

async function listNewsArticles(env: PagesEnv): Promise<NewsListItem[]> {
  const entries = await listGitHubDirectory(env, NEWS_DIR);
  const articles: NewsListItem[] = [];

  for (const entry of entries) {
    const slug = slugFromFilename(entry.name);
    if (!slug) continue;

    const file = await readGitHubFile(env, entry.path);
    if (!file) continue;

    const parsed = parseNewsMarkdown(file.content, slug);
    if (!parsed) continue;

    articles.push({
      slug: parsed.slug,
      title: parsed.title,
      date: parsed.date,
      summary: parsed.summary,
      draft: parsed.draft,
      sha: file.sha || entry.sha,
    });
  }

  return articles.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

async function readNewsArticle(env: PagesEnv, slug: string): Promise<(NewsArticle & { sha: string }) | null> {
  const file = await readGitHubFile(env, newsFilePath(slug));
  if (!file) return null;

  const parsed = parseNewsMarkdown(file.content, slug);
  if (!parsed) return null;

  return { ...parsed, sha: file.sha };
}

async function ensureUniqueSlug(env: PagesEnv, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;
  while (await readGitHubFile(env, newsFilePath(slug))) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function onRequestGet(context: ContentContext): Promise<Response> {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug")?.trim();

  try {
    if (slug) {
      const article = await readNewsArticle(context.env, slug);
      if (!article) {
        return jsonError("記事が見つかりません。", 404);
      }
      return Response.json({ ok: true, article });
    }

    const articles = await listNewsArticles(context.env);
    return Response.json({ ok: true, articles });
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

  const requestedSlug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const existing = requestedSlug ? await readNewsArticle(context.env, requestedSlug) : null;

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

  try {
    let slug = article.slug;
    let sha: string | undefined;

    if (existing) {
      const clientSha = typeof payload.sha === "string" ? payload.sha.trim() : "";
      if (clientSha && existing.sha && clientSha !== existing.sha) {
        return jsonError("他の編集と競合しました。再読み込みしてから保存してください。", 409);
      }
      sha = existing.sha;
    } else {
      const baseSlug = slug || makeNewsSlug(article.date, article.title);
      slug = await ensureUniqueSlug(context.env, baseSlug);
      article.slug = slug;
    }

    const content = serializeNewsMarkdown(article);
    const result = await writeGitHubFile(
      context.env,
      newsFilePath(slug),
      content,
      sha,
      existing
        ? `admin: update news ${slug} (${auth.username})`
        : `admin: create news ${slug} (${auth.username})`,
    );

    return Response.json({
      ok: true,
      article: { ...article, sha: result.sha },
      message: "保存しました。Cloudflare Pages の再ビルドが始まります。",
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
    const existing = await readNewsArticle(context.env, slug);
    if (!existing) {
      return jsonError("記事が見つかりません。", 404);
    }

    const clientSha = typeof payload?.sha === "string" ? payload.sha.trim() : "";
    if (clientSha && existing.sha && clientSha !== existing.sha) {
      return jsonError("他の編集と競合しました。再読み込みしてから削除してください。", 409);
    }

    await deleteGitHubFile(
      context.env,
      newsFilePath(slug),
      existing.sha,
      `admin: delete news ${slug} (${auth.username})`,
    );

    return Response.json({
      ok: true,
      message: "削除しました。Cloudflare Pages の再ビルドが始まります。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "削除に失敗しました。";
    return jsonError(message, 500);
  }
}
