# Ready to Deploy — Broken Links + SEO + Careers Link

**Date:** June 27, 2026
**Site:** www.qualityinnmcalester.com

Copy the 3 files below to the website root (replace the existing versions), then deploy.

---

## Files in this folder

| File | What changed |
|---|---|
| `careers.html` | Fixed 9 broken application links, fixed dropdown pre-fill bug, added JSON-LD schema |
| `index.html` | Added **Careers** link to the footer (Hotel column) |
| `sitemap.xml` | Added 4 indexable pages that were missing |

---

## 1. Broken links — FIXED (careers.html)

All 9 "Apply" buttons linked to **`application-form.html`**, which doesn't exist. The real form
is **`e-application.html`**. Every link now points there.

**Bonus bug fixed:** the form pre-fills its Position dropdown from the `?position=` URL parameter
by exact match. The Guest Service Agent button passed `Guest+Service+Agent`, but the dropdown's
actual value is `Guest Service Agent (Front Desk)` — so it silently failed to pre-select. Fixed.

---

## 2. JSON-LD structured data — ADDED (careers.html)

careers.html was the one indexable page with no schema markup. Added a `@graph` matching the
pattern used on about.html / parking.html: **WebPage** (with Home › Careers breadcrumb) +
**Hotel** + **WebSite**. Validates as well-formed JSON.

Note: used WebPage+Hotel rather than Google `JobPosting` markup on purpose — the page says
"we are not always hiring," and JobPosting requires accurate datePosted/validThrough for open
roles. Declaring active postings that aren't open risks Google penalties. If you get specific
dated openings, we can add proper JobPosting entries then.

---

## 3. Careers link in footer — ADDED (index.html)

Added `<li><a href="careers.html">Careers</a></li>` to the **Hotel** column of the home-page
footer, right after "About Us". This also gives careers.html an internal link from the homepage,
which helps it get crawled and indexed.

---

## 4. Sitemap — FIXED (sitemap.xml)

Added 4 indexable public pages that were missing (was 22 URLs, now 26):
- `group-travel.html`
- `careers.html`
- `parking-payment.html`
- `blog-construction-crew-rooming.html`

Validates as well-formed XML.

---

## Confirmed healthy (no action needed)

- Every page has a title, one H1, viewport tag; every image has alt text.
- All guest/staff utility forms are correctly noindex + blocked in robots.txt.
- robots.txt references sitemap.xml; canonical tags are consistent.

## Optional polish (NOT changed — your call)

- Some title tags exceed ~60 chars and some meta descriptions exceed ~155 chars (Google
  truncates these in results). Cosmetic only. Say the word and I'll tighten them.
