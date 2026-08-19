# InkAds launch checklist

## Mobile (every breakpoint)
- [ ] Landing page loads fast (no missing fonts/assets).
- [ ] Keyboard tab order matches visual order (skip link works).
- [ ] Buttons/links remain reachable (no overlapping sticky header issues).
- [ ] Reduced-motion users do not experience unexpected animation/scroll behavior.

## Desktop
- [ ] Semantic landmarks are present (`header`, `nav`, `main`, `footer`).
- [ ] Headings follow logical order (one `h1`, subsequent `h2` sections).
- [ ] Focus styles are visible on keyboard navigation.

## Content / copy
- [ ] Metadata title/description matches the landing page intent.
- [ ] No unvalidated outcome claims are included on the public page.
- [ ] Images/visual placeholders have appropriate alternative text where applicable.

## Links
- [ ] All internal anchor links (`#how-it-works`, `#places`, `#audiences`, etc.) work.
- [ ] “Back to top” returns to the `main` landmark.
- [ ] Canonical URL, Open Graph, and Twitter preview metadata are correct.

## DNS / domain
- [ ] `inkads.poc.singletonsd.com` points to the GitHub Pages target as documented in `docs/deployment.md`.
- [ ] `sitemap.xml` and `robots.txt` reference `https://inkads.poc.singletonsd.com` (production domain).

## HTTPS
- [ ] Enforce HTTPS only after the certificate is issued for `inkads.poc.singletonsd.com`.
- [ ] Manual check: `https://inkads.poc.singletonsd.com` returns HTTP 200.

## Rollback
- [ ] If a release needs to be rolled back, revert the deployment commit on `main`.
- [ ] Confirm the Pages workflow republishes the previous static build.

