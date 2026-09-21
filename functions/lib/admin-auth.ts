import type { PagesEnv } from "./env";
import { readSessionCookie, verifySessionToken } from "./session";

export interface AdminContext {
  request: Request;
  env: PagesEnv;
  params?: Record<string, string | undefined>;
}

export async function requireAdmin(context: AdminContext): Promise<
  | { ok: true; username: string }
  | { ok: false; response: Response }
> {
  const secret = context.env.SESSION_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: Response.json({ ok: false, message: "SESSION_SECRET is not configured." }, { status: 500 }),
    };
  }

  const token = readSessionCookie(context.request);
  if (!token) {
    return {
      ok: false,
      response: Response.json({ ok: false, message: "ログインが必要です。" }, { status: 401 }),
    };
  }

  const session = await verifySessionToken(token, secret);
  if (!session) {
    return {
      ok: false,
      response: Response.json({ ok: false, message: "セッションが無効です。" }, { status: 401 }),
    };
  }

  return { ok: true, username: session.u };
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ ok: false, message }, { status });
}
