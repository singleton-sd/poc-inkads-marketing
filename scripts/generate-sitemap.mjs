import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isDraftFrontmatter } from "../src/lib/draft-frontmatter.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(repoRoot, "dist");
const contentRoot = path.join(repoRoot, "src", "content");
const site = "https://inkads.poc.singletonsd.com";

const SKIP_FILES = new Set(["404.html"]);

/**
 * Optional `slug:` from frontmatter (marketing collection).
 * @param {string} source
 */
function frontmatterSlug(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;
  const slugMatch = (match[1] ?? "").match(
    /^slug:\s*["']?([^"'\n]+)["']?\s*$/m,
  );
  return slugMatch?.[1]?.trim();
}

/**
 * Routes that must not appear in the sitemap because their CMS entry is draft.
 * Dist already omits most drafts; this is a belt-and-braces filter.
 * @returns {Promise<Set<string>>}
 */
async function loadDraftRoutes() {
  const drafts = new Set();

  /** @param {string} dir @param {(name: string, source: string) => void} visit */
  async function walkMarkdown(dir, visit) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkMarkdown(fullPath, visit);
        continue;
      }
      if (!entry.name.endsWith(".md") && !entry.name.endsWith(".mdx")) continue;
      const source = await readFile(fullPath, "utf8");
      visit(entry.name.replace(/\.(md|mdx)$/, ""), source);
    }
  }

  await walkMarkdown(path.join(contentRoot, "pages"), (name, source) => {
    if (!isDraftFrontmatter(source)) return;
    if (name === "home") {
      drafts.add("/");
      return;
    }
    drafts.add(`/${name}/`);
  });

  await walkMarkdown(path.join(contentRoot, "marketing"), (name, source) => {
    if (!isDraftFrontmatter(source)) return;
    const slug = frontmatterSlug(source) ?? name;
    drafts.add(`/${slug}/`);
  });

  await walkMarkdown(path.join(contentRoot, "legal"), (name, source) => {
    if (!isDraftFrontmatter(source)) return;
    drafts.add(`/${name}/`);
  });

  return drafts;
}

/** @param {string} dir */
async function collectHtmlRoutes(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    // Mirror tests/visual.mjs: never publish hidden / reserved build dirs.
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "visual" || entry.name === "admin") continue;
      routes.push(
        ...(await collectHtmlRoutes(fullPath, `${prefix}${entry.name}/`)),
      );
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    if (SKIP_FILES.has(entry.name)) continue;

    if (entry.name === "index.html") {
      routes.push(prefix.length === 0 ? "/" : `/${prefix}`);
    } else {
      const slug = entry.name.replace(/\.html$/, "");
      routes.push(`/${prefix}${slug}/`);
    }
  }

  return routes;
}

const draftRoutes = await loadDraftRoutes();
const routes = (await collectHtmlRoutes(distDir)).filter(
  (route) => !draftRoutes.has(route),
);
const uniqueRoutes = [...new Set(routes)].sort((a, b) => a.localeCompare(b));

const urlEntries = uniqueRoutes
  .map((route) => {
    const loc = route === "/" ? `${site}/` : `${site}${route}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

await mkdir(distDir, { recursive: true });
await writeFile(path.join(distDir, "sitemap.xml"), xml, "utf8");

await writeFile(
  path.join(repoRoot, "public/sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Generated during pnpm build — see scripts/generate-sitemap.mjs -->
  <url>
    <loc>${site}/</loc>
    <changefreq>monthly</changefreq>
  </url>
</urlset>
`,
  "utf8",
);

console.log(
  `Generated sitemap with ${uniqueRoutes.length} routes` +
    (draftRoutes.size > 0
      ? ` (excluded ${draftRoutes.size} draft path(s))`
      : ""),
);
