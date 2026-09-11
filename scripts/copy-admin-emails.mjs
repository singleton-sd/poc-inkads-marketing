import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const source = path.join(rootDir, "admin-emails/dist");
const target = path.join(rootDir, "dist/admin/emails");

if (!existsSync(source)) {
  console.error(
    "Missing admin-emails/dist. Run `pnpm admin:emails:build` before copying.",
  );
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
console.log(`Copied email admin SPA to ${path.relative(rootDir, target)}`);
