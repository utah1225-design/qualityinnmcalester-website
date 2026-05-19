# Quality Inn McAlester — Guest Messaging System

A web-based guest messaging system with AI smart replies, a unified front desk
inbox, a guest case system, and a maintenance log. Runs entirely on your
existing Cloudflare account. No SMS cost. SMS can bolt on later.

---

## The files

| File | What it is | Where it runs |
|---|---|---|
| `chat-widget.html` | Guest chat — embed on your site / QR target | Cloudflare Pages (your site) |
| `inbox-dashboard.html` | Front desk console: Inbox + Cases + Maintenance Log | Cloudflare Pages |
| `cloudflare-worker.js` | The backend — AI replies, storage | Cloudflare Worker |
| `README.md` | This file | — |

---

## How it works

```
Guest opens chat-widget.html  (from your website or a QR code)
        ↓
Types a message
        ↓
chat-widget  →  Cloudflare Worker  →  Workers AI (Llama, free)
        ↓
AI reply comes back. If the message is an ISSUE, the AI flags it.
        ↓
Guest is asked for first name, last name, phone, room  →  a CASE is created
        ↓
Front desk sees everything in inbox-dashboard.html:
   • Inbox tab     — every guest conversation
   • Cases tab     — Open → Resolved → Closed (Closed needs guest satisfied)
   • Maintenance   — maintenance-type cases, with tech + fix notes
```

---

## Test it right now (demo mode, no setup)

Open `chat-widget.html` and `inbox-dashboard.html` in the same browser.
With no Worker connected they run in demo mode:

1. **chat-widget.html** — chat with the concierge. Type "the AC is broken"
   → it flags an issue → fill the case form → a case is created.
2. **inbox-dashboard.html** — see conversations in the Inbox, the case under
   the Cases tab, and the maintenance entry under Maintenance Log.

Everything works offline for testing. The AI is keyword-based until the
Worker is connected.

---

## Going live — deploy the Worker (free, ~15 min)

### Step 1 — Create the Worker
1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Worker**
2. Name it e.g. `qi-concierge` → Deploy the default, then **Edit code**
3. Delete the default code, paste all of `cloudflare-worker.js`, Save & Deploy

### Step 2 — Add the bindings
In the Worker → **Settings** → **Bindings**:
- **Add binding → Workers AI** → variable name: `AI`
- **Add binding → KV namespace** → create one called `hotel-data` →
  variable name: `HOTEL_KV`

Redeploy after adding bindings.

### Step 3 — Connect the pages
Copy your Worker URL (looks like `https://qi-concierge.YOURNAME.workers.dev`).
In **both** `chat-widget.html` and `inbox-dashboard.html`, find near the top:
```js
var WORKER_URL = "";
```
Set it to your Worker URL:
```js
var WORKER_URL = "https://qi-concierge.YOURNAME.workers.dev";
```

### Step 4 — Put the pages on your site
Upload `chat-widget.html` and `inbox-dashboard.html` to your website repo.
- Guests reach `chat-widget.html` via a QR code in rooms / at the front desk
- Front desk bookmarks `inbox-dashboard.html`

Generate a QR code (free, e.g. qr-code-generator.com) pointing to
`https://www.qualityinnmcalester.com/chat-widget.html`.

---

## The case system

- A case has: first name, last name, phone, room, type, summary, status, timeline
- **Status flow: Open → Resolved → Closed**
- **Closed requires guest satisfaction** — the dashboard asks the front desk
  to confirm the guest is satisfied before a case can be Closed
- Identity (name/phone/room) is collected **only when a case is opened** —
  guests chat freely before that

## The maintenance log

- A separate page (Maintenance tab in the dashboard)
- When a case is typed `maintenance`, a linked maintenance entry is created
  automatically (linked by case ID)
- The log adds fields the front desk fills in: assigned tech, fix notes
- Updating a maintenance case status keeps the log in sync

---

## Adding SMS later (optional, Phase 2)

The Worker is built channel-agnostic. To add SMS:
1. Sign up with Telnyx (~$0.004/text) or Twilio (~$0.0079/text)
2. Add a `/sms-webhook` route to the Worker that converts the provider's
   incoming payload into the same conversation format
3. Add a send function that posts replies back through the provider
Nothing else changes — the inbox, cases, and AI all stay the same.

---

## Cost

| Piece | Cost |
|---|---|
| Cloudflare Pages (hosting) | Free |
| Cloudflare Worker | Free (100k requests/day) |
| Workers AI (the AI replies) | Free tier — far more than a hotel needs |
| Cloudflare KV (storage) | Free tier |
| **Total** | **$0/month** |

SMS, if added later, is the only paid piece (~$10/mo at hotel volume).
