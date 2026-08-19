# AGENTS.md — InkAds marketing

This repository is public. Never commit or post secrets, credentials, private
customer information, contracts, pricing negotiations, or commercially
sensitive ClickUp content.

## Engineering workflow

- GitHub Issues are the engineering source of truth.
- Use one independently mergeable issue per branch, worktree, and PR.
- Tracking/parent issues are not implementation units.
- An unresolved `Depends on: #N` means the issue must not be started.
- Branches use `<type>/<issue-number>-<kebab-title>`.
- Work in sibling worktrees created from current `origin/main`; never edit
  directly on `main`.
- PR bodies must use `Closes #N`; humans merge.
- Remove and prune worktrees after merge.

## Product and technical boundaries

- ClickUp owns marketing strategy, copy development, and private commercial
  planning.
- GitHub owns technical requirements, dependencies, code, tests, and PRs.
- Keep public copy conservative. Do not claim unvalidated scale, performance,
  revenue, or campaign outcomes.

## Stack and quality gate

- Astro SSG, strict TypeScript, Tailwind CSS, and Markdown content collections.
- Use semantic CSS variables from `src/styles/global.css`; do not copy private
  package contents into this repository.
- Run `pnpm format:check`, `pnpm lint`, `pnpm test`, and `pnpm build` before
  pushing.
- Keep the site fully static unless a later issue explicitly introduces an
  external service.
