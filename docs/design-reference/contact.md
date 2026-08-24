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
  - { name: role, type: select, options: ["Venue owner / operator", "Advertiser / brand", "Other"] }
  - { name: message, type: textarea, placeholder: Tell us about your space or campaign }
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

This is a local PoC form (client-side submitted flag); production should post to a real endpoint.
