import type { PagesEnv } from "./lib/env";
import { isManageHost, isManagePassthroughPath, MANAGE_HOST } from "./lib/manage-host";
import { readSessionCookie, verifySessionToken } from "./lib/session";

interface MiddlewareContext {
  request: Request;
  env: PagesEnv;
  next: (input?: RequestInit | Request) => Promise<Response>;
}

async function hasValidSession(request: Request, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  const token = readSessionCookie(request);
  if (!token) return false;
  const session = await verifySessionToken(token, secret);
  return session !== null;
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

  if (!isManageHost(hostname)) {
    return next();
  }

  const pathname = url.pathname;

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

  if (pathname !== "/" && pathname !== "") {
    return Response.redirect(new URL("/", url.origin).toString(), 302);
  }

  const loggedIn = await hasValidSession(request, env.SESSION_SECRET?.trim());
  const target = loggedIn ? "/admin/" : "/admin/login/";

  return next({ request: rewriteRequest(request, target) });
}

export { MANAGE_HOST };
