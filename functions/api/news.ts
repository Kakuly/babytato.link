import {
  listPublishedNews,
  publicNewsPayload,
  readNewsArticle,
  requireNewsDb,
} from "../lib/news-db";
import type { PagesEnv } from "../lib/env";

interface NewsContext {
  request: Request;
  env: PagesEnv;
}

const ALLOWED_ORIGINS = new Set([
  "https://babytato.link",
  "https://www.babytato.link",
  "http://127.0.0.1:4322",
  "http://localhost:4322",
  "http://127.0.0.1:8788",
  "http://localhost:8788",
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonOk(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      ...corsHeaders(request),
    },
  });
}

function jsonFail(request: Request, message: string, status: number): Response {
  return jsonOk(request, { ok: false, message }, status);
}

export async function onRequestOptions(context: NewsContext): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context: NewsContext): Promise<Response> {
  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";

  try {
    const db = requireNewsDb(context.env);

    if (slug) {
      const article = await readNewsArticle(db, slug, true);
      if (!article) {
        return jsonFail(context.request, "記事が見つかりません。", 404);
      }
      return jsonOk(context.request, { ok: true, article: publicNewsPayload(article) });
    }

    const articles = await listPublishedNews(db);
    return jsonOk(context.request, {
      ok: true,
      articles: articles.map(publicNewsPayload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "読み込みに失敗しました。";
    return jsonFail(context.request, message, 500);
  }
}
