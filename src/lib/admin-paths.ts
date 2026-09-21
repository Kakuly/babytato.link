/** Must match functions/lib/manage-host.ts */
export const MANAGE_HOST = "manage.babytato.link";

export function isManageHost(hostname = globalThis.location?.hostname ?? ""): boolean {
  return hostname === MANAGE_HOST;
}

export function adminLoginPath(): string {
  return isManageHost() ? "/" : "/admin/login/";
}

export function adminDashboardPath(): string {
  return isManageHost() ? "/" : "/admin/";
}

export function adminLinksPath(): string {
  return isManageHost() ? "/links/" : "/admin/links/";
}

export function adminNewsPath(): string {
  return isManageHost() ? "/news/" : "/admin/news/";
}

export function adminNewsEditPath(slug?: string): string {
  const base = isManageHost() ? "/news/edit/" : "/admin/news/edit/";
  return slug ? `${base}?slug=${encodeURIComponent(slug)}` : base;
}
