import { marked } from "marked";

type PublicNewsArticle = {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  body: string;
};

marked.setOptions({ gfm: true, breaks: true });

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}/${month}/${day}`;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function renderBody(markdown: string): string {
  const parsed = marked.parse(markdown || "", { async: false });
  const html = typeof parsed === "string" ? parsed : "";
  return sanitizeHtml(html);
}

function setStatus(
  statusEl: HTMLElement | null,
  emptyEl: HTMLElement | null,
  listEl: HTMLElement | null,
  message: string,
  kind: "loading" | "empty" | "error" | "hidden",
) {
  if (statusEl) {
    statusEl.hidden = kind === "hidden" || kind === "empty";
    statusEl.textContent = kind === "error" || kind === "loading" ? message : "";
    statusEl.classList.toggle("is-error", kind === "error");
  }
  if (emptyEl) emptyEl.hidden = kind !== "empty";
  if (listEl) listEl.hidden = true;
}

function renderArticles(listEl: HTMLElement, articles: PublicNewsArticle[]) {
  listEl.replaceChildren();
  for (const article of articles) {
    const item = document.createElement("article");
    item.className = "news-item";

    const meta = document.createElement("p");
    meta.className = "news-item__meta";
    meta.textContent = formatDate(article.date);

    const title = document.createElement("h3");
    title.className = "news-item__title";
    title.textContent = article.title;

    item.append(meta, title);

    if (article.summary) {
      const summary = document.createElement("p");
      summary.className = "news-item__summary";
      summary.textContent = article.summary;
      item.append(summary);
    }

    const prose = document.createElement("div");
    prose.className = "news-item__prose";
    prose.innerHTML = renderBody(article.body);
    item.append(prose);
    listEl.append(item);
  }
}

export function initHomeNews(root: ParentNode = document): void {
  const wrap = root.querySelector<HTMLElement>("[data-home-news]");
  if (!wrap) return;

  const statusEl = wrap.querySelector<HTMLElement>("[data-home-news-status]");
  const listEl = wrap.querySelector<HTMLElement>("[data-home-news-list]");
  const emptyEl = wrap.querySelector<HTMLElement>("[data-home-news-empty]");
  if (!listEl) return;

  setStatus(statusEl, emptyEl, listEl, "読み込み中…", "loading");

  void (async () => {
    try {
      // Local Astro (:4322) proxies /api → pages:dev (:8788) via astro.config.
      const response = await fetch("/api/news", { credentials: "omit" });
      const data = (await response.json()) as {
        ok?: boolean;
        articles?: PublicNewsArticle[];
        message?: string;
      };
      if (!response.ok || !data.ok || !data.articles) {
        throw new Error(data.message ?? "お知らせを読み込めませんでした。");
      }

      if (data.articles.length === 0) {
        setStatus(statusEl, emptyEl, listEl, "", "empty");
        return;
      }

      renderArticles(listEl, data.articles);
      setStatus(statusEl, emptyEl, listEl, "", "hidden");
      listEl.hidden = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : "お知らせを読み込めませんでした。";
      setStatus(statusEl, emptyEl, listEl, message, "error");
    }
  })();
}
