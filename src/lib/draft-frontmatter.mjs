/**
 * True when markdown frontmatter sets draft to a YAML truthy boolean.
 * Matches Astro/gray-matter behaviour for common forms, including inline comments
 * outside quotes (e.g. `draft: true # unpublished`). Hashes inside quoted scalars
 * are preserved (e.g. `draft: "true # note"` is not boolean true).
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
 * Strip a YAML line comment (` # ...`) only when `#` is outside quotes.
 * @param {string} raw
 * @returns {string}
 */
function stripUnquotedYamlComment(raw) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      if (inDouble && i > 0 && raw[i - 1] === "\\") continue;
      inDouble = !inDouble;
      continue;
    }
    if (
      ch === "#" &&
      !inSingle &&
      !inDouble &&
      i > 0 &&
      /\s/.test(raw[i - 1])
    ) {
      return raw.slice(0, i).trimEnd();
    }
  }
  return raw.trim();
}

/**
 * @param {string} raw
 * @returns {boolean | undefined}
 */
function parseYamlBooleanScalar(raw) {
  const cleaned = stripUnquotedYamlComment(raw);
  const unquoted = cleaned.replace(/^["']|["']$/g, "");
  const lower = unquoted.toLowerCase();
  if (["true", "yes", "on", "y"].includes(lower)) return true;
  if (["false", "no", "off", "n"].includes(lower)) return false;
  return undefined;
}
