export interface PagesEnv {
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  ADMIN_USER_1?: string;
  ADMIN_PASS_1?: string;
  ADMIN_USER_2?: string;
  ADMIN_PASS_2?: string;
  /** @deprecated Use ADMIN_USER_1 / ADMIN_PASS_1 instead */
  ADMIN_USERNAME?: string;
  /** @deprecated Use ADMIN_PASS_1 instead */
  ADMIN_PASSWORD?: string;
  /** @deprecated Legacy single-user SHA-256 hash */
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET?: string;
  /** Local dev only: auto-login username for SITE iframe workflow (127.0.0.1 / localhost). */
  DEV_AUTO_LOGIN_USER?: string;
  /** Discord / Slack incoming webhook for the public inquiry form. */
  CONTACT_WEBHOOK_URL?: string;
}

export function githubRepo(env: PagesEnv): string {
  return env.GITHUB_REPO ?? "kakuly/babytato.link";
}

export function githubBranch(env: PagesEnv): string {
  return env.GITHUB_BRANCH ?? "main";
}
