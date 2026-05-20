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
- Phone (front desk, 24/7): ${HOTEL.phone}
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

WHEN A GUEST REPORTS A PROBLEM (broken, maintenance, cleanliness, noise, safety):
- Be empathetic. Acknowledge the issue.
- Say you'll flag this for the front desk so a team member follows up.
- Mention they can also call ${HOTEL.phone} for anything urgent.

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

      /* ---- list maintenance log ---- */
      if (path === "/maintenance-log" && request.method === "GET") {
        return await listMaintenance(env);
      }

      /* ---- health check ---- */
      if (path === "/" || path === "/health") {
        return json({ ok: true, hotel: HOTEL.name, time: new Date().toISOString() });
      }

      return json({ error: "Not found", path }, 404);

    } catch (err) {
      return json({ error: err.message }, 500);
    }
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
   STORAGE — Cloudflare KV (free tier)
   Keys:  conv:<id>   case:<id>   maint:<id>
   ============================================================ */
async function saveConversation(request, env) {
  const conv = await request.json();
  if (!conv.id) conv.id = "conv_" + Date.now();
  conv.updatedAt = new Date().toISOString();
  await env.HOTEL_KV.put("conv:" + conv.id, JSON.stringify(conv));
  return json({ ok: true, id: conv.id });
}

async function listConversations(env) {
  const list = await env.HOTEL_KV.list({ prefix: "conv:" });
  const items = [];
  for (const key of list.keys) {
    const v = await env.HOTEL_KV.get(key.name);
    if (v) items.push(JSON.parse(v));
  }
  return json({ conversations: items });
}

async function saveCase(request, env) {
  const c = await request.json();
  if (!c.id) c.id = "CASE-" + Date.now().toString().slice(-6);
  c.updatedAt = new Date().toISOString();
  if (!c.createdAt) c.createdAt = c.updatedAt;
  await env.HOTEL_KV.put("case:" + c.id, JSON.stringify(c));

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
  }
  return json({ ok: true, id: c.id });
}

async function listCases(env) {
  const list = await env.HOTEL_KV.list({ prefix: "case:" });
  const items = [];
  for (const key of list.keys) {
    const v = await env.HOTEL_KV.get(key.name);
    if (v) items.push(JSON.parse(v));
  }
  return json({ cases: items });
}

async function saveMaintenance(request, env) {
  const m = await request.json();
  if (!m.id) m.id = "MAINT-" + Date.now().toString().slice(-6);
  m.updatedAt = new Date().toISOString();
  if (!m.createdAt) m.createdAt = m.updatedAt;
  await env.HOTEL_KV.put("maint:" + m.id, JSON.stringify(m));
  return json({ ok: true, id: m.id });
}

async function listMaintenance(env) {
  const list = await env.HOTEL_KV.list({ prefix: "maint:" });
  const items = [];
  for (const key of list.keys) {
    const v = await env.HOTEL_KV.get(key.name);
    if (v) items.push(JSON.parse(v));
  }
  return json({ maintenance: items });
}
