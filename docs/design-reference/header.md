---
page: Header
kind: chrome
source: Header.dc.html
sticky: true
background: "#000"
border_bottom: "1px solid #292c30"
---

# Header

Global site chrome. Imported into every content page via `dc-import name="Header"` with `active-page` set to the current nav label (or empty).

## Layout

Sticky top bar. Flex row: logo lockup (left) · nav + CTA (right). Padding 14px 24px. Font: Open Sauce Sans.

## Logo lockup (links to Home)

- 32×32 framed icon: 2.5px `#ffb300` border, 5px radius. Inside: gold vertical content block + two text lines (white full-width, `#7f848a` at 65% width).
- Wordmark “InkAds” 19px / 500 / `#fff`
- Underline: gold bar + short grey bar
- Byline “by Singleton SD” 8px uppercase `#60656b`

## Nav links

Active item color `#ffb300`; inactive `#c9ccd1`. 13px / 500. No underline.

1. How it works → How-It-Works
2. Use cases → Places
3. Venues
4. Advertisers
5. Pricing
6. About

## CTA

Primary button: “Request a demo” → Contact. Fill `#ffb300`, text `#000`, 10px 16px.
