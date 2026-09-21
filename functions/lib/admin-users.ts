import type { PagesEnv } from "./env";
import { timingSafeEqual, verifyPasswordAgainstCredentials } from "./password";

export interface AdminUser {
  username: string;
  password?: string;
  passwordHash?: string;
}

function loadMultiAdminUsers(env: PagesEnv): AdminUser[] {
  const users: AdminUser[] = [];

  const pairs: Array<[string | undefined, string | undefined]> = [
    [env.ADMIN_USER_1, env.ADMIN_PASS_1],
    [env.ADMIN_USER_2, env.ADMIN_PASS_2],
  ];

  for (const [username, password] of pairs) {
    const trimmedUsername = username?.trim();
    if (trimmedUsername && password) {
      users.push({ username: trimmedUsername, password });
    }
  }

  return users;
}

function loadLegacyAdminUser(env: PagesEnv): AdminUser | null {
  const username = env.ADMIN_USERNAME?.trim();
  if (!username) return null;

  if (env.ADMIN_PASSWORD_HASH) {
    return { username, passwordHash: env.ADMIN_PASSWORD_HASH.trim().toLowerCase() };
  }

  if (env.ADMIN_PASSWORD) {
    return { username, password: env.ADMIN_PASSWORD };
  }

  return null;
}

export function loadAdminUsers(env: PagesEnv): AdminUser[] {
  const multi = loadMultiAdminUsers(env);
  if (multi.length > 0) return multi;

  const legacy = loadLegacyAdminUser(env);
  return legacy ? [legacy] : [];
}

export function adminUsersConfigured(env: PagesEnv): boolean {
  return loadAdminUsers(env).length > 0;
}

export async function verifyAdminLogin(
  inputUsername: string,
  password: string,
  env: PagesEnv,
): Promise<string | null> {
  const users = loadAdminUsers(env);
  if (users.length === 0) return null;

  const trimmed = inputUsername.trim();
  let matched: AdminUser | undefined;

  for (const user of users) {
    if (timingSafeEqual(user.username, trimmed)) {
      matched = user;
      break;
    }
  }

  const target = matched ?? users[0];
  const valid = await verifyPasswordAgainstCredentials(password, {
    password: target.password,
    passwordHash: target.passwordHash,
  });
  if (!matched || !valid) return null;

  return matched.username;
}
