import { adminLoginPath } from "../../lib/admin-paths";

export interface SessionResponse {
  ok: boolean;
  username?: string;
  message?: string;
}

export async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/admin/session", { credentials: "same-origin" });
  return (await response.json()) as SessionResponse;
}

export async function requireSession(loginPath = adminLoginPath()): Promise<SessionResponse> {
  const session = await fetchSession();
  if (!session.ok) {
    window.location.href = loginPath;
    throw new Error("unauthenticated");
  }
  return session;
}

export function showStatus(
  element: HTMLElement | null,
  message: string,
  type: "success" | "error" = "success",
): void {
  if (!element) return;
  element.textContent = message;
  element.className = `admin-status is-visible is-${type}`;
}
