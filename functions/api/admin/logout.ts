import { clearSessionCookieHeader } from "../../lib/session";

interface LogoutContext {
  request: Request;
}

export async function onRequestPost(context: LogoutContext): Promise<Response> {
  const hostname = new URL(context.request.url).hostname;

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookieHeader(hostname),
      },
    },
  );
}
