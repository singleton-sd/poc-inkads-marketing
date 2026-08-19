// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const environment = /** @type {Record<string, string | undefined>} */ (
  Reflect.get(globalThis, "process")?.env ?? {}
);

// https://astro.build/config
export default defineConfig({
  site: "https://inkads.poc.singletonsd.com",
  base: environment.PREVIEW_BASE_PATH ?? "/",
  vite: { plugins: [tailwindcss()] },
});
