import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: path.join(rootDir, "../public/admin/emails"),
    emptyOutDir: true,
    sourcemap: true,
  },
});
