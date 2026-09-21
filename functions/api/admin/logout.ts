import { clearSessionCookieHeader } from "../../lib/session";

interface LogoutContext {
  request: Request;
}

export async function onRequestPost(context: LogoutContext): Promise<Response> {
  const url = new URL(context.request.url);

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookieHeader(url.hostname, url.protocol),
      },
    },
  );
}
