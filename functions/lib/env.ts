/** Minimal D1 surface used by news (Pages `DB` binding). */
export interface NewsD1Statement {
  bind(...values: unknown[]): NewsD1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface NewsD1 {
  prepare(query: string): NewsD1Statement;
  batch<T = unknown>(statements: NewsD1Statement[]): Promise<T[]>;
}

/** Minimal R2 surface used by news images (Pages `MEDIA` binding). */
export interface NewsR2Object {
  body: ReadableStream | null;
  httpEtag?: string;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata(headers: Headers): void;
}

export interface NewsR2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<NewsR2Object | null>;
}

export interface PagesEnv {
  DB?: NewsD1;
  MEDIA?: NewsR2Bucket;
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
