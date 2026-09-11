/**
 * True when markdown frontmatter sets draft to a YAML truthy boolean.
 * Matches Astro/gray-matter behaviour for common forms, including inline comments
 * (e.g. `draft: true # unpublished`).
 * @param {string} raw
 * @returns {boolean}
 */
export function isDraftFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return false;
  const draftMatch = (match[1] ?? "").match(/^draft:\s*(.*)$/m);
  if (!draftMatch) return false;
  return parseYamlBooleanScalar(draftMatch[1] ?? "") === true;
}

/**
 * @param {string} raw
 * @returns {boolean | undefined}
 */
function parseYamlBooleanScalar(raw) {
  const cleaned = raw.replace(/\s+#.*$/, "").trim();
  const unquoted = cleaned.replace(/^["']|["']$/g, "");
  const lower = unquoted.toLowerCase();
  if (["true", "yes", "on", "y"].includes(lower)) return true;
  if (["false", "no", "off", "n"].includes(lower)) return false;
  return undefined;
}
