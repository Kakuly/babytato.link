/** Hostname for the admin-only subdomain (Cloudflare Pages custom domain). */
export const MANAGE_HOST = "manage.babytato.link";

export function isManageHost(hostname: string): boolean {
  return hostname === MANAGE_HOST;
}

/** Shared session cookie across babytato.link and subdomains (production only). */
export function cookieDomain(hostname: string): string | null {
  if (hostname === "babytato.link" || hostname.endsWith(".babytato.link")) {
    return ".babytato.link";
  }
  return null;
}

const ASSET_PREFIXES = ["/_astro/", "/favicon.svg", "/tato-", "/holo-field.png"];

export function isManagePassthroughPath(pathname: string): boolean {
  if (pathname.startsWith("/api/admin/")) return true;
  return ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
