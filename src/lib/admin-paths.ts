/** Must match functions/lib/manage-host.ts */
export const MANAGE_HOST = "manage.babytato.link";

export type AdminTabId = "overview" | "news" | "links" | "discography";

export function isManageHost(hostname = globalThis.location?.hostname ?? ""): boolean {
  return hostname === MANAGE_HOST;
}

function adminRoot(): string {
  return isManageHost() ? "/" : "/admin/";
}

export function adminLoginPath(): string {
  return isManageHost() ? "/" : "/admin/login/";
}

export function adminDashboardPath(tab?: AdminTabId): string {
  const root = adminRoot();
  if (!tab || tab === "overview") return root;
  return `${root}?tab=${tab}`;
}

export function adminLinksPath(): string {
  return adminDashboardPath("links");
}

export function adminNewsPath(): string {
  return adminDashboardPath("news");
}

export function adminNewsEditPath(slug?: string): string {
  const base = isManageHost() ? "/news/edit/" : "/admin/news/edit/";
  return slug ? `${base}?slug=${encodeURIComponent(slug)}` : base;
}

export function adminDiscographyPath(): string {
  return adminDashboardPath("discography");
}
