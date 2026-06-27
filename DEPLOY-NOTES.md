# Ready to Deploy — Broken Links + SEO Fixes

**Date:** June 27, 2026
**Site:** www.qualityinnmcalester.com

Copy the two files below to the website root (replace the existing versions), then deploy.

---

## Files in this folder

| File | What changed |
|---|---|
| `careers.html` | Fixed 9 broken application links + 1 dropdown pre-fill bug |
| `sitemap.xml` | Added 4 indexable pages that were missing |

---

## 1. Broken links — FIXED

### careers.html pointed to a file that doesn't exist
All 9 "Apply" buttons linked to **`application-form.html`**, which was never created.
The real application form is **`e-application.html`**. Every link now points there.

Affected buttons (all fixed):
- Submit Application (hero)
- Submit Your Application (x2)
- Apply for This Position — Assistant General Manager, Housekeeping, Guest Service Agent,
  Maintenance Technician, Night Auditor
- Submit General Application

### Bonus bug found & fixed: position dropdown wouldn't pre-fill
`e-application.html` pre-fills the "Position" dropdown from the `?position=` URL parameter by
**exact match**. The Guest Service Agent button passed `?position=Guest+Service+Agent`, but the
dropdown's actual option value is `Guest Service Agent (Front Desk)` — so it silently failed to
pre-select. Updated that link to `?position=Guest+Service+Agent+%28Front+Desk%29`. All 6 role
links now correctly pre-select their position.

---

## 2. SEO analysis — what was missing

### Fixed: 4 public pages were absent from the sitemap
`sitemap.xml` listed 22 URLs but omitted 4 indexable, public pages. Added:
- `group-travel.html`
- `careers.html`
- `parking-payment.html` (non-guest parking — a revenue page worth indexing)
- `blog-construction-crew-rooming.html` (blog post not listed with the others)

Sitemap now has 26 URLs and validates as well-formed XML.

### Checked and confirmed healthy (no action needed)
- Every page has a `<title>`, exactly one `<h1>`, and a `viewport` tag.
- Every `<img>` has `alt` text.
- All guest/staff utility forms (`g-*.html`, `ccform`, `ai-chat`, `e-application`, `g-feedback`)
  are correctly `noindex,nofollow` AND blocked in `robots.txt` — their missing meta descriptions
  are intentional and correct.
- `robots.txt` references `sitemap.xml` and the canonical tags are consistent.
- The `$1` flagged by the link scanner in `ai-chat.html` is a **false positive** — it's a
  JavaScript regex replacement template (`linkify()`), not a hyperlink. No fix needed.

---

## 3. Optional polish (NOT changed — your call)

These don't break anything; they only affect how listings look in Google. Left as-is to avoid
altering your copy without approval:

- **Long title tags (>60 chars, Google truncates):** index (99c), blog-construction-crew (100c),
  explore (92c), amenities (91c), extended-stay (88c), careers (84c), and several blog posts.
- **Long meta descriptions (>160 chars, Google truncates ~155):** promotions (239c),
  blog-extended-stay (233c), explore/amenities/blog-mcaap (~215-222c), and others.

If you want, I can tighten these titles/descriptions in a follow-up pass.
