import { requireSession, showStatus } from "./client";

export type ReleaseType = "single" | "ep" | "album";
export type DiscographySection = "collabo" | "myReleases";

export type DiscographyEntry = {
  id: string;
  title: string;
  type: ReleaseType;
  date?: string;
  img: string;
  url?: string;
};

export type DiscographyData = {
  collabo: DiscographyEntry[];
  myReleases: DiscographyEntry[];
};

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_JACKET_BYTES = 10 * 1024 * 1024;

function slugifyId(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return ascii || "release";
}

function uniqueId(base: string, data: DiscographyData, ignore?: string): string {
  const taken = new Set(
    [...data.collabo, ...data.myReleases].map((entry) => entry.id).filter((id) => id !== ignore),
  );
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function cloneData(data: DiscographyData): DiscographyData {
  return {
    collabo: data.collabo.map((entry) => ({ ...entry })),
    myReleases: data.myReleases.map((entry) => ({ ...entry })),
  };
}

function jacketPreviewSrc(img: string, localUrl?: string): string {
  if (localUrl) return localUrl;
  if (!img) return "";
  if (/^https?:\/\//i.test(img)) return img;
  if (img.startsWith("/")) return `https://babytato.link${img}`;
  return img;
}

export async function initDiscographyEditor(): Promise<void> {
  await requireSession();

  const statusEl = document.getElementById("disco-status");
  const listEl = document.getElementById("disco-list");
  const emptyEl = document.getElementById("disco-empty");
  const loadingEl = document.getElementById("disco-loading");
  const form = document.getElementById("disco-form") as HTMLFormElement | null;
  const formWrap = document.getElementById("disco-form-wrap");
  const saveBtn = document.getElementById("disco-save") as HTMLButtonElement | null;
  const cancelBtn = document.getElementById("disco-cancel");
  const addBtn = document.getElementById("disco-add");
  const reloadBtn = document.getElementById("disco-reload");
  const tabs = document.querySelectorAll<HTMLButtonElement>("[data-disco-tab]");
  const previewImg = document.getElementById("disco-preview") as HTMLImageElement | null;
  const previewEmpty = document.getElementById("disco-preview-empty");
  const fileInput = document.getElementById("disco-file") as HTMLInputElement | null;
  const idInput = document.getElementById("disco-id") as HTMLInputElement | null;
  const titleInput = document.getElementById("disco-title") as HTMLInputElement | null;
  const typeInput = document.getElementById("disco-type") as HTMLSelectElement | null;
  const dateInput = document.getElementById("disco-date") as HTMLInputElement | null;
  const urlInput = document.getElementById("disco-url") as HTMLInputElement | null;
  const headingEl = document.getElementById("disco-form-heading");

  let fileSha = "";
  let data: DiscographyData = { collabo: [], myReleases: [] };
  let section: DiscographySection = "collabo";
  let editingId: string | null = null;
  let isNew = false;
  let autoId = true;
  let pendingFile: File | null = null;
  let pendingPreview = "";

  function setBusy(busy: boolean) {
    if (loadingEl) loadingEl.hidden = !busy;
    if (saveBtn) saveBtn.disabled = busy;
    if (addBtn instanceof HTMLButtonElement) addBtn.disabled = busy;
    if (reloadBtn instanceof HTMLButtonElement) reloadBtn.disabled = busy;
    tabs.forEach((tab) => {
      tab.disabled = busy;
    });
  }

  function currentList(): DiscographyEntry[] {
    return data[section];
  }

  function findEntry(id: string): { entry: DiscographyEntry; section: DiscographySection } | null {
    for (const key of ["collabo", "myReleases"] as const) {
      const entry = data[key].find((item) => item.id === id);
      if (entry) return { entry, section: key };
    }
    return null;
  }

  function closeForm() {
    editingId = null;
    isNew = false;
    autoId = true;
    pendingFile = null;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    pendingPreview = "";
    if (form) form.reset();
    if (formWrap) formWrap.hidden = true;
    if (fileInput) fileInput.value = "";
    updatePreview("");
  }

  function updatePreview(img: string) {
    const src = jacketPreviewSrc(img, pendingPreview);
    if (previewImg && src) {
      previewImg.src = src;
      previewImg.hidden = false;
      if (previewEmpty) previewEmpty.hidden = true;
    } else {
      if (previewImg) {
        previewImg.removeAttribute("src");
        previewImg.hidden = true;
      }
      if (previewEmpty) previewEmpty.hidden = false;
    }
  }

  function fillForm(entry: DiscographyEntry) {
    if (!form) return;
    if (idInput) {
      idInput.value = entry.id;
      idInput.readOnly = !isNew;
    }
    if (titleInput) titleInput.value = entry.title;
    if (typeInput) typeInput.value = entry.type;
    if (dateInput) dateInput.value = entry.date ?? "";
    if (urlInput) urlInput.value = entry.url ?? "";
    updatePreview(entry.img);
  }

  function openForm(entry: DiscographyEntry, asNew: boolean) {
    isNew = asNew;
    autoId = asNew;
    editingId = entry.id;
    pendingFile = null;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    pendingPreview = "";
    if (fileInput) fileInput.value = "";
    if (headingEl) headingEl.textContent = asNew ? "new release" : "edit release";
    if (formWrap) formWrap.hidden = false;
    fillForm(entry);
    titleInput?.focus();
  }

  function renderList() {
    if (!listEl || !emptyEl) return;
    listEl.replaceChildren();
    const entries = currentList();

    if (entries.length === 0) {
      listEl.hidden = true;
      emptyEl.hidden = false;
      emptyEl.textContent =
        section === "collabo" ? "コラボリリースはまだありません。" : "ソロリリースはまだありません。";
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;

    for (const entry of entries) {
      const item = document.createElement("li");
      item.className = "admin-disco-item";
      if (entry.id === editingId) item.classList.add("is-active");

      const thumb = document.createElement("img");
      thumb.className = "admin-disco-item__img";
      thumb.alt = "";
      const src = jacketPreviewSrc(entry.img);
      if (src) thumb.src = src;
      else thumb.hidden = true;

      const body = document.createElement("div");
      body.className = "admin-disco-item__body";

      const title = document.createElement("h3");
      title.className = "admin-disco-item__title";
      title.textContent = entry.title;

      const meta = document.createElement("p");
      meta.className = "admin-disco-item__meta";
      meta.textContent = [entry.type, entry.date, entry.url ? "link" : ""]
        .filter(Boolean)
        .join(" · ");

      const actions = document.createElement("div");
      actions.className = "admin-disco-item__actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-btn admin-btn-small";
      editBtn.textContent = "edit";
      editBtn.addEventListener("click", () => openForm(entry, false));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "admin-btn admin-btn-small admin-btn-danger";
      deleteBtn.textContent = "delete";
      deleteBtn.addEventListener("click", () => {
        deleteEntry(entry.id).catch(() => undefined);
      });

      body.append(title, meta);
      actions.append(editBtn, deleteBtn);
      item.append(thumb, body, actions);
      listEl.append(item);
    }
  }

  function setSection(next: DiscographySection) {
    section = next;
    tabs.forEach((tab) => {
      const active = tab.dataset.discoTab === next;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    closeForm();
    renderList();
  }

  function readForm(): DiscographyEntry | null {
    const title = titleInput?.value.trim() ?? "";
    const type = (typeInput?.value ?? "single") as ReleaseType;
    const id = idInput?.value.trim() ?? "";
    const date = dateInput?.value.trim() ?? "";
    const url = urlInput?.value.trim() ?? "";
    const existing = editingId ? findEntry(editingId)?.entry : undefined;
    const img = existing?.img ?? "";

    if (!title) {
      showStatus(statusEl, "タイトルを入力してください。", "error");
      return null;
    }
    if (!ID_RE.test(id)) {
      showStatus(statusEl, "id は英小文字・数字・ハイフンのみです。", "error");
      return null;
    }
    if (!["single", "ep", "album"].includes(type)) {
      showStatus(statusEl, "種別を選択してください。", "error");
      return null;
    }
    if (date && !DATE_RE.test(date)) {
      showStatus(statusEl, "日付は YYYY-MM-DD で入力してください。", "error");
      return null;
    }
    if (url && url !== "#" && !/^https?:\/\//i.test(url)) {
      showStatus(statusEl, "URL は https:// から入力してください。", "error");
      return null;
    }

    const entry: DiscographyEntry = { id, title, type, img };
    if (date) entry.date = date;
    if (url) entry.url = url;
    return entry;
  }

  async function uploadJacket(id: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("file", file);
    const response = await fetch("/api/admin/content/discography", {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    const payload = (await response.json()) as { ok: boolean; img?: string; message?: string };
    if (!response.ok || !payload.ok || !payload.img) {
      throw new Error(payload.message ?? "ジャケットのアップロードに失敗しました。");
    }
    return payload.img;
  }

  async function saveDiscography(next: DiscographyData, message?: string) {
    const response = await fetch("/api/admin/content/discography", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discography: next, sha: fileSha }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      discography?: DiscographyData;
      sha?: string;
      message?: string;
    };
    if (!response.ok || !payload.ok || !payload.discography) {
      throw new Error(payload.message ?? "保存に失敗しました。");
    }
    data = payload.discography;
    fileSha = payload.sha ?? fileSha;
    showStatus(statusEl, message ?? payload.message ?? "保存しました。", "success");
  }

  async function loadDiscography() {
    setBusy(true);
    showStatus(statusEl, "読み込み中…", "success");
    statusEl?.classList.add("is-visible");
    try {
      const response = await fetch("/api/admin/content/discography", { credentials: "same-origin" });
      const payload = (await response.json()) as {
        ok: boolean;
        discography?: DiscographyData;
        sha?: string;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.discography) {
        throw new Error(payload.message ?? "読み込みに失敗しました。");
      }
      data = payload.discography;
      fileSha = payload.sha ?? "";
      closeForm();
      renderList();
      showStatus(statusEl, "読み込み完了", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "読み込みに失敗しました。";
      showStatus(statusEl, message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    const found = findEntry(id);
    if (!found) return;
    if (!window.confirm(`「${found.entry.title}」を削除しますか？`)) return;

    setBusy(true);
    try {
      const next = cloneData(data);
      next[found.section] = next[found.section].filter((entry) => entry.id !== id);
      await saveDiscography(next, "削除しました。Cloudflare Pages の再ビルドが始まります。");
      if (editingId === id) closeForm();
      renderList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "削除に失敗しました。";
      showStatus(statusEl, message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent(event: Event) {
    event.preventDefault();
    const draft = readForm();
    if (!draft) return;
    if (!draft.img && !pendingFile) {
      showStatus(statusEl, "ジャケット画像を選んでください。", "error");
      return;
    }

    const duplicate = [...data.collabo, ...data.myReleases].some(
      (entry) => entry.id === draft.id && entry.id !== editingId,
    );
    if (duplicate) {
      showStatus(statusEl, "同じ id のリリースが既にあります。", "error");
      return;
    }

    if (pendingFile && pendingFile.size > MAX_JACKET_BYTES) {
      showStatus(statusEl, "ジャケットは 10MB 以下にしてください。", "error");
      return;
    }

    setBusy(true);
    showStatus(statusEl, "保存中…", "success");
    statusEl?.classList.add("is-visible");

    try {
      if (pendingFile) {
        draft.img = await uploadJacket(draft.id, pendingFile);
      }
      if (!draft.img) {
        throw new Error("ジャケット画像を選んでください。");
      }

      const next = cloneData(data);

      if (isNew) {
        next[section] = [draft, ...next[section]];
      } else if (editingId) {
        const found = findEntry(editingId);
        if (!found) throw new Error("編集中のリリースが見つかりません。");
        next[found.section] = next[found.section].map((entry) => (entry.id === editingId ? draft : entry));
      }

      await saveDiscography(next);
      closeForm();
      renderList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存に失敗しました。";
      showStatus(statusEl, message, "error");
    } finally {
      setBusy(false);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const next = tab.dataset.discoTab;
      if (next === "collabo" || next === "myReleases") setSection(next);
    });
  });

  addBtn?.addEventListener("click", () => {
    const id = uniqueId("release", data);
    openForm(
      {
        id,
        title: "",
        type: "single",
        img: "",
      },
      true,
    );
    renderList();
  });

  reloadBtn?.addEventListener("click", () => {
    loadDiscography().catch(() => undefined);
  });

  cancelBtn?.addEventListener("click", () => {
    closeForm();
    renderList();
  });

  form?.addEventListener("submit", (event) => {
    saveCurrent(event).catch(() => undefined);
  });

  titleInput?.addEventListener("input", () => {
    if (!isNew || !autoId || !idInput) return;
    idInput.value = uniqueId(slugifyId(titleInput.value), data);
  });

  idInput?.addEventListener("input", () => {
    if (isNew) autoId = false;
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0] ?? null;
    if (file && file.size > MAX_JACKET_BYTES) {
      pendingFile = null;
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      pendingPreview = "";
      fileInput.value = "";
      showStatus(statusEl, "ジャケットは 10MB 以下にしてください。", "error");
      updatePreview(findEntry(editingId ?? "")?.entry.img ?? "");
      return;
    }
    pendingFile = file;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    pendingPreview = file ? URL.createObjectURL(file) : "";
    updatePreview(findEntry(editingId ?? "")?.entry.img ?? "");
  });

  await loadDiscography();
}
