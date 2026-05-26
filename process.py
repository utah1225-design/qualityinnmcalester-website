#!/usr/bin/env python3
"""
Quality Inn McAlester — rename batch processor.

For each (old, new) mapping:
  - read originals/<old>.html
  - insert <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
    immediately after the viewport meta tag
  - rewrite any self-referential canonical / og:url / twitter:url that reference
    the old filename, pointing them at the new filename
  - write to renamed/<new>.html

Preserves CRLF line endings.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "originals"
DST = ROOT / "renamed"
DST.mkdir(exist_ok=True)

RENAMES = [
    ("e-checkout.html",      "g-checkout.html"),
    ("late-checkout.html",   "g-late-checkout.html"),
    ("lost-found.html",      "g-lost-found.html"),
    ("refund.html",          "g-refund.html"),
    ("report.html",          "g-report.html"),
    ("ccform.html",          "g-creditcard.html"),
    ("feedback.html",        "g-feedback.html"),
    ("application-form.html","e-application.html"),
    ("chat-widget.html",     "ai-chat.html"),
]

NOINDEX_META = '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">'

# Pattern matching the viewport meta — handles single/double quotes and CRLF
VIEWPORT_RE = re.compile(
    r'(<meta\s+name=["\']viewport["\'][^>]*>)',
    re.IGNORECASE,
)

def process_one(old_name: str, new_name: str) -> dict:
    src_path = SRC / old_name
    dst_path = DST / new_name
    raw = src_path.read_bytes()

    # Detect line ending (CRLF vs LF) — preserve what the file uses
    eol = b"\r\n" if b"\r\n" in raw[:2000] else b"\n"

    text = raw.decode("utf-8")

    # 1. Already has noindex? skip insertion
    has_noindex = bool(re.search(
        r'<meta\s+name=["\']robots["\'][^>]*noindex',
        text, re.IGNORECASE,
    ))

    inserted = False
    if not has_noindex:
        m = VIEWPORT_RE.search(text)
        if not m:
            raise RuntimeError(f"{old_name}: no viewport meta tag found")
        # Insert AFTER viewport meta, on its own line, matching file's EOL
        eol_str = eol.decode()
        injection = m.group(1) + eol_str + NOINDEX_META
        text = text[:m.start()] + injection + text[m.end():]
        inserted = True

    # 2. Update self-referential URLs (canonical, og:url, twitter:url) that
    #    reference the old filename. Match only URLs ending in /<oldname>.
    old_url_pat = re.escape(old_name)
    url_updates = 0
    # Pattern: anything with the old filename inside a URL attribute value
    new_text, n = re.subn(
        r'(["\'])(https?://[^"\']*?/)' + old_url_pat + r'(["\'])',
        lambda m: m.group(1) + m.group(2) + new_name + m.group(3),
        text,
    )
    text = new_text
    url_updates += n

    dst_path.write_text(text, encoding="utf-8", newline="")

    return {
        "old": old_name,
        "new": new_name,
        "noindex_inserted": inserted,
        "noindex_already_present": has_noindex,
        "url_refs_updated": url_updates,
        "src_bytes": len(raw),
        "dst_bytes": dst_path.stat().st_size,
    }

print(f"Processing {len(RENAMES)} files...\n")
print(f"{'OLD':<24} {'NEW':<22} {'NOINDEX':<10} {'URLs':<5} {'SIZE'}")
print("-" * 75)

for old, new in RENAMES:
    r = process_one(old, new)
    ni = "INSERTED" if r["noindex_inserted"] else ("PRESENT" if r["noindex_already_present"] else "NONE")
    print(f"{r['old']:<24} {r['new']:<22} {ni:<10} {r['url_refs_updated']:<5} {r['src_bytes']} -> {r['dst_bytes']}")

print(f"\nWrote {len(RENAMES)} files to {DST}")
