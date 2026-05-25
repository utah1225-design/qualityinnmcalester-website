/* ============================================================
   QUALITY INN & SUITES McALESTER ON HWY 69
   Guest Messaging — Cloudflare Worker backend
   ============================================================
   Powers: AI smart replies + session tracking + storage for
   conversations, cases, and the maintenance log.

   DEPLOY (free, on your existing Cloudflare account):
   1. dash.cloudflare.com -> Workers & Pages -> Create -> Worker
   2. Replace the default code with this file
   3. Bindings needed (Settings -> Variables / Bindings):
        - AI            -> Workers AI binding   (free)
        - KV namespace  -> binding name: HOTEL_KV   (free tier)
   4. Deploy. Copy the worker URL into chat-widget.html and
      inbox-dashboard.html (the WORKER_URL constant).

   SMS LATER: the /reply route is channel-agnostic. To add SMS,
   add a /sms-webhook route that maps a provider (Telnyx/Twilio)
   payload into the same conversation format. Nothing else changes.
   ============================================================ */

/* ---- HOTEL FACTS — Ayri's knowledge base ---- */
const HOTEL = {
  name: "Quality Inn & Suites McAlester on Hwy 69",
  shortName: "Quality Inn McAlester",
  phone: "(918) 426-8091",
  groupPhone: "(918) 420-9126",
  inHousePhone: "(918) 420-9537",
  address: "400 S George Nigh Expy, McAlester, OK 74501",
  checkIn: "3:00 PM",
  checkOut: "11:00 AM",
  frontDesk: "24 hours a day",
  breakfast: "free full hot breakfast 6:00 AM to 9:00 AM every day (eggs, sausage, waffles, pancakes, fresh fruit, oatmeal, juices, coffee, breads and bagels)",
  parking: "free on-site parking, including McAlester's largest truck and RV lot, with dedicated oversized spaces for semi-trucks, trailers, and RVs",
  wifi: "free wi-fi throughout the property; the password is on the in-room card",
  pets: "$15 per night per pet; service animals accommodated per ADA requirements",
  rooms: "every room includes a mini-fridge, microwave, in-room safe, work desk, hair dryer, coffee maker, Smart TV with built-in Netflix and Amazon Prime (guests sign in with their own accounts), and soundproofing. Select rooms are kitchenette suites with a stovetop and full fridge.",
  amenities: "24-hour fitness center, free hot breakfast, free wi-fi, free oversized parking, 24-hour coffee station, guest laundry, on-site meeting room, 24-hour front desk",
  neighborhood: "next to Walmart Supercenter; close to MCAAP (McAlester Army Ammunition Plant, about 7 miles via Hwy 270), Choctaw Casino McAlester (~5 mi), Southeast Expo Center (~3 mi), McAlester Regional Hospital (~2 mi), Lake Eufaula (~35 min east), Robbers Cave State Park (~20 mi)",
  diningNearby: "Walmart Supercenter, Wendy's, Denny's, Taco Bell, Pizza Hut, Hunan Chinese, The Original Egg, Arby's, McDonald's, Mazzio's, Chili's (American), RibCrib (BBQ), Marilyn's Restaurant (Steakhouse, 2 mi), El Tequila (Mexican, 2 mi), Pete's Place in Krebs (famous Italian since 1925, ~3 mi), Captain John's seafood (~1 mi)",
  rates: "we offer special rates including the Rail & Rest Rate (promo code RAIL) for Union Pacific Railroad crews and the Mission Ready Rate (promo code MCAAP) for McAlester Army Ammunition Plant contractors and visitors, plus government and military per diem rates, and weekly extended-stay rates",
  noPool: true   /* hotel does NOT have a pool — Ayri must never claim one */
};

/* ---- the AI system prompt — guardrailed ---- */
function systemPrompt() {
  return `You are Ayri, the digital concierge for ${HOTEL.name}.
You help guests by text chat in a warm, professional, concise way.
You are an AI assistant — never claim to be human. If asked, say you're Ayri, the AI concierge, and you can connect them with the front desk team.

HOTEL FACTS — use only these, never invent or guess:
- Hotel: ${HOTEL.name}
- Address: ${HOTEL.address}
- Phone numbers (pick the RIGHT one for each guest):
    * Reservation line (default — new bookings, availability, rates): ${HOTEL.phone}
    * Group reservations (weddings, room blocks, corporate groups, conferences, events, sports teams, multiple rooms): ${HOTEL.groupPhone}
    * Front desk direct (in-house guests who provided a room number or are reporting an in-room issue): ${HOTEL.inHousePhone}
- Check-in: ${HOTEL.checkIn} | Check-out: ${HOTEL.checkOut} | Front desk: ${HOTEL.frontDesk}
- Breakfast: ${HOTEL.breakfast}
- Parking: ${HOTEL.parking}
- Wi-Fi: ${HOTEL.wifi}
- Pets: ${HOTEL.pets}
- In every room: ${HOTEL.rooms}
- Amenities: ${HOTEL.amenities}
- Neighborhood & nearby places: ${HOTEL.neighborhood}
- Dining nearby: ${HOTEL.diningNearby}
- Special rates: ${HOTEL.rates}

ABSOLUTE RULES:
- This hotel has NO swimming pool of any kind. Never claim it has one. If asked, say "We don't have a pool, but I'd be happy to suggest other things to enjoy nearby" and offer something real.
- Never invent amenities, prices, or details. If you don't know, say "Let me connect you with our front desk for that — they'll have the exact answer."
- Keep replies short and warm — 1 to 3 sentences. This is a text chat.
- Never discuss credit card numbers, CVV, or payment details over chat. Direct guests to the front desk.
- Use the actual hotel name and facts above — they are accurate.

PHONE NUMBER RULES — pick the right line for each scenario:
- If the guest mentions a wedding, group, block of rooms, corporate booking, conference, sports team, event, reunion, or multiple rooms → give them the group reservations line: ${HOTEL.groupPhone}
- If the guest has provided a room number, mentions their current stay, or is reporting an in-room problem → give them the front desk direct line: ${HOTEL.inHousePhone}
- Otherwise (general questions, individual booking, rates, availability, walk-in style inquiries) → give them the reservation line: ${HOTEL.phone}
- Give only ONE phone number per reply. Pick the right one for the situation.

WHEN A GUEST REPORTS A PROBLEM (broken, maintenance, cleanliness, noise, safety):
- Be empathetic. Acknowledge the issue.
- Say you'll flag this for the front desk so a team member follows up.
- Mention they can also call the front desk directly at ${HOTEL.inHousePhone} for anything urgent.

WHEN A GUEST ASKS FOR A HUMAN / FRONT DESK / TO TALK TO SOMEONE:
- Reply warmly and let them know you'll connect them. Example:
  "Of course! I'm Ayri, the AI concierge — let me connect you with our front desk team. If they're with another guest right now, they'll be with you shortly."
- Then the front desk takes over via the dashboard.

USEFUL LINKS — share when topically relevant. Always paste the full URL on its own; the chat will make it clickable:
- Guest guide (TV channels, in-room info): https://www.qualityinnmcalester.com/guest-guide
- Amenities overview: https://www.qualityinnmcalester.com/amenities
- Photo gallery: https://www.qualityinnmcalester.com/gallery
- Local attractions and things to do in McAlester: https://www.qualityinnmcalester.com/explore

WHEN to share a link:
- Guest asks about attractions, things to do, places to visit → share the explore link
- Guest asks about TV channels, room features, how something works → share the guest guide link
- Guest asks "what amenities do you have" or wants details → share the amenities link
- Guest wants to see photos or what the property looks like → share the gallery link
Do NOT share links in every reply. Only when the link genuinely answers or expands on the question. Format: a short helpful sentence, then the URL on its own line.

TONE:
- Warm but brief. Like a thoughtful front desk agent who texts.
- No emojis unless the guest uses them first.
- No corporate jargon. Sound like a real person.`;
}

/* ---- CORS so the website pages can call this Worker ---- */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

/* ============================================================
   MAIN ROUTER
   ============================================================ */
export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      /* ---- AI smart reply / guest message ---- */
      if (path === "/reply" && request.method === "POST") {
        return await handleReply(request, env);
      }

      /* ---- AI smart-reply SUGGESTIONS for front desk ---- */
      if (path === "/suggest" && request.method === "POST") {
        return await handleSuggest(request, env);
      }

      /* ---- save a conversation ---- */
      if (path === "/conversation" && request.method === "POST") {
        return await saveConversation(request, env);
      }

      /* ---- list all conversations (front desk inbox) ---- */
      if (path === "/conversations" && request.method === "GET") {
        return await listConversations(env);
      }

      /* ---- save / update a case ---- */
      if (path === "/case" && request.method === "POST") {
        return await saveCase(request, env);
      }

      /* ---- list cases ---- */
      if (path === "/cases" && request.method === "GET") {
        return await listCases(env);
      }

      /* ---- save / update a maintenance log entry ---- */
      if (path === "/maintenance" && request.method === "POST") {
        return await saveMaintenance(request, env);
      }

      /* ---- list maintenance log (open only) ---- */
      if (path === "/maintenance-log" && request.method === "GET") {
        return await listMaintenance(env);
      }
      if (path === "/maintenance-log-all" && request.method === "GET") {
        return await listAllMaintenance(env);
      }

      /* ---- reassign a case between front desk and maintenance ---- */
      if (path === "/case/reassign" && request.method === "POST") {
        return await reassignCase(request, env);
      }
      if (path === "/case/note" && request.method === "POST") {
        return await addCaseNote(request, env);
      }
      if (path === "/case/status" && request.method === "POST") {
        return await changeCaseStatus(request, env);
      }
      if (path === "/case/assign" && request.method === "POST") {
        return await assignCaseToPerson(request, env);
      }

      /* ═══════════════════════════════════════════════════
         SECTION — GUEST REQUESTS (V1.01)
         Express checkouts, refunds, lost & found,
         late checkout, housekeeping incidents.
         All stored under request: KV pattern.
         ═══════════════════════════════════════════════════ */
      if (path === "/request" && request.method === "POST") {
        return await saveRequest(request, env);
      }
      if (path === "/requests" && request.method === "GET") {
        return await listRequests(env);
      }
      if (path === "/request/process" && request.method === "POST") {
        return await processRequest(request, env);
      }
      if (path === "/request/archive" && request.method === "POST") {
        return await archiveRequest(request, env);
      }

      /* ---- unified settings (admin + readers) ---- */
      if (path === "/settings" && request.method === "GET") {
        return await getSettings(env);
      }
      if (path === "/settings" && request.method === "POST") {
        return await saveSettings(request, env);
      }
      if (path === "/admin-verify" && request.method === "POST") {
        return await verifyAdmin(request, env);
      }
      if (path === "/maintenance-verify" && request.method === "POST") {
        return await verifyMaintenance(request, env);
      }
      if (path === "/dashboard-verify" && request.method === "POST") {
        return await verifyDashboard(request, env);
      }

      /* ---- health check ---- */
      if (path === "/" || path === "/health") {
        return json({ ok: true, hotel: HOTEL.name, time: new Date().toISOString() });
      }

      return json({ error: "Not found", path }, 404);

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },

  /* ═══════════════════════════════════════════════════
     CRON — auto-archives express_checkout requests > 48h.
     Configure cron trigger via wrangler.toml or
     Cloudflare dashboard: Workers → Settings → Triggers.
     Suggested schedule: "0 * * * *" (hourly)
     ═══════════════════════════════════════════════════ */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(autoArchiveOldRequests(env));
  }
};

/* ============================================================
   AI — guest message -> concierge reply
   ============================================================ */
async function handleReply(request, env) {
  const body = await request.json();
  const guestMessage = body.guestMessage || "";
  const history = body.history || [];   /* prior turns, optional */

  /* build the message list for the model */
  const messages = [
    { role: "system", content: systemPrompt() }
  ];
  history.slice(-6).forEach(m => {
    messages.push({
      role: m.from === "guest" ? "user" : "assistant",
      content: m.text
    });
  });
  messages.push({ role: "user", content: guestMessage });

  /* call Cloudflare Workers AI (free) */
  const aiResp = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 220
  });

  const reply = (aiResp.response || "").trim()
    || "Let me connect you with our front desk team — they'll help right away.";

  /* does this message look like a guest ISSUE? -> flag for a case */
  const isIssue = detectIssue(guestMessage);

  return json({
    reply,
    flagAsCase: isIssue,
    issueType: isIssue ? classifyIssue(guestMessage) : null
  });
}

/* ============================================================
   AI — suggestions for the front desk to pick from
   ============================================================ */
async function handleSuggest(request, env) {
  const body = await request.json();
  const guestMessage = body.guestMessage || "";

  const prompt = `A hotel guest sent this message: "${guestMessage}"

Write 3 short, warm, professional reply options a front desk agent could send.
Each must be 1-2 sentences. Use only real hotel facts. Return them as a JSON
array of 3 strings and nothing else.`;

  const aiResp = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: prompt }
    ],
    max_tokens: 300
  });

  /* try to parse a JSON array out of the model output */
  let suggestions = [];
  try {
    const match = (aiResp.response || "").match(/\[[\s\S]*\]/);
    if (match) suggestions = JSON.parse(match[0]);
  } catch (e) { /* fall through */ }

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    suggestions = [
      "Thank you for reaching out — I'll help with that right away.",
      "Thanks for your message! Let me look into this for you.",
      "Happy to help — give me just a moment to check on that."
    ];
  }

  return json({ suggestions: suggestions.slice(0, 3) });
}

/* ============================================================
   ISSUE DETECTION — flags messages that should become cases
   ============================================================ */
function detectIssue(text) {
  const t = (text || "").toLowerCase();
  const issueWords = [
    "broken","not work","doesn't work","does not work","leak","clog","dirty",
    "unclean","smell","noise","loud","cold","no hot water","heater","heat not",
    "tv not","wifi not","wi-fi not","stuck","locked out","key not","towels",
    "missing","maintenance","repair","fix","problem","issue","complaint",
    "unhappy","disappointed","roach","stain"," ac "," a/c"
  ];
  return issueWords.some(function(w){ return t.indexOf(w) > -1; });
}

function classifyIssue(text) {
  const t = (text || "").toLowerCase();
  if (/ac |a\/c|heat|heater|cold|hot water|leak|clog|broken|not work|tv|wifi|wi-fi|light|door|lock|key/.test(t))
    return "maintenance";
  if (/dirty|unclean|towels|smell|stain|clean|housekeep|sheets/.test(t))
    return "housekeeping";
  return "service";
}

/* ============================================================
   CACHED INDEX — avoids KV.list() quota on free tier
   Each kind (conv/case/maint) has a JSON-array index of IDs.
   Reads go through the index (cheap GETs). Writes update it.
   ============================================================ */
const INDEX_KEYS = {
  conv:    "index:conv",
  case:    "index:case",
  maint:   "index:maint",
  request: "index:request"
};
const PREFIXES = {
  conv:    "conv:",
  case:    "case:",
  maint:   "maint:",
  request: "request:"
};

async function readIndex(env, kind) {
  if (!env.HOTEL_KV) return [];
  const raw = await env.HOTEL_KV.get(INDEX_KEYS[kind]);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  /* Index missing — try to rebuild ONCE via list(). If quota
     exhausted, return [] gracefully; system recovers on next write. */
  try {
    const listed = await env.HOTEL_KV.list({ prefix: PREFIXES[kind] });
    const ids = listed.keys.map(k => k.name.slice(PREFIXES[kind].length));
    await env.HOTEL_KV.put(INDEX_KEYS[kind], JSON.stringify(ids));
    return ids;
  } catch (e) {
    return [];
  }
}

async function addToIndex(env, kind, id) {
  if (!env.HOTEL_KV || !id) return;
  const ids = await readIndex(env, kind);
  if (!ids.includes(id)) {
    ids.push(id);
    await env.HOTEL_KV.put(INDEX_KEYS[kind], JSON.stringify(ids));
  }
}

async function readAll(env, kind) {
  const ids = await readIndex(env, kind);
  if (!ids.length) return [];
  const records = await Promise.all(ids.map(async id => {
    const raw = await env.HOTEL_KV.get(PREFIXES[kind] + id);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }));
  return records.filter(r => r !== null);
}

/* ============================================================
   STORAGE — Cloudflare KV (free tier)
   Keys:  conv:<id>   case:<id>   maint:<id>
   ============================================================ */
async function saveConversation(request, env) {
  const conv = await request.json();
  if (!conv.id) conv.id = "conv_" + Date.now();
  conv.updatedAt = new Date().toISOString();
  await env.HOTEL_KV.put("conv:" + conv.id, JSON.stringify(conv));
  await addToIndex(env, "conv", conv.id);
  return json({ ok: true, id: conv.id });
}

async function listConversations(env) {
  const items = await readAll(env, "conv");
  return json({ conversations: items });
}

async function saveCase(request, env) {
  const c = await request.json();
  const isNew = !c.id;
  if (!c.id) c.id = "CASE-" + Date.now().toString().slice(-6);
  c.updatedAt = new Date().toISOString();
  if (!c.createdAt) c.createdAt = c.updatedAt;
  /* case-management defaults */
  if (!c.owner) c.owner = "frontDesk";
  if (!c.assignedTo || typeof c.assignedTo !== "object") {
    c.assignedTo = { team: c.owner, person: null };
  }
  if (!Array.isArray(c.notes)) c.notes = [];
  if (typeof c.currentNote !== "string") c.currentNote = "";
  /* on first save, seed an opening note from the description */
  if (isNew && (c.description || c.summary)) {
    c.notes.push({
      author: c.openedBy || "System",
      team: "frontDesk",
      text: c.description || c.summary,
      type: "open",
      at: c.createdAt
    });
    if (!c.currentNote) c.currentNote = (c.description || c.summary).slice(0, 140);
  }
  await env.HOTEL_KV.put("case:" + c.id, JSON.stringify(c));
  await addToIndex(env, "case", c.id);

  /* if it's a maintenance case, mirror a linked entry into the log */
  if (c.type === "maintenance") {
    const m = {
      id: "MAINT-" + c.id.replace("CASE-", ""),
      caseId: c.id,
      room: c.room,
      guestName: (c.firstName || "") + " " + (c.lastName || ""),
      issue: c.summary || c.description || "",
      status: c.status || "Open",
      assignedTech: c.assignedTech || "",
      fixNotes: c.fixNotes || "",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    };
    await env.HOTEL_KV.put("maint:" + m.id, JSON.stringify(m));
    await addToIndex(env, "maint", m.id);
  }
  return json({ ok: true, id: c.id });
}

async function listCases(env) {
  const items = await readAll(env, "case");
  return json({ cases: items });
}

async function saveMaintenance(request, env) {
  const m = await request.json();
  if (!m.id) m.id = "MAINT-" + Date.now().toString().slice(-6);
  m.updatedAt = new Date().toISOString();
  if (!m.createdAt) m.createdAt = m.updatedAt;
  await env.HOTEL_KV.put("maint:" + m.id, JSON.stringify(m));
  await addToIndex(env, "maint", m.id);
  return json({ ok: true, id: m.id });
}

async function listMaintenance(env) {
  /* maintenance log is now: all cases where owner is 'maintenance' AND not closed.
     We pull cases (not maint: keys) so reassignment between front desk and
     maintenance just flips the owner field — no data duplication. */
  const cases = await readAll(env, "case");
  const items = cases.filter(function(c){
    return c.owner === "maintenance" && c.closed !== true && (c.status || "").toLowerCase() !== "closed";
  });
  return json({ maintenance: items });
}

async function listAllMaintenance(env) {
  const items = await readAll(env, "maint");
  return json({ maintenance: items });
}

/* ============================================================
   GUEST REQUESTS (V1.01) — Express checkouts, refunds,
   lost & found, late checkout, housekeeping incidents.
   ============================================================
   Same shape across all request types:
     { id, type, status, createdAt, fields:{}, processedAt, processedBy }
   Status flow: pending -> processed -> archived (or skip to archived)
   ============================================================ */

async function saveRequest(request, env) {
  const r = await request.json();
  if (!r.type) {
    return json({ error: "type required (express_checkout | refund | lost_found | late_checkout | housekeeping_incident)" }, 400);
  }
  if (!r.id) r.id = "REQ-" + Date.now().toString().slice(-6);
  r.createdAt = r.createdAt || new Date().toISOString();
  r.status = r.status || "pending";
  if (typeof r.fields !== "object" || r.fields === null) r.fields = {};
  if (!("processedAt" in r)) r.processedAt = null;
  if (!("processedBy" in r)) r.processedBy = null;
  await env.HOTEL_KV.put("request:" + r.id, JSON.stringify(r));
  await addToIndex(env, "request", r.id);
  return json({ ok: true, id: r.id });
}

async function listRequests(env) {
  const items = await readAll(env, "request");
  /* return active (non-archived) for the dashboard view */
  const active = items.filter(function(x){ return x && x.status !== "archived"; });
  return json({ requests: active });
}

async function processRequest(request, env) {
  const body = await request.json();
  if (!body.id) return json({ error: "id required" }, 400);
  const raw = await env.HOTEL_KV.get("request:" + body.id);
  if (!raw) return json({ error: "not found" }, 404);
  const r = JSON.parse(raw);
  /* Mark processed (visible in dashboard until manually archived
     or auto-archived 30 days after processedAt). */
  r.status = "processed";
  r.processedAt = new Date().toISOString();
  r.processedBy = body.processedBy || "Unknown";
  /* append a processing note if one was provided */
  if (!Array.isArray(r.notes)) r.notes = [];
  if (body.note && String(body.note).trim()) {
    r.notes.push({
      author: body.processedBy || "Unknown",
      text: String(body.note).trim(),
      at: r.processedAt,
      type: "process"
    });
  }
  await env.HOTEL_KV.put("request:" + r.id, JSON.stringify(r));
  return json({ ok: true, id: r.id, status: r.status });
}

async function archiveRequest(request, env) {
  const body = await request.json();
  if (!body.id) return json({ error: "id required" }, 400);
  const raw = await env.HOTEL_KV.get("request:" + body.id);
  if (!raw) return json({ error: "not found" }, 404);
  const r = JSON.parse(raw);
  r.status = "archived";
  r.processedAt = r.processedAt || new Date().toISOString();
  r.processedBy = r.processedBy || (body.archivedBy || "Unknown");
  await env.HOTEL_KV.put("request:" + r.id, JSON.stringify(r));
  return json({ ok: true, id: r.id, status: r.status });
}

/* Auto-archive requests with two rules:
     (A) PENDING items older than per-type threshold from createdAt
            (express_checkout=48h, housekeeping_incident=10d).
            This handles abandoned / unprocessed items.
     (B) PROCESSED items older than 30 days from processedAt
            (universal across all types). This cleans up the
            audit log so the dashboard does not grow forever.
   Other types in pending state are NOT auto-archived
   (front desk must process or archive manually). */
async function autoArchiveOldRequests(env) {
  const items = await readAll(env, "request");
  const now = Date.now();
  const HOUR = 3600 * 1000;
  const DAY  = 24 * HOUR;
  const PENDING_THRESHOLDS = {
    express_checkout:      48 * HOUR,
    housekeeping_incident: 10 * DAY
  };
  const PROCESSED_RETENTION = 30 * DAY;
  let archived = 0;
  for (const r of items) {
    if (!r || r.status === "archived") continue;
    let shouldArchive = false;
    let reason = "";
    if (r.status === "processed") {
      const procT = new Date(r.processedAt || r.createdAt).getTime();
      if (now - procT > PROCESSED_RETENTION) {
        shouldArchive = true;
        reason = "Auto (30d post-process)";
      }
    } else {
      /* pending: type-specific from createdAt */
      const th = PENDING_THRESHOLDS[r.type];
      if (th) {
        const created = new Date(r.createdAt).getTime();
        if (now - created > th) {
          shouldArchive = true;
          reason = "Auto (" + Math.round(th / HOUR) + "h pending)";
        }
      }
    }
    if (shouldArchive) {
      r.status = "archived";
      r.archivedAt = new Date().toISOString();
      r.archivedBy = reason;
      await env.HOTEL_KV.put("request:" + r.id, JSON.stringify(r));
      archived++;
    }
  }
  return { archived };
}

/* Backwards-compat shim — old name still callable if anything references it */
async function autoArchiveOldCheckouts(env) {
  return autoArchiveOldRequests(env);
}


/* ============================================================
   UNIFIED SETTINGS — front desk + maintenance + admin in one key.
   Stored at KV key "settings".
   ============================================================ */
const SETTINGS_KEY  = "settings";
const DEFAULT_SETTINGS = {
  /* passcodes (admin is always required) */
  adminPasscode:        "McAlesterAdmin2026",
  dashboardPasscode:    "frontdesk2026",
  maintenancePasscode:  "iwillfixit",
  /* whether each gate is enforced */
  requireDashboardPasscode:   true,
  requireMaintenancePasscode: true,
  /* staff rosters — admin types these once, dropdown choices */
  frontDeskStaff:    ["Front Desk 1","Front Desk 2","Front Desk 3"],
  maintenanceStaff:  ["Maintenance 1","Maintenance 2","Maintenance 3"],
  housekeepingStaff: ["Housekeeping 1","Housekeeping 2","Housekeeping 3"],
  staffMaxPerTeam:  5,
  /* inbox polling — tunable from admin to balance quota vs responsiveness */
  inboxPollActiveMs:   15000,
  inboxPollComposerMs: 5000,
  /* response time tiers — milliseconds */
  excellentMs:          180000,   /* 3 min */
  slowMs:               600000,   /* 10 min */
  lateMs:               1200000,  /* 20 min */
  /* idle timeout — milliseconds */
  idleWarnMs:           600000,   /* 10 min */
  idleCloseMs:          1800000,  /* 30 min */
  /* phone numbers */
  reservationPhone:     "(918) 426-8091",
  groupPhone:           "(918) 420-9126",
  frontDeskPhone:       "(918) 420-9537"
};

async function readSettings(env) {
  if (!env.HOTEL_KV) return DEFAULT_SETTINGS;
  const raw = await env.HOTEL_KV.get(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    return Object.assign({}, DEFAULT_SETTINGS, parsed);
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

async function getSettings(env) {
  const s = await readSettings(env);
  /* return everything except the admin passcode — never expose it via GET */
  const safe = Object.assign({}, s);
  delete safe.adminPasscode;
  return json({ settings: safe });
}

async function saveSettings(request, env) {
  const body = await request.json();
  /* require correct admin passcode in the request — server-side validated */
  const current = await readSettings(env);
  if ((body.adminPasscode || "") !== current.adminPasscode) {
    return json({ error: "Admin passcode incorrect" }, 401);
  }
  const updated = body.settings || {};
  /* allow rotating the admin passcode too if newAdminPasscode provided */
  if (body.newAdminPasscode && body.newAdminPasscode.length >= 6) {
    updated.adminPasscode = body.newAdminPasscode;
  } else {
    updated.adminPasscode = current.adminPasscode;
  }
  /* merge with defaults so missing fields keep current values */
  const merged = Object.assign({}, current, updated);
  await env.HOTEL_KV.put(SETTINGS_KEY, JSON.stringify(merged));
  /* return the safe (no admin pass) version */
  const safe = Object.assign({}, merged);
  delete safe.adminPasscode;
  return json({ ok: true, settings: safe });
}

async function verifyAdmin(request, env) {
  const body = await request.json();
  const s = await readSettings(env);
  return json({ ok: (body.passcode || "") === s.adminPasscode });
}

async function verifyMaintenance(request, env) {
  const body = await request.json();
  const s = await readSettings(env);
  if (s.requireMaintenancePasscode === false) return json({ ok: true, skipped: true });
  return json({ ok: (body.passcode || "") === s.maintenancePasscode });
}

async function verifyDashboard(request, env) {
  const body = await request.json();
  const s = await readSettings(env);
  if (s.requireDashboardPasscode === false) return json({ ok: true, skipped: true });
  return json({ ok: (body.passcode || "") === s.dashboardPasscode });
}

async function reassignCase(request, env) {
  const body = await request.json();
  const id = body.id;
  const newOwner = body.owner; /* 'frontDesk' or 'maintenance' */
  const reassignedBy = body.reassignedBy || "Front Desk";
  if (!id || (newOwner !== "frontDesk" && newOwner !== "maintenance")) {
    return json({ error: "id and owner ('frontDesk'|'maintenance') required" }, 400);
  }
  const raw = await env.HOTEL_KV.get("case:" + id);
  if (!raw) return json({ error: "Case not found" }, 404);
  const c = JSON.parse(raw);
  const previousOwner = c.owner || "frontDesk";
  c.owner = newOwner;
  c.updatedAt = new Date().toISOString();
  c.reassignHistory = c.reassignHistory || [];
  c.reassignHistory.push({
    from: previousOwner, to: newOwner, by: reassignedBy, at: c.updatedAt
  });
  /* timeline note */
  c.notes = c.notes || [];
  c.notes.push({
    author: reassignedBy,
    team: previousOwner,
    text: "Reassigned from " + previousOwner + " to " + newOwner,
    type: "reassign",
    at: c.updatedAt
  });
  /* clear assigned person on team change — new team picks their own */
  c.assignedTo = { team: newOwner, person: null };
  /* reset to 'Open' on reassignment so it's actionable for the new owner */
  if (newOwner === "maintenance" && (c.status || "").toLowerCase() === "resolved") {
    c.status = "Open";
  }
  await env.HOTEL_KV.put("case:" + c.id, JSON.stringify(c));
  return json({ ok: true, case: c });
}

async function addCaseNote(request, env) {
  const body = await request.json();
  if (!body.id || !body.text || !body.author) {
    return json({ error: "id, text, author required" }, 400);
  }
  const raw = await env.HOTEL_KV.get("case:" + body.id);
  if (!raw) return json({ error: "Case not found" }, 404);
  const c = JSON.parse(raw);
  c.notes = c.notes || [];
  c.notes.push({
    author: body.author,
    team: body.team || c.owner || "frontDesk",
    text: body.text,
    type: body.type || "note",
    at: new Date().toISOString()
  });
  /* if this note is also a status summary update, replace currentNote */
  if (body.updateCurrentNote === true) {
    c.currentNote = body.text.slice(0, 140);
  }
  c.updatedAt = new Date().toISOString();
  await env.HOTEL_KV.put("case:" + c.id, JSON.stringify(c));
  return json({ ok: true, case: c });
}

async function assignCaseToPerson(request, env) {
  const body = await request.json();
  if (!body.id) return json({ error: "id required" }, 400);
  const raw = await env.HOTEL_KV.get("case:" + body.id);
  if (!raw) return json({ error: "Case not found" }, 404);
  const c = JSON.parse(raw);
  const prevPerson = (c.assignedTo && c.assignedTo.person) || null;
  c.assignedTo = {
    team: body.team || c.owner || "frontDesk",
    person: body.person || null
  };
  c.notes = c.notes || [];
  if (prevPerson !== c.assignedTo.person) {
    c.notes.push({
      author: body.assignedBy || "System",
      team: c.assignedTo.team,
      text: prevPerson
        ? ("Reassigned from " + prevPerson + " to " + (c.assignedTo.person || "unassigned"))
        : ("Assigned to " + (c.assignedTo.person || "unassigned")),
      type: "assign",
      at: new Date().toISOString()
    });
  }
  c.updatedAt = new Date().toISOString();
  await env.HOTEL_KV.put("case:" + c.id, JSON.stringify(c));
  return json({ ok: true, case: c });
}

async function changeCaseStatus(request, env) {
  const body = await request.json();
  if (!body.id || !body.status) {
    return json({ error: "id and status required" }, 400);
  }
  const raw = await env.HOTEL_KV.get("case:" + body.id);
  if (!raw) return json({ error: "Case not found" }, 404);
  const c = JSON.parse(raw);
  const prev = c.status || "Open";
  c.status = body.status;
  c.updatedAt = new Date().toISOString();
  /* "Closed" marks the case as closed and removes it from active views */
  if (body.status === "Closed") {
    c.closed = true;
    c.closedAt = c.updatedAt;
    c.closedBy = body.changedBy || "Front Desk";
  } else if (prev === "Closed" && body.status !== "Closed") {
    /* reopen: clear closed flag */
    c.closed = false;
    c.closedAt = null;
  }
  c.notes = c.notes || [];
  c.notes.push({
    author: body.changedBy || "System",
    team: body.team || c.owner || "frontDesk",
    text: "Status: " + prev + " → " + body.status,
    type: "status",
    at: c.updatedAt
  });
  await env.HOTEL_KV.put("case:" + c.id, JSON.stringify(c));
  return json({ ok: true, case: c });
}

