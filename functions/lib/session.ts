import { cookieDomain } from "./manage-host";

const COOKIE_NAME = "tato_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  u: string;
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(username: string, secret: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadPart = toBase64Url(payloadBytes);
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return `${payloadPart}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadPart, sigPart] = parts;
  const key = await getHmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(sigPart),
    new TextEncoder().encode(payloadPart),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as SessionPayload;
    if (!payload.u || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }

  return null;
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

/** Omit Secure on http:// localhost so pages:dev and SITE iframe login work. */
function cookieSecurePart(hostname?: string, protocol?: string): string {
  if (protocol === "http:") return "";
  if (hostname && isLocalDevHost(hostname)) return "";
  return "; Secure";
}

/**
 * Lax blocks Set-Cookie in cross-site iframes (e.g. SITE at localhost:4001 embedding
 * 127.0.0.1:8788). Chrome allows SameSite=None without Secure on localhost / 127.0.0.1.
 */
function cookieSameSitePart(hostname?: string, protocol?: string): string {
  if (protocol === "http:" && hostname && isLocalDevHost(hostname)) {
    return "SameSite=None";
  }
  return "SameSite=Lax";
}

function cookieDomainPart(hostname?: string): string {
  if (!hostname) return "";
  const domain = cookieDomain(hostname);
  return domain ? `; Domain=${domain}` : "";
}

export function sessionCookieHeader(token: string, hostname?: string, protocol?: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${cookieSameSitePart(hostname, protocol)}; Max-Age=${SESSION_MAX_AGE}${cookieSecurePart(hostname, protocol)}${cookieDomainPart(hostname)}`;
}

export function clearSessionCookieHeader(hostname?: string, protocol?: string): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; ${cookieSameSitePart(hostname, protocol)}; Max-Age=0${cookieSecurePart(hostname, protocol)}${cookieDomainPart(hostname)}`;
}

export { COOKIE_NAME, SESSION_MAX_AGE };
