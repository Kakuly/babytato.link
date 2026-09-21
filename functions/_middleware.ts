import type { PagesEnv } from "./lib/env";
import {
  isManageHost,
  isManagePassthroughPath,
  manageAdminInternalPath,
  MANAGE_HOST,
} from "./lib/manage-host";
import {
  createSessionToken,
  readSessionCookie,
  sessionCookieHeader,
  verifySessionToken,
} from "./lib/session";

interface MiddlewareContext {
  request: Request;
  env: PagesEnv;
  next: (input?: RequestInfo, init?: RequestInit) => Promise<Response>;
}

async function hasValidSession(request: Request, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  const token = readSessionCookie(request);
  if (!token) return false;
  const session = await verifySessionToken(token, secret);
  return session !== null;
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function isDevAutoLoginEntryPath(pathname: string, manageHost: boolean): boolean {
  if (pathname === "/admin/login/" || pathname === "/admin/login") return true;
  if (pathname === "/admin/" || pathname === "/admin") return true;
  if (manageHost && (pathname === "/" || pathname === "")) return true;
  return false;
}

function devDashboardPath(manageHost: boolean): string {
  return manageHost ? "/" : "/admin/";
}

async function devAutoLoginRedirect(
  request: Request,
  env: PagesEnv,
  redirectPath: string,
): Promise<Response | null> {
  const username = env.DEV_AUTO_LOGIN_USER?.trim();
  if (!username) return null;

  const secret = env.SESSION_SECRET?.trim();
  if (!secret) return null;

  const url = new URL(request.url);
  const token = await createSessionToken(username, secret);
  const redirectUrl = new URL(redirectPath, url.origin).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      "Set-Cookie": sessionCookieHeader(token, url.hostname, url.protocol),
    },
  });
}

function rewriteRequest(request: Request, pathname: string): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;
  const pathname = url.pathname;
  const manageHost = isManageHost(hostname);

  if (
    isLocalDevHost(hostname) &&
    env.DEV_AUTO_LOGIN_USER?.trim() &&
    isDevAutoLoginEntryPath(pathname, manageHost)
  ) {
    const secret = env.SESSION_SECRET?.trim();
    const loggedIn = await hasValidSession(request, secret);
    const dashboardPath = devDashboardPath(manageHost);

    if (loggedIn) {
      const onLoginPage =
        pathname === "/admin/login/" ||
        pathname === "/admin/login" ||
        (manageHost && (pathname === "/" || pathname === ""));
      if (onLoginPage) {
        return Response.redirect(new URL(dashboardPath, url.origin).toString(), 302);
      }
    } else {
      const autoLogin = await devAutoLoginRedirect(request, env, dashboardPath);
      if (autoLogin) return autoLogin;
    }
  }

  if (!manageHost) {
    return next();
  }

  if (isManagePassthroughPath(pathname)) {
    return next();
  }

  // Canonical admin URLs on the manage host (no /admin prefix in the address bar).
  if (pathname === "/admin/login/" || pathname === "/admin/login") {
    return Response.redirect(new URL("/", url.origin).toString(), 302);
  }

  if (pathname === "/admin/" || pathname === "/admin") {
    return Response.redirect(new URL("/", url.origin).toString(), 302);
  }

  if (pathname.startsWith("/admin/")) {
    return Response.redirect(new URL("/", url.origin).toString(), 302);
  }

  const adminRoute = manageAdminInternalPath(pathname);
  if (adminRoute) {
    const loggedIn = await hasValidSession(request, env.SESSION_SECRET?.trim());
    if (!loggedIn) {
      return next(rewriteRequest(request, "/admin/login/"));
    }
    return next(rewriteRequest(request, adminRoute));
  }

  if (pathname !== "/" && pathname !== "") {
    return Response.redirect(new URL("/", url.origin).toString(), 302);
  }

  const loggedIn = await hasValidSession(request, env.SESSION_SECRET?.trim());
  const target = loggedIn ? "/admin/" : "/admin/login/";

  return next(rewriteRequest(request, target));
}

export { MANAGE_HOST };
