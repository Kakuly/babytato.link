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

const SECTION_TABS = {
  "/news": "news",
  "/links": "links",
  "/discography": "discography",
} as const;

type SectionTab = (typeof SECTION_TABS)[keyof typeof SECTION_TABS];

/** Deep-link paths on manage host that should open a dashboard tab. */
export function manageAdminTabRedirect(pathname: string): `/?tab=${SectionTab}` | null {
  for (const [prefix, tab] of Object.entries(SECTION_TABS) as [keyof typeof SECTION_TABS, SectionTab][]) {
    if (pathname === prefix || pathname === `${prefix}/`) {
      return `/?tab=${tab}`;
    }
  }
  return null;
}

/** Nested manage-host routes rewritten to internal /admin/* pages (e.g. news edit). */
export function manageAdminInternalPath(pathname: string): string | null {
  if (pathname === "/news/edit" || pathname === "/news/edit/" || pathname.startsWith("/news/edit/")) {
    return "/admin/news/edit/";
  }
  return null;
}

export function isManagePassthroughPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return true;
  return ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
