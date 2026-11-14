---
title: Privacy Policy | InkAds
description: How the InkAds proof-of-concept marketing site handles contact enquiries, waitlist signups, and hosting.
effectiveDate: 2026-11-14
draft: false
---

This Privacy Policy describes how Singleton SD operates the InkAds proof-of-concept
marketing site at `inkads.poc.singletonsd.com`.

## What we collect

When you use the contact form, we collect the fields you submit: name, venue or
company name, email address, optional phone number, how you identify (venue,
advertiser, or other), your message, consent, and whether you opt in to
occasional updates. Waitlist signups collect name, email, optional company,
consent, and the same optional marketing opt-in (unchecked by default).

Cloudflare Turnstile provides a verification token with each submission. We
also record which page the form was sent from.

If you email us directly, we receive your email address and message content.

## How we use it

We use contact and waitlist submissions to respond to questions about the
InkAds proof of concept and, if you opt in, to send occasional product
updates. We do not sell contact details or use them for unrelated marketing
without your consent.

## How submissions are delivered

Contact and waitlist forms post JSON from your browser to Singleton SD's shared
lead-intake API at `https://api.singletonsd.com/v1/leads`. The API verifies the
Turnstile token, applies origin checks, and queues the lead. The site origin
must be `https://inkads.poc.singletonsd.com`.

## Hosting and processors

The public site is hosted on GitHub Pages. Form verification uses Cloudflare
Turnstile. Lead intake runs on Singleton SD's shared API gateway.

## Analytics

This proof-of-concept site does not currently use third-party analytics on the
public pages. If analytics are added later, this policy will be updated before
they are enabled.

## Contact

Questions about this policy: [hello@inkads.poc.singletonsd.com](mailto:hello@inkads.poc.singletonsd.com).
