import eslint from "@eslint/js";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { ...eslint.configs.recommended, files: ["**/*.{js,mjs,cjs}"] },
  ...astro.configs["flat/recommended"],
  {
    files: ["**/*.astro"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },
  { ignores: [".astro/**", "dist/**", "visual-base/**"] },
];
