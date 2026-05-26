# Separation Rename Batch — Setup Guide

This batch separates the guest-facing site (marketing + brand) from operations and AI-widget surfaces by renaming and noindexing 9 files.

Generated: 2026-05-26

---

## 1. The 9 renames (replace in repo)

For each pair, delete the old file and add the new one. The new files are inside `renamed/` in this zip.

| Old (delete) | New (add) | Purpose |
|---|---|---|
| `e-checkout.html` | `g-checkout.html` | Guest form |
| `late-checkout.html` | `g-late-checkout.html` | Guest form |
| `lost-found.html` | `g-lost-found.html` | Guest form |
| `refund.html` | `g-refund.html` | Guest form |
| `report.html` | `g-report.html` | Guest form |
| `ccform.html` | `g-creditcard.html` | Guest form (CC auth) |
| `feedback.html` | `g-feedback.html` | Guest form |
| `application-form.html` | `e-application.html` | Employment |
| `chat-widget.html` | `ai-chat.html` | AI embed |

**Naming convention now established:**
- `g-` = guest-facing, noindexed
- `e-` = employment, noindexed
- `ai-` = AI widgets, noindexed
- no prefix = marketing / indexable

### Git commands (one block)

```bash
cd /path/to/qualityinnmcalester-website

# Remove old files
git rm e-checkout.html late-checkout.html lost-found.html refund.html report.html ccform.html feedback.html application-form.html chat-widget.html

# Drop in new ones from this zip's renamed/ folder
# (copy them into the repo root, then:)
git add g-checkout.html g-late-checkout.html g-lost-found.html g-refund.html g-report.html g-creditcard.html g-feedback.html e-application.html ai-chat.html

# Add robots.txt at repo root
git add robots.txt

git commit -m "Separate guest/operations surfaces: rename 9 files with noindex"
git push
```

---

## 2. robots.txt — place at repo root

The included `robots.txt` blocks crawlers from all noindexed pages (belt-and-suspenders with the per-page meta tag). Sitemap line intentionally omitted — add when you're ready.

---

## 3. Manual step: paste noindex into 9 unchanged operations files

These files were NOT renamed (their URLs stay the same), but they need the noindex meta tag pasted in manually. Open each and add the bold line right after the viewport meta tag:

```html
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">   ← ADD THIS
```

Files to update:
1. `admin.html`
2. `staff-hub.html`
3. `requests-dashboard.html`
4. `inbox-dashboard.html`
5. `housekeeping.html`
6. `maintenance.html`
7. `shift-handoff.html`
8. `lost-found-inventory.html`
9. `incident-log.html`

These are also covered by robots.txt, but the meta tag is the stronger signal — Google honors meta robots even when robots.txt is misconfigured.

---

## 4. Files intentionally left alone

| File | Status | Why |
|---|---|---|
| `parking-payment.html` | unchanged, indexable | Your call — keep as-is until finished |
| `guest-guide.html` | unchanged, indexable | TV/dining info has SEO value |
| `index.html`, marketing pages | unchanged, indexable | Public site |

---

## 5. What the processor did to each file

The Python processor (included as `process.py` for reference):

1. **Inserted noindex meta** immediately after `<meta name="viewport">` — but only if not already present. The 3 larger files (ccform, feedback, application-form) already had noindex baked in from prior edits.

2. **Updated self-referential URLs** — `<link rel="canonical">`, `<meta property="og:url">`, `<meta property="twitter:url">` — to point at the new filename instead of the old one.

Summary of changes per file:

| File | noindex action | URL refs updated |
|---|---|---|
| g-checkout.html | inserted | 0 |
| g-late-checkout.html | inserted | 0 |
| g-lost-found.html | inserted | 0 |
| g-refund.html | inserted | 0 |
| g-report.html | inserted | 0 |
| g-creditcard.html | already present | 1 (canonical) |
| g-feedback.html | already present | 2 (canonical + og:url) |
| e-application.html | already present | 1 (canonical) |
| ai-chat.html | inserted | 0 |

---

## 6. Cosmetic stale references after chat-widget → ai-chat

These don't break anything but you may want to clean them up later:

- `README.md` — likely mentions chat-widget by name
- `cloudflare-worker.js` line ~14 — comment says "Copy the worker URL into chat-widget.html and inbox-dashboard.html"
- `inbox-dashboard.html` — has a comment referencing chat-widget (no functional ref)

These are documentation only. The Worker doesn't dispatch by filename.

---

## 7. Notes worth re-reading

- **No `_redirects` file generated.** Site isn't live yet — once the domain transfer finishes, set redirects if any external links point at the old filenames.
- **ccform (now g-creditcard.html) submit endpoint** — verified it uses Google Apps Script (not Netlify as previously noted). Works fine on Cloudflare Pages. The PCI scope consideration of collecting card data on your owned domain is still deferred per your earlier call.
- **No competing booking engine, no marketing-page changes.** Only the 9 renames and the unchanged-but-noindex operations files.

---

## 8. After deploy — verification checklist

Once the new files are live on Pages:

- [ ] Visit each new URL (e.g. `qualityinnmcalester.com/g-checkout.html`) — confirms the file is reachable
- [ ] View source on each — confirm `<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">` is in `<head>`
- [ ] Visit `qualityinnmcalester.com/robots.txt` — confirm it loads with all 17 Disallow lines
- [ ] Visit one of the OLD URLs (e.g. `qualityinnmcalester.com/refund.html`) — confirm it 404s (or set up 301 if you want soft handoff)
- [ ] Submit one guest form — confirm it still POSTs to the Worker and shows the success card

Done.
