export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface PasswordCredentials {
  password?: string;
  passwordHash?: string;
}

export async function verifyPasswordAgainstCredentials(
  password: string,
  credentials: PasswordCredentials,
): Promise<boolean> {
  if (credentials.passwordHash) {
    const hash = await hashPassword(password);
    return timingSafeEqual(hash, credentials.passwordHash);
  }

  if (credentials.password) {
    return timingSafeEqual(password, credentials.password);
  }

  return false;
}
