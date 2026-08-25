---
page: Home
nav_label: Home
source: Home.dc.html
chrome: [Header, Footer]
header_active: Home
background: "#000"
text: "#fff"
font: Open Sauce Sans
primary_cta: { label: Request a demo, href: Contact }
secondary_cta: { label: See how it works, href: How-It-Works }
hero_widget: e-paper preview (480 × 800)
default_preview_tab: Poster
preview_tabs: [Poster, Advertiser, Yours]
image_slots:
  - {
      id: hero-own-creative,
      size: "flex fill inside 3:5 screen",
      placeholder: "Drop your artwork (480 × 800)",
      visible_when: "Yours tab",
    }
---

# Home

## Hero

**Layout:** Two-column grid 1.1fr / 0.9fr, 64px gap. Left = copy. Right = live e-paper preview (not a static image slot).

**Eyebrow:** E-paper · shared spaces

**H1:** Useful messages.  
Placed thoughtfully.

**Lead:** InkAds is a low-power e-paper advertising network for pubs, shopping centres, bathrooms, waiting areas, cafés, gyms and other high-traffic indoor spaces — calm, static displays instead of another bright screen.

**CTAs:** Request a demo (primary gold fill) · See how it works (ghost gold)

### Preview on display (hero right)

Device chrome: dark bezel, 14px radius, 3:5 screen (480 × 800 e-paper). Label row: “Preview on display” + three tabs.

| Tab              | Mode key     | What it shows                                                                                              |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| Poster (default) | `venue`      | Real venue trivia poster image, grayscale + high-contrast 1-bit filter. Footer bar: InkAds · Updated 06:00 |
| Advertiser       | `advertiser` | Typeset 1-bit layout: Northbank Coffee Roasters / “Two streets away. Still warm.” / Scan for voucher + QR  |
| Yours            | `own`        | `hero-own-creative` drop slot (“Drop your artwork (480 × 800)”) + InkAds / Your creative bar               |

Default poster src: College Lawn Hotel trivia artwork (`collegelawnhotel.com.au` … `COL_Trivia_Digi_WEB-1-595x842.jpg`), filtered `grayscale(1) contrast(2.6)`.

**Advertiser preset copy:**

- Eyebrow: Northbank Coffee Roasters · Campaign 04
- Headline: Two streets away. Still warm.
- Body: Single-origin filter, roasted this week. Show this screen for 20% off your first cup.
- CTA: Claim the offer / Scan for voucher

**Below the device:** caption (`{{ creative.caption }}`) · `480 × 800 e-paper`

**Upload bar:** “Try your own creative” / “Drop an image into the panel to see how it renders on real hardware.” Button: Upload artwork → switches to Yours tab.

Poster caption: `Venue poster artwork · as the 1-bit panel renders it`  
Advertiser caption: `Advertiser creative · matched by venue context`  
Yours caption: `Your artwork · drop an image to preview it`

---

## The idea (white band)

Background `#fff`, text `#000`, centered, max-width 760px.

**Eyebrow:** The idea (`#c89200`)

**H2:** A calmer format for useful messages in physical places.

**Body:** InkAds connects venue space with advertiser messages through low-power e-paper displays — a considered alternative to adding another bright, animated screen. No mains power required at each unit, and content changes remotely on a schedule.

---

## Two paths · one network

**H2:** Designed around the space and the message.

Two cards on `#111` with `#292c30` border:

1. **Venues** — Give overlooked space a useful role. A display format designed to fit the character and practical needs of your venue — no cabling, no bright video screen. Link: See the venue model → Venues (gold).
2. **Advertisers** — Place messages in relevant contexts. A tactile canvas for context-aware creative, with scheduled changes and QR calls to action — no printing, no replacing posters. Link: Explore placement contexts → Advertisers (purple `#8432ff`).

---

## A simple system

Dark band `#0a0a0a` with top/bottom borders.

**H2:** From message to place.

1. **Match** — A venue and message are considered together, with context guiding placement.
2. **Prepare** — Creative is composed for a static e-paper canvas rather than a conventional digital screen.
3. **Display** — The device presents the selected message within the venue's shared space.

Three columns.

---

## Use cases · built to adapt

**H2:** Start specific. Think beyond one setting.

**Body:** Bathrooms are the initial proof-of-concept context, not the limit of the idea. The same format could work anywhere a calm, considered display belongs.

Four cards:

| Status                      | Title               | Copy                                                                   |
| --------------------------- | ------------------- | ---------------------------------------------------------------------- |
| Initial focus (gold border) | Bathrooms           | Testing how a compact display fits a private, high-dwell shared space. |
|                             | Pubs & hospitality  | Placements where people gather, pause, and make local decisions.       |
|                             | Shopping centres    | A format to explore across varied retail environments and amenities.   |
|                             | High-traffic spaces | Other settings where a static message can complement the environment.  |

Link: See all use cases → Places

---

## Choose a perspective (gold band)

Background `#ffb300`, text `#000`, centered.

**H2:** A shared canvas needs both sides.

**CTAs:** Venue perspective → Venues (black fill, gold text) · Advertiser perspective → Advertisers (ghost black)
