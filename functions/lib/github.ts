import type { PagesEnv } from "./env";
import { githubBranch, githubRepo } from "./env";

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface GitHubDirEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

interface GitHubContentsResponse {
  content?: string;
  sha?: string;
  message?: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "babytato-link-admin",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function readGitHubFile(env: PagesEnv, path: string): Promise<GitHubFile | null> {
  const token = env.GITHUB_TOKEN?.trim();
  const repo = githubRepo(env);
  const branch = githubBranch(env);
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;

  if (token) {
    const response = await fetch(url, { headers: authHeaders(token) });
    if (response.status === 404) return null;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GitHubContentsResponse;
      throw new Error(body.message ?? `GitHub read failed (${response.status})`);
    }
    const data = (await response.json()) as GitHubContentsResponse;
    if (!data.content || !data.sha) throw new Error("GitHub response missing content or sha.");
    const content = atob(data.content.replace(/\n/g, ""));
    return { path, content, sha: data.sha };
  }

  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  const response = await fetch(rawUrl);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub raw read failed (${response.status})`);
  const content = await response.text();
  return { path, content, sha: "" };
}

export async function writeGitHubFile(
  env: PagesEnv,
  path: string,
  content: string,
  sha: string | undefined,
  message: string,
): Promise<{ sha: string }> {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN が未設定です。Cloudflare Dashboard または .dev.vars に設定してください。");
  }

  const repo = githubRepo(env);
  const branch = githubBranch(env);
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };
  if (sha) body.sha = sha;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as GitHubContentsResponse;
    throw new Error(data.message ?? `GitHub write failed (${response.status})`);
  }

  const data = (await response.json()) as { content?: { sha?: string } };
  return { sha: data.content?.sha ?? "" };
}

interface GitHubContentsListItem {
  name?: string;
  path?: string;
  sha?: string;
  type?: string;
  message?: string;
}

export async function listGitHubDirectory(env: PagesEnv, dirPath: string): Promise<GitHubDirEntry[]> {
  const token = env.GITHUB_TOKEN?.trim();
  const repo = githubRepo(env);
  const branch = githubBranch(env);
  const url = `https://api.github.com/repos/${repo}/contents/${dirPath}?ref=${encodeURIComponent(branch)}`;

  if (!token) {
    throw new Error("GITHUB_TOKEN が未設定です。Cloudflare Dashboard または .dev.vars に設定してください。");
  }

  const response = await fetch(url, { headers: authHeaders(token) });
  if (response.status === 404) return [];
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as GitHubContentsListItem;
    throw new Error(body.message ?? `GitHub list failed (${response.status})`);
  }

  const data = (await response.json()) as GitHubContentsListItem[];
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item.type === "file" && item.name && item.path && item.sha)
    .map((item) => ({
      name: item.name!,
      path: item.path!,
      sha: item.sha!,
      type: "file" as const,
    }));
}

export async function deleteGitHubFile(
  env: PagesEnv,
  path: string,
  sha: string,
  message: string,
): Promise<void> {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN が未設定です。Cloudflare Dashboard または .dev.vars に設定してください。");
  }

  const repo = githubRepo(env);
  const branch = githubBranch(env);
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, sha, branch }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as GitHubContentsResponse;
    throw new Error(data.message ?? `GitHub delete failed (${response.status})`);
  }
}
