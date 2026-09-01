import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(repoRoot, "dist");
const site = "https://inkads.poc.singletonsd.com";

const SKIP_FILES = new Set(["404.html"]);

/** @param {string} dir */
async function collectHtmlRoutes(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
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

const routes = await collectHtmlRoutes(distDir);
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

console.log(`Generated sitemap with ${uniqueRoutes.length} routes`);
