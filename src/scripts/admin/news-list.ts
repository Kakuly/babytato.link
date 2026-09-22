import { requireSession, showStatus } from "./client";
import { adminNewsEditPath } from "../../lib/admin-paths";

type NewsListItem = {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  draft?: boolean;
  sha: string;
};

export async function initNewsList(): Promise<void> {
  const listEl = document.getElementById("news-list");
  const loadingEl = document.getElementById("news-list-loading");
  const emptyEl = document.getElementById("news-list-empty");
  const statusEl = document.getElementById("news-status");
  const reloadBtn = document.getElementById("news-reload");

  function setLoading(loading: boolean) {
    if (loadingEl) loadingEl.hidden = !loading;
    if (reloadBtn instanceof HTMLButtonElement) reloadBtn.disabled = loading;
  }

  function formatDate(value: string): string {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${year}/${month}/${day}`;
  }

  function renderList(articles: NewsListItem[]) {
    if (!listEl || !emptyEl) return;

    listEl.replaceChildren();

    if (articles.length === 0) {
      listEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;

    for (const article of articles) {
      const item = document.createElement("li");
      item.className = "admin-news-item";

      const meta = document.createElement("p");
      meta.className = "admin-news-item__meta";
      meta.textContent = formatDate(article.date);

      const title = document.createElement("h3");
      title.className = "admin-news-item__title";
      title.textContent = article.title;

      if (article.draft) {
        const badge = document.createElement("span");
        badge.className = "admin-news-item__draft";
        badge.textContent = "draft";
        title.append(" ", badge);
      }

      const summary = document.createElement("p");
      summary.className = "admin-news-item__summary";
      summary.textContent = article.summary ?? "";

      const actions = document.createElement("div");
      actions.className = "admin-news-item__actions";

      const editLink = document.createElement("a");
      editLink.className = "admin-btn admin-btn-small";
      editLink.href = adminNewsEditPath(article.slug);
      editLink.textContent = "edit";

      actions.append(editLink);
      item.append(meta, title);
      if (article.summary) item.append(summary);
      item.append(actions);
      listEl.append(item);
    }
  }

  async function loadArticles() {
    setLoading(true);
    showStatus(statusEl, "読み込み中…", "success");
    statusEl?.classList.add("is-visible");

    try {
      const response = await fetch("/api/admin/content/news", { credentials: "same-origin" });
      const data = (await response.json()) as {
        ok: boolean;
        articles?: NewsListItem[];
        message?: string;
      };

      if (!response.ok || !data.ok || !data.articles) {
        throw new Error(data.message ?? "読み込みに失敗しました。");
      }

      renderList(data.articles);
      showStatus(statusEl, "読み込み完了", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "読み込みに失敗しました。";
      showStatus(statusEl, message, "error");
    } finally {
      setLoading(false);
    }
  }

  await requireSession();
  await loadArticles();
  reloadBtn?.addEventListener("click", () => {
    loadArticles().catch(() => undefined);
  });
}
