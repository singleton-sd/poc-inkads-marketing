import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = new URL("..", import.meta.url);
const distDir = new URL("dist/", repoRoot);

const indexHtmlPath = new URL("index.html", distDir);
const notFoundHtmlPath = new URL("404.html", distDir);
const robotsTxtPath = new URL("robots.txt", distDir);
const sitemapXmlPath = new URL("sitemap.xml", distDir);
const ogImagePath = new URL("og-image.png", distDir);

const homeMdPath = new URL("src/content/pages/home.md", repoRoot);

const SITE_DOMAIN = "https://inkads.poc.singletonsd.com";

function getTextBetween(haystack, startRegex, endRegex) {
  const start = haystack.match(startRegex);
  assert(start, `Could not find start marker: ${startRegex}`);
  const sliced = haystack.slice(start.index + start[0].length);
  const end = sliced.match(endRegex);
  assert(end, `Could not find end marker: ${endRegex}`);
  return end.index === undefined ? "" : sliced.slice(0, end.index);
}

const home = await readFile(homeMdPath, "utf8");
const homeFrontmatterDescription = getTextBetween(
  home,
  /description:\s*/i,
  /\nheadline:/i,
).trim();

assert.ok(
  homeFrontmatterDescription.length <= 160,
  `Home meta description should be ≤160 chars (got ${homeFrontmatterDescription.length})`,
);

if (!existsSync(fileURLToPath(indexHtmlPath))) {
  throw new Error(
    `Missing ${indexHtmlPath.pathname}. Run pnpm build before pnpm test:seo.`,
  );
}

const [indexHtml, notFoundHtml, robotsTxt, sitemapXml] = await Promise.all([
  readFile(indexHtmlPath, "utf8"),
  readFile(notFoundHtmlPath, "utf8"),
  readFile(robotsTxtPath, "utf8"),
  readFile(sitemapXmlPath, "utf8"),
]);

testMetadata("basic <title> + description", () => {
  assert.match(indexHtml, /<title>[^<]*InkAds[^<]*<\/title>/i);
  assert.match(
    indexHtml,
    new RegExp(
      homeFrontmatterDescription.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ),
  );
});

testMetadata("canonical + robots meta", () => {
  assert.match(
    indexHtml,
    new RegExp(
      `<link\\s+rel="canonical"\\s+href="${SITE_DOMAIN.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/`,
      "i",
    ),
  );
  assert.match(indexHtml, /<meta name="robots" content="index,follow"\s*\/?>/i);
});

testMetadata("404 is noindex", () => {
  assert.match(
    notFoundHtml,
    /<meta name="robots" content="noindex,follow"\s*\/?>/i,
  );
});

testMetadata("Open Graph and Twitter cards reference production domain", () => {
  assert.match(indexHtml, /property="og:title" content="[^"]*InkAds/i);
  assert.match(
    indexHtml,
    new RegExp(`property="og:url" content="${SITE_DOMAIN}[^"]*"`, "i"),
  );
  assert.match(
    indexHtml,
    new RegExp(
      `property="og:image" content="${SITE_DOMAIN}/og-image\\.png"`,
      "i",
    ),
  );
  assert.ok(
    existsSync(fileURLToPath(ogImagePath)),
    "Missing dist/og-image.png",
  );

  assert.match(indexHtml, /name="twitter:card" content="summary_large_image"/i);
  assert.match(
    indexHtml,
    new RegExp(
      `name="twitter:image" content="${SITE_DOMAIN}/og-image\\.png"`,
      "i",
    ),
  );
});

testMetadata("structured data present", () => {
  const ldTypeIdx = indexHtml.indexOf('type="application/ld+json"');
  assert.ok(ldTypeIdx >= 0, "Missing application/ld+json script tag");

  const jsonStart = indexHtml.indexOf("{", ldTypeIdx);
  const scriptEnd = indexHtml.indexOf("</script>", jsonStart);
  assert.ok(jsonStart >= 0 && scriptEnd > jsonStart, "Missing JSON-LD payload");

  const jsonText = indexHtml.slice(jsonStart, scriptEnd).trim();
  const parsed = JSON.parse(jsonText);

  assert.equal(parsed["@context"], "https://schema.org");
  assert.ok(Array.isArray(parsed["@graph"]), "Expected @graph array");
  const types = parsed["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("WebSite"), "Missing WebSite in @graph");
  assert.ok(types.includes("WebPage"), "Missing WebPage in @graph");
  assert.ok(types.includes("Organization"), "Missing Organization in @graph");
  const website = parsed["@graph"].find((n) => n["@type"] === "WebSite");
  assert.equal(website.name, "InkAds");
  assert.match(
    website.url,
    new RegExp(`^${SITE_DOMAIN.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/?$`),
  );
});

testMetadata("favicons included", () => {
  assert.match(indexHtml, /rel="icon"[^>]+href="\/favicon\.svg"/i);
  assert.match(indexHtml, /rel="icon"[^>]+href="\/favicon\.ico"/i);
  assert.match(indexHtml, /rel="icon"[^>]+href="\/favicon-32\.png"/i);
  assert.match(
    indexHtml,
    /rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/i,
  );
});

testMetadata("sitemap lists primary public routes", () => {
  assert.match(
    sitemapXml,
    new RegExp(`${SITE_DOMAIN.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/`, "i"),
  );
  assert.match(
    sitemapXml,
    /<loc>https:\/\/inkads\.poc\.singletonsd\.com\/<\/loc>/i,
  );
  assert.match(
    sitemapXml,
    /<loc>https:\/\/inkads\.poc\.singletonsd\.com\/contact\/<\/loc>/i,
  );
  assert.match(
    sitemapXml,
    /<loc>https:\/\/inkads\.poc\.singletonsd\.com\/privacy\/<\/loc>/i,
  );
  assert.match(
    sitemapXml,
    /<loc>https:\/\/inkads\.poc\.singletonsd\.com\/terms\/<\/loc>/i,
  );
  assert.doesNotMatch(sitemapXml, /\/admin\//i);
  assert.doesNotMatch(sitemapXml, /404\.html/i);
  assert.doesNotMatch(
    sitemapXml,
    /<loc>https:\/\/inkads\.poc\.singletonsd\.com\/go\/?<\/loc>/i,
  );
});

testMetadata("sitemap and robots reference production domain", () => {
  assert.match(
    sitemapXml,
    new RegExp(`${SITE_DOMAIN.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/`, "i"),
  );
  assert.match(
    sitemapXml,
    /<loc>https:\/\/inkads\.poc\.singletonsd\.com\/<\/loc>/i,
  );

  assert.match(robotsTxt, /User-agent:\s*\*/i);
  assert.match(robotsTxt, /Disallow:\s*\/admin\//i);
  assert.match(robotsTxt, /Disallow:\s*\/go\//i);
  assert.match(
    robotsTxt,
    new RegExp(
      `Sitemap:\\s*${SITE_DOMAIN.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/sitemap\\.xml`,
      "i",
    ),
  );
  assert.doesNotMatch(robotsTxt, /noindex|nofollow/i);
});

function testMetadata(label, fn) {
  try {
    fn();
  } catch (err) {
    err.message = `${label} failed: ${err.message}`;
    throw err;
  }
}

console.log("SEO + metadata checks passed");
