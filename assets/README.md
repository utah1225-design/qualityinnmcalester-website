# Quality Inn McAlester — Logo & Asset Guide

## Folder structure

```
assets/
├── favicon.ico                                       (legacy browser favicon)
├── favicon-32.png                                    (modern browser favicon)
├── favicon-192.png                                   (apple-touch-icon, PWA)
├── favicon-512.png                                   (high-res favicon)
└── logos/
    ├── quality-inn-horizontal-color.jpg              (header, primary - color)
    ├── quality-inn-horizontal-white.png              (HEADER on dark navy + FOOTER, currently used)
    ├── quality-inn-horizontal-black.jpg              (light backgrounds, print)
    ├── quality-inn-vertical-color.jpg                (square placements, social posts)
    ├── quality-inn-vertical-white.png                (square + dark background)
    ├── quality-inn-vertical-black.jpg                (square + light background)
    └── quality-inn-q-symbol.png                      (Q symbol only - cropped from vertical)
```

## Where each logo is used on the site

| Placement | File used | Why |
|-----------|-----------|-----|
| Header (every page) | `quality-inn-horizontal-white.png` | Navy background needs white logo; height 42px (34px on mobile) |
| Footer (every page) | `quality-inn-horizontal-white.png` | Same dark background; height 38px |
| Favicon | `favicon-32.png` + `favicon-192.png` + `favicon.ico` | Browser tab + bookmarks + Apple touch icon |

## What's NOT changed

- Custom "Quality Inn & Suites / McAlester on Hwy 69" text branding REMAINS in the header next to the brand logo
- This preserves the McAlester-specific identity while adding Choice Hotels brand recognition

## Map embeds added

- **index.html** — "Find Us" section before footer (with iframe + Get Directions button)
- **direction.html** — Large interactive map after the page hero, with 3 quick-direction action buttons

Both use Google Maps embed iframe (no API key needed, free, no monthly costs).

## How to update logos later

If Choice Hotels issues new brand assets:
1. Replace files in `assets/logos/` with the same filenames
2. Push to GitHub
3. Cloudflare Pages auto-redeploys
4. Hard-refresh browser to clear cached logos

No HTML changes needed — paths are stable.

## How to update favicon later

If you want a custom branded favicon (not just the Q symbol):
1. Design a 512x512 PNG with your brand
2. Use https://realfavicongenerator.net to generate the full set
3. Replace `favicon-32.png`, `favicon-192.png`, `favicon-512.png`, `favicon.ico`
4. Push to GitHub

---

*Generated as part of V1.01 work on `v1.01-dev` branch — May 2026*
