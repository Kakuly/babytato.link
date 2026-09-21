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

const ASSET_PREFIXES = ["/_astro/", "/favicon.svg", "/tato-", "/holo-field.png", "/releases/"];

/** Public manage-host prefixes rewritten to internal /admin/* routes. */
const MANAGE_ADMIN_PREFIXES = ["/links", "/news", "/discography"] as const;

export function manageAdminInternalPath(pathname: string): string | null {
  for (const prefix of MANAGE_ADMIN_PREFIXES) {
    if (pathname === prefix || pathname === `${prefix}/` || pathname.startsWith(`${prefix}/`)) {
      const rest = pathname === prefix ? "/" : pathname.slice(prefix.length) || "/";
      const internal = `/admin${prefix}${rest === "/" ? "/" : rest}`;
      return internal.endsWith("/") ? internal : `${internal}/`;
    }
  }
  return null;
}

export function isManagePassthroughPath(pathname: string): boolean {
  if (pathname.startsWith("/api/admin/")) return true;
  return ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
