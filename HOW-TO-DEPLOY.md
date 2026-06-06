# READY-TO-DEPLOY — Workflow Guide
## Quality Inn & Suites McAlester on Hwy 69

---

## FOLDER STRUCTURE

```
QualityInn-McAlester/
├── READY-TO-DEPLOY/          ← YOU ARE HERE
│   └── HOW-TO-DEPLOY.md      ← This file
├── qualityinnmcalester-website/  ← Mirror of what's live on GitHub
│   ├── Scripts/              ← Apps Script .js files
│   └── [all .html files]
└── docs/                     ← Reference docs, KB files
```

---

## THE WORKFLOW (3 steps)

### STEP 1 — Claude modifies a file
Claude creates or updates a file and places it in **this folder** (READY-TO-DEPLOY).
You'll be told which file(s) changed and what changed.

### STEP 2 — You deploy to GitHub
1. Open this folder in Google Drive
2. Download the modified file(s)
3. Go to your GitHub repo (qualityinnmcalester)
4. Open the file → Edit (pencil) → paste new content → Commit
5. Cloudflare auto-deploys (takes ~60 seconds)
6. Test the live site to confirm it works

### STEP 3 — You sync Drive to match GitHub
Once confirmed working:
1. Move (or re-upload) the file from **READY-TO-DEPLOY/** into **qualityinnmcalester-website/**
   (this keeps the website folder as an exact mirror of what's live)
2. The READY-TO-DEPLOY folder should be empty between sessions

---

## RULES

| Rule | Why |
|------|-----|
| All edits go through READY-TO-DEPLOY first | Single handoff point — no confusion about which version is right |
| Never edit directly in GitHub | If you edit in GitHub, Drive drifts out of sync |
| qualityinnmcalester-website/ always mirrors GitHub | So Claude has accurate source files to work from |
| READY-TO-DEPLOY is empty when idle | If there are files here, something is waiting to be deployed |

---

## RESYNC: Getting GitHub → Drive (one-time catch-up)

For files that have changed in GitHub but NOT in Drive, do a manual one-time pull:

**Files currently out of sync (GitHub is ahead of Drive):**
- `ccform.html` — action URL updated to new /exec
- `group-travel.html` — APPS_SCRIPT_URL updated to new /exec
- `g-feedback.html` — URL updated to new /exec
- `e-application.html` — URL updated + form_type hidden field added

**How to resync:**
1. In GitHub, open the file → click Raw → Ctrl+A, Ctrl+C
2. In Drive, open qualityinnmcalester-website/ → find the file → open it → replace content → save

After this one-time catch-up, Drive and GitHub will be in sync.
Going forward, all changes flow through READY-TO-DEPLOY and Drive stays current.

---

## APPS SCRIPT

The live deployed script URL (new /exec, all 4 forms active):
```
https://script.google.com/macros/s/AKfycbxtxkTKgJgoKLvNk24xc7EP8vQZ1157hVqsty5t4QS_kjpzf5fEI5C_bbw4ckWH00szTA/exec
```

Script source file in Drive:
- `qualityinnmcalester-website/Scripts/google-apps-script-ROUTER-FINAL.js`

If you ever redeploy the script (new /exec URL), update:
1. ccform.html (form action="...")
2. e-application.html (var APP_SCRIPT_URL)
3. group-travel.html (var APPS_SCRIPT_URL)
4. g-feedback.html (same pattern)

---

*Last updated: June 2026*
