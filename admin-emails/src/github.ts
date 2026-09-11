import {
  loadTemplateSource,
  type SerializedTemplateSource,
  type TemplateSourceFiles,
} from "@singleton-sd/post-kit-editor";

import {
  GITHUB_BASE_BRANCH,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_REPO_NAME,
  TEMPLATES_ROOT,
} from "./auth";
import { assertTemplateRevisionFresh, type TemplateBlobShas } from "./revision";

export type { TemplateBlobShas } from "./revision";
export {
  assertTemplateRevisionFresh,
  STALE_TEMPLATE_MESSAGE,
} from "./revision";

export interface TemplateListItem {
  directory: string;
  key: string;
  name: string;
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  download_url?: string | null;
}

interface GitHubUser {
  login: string;
}

async function githubJson<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `GitHub API ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      // keep status
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function fetchAuthenticatedUser(
  token: string,
): Promise<GitHubUser> {
  return githubJson<GitHubUser>(token, "/user");
}

export async function listTemplateDirectories(
  token: string,
): Promise<TemplateListItem[]> {
  const items = await githubJson<GitHubContentItem[]>(
    token,
    `/repos/${GITHUB_REPO}/contents/${TEMPLATES_ROOT}?ref=${GITHUB_BASE_BRANCH}`,
  );
  const dirs = items.filter((item) => item.type === "dir");
  const listed: TemplateListItem[] = [];

  for (const dir of dirs) {
    try {
      const loaded = await loadTemplateFromGit(token, dir.name);
      listed.push({
        directory: dir.name,
        key: loaded.files.metadata.key,
        name: loaded.files.metadata.name,
      });
    } catch {
      // Skip incomplete directories (e.g. README-only).
    }
  }

  return listed.sort((a, b) => a.key.localeCompare(b.key));
}

async function readRepoFile(
  token: string,
  path: string,
  ref: string = GITHUB_BASE_BRANCH,
): Promise<{ text: string; sha: string }> {
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const item = await githubJson<{
    content?: string;
    encoding?: string;
    sha?: string;
  }>(
    token,
    `/repos/${GITHUB_REPO}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
  );
  if (!item.content || item.encoding !== "base64" || !item.sha) {
    throw new Error(`Could not read ${path}`);
  }
  return {
    text: decodeBase64Utf8(item.content.replace(/\n/g, "")),
    sha: item.sha,
  };
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export interface LoadedTemplate {
  files: TemplateSourceFiles;
  blobShas: TemplateBlobShas;
}

export async function loadTemplateFromGit(
  token: string,
  directory: string,
): Promise<LoadedTemplate> {
  const base = `${TEMPLATES_ROOT}/${directory}`;
  const [templateFile, metadataFile, previewFile] = await Promise.all([
    readRepoFile(token, `${base}/template.json`),
    readRepoFile(token, `${base}/metadata.json`),
    readRepoFile(token, `${base}/preview.json`),
  ]);
  return {
    files: loadTemplateSource({
      templateJson: JSON.parse(templateFile.text) as unknown,
      metadata: JSON.parse(metadataFile.text) as unknown,
      previewData: JSON.parse(previewFile.text) as unknown,
    }),
    blobShas: {
      template: templateFile.sha,
      metadata: metadataFile.sha,
      preview: previewFile.sha,
    },
  };
}

async function fetchTemplateBlobShas(
  token: string,
  directory: string,
  ref: string,
): Promise<TemplateBlobShas> {
  const base = `${TEMPLATES_ROOT}/${directory}`;
  const [templateFile, metadataFile, previewFile] = await Promise.all([
    readRepoFile(token, `${base}/template.json`, ref),
    readRepoFile(token, `${base}/metadata.json`, ref),
    readRepoFile(token, `${base}/preview.json`, ref),
  ]);
  return {
    template: templateFile.sha,
    metadata: metadataFile.sha,
    preview: previewFile.sha,
  };
}

/** Resolve main tip once; freshness + PR tree must share this commit. */
async function fetchBaseBranchSha(token: string): Promise<string> {
  const ref = await githubJson<{ object: { sha: string } }>(
    token,
    `/repos/${GITHUB_REPO}/git/ref/heads/${GITHUB_BASE_BRANCH}`,
  );
  return ref.object.sha;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export interface SavePullRequestResult {
  ok: true;
  prUrl: string;
  branch: string;
}

export async function saveTemplatePullRequest(
  token: string,
  directory: string,
  serialized: SerializedTemplateSource,
  files: TemplateSourceFiles,
  expectedBlobShas: TemplateBlobShas,
): Promise<SavePullRequestResult> {
  if (files.metadata.key.length === 0) {
    throw new Error("metadata.key is required.");
  }
  if (
    directory.includes("..") ||
    directory.includes("/") ||
    directory.startsWith(".")
  ) {
    throw new Error("Invalid template directory name.");
  }

  // Pin freshness reads and the PR parent to the same commit so main cannot
  // advance between the SHA check and tree creation (stale overwrite risk).
  const baseSha = await fetchBaseBranchSha(token);
  const currentShas = await fetchTemplateBlobShas(token, directory, baseSha);
  assertTemplateRevisionFresh(expectedBlobShas, currentShas);

  const user = await fetchAuthenticatedUser(token);
  const baseCommit = await githubJson<{ tree: { sha: string } }>(
    token,
    `/repos/${GITHUB_REPO}/git/commits/${baseSha}`,
  );

  const paths = {
    template: `${TEMPLATES_ROOT}/${directory}/template.json`,
    metadata: `${TEMPLATES_ROOT}/${directory}/metadata.json`,
    preview: `${TEMPLATES_ROOT}/${directory}/preview.json`,
  };

  const bodies = {
    template: `${serialized.templateJson.trimEnd()}\n`,
    metadata: `${serialized.metadataJson.trimEnd()}\n`,
    preview: `${serialized.previewJson.trimEnd()}\n`,
  };

  const [templateBlob, metadataBlob, previewBlob] = await Promise.all([
    githubJson<{ sha: string }>(token, `/repos/${GITHUB_REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: utf8ToBase64(bodies.template),
        encoding: "base64",
      }),
    }),
    githubJson<{ sha: string }>(token, `/repos/${GITHUB_REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: utf8ToBase64(bodies.metadata),
        encoding: "base64",
      }),
    }),
    githubJson<{ sha: string }>(token, `/repos/${GITHUB_REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: utf8ToBase64(bodies.preview),
        encoding: "base64",
      }),
    }),
  ]);

  const tree = await githubJson<{ sha: string }>(
    token,
    `/repos/${GITHUB_REPO}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: [
          {
            path: paths.template,
            mode: "100644",
            type: "blob",
            sha: templateBlob.sha,
          },
          {
            path: paths.metadata,
            mode: "100644",
            type: "blob",
            sha: metadataBlob.sha,
          },
          {
            path: paths.preview,
            mode: "100644",
            type: "blob",
            sha: previewBlob.sha,
          },
        ],
      }),
    },
  );

  const message = `content(email): update ${files.metadata.key} via email admin`;
  const commit = await githubJson<{ sha: string }>(
    token,
    `/repos/${GITHUB_REPO}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [baseSha],
      }),
    },
  );

  const slug = files.metadata.key
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 40);
  const branch = `cms/email-${slug}-${Date.now().toString(36)}`;

  await githubJson(token, `/repos/${GITHUB_REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    }),
  });

  const pr = await githubJson<{ html_url: string }>(
    token,
    `/repos/${GITHUB_REPO}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: `content(email): ${files.metadata.name} (${files.metadata.key})`,
        head: branch,
        base: GITHUB_BASE_BRANCH,
        body: [
          `Email template update from \`/admin/emails\` by @${user.login}.`,
          "",
          `Directory: \`${TEMPLATES_ROOT}/${directory}/\``,
          "",
          "Files: `template.json`, `metadata.json`, `preview.json`.",
          "",
          "Not a Decap collection — PostKit EmailBuilder sources only.",
        ].join("\n"),
      }),
    },
  );

  return { ok: true, prUrl: pr.html_url, branch };
}

/** Exported for tests / docs — never put API keys here. */
export const githubRepoLabel = `${GITHUB_OWNER}/${GITHUB_REPO_NAME}`;
