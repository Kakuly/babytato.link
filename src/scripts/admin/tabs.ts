export type AdminTabId = "overview" | "news" | "links" | "discography";

const TAB_IDS: AdminTabId[] = ["overview", "news", "links", "discography"];

function isAdminTabId(value: string | null | undefined): value is AdminTabId {
  return !!value && (TAB_IDS as string[]).includes(value);
}

export function readAdminTabFromLocation(search = window.location.search, hash = window.location.hash): AdminTabId {
  const params = new URLSearchParams(search);
  const fromQuery = params.get("tab");
  if (isAdminTabId(fromQuery)) return fromQuery;

  const fromHash = hash.replace(/^#/, "").trim();
  if (isAdminTabId(fromHash)) return fromHash;

  return "overview";
}

export function writeAdminTabToLocation(tab: AdminTabId): void {
  const next = new URL(window.location.href);
  if (tab === "overview") {
    next.searchParams.delete("tab");
  } else {
    next.searchParams.set("tab", tab);
  }
  if (next.hash) next.hash = "";
  window.history.replaceState({}, "", next);
}

export function initAdminTabs(options?: {
  onChange?: (tab: AdminTabId) => void;
  initialTab?: AdminTabId;
}): AdminTabId {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-admin-tab]"));
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-admin-panel]"));

  function setActive(tab: AdminTabId, persist = true) {
    for (const button of buttons) {
      const active = button.dataset.adminTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
    }

    for (const panel of panels) {
      const active = panel.dataset.adminPanel === tab;
      panel.hidden = !active;
    }

    if (persist) writeAdminTabToLocation(tab);
    options?.onChange?.(tab);
  }

  const initial = options?.initialTab ?? readAdminTabFromLocation();
  setActive(initial, true);

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.adminTab;
      if (!isAdminTabId(tab)) return;
      setActive(tab);
    });
  }

  window.addEventListener("popstate", () => {
    setActive(readAdminTabFromLocation(), false);
  });

  return initial;
}
