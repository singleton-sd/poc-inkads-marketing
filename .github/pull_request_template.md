<!-- inkads-preview:start -->

## Preview

_Preview and visual report links are filled in automatically by the preview
workflow after the first successful deploy. Until then, the sticky **Preview**
comment on this PR is the source of truth once CI finishes._
<!-- inkads-preview:end -->

## Summary

-

## Test plan

- [ ] Open the sticky **Preview** comment / Preview section and check the live site
- [ ] Open the hosted **visual report** (`…/visual/`) and review base vs PR vs diff
- [ ] If **`visual-review`** fails for intentional new/changed pages: add `visual-accepted` (check clears automatically)
- [ ] `pnpm format:check && pnpm lint && pnpm test && pnpm build`
