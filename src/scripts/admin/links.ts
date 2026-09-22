import { requireSession, showStatus } from "./client";

const PLATFORM_KEYS = [
  "x",
  "instagram",
  "youtube",
  "soundcloud",
  "tiktok",
  "fanbox",
  "booth",
  "spotify",
  "appleMusic",
  "bandcamp",
  "discord",
] as const;

type SocialLinks = Record<(typeof PLATFORM_KEYS)[number], string>;

export async function initLinksEditor(): Promise<void> {
  const form = document.getElementById("links-form") as HTMLFormElement | null;
  const statusEl = document.getElementById("links-status");
  const saveBtn = document.getElementById("links-save") as HTMLButtonElement | null;
  const reloadBtn = document.getElementById("links-reload");
  let fileSha = "";

  function setLoading(loading: boolean) {
    if (saveBtn) saveBtn.disabled = loading;
    if (reloadBtn instanceof HTMLButtonElement) reloadBtn.disabled = loading;
  }

  function emptyLinks(): SocialLinks {
    return Object.fromEntries(PLATFORM_KEYS.map((k) => [k, ""])) as SocialLinks;
  }

  function fillForm(links: SocialLinks) {
    if (!form) return;
    for (const key of PLATFORM_KEYS) {
      const input = form.elements.namedItem(key) as HTMLInputElement | null;
      if (input) input.value = links[key] ?? "";
    }
  }

  function readForm(): SocialLinks {
    const links = emptyLinks();
    if (!form) return links;
    for (const key of PLATFORM_KEYS) {
      const input = form.elements.namedItem(key) as HTMLInputElement | null;
      links[key] = (input?.value ?? "").trim();
    }
    return links;
  }

  async function loadLinks() {
    setLoading(true);
    showStatus(statusEl, "読み込み中…", "success");
    statusEl?.classList.add("is-visible");

    try {
      const response = await fetch("/api/admin/content/links", { credentials: "same-origin" });
      const data = (await response.json()) as {
        ok: boolean;
        links?: SocialLinks;
        sha?: string;
        message?: string;
      };

      if (!response.ok || !data.ok || !data.links) {
        throw new Error(data.message ?? "読み込みに失敗しました。");
      }

      fileSha = data.sha ?? "";
      fillForm({ ...emptyLinks(), ...data.links });
      showStatus(statusEl, "読み込み完了", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "読み込みに失敗しました。";
      showStatus(statusEl, message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveLinks(event: Event) {
    event.preventDefault();
    if (!form) return;

    const links = readForm();
    for (const key of PLATFORM_KEYS) {
      const value = links[key];
      if (value && !/^https?:\/\//i.test(value)) {
        showStatus(statusEl, `${key}: https:// で始まる URL を入力してください（空欄で非表示）。`, "error");
        statusEl?.classList.add("is-visible");
        return;
      }
    }

    setLoading(true);
    showStatus(statusEl, "保存中…", "success");
    statusEl?.classList.add("is-visible");

    try {
      const response = await fetch("/api/admin/content/links", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links, sha: fileSha }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        links?: SocialLinks;
        sha?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "保存に失敗しました。");
      }

      if (data.links) fillForm({ ...emptyLinks(), ...data.links });
      fileSha = data.sha ?? fileSha;
      showStatus(statusEl, data.message ?? "保存しました。", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存に失敗しました。";
      showStatus(statusEl, message, "error");
    } finally {
      setLoading(false);
    }
  }

  await requireSession();
  await loadLinks();
  form?.addEventListener("submit", saveLinks);
  reloadBtn?.addEventListener("click", () => {
    loadLinks().catch(() => undefined);
  });
}
