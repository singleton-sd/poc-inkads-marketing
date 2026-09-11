---
page: Contact
nav_label: null
source: Contact.dc.html
chrome: [Header, Footer]
header_active: ""
purpose: demo request
email: hello@inkads.poc.singletonsd.com
form_fields:
  - { name: name, type: text, required: true, placeholder: Name }
  - { name: company, type: text, required: true, placeholder: Venue / company }
  - { name: email, type: email, required: true, placeholder: Email }
  - {
      name: role,
      type: select,
      options: ["Venue owner / operator", "Advertiser / brand", "Other"],
    }
  - {
      name: message,
      type: textarea,
      placeholder: Tell us about your space or campaign,
    }
submit_label: Send request
success_title: Thanks — request received.
success_body: We'll be in touch shortly to schedule a demo.
---

# Contact / Request a demo

Two-column layout 0.9fr / 1.1fr.

## Left column

**Eyebrow:** Request a demo

**H1:** Let's talk about your space or campaign.

**Lead:** Tell us a bit about your venue or brand and we'll follow up to scope a pilot.

- **Email:** hello@inkads.poc.singletonsd.com
- **Status:** Proof of concept · a Singleton SD product

## Right column — form

Default: form visible. On submit: success panel (gold border) replaces the fields.

Fields: Name | Venue / company (row) · Email · Role select (“I am a…”) · Message textarea · Send request (gold button).

## Query prefills (deep links / QR)

`/contact` reads optional URL query params on `astro:page-load` and prefills
safe fields. Invalid values are ignored (form stays on defaults).

| Param   | Values                                                                                         | Effect                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `role`  | `venue` / `partnership`, `advertiser` / `sales`, `other` / `general`, or an exact option label | Selects “I am a…”; submit still maps via `ROLE_TO_SUBJECT` → PostKit `partnership` / `sales` / `general` |
| `name`  | Non-empty trimmed text ≤ 200 chars, no control characters                                      | Prefills Name                                                                                            |
| `email` | Simple email shape ≤ 254 chars, no control characters in each segment                          | Prefills Email                                                                                           |

Examples:

- `/contact?role=venue`
- `/contact?role=advertiser&name=Ada&email=ada@example.com`

**Do not put secrets in query strings** (tokens, passwords, API keys, or other
sensitive PII). Query params appear in browser history, server/CDN logs, and
Referer headers. Prefer short CTA deep links with `role` only; use `name` /
`email` only for low-sensitivity convenience prefills.
