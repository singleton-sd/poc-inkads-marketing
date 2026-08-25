<!-- inkads-preview:start -->

## Preview

_Preview URL and screenshot artifact links are filled in automatically by the
preview workflow after the first successful deploy. Until then, the sticky
**Preview** comment on this PR is the source of truth once CI finishes._
<!-- inkads-preview:end -->

## Summary

-

## Test plan

- [ ] Open the sticky **Preview** comment / Preview section and check the live site
- [ ] Download the `visual-pr-<n>` workflow artifact and review `pr/` vs `base/` vs `diff/`
- [ ] `pnpm format:check && pnpm lint && pnpm test && pnpm build`
