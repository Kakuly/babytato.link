import type { PagesEnv } from "../../lib/env";
import { readSessionCookie, verifySessionToken } from "../../lib/session";

interface SessionContext {
  request: Request;
  env: PagesEnv;
}

export async function onRequestGet(context: SessionContext): Promise<Response> {
  const { request, env } = context;
  const secret = env.SESSION_SECRET;

  if (!secret) {
    return Response.json({ ok: false, message: "SESSION_SECRET is not configured." }, { status: 500 });
  }

  const token = readSessionCookie(request);
  if (!token) {
    return Response.json({ ok: false, message: "未ログイン" }, { status: 401 });
  }

  const session = await verifySessionToken(token, secret);
  if (!session) {
    return Response.json({ ok: false, message: "セッションが無効です。" }, { status: 401 });
  }

  return Response.json({ ok: true, username: session.u });
}
