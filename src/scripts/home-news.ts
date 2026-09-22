import { marked } from "marked";

type PublicNewsListItem = {
  slug: string;
  title: string;
  date: string;
  summary?: string;
};

type PublicNewsArticle = PublicNewsListItem & {
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

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true");
}

type ModalRefs = {
  root: HTMLElement;
  dialog: HTMLElement;
  meta: HTMLElement;
  title: HTMLElement;
  summary: HTMLElement;
  status: HTMLElement;
  prose: HTMLElement;
  closeBtn: HTMLButtonElement;
};

function ensureModal(wrap: HTMLElement): ModalRefs {
  let root = wrap.querySelector<HTMLElement>("[data-news-modal]");
  if (!root) {
    root = document.createElement("div");
    root.className = "news-modal";
    root.hidden = true;
    root.dataset.newsModal = "";
    root.innerHTML = `
      <div class="news-modal__backdrop" data-news-modal-dismiss tabindex="-1"></div>
      <div
        class="news-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-modal-title"
        data-news-modal-dialog
      >
        <button type="button" class="news-modal__close" data-news-modal-dismiss aria-label="閉じる">
          <span aria-hidden="true">×</span>
        </button>
        <p class="news-modal__meta" data-news-modal-meta></p>
        <h2 class="news-modal__title" id="news-modal-title" data-news-modal-title></h2>
        <p class="news-modal__summary" data-news-modal-summary hidden></p>
        <p class="news-modal__status" data-news-modal-status hidden></p>
        <div class="news-modal__prose" data-news-modal-prose></div>
      </div>
    `;
    wrap.append(root);
  }

  const dialog = root.querySelector<HTMLElement>("[data-news-modal-dialog]");
  const meta = root.querySelector<HTMLElement>("[data-news-modal-meta]");
  const title = root.querySelector<HTMLElement>("[data-news-modal-title]");
  const summary = root.querySelector<HTMLElement>("[data-news-modal-summary]");
  const status = root.querySelector<HTMLElement>("[data-news-modal-status]");
  const prose = root.querySelector<HTMLElement>("[data-news-modal-prose]");
  const closeBtn = root.querySelector<HTMLButtonElement>(".news-modal__close");
  if (!dialog || !meta || !title || !summary || !status || !prose || !closeBtn) {
    throw new Error("news modal markup incomplete");
  }
  return { root, dialog, meta, title, summary, status, prose, closeBtn };
}

function renderArticles(listEl: HTMLElement, articles: PublicNewsListItem[]) {
  listEl.replaceChildren();
  for (const article of articles) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "news-item";
    item.dataset.newsSlug = article.slug;
    item.dataset.newsDate = article.date;
    if (article.summary) item.dataset.newsSummary = article.summary;
    item.setAttribute("aria-haspopup", "dialog");

    const meta = document.createElement("span");
    meta.className = "news-item__meta";
    meta.textContent = formatDate(article.date);

    const title = document.createElement("span");
    title.className = "news-item__title";
    title.textContent = article.title;

    item.append(meta, title);

    if (article.summary) {
      const summary = document.createElement("span");
      summary.className = "news-item__summary";
      summary.textContent = article.summary;
      item.append(summary);
    }

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

  const modal = ensureModal(wrap);
  let lastFocus: HTMLElement | null = null;
  let openSlug = "";
  let loadToken = 0;

  const closeModal = () => {
    if (modal.root.hidden) return;
    modal.root.hidden = true;
    document.body.classList.remove("news-modal-open");
    openSlug = "";
    modal.prose.replaceChildren();
    modal.status.hidden = true;
    modal.status.textContent = "";
    if (lastFocus) {
      lastFocus.focus();
      lastFocus = null;
    }
  };

  const openModalShell = (article: PublicNewsListItem, trigger: HTMLElement) => {
    lastFocus = trigger;
    openSlug = article.slug;
    modal.meta.textContent = formatDate(article.date);
    modal.title.textContent = article.title;
    if (article.summary) {
      modal.summary.hidden = false;
      modal.summary.textContent = article.summary;
    } else {
      modal.summary.hidden = true;
      modal.summary.textContent = "";
    }
    modal.prose.replaceChildren();
    modal.status.hidden = false;
    modal.status.textContent = "読み込み中…";
    modal.status.classList.remove("is-error");
    modal.root.hidden = false;
    document.body.classList.add("news-modal-open");
    modal.closeBtn.focus();
  };

  const loadArticle = async (slug: string) => {
    const token = ++loadToken;
    try {
      const response = await fetch(`/api/news?slug=${encodeURIComponent(slug)}`, {
        credentials: "omit",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        article?: PublicNewsArticle;
        message?: string;
      };
      if (token !== loadToken || openSlug !== slug) return;
      if (!response.ok || !data.ok || !data.article) {
        throw new Error(data.message ?? "記事を読み込めませんでした。");
      }

      modal.status.hidden = true;
      modal.status.textContent = "";
      modal.prose.innerHTML = renderBody(data.article.body);
    } catch (error) {
      if (token !== loadToken || openSlug !== slug) return;
      const message = error instanceof Error ? error.message : "記事を読み込めませんでした。";
      modal.status.hidden = false;
      modal.status.textContent = message;
      modal.status.classList.add("is-error");
      modal.prose.replaceChildren();
    }
  };

  modal.root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-news-modal-dismiss]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (modal.root.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = getFocusable(modal.dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      modal.closeBtn.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  listEl.addEventListener("click", (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(".news-item");
    if (!trigger?.dataset.newsSlug) return;
    const slug = trigger.dataset.newsSlug;
    const title = trigger.querySelector(".news-item__title")?.textContent ?? "";
    const date = trigger.dataset.newsDate ?? "";
    const summary = trigger.dataset.newsSummary || undefined;

    openModalShell({ slug, title, date, summary }, trigger);
    void loadArticle(slug);
  });

  setStatus(statusEl, emptyEl, listEl, "読み込み中…", "loading");

  void (async () => {
    try {
      // Local Astro (:4322) proxies /api → pages:dev (:8788) via astro.config.
      const response = await fetch("/api/news", { credentials: "omit" });
      const data = (await response.json()) as {
        ok?: boolean;
        articles?: PublicNewsListItem[];
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
