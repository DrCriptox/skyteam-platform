// WhatsApp AI Bot — Webhook principal (Twilio + Meta Cloud API dual-mode)
// Recibe mensajes de WhatsApp, responde con IA hibrida, agenda citas

// === CONFIG ===
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

// Provider: 'twilio' or 'meta' (default: twilio)
const PROVIDER = process.env.WA_PROVIDER || 'twilio';

// Twilio config
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // sandbox default

// Meta Cloud API config (for future use when Meta account is unblocked)
const META_API = 'https://graph.facebook.com/v21.0';
const META_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const META_TOKEN = process.env.WHATSAPP_TOKEN || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'skyteam_wa_verify_2026';

// Bot config
const BOT_USERNAME = process.env.WA_BOT_USERNAME || 'yonfer';
const AUDIO_URL = process.env.WA_AUDIO_URL || '';

// === SUPABASE HELPER ===
async function sb(path, opts) {
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: (opts && opts.method) || 'GET',
      headers: { ...SB_HEADERS, ...(opts && opts.headers ? opts.headers : {}) },
      body: opts && opts.body ? opts.body : undefined,
      signal: ac.signal
    });
    clearTimeout(tm);
    if (!r.ok) { const t = await r.text().catch(() => ''); console.error('[WA-BOT] SB', r.status, path.substring(0, 60), t.substring(0, 120)); return null; }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  } catch (e) { clearTimeout(tm); console.error('[WA-BOT] SB error:', e.message); return null; }
}

// ============================================================
// SEND HELPERS — dual mode (Twilio / Meta)
// ============================================================

async function twilioSend(to, body, mediaUrl) {
  if (!TWILIO_SID || !TWILIO_TOKEN) return { ok: false, error: 'Twilio not configured' };
  try {
    var params = new URLSearchParams();
    params.append('To', to.indexOf('whatsapp:') === 0 ? to : 'whatsapp:+' + to);
    params.append('From', TWILIO_FROM);
    params.append('Body', body);
    if (mediaUrl) params.append('MediaUrl', mediaUrl);

    var r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_SID + '/Messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
      },
      body: params.toString()
    });
    var data = await r.json();
    if (!r.ok) { console.error('[WA-SEND-TWILIO]', r.status, JSON.stringify(data).substring(0, 300)); return { ok: false, error: data }; }
    return { ok: true, messageId: data.sid };
  } catch (e) { console.error('[WA-SEND-TWILIO] Exception:', e.message); return { ok: false, error: e.message }; }
}

async function metaSend(to, type, payload) {
  if (!META_PHONE_ID || !META_TOKEN) return { ok: false, error: 'Meta WA not configured' };
  try {
    var body = { messaging_product: 'whatsapp', to, type, ...payload };
    var r = await fetch(META_API + '/' + META_PHONE_ID + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + META_TOKEN },
      body: JSON.stringify(body)
    });
    var data = await r.json();
    if (!r.ok) { console.error('[WA-SEND-META]', r.status, JSON.stringify(data).substring(0, 300)); return { ok: false, error: data }; }
    return { ok: true, messageId: data.messages && data.messages[0] ? data.messages[0].id : null };
  } catch (e) { console.error('[WA-SEND-META] Exception:', e.message); return { ok: false, error: e.message }; }
}

async function sendText(to, text) {
  if (PROVIDER === 'twilio') return twilioSend(to, text);
  return metaSend(to, 'text', { text: { preview_url: true, body: text } });
}

async function sendAudio(to, audioUrl) {
  if (PROVIDER === 'twilio') return twilioSend(to, '🎙️ Mensaje de bienvenida:', audioUrl);
  return metaSend(to, 'audio', { audio: { link: audioUrl } });
}

// Slots as numbered text list (works on both providers)
async function sendSlotList(to, bodyText, slots) {
  var text = bodyText + '\n\n';
  var emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  for (var i = 0; i < slots.length && i < 8; i++) {
    text += emojis[i] + ' ' + slots[i].label + '\n';
  }
  text += '\nResponde con el *número* del horario que prefieras 👆';
  return sendText(to, text);
}

async function markRead(messageId) {
  if (PROVIDER !== 'meta' || !META_PHONE_ID || !META_TOKEN) return;
  fetch(META_API + '/' + META_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + META_TOKEN },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId })
  }).catch(function () { });
}

// ============================================================
// AI HELPERS
// ============================================================

async function callGPT(systemPrompt, messages, maxTokens) {
  var key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  var msgs = [{ role: 'system', content: systemPrompt }];
  messages.forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
  try {
    var r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: maxTokens || 400, temperature: 0.7, messages: msgs })
    });
    var data = await r.json();
    return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
  } catch (e) { console.error('[WA-BOT] GPT error:', e.message); return null; }
}

async function callClaude(systemPrompt, messages, maxTokens) {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key) return callGPT(systemPrompt, messages, maxTokens);
  try {
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens || 400, system: systemPrompt, messages: messages })
    });
    var data = await r.json();
    return data.content && data.content[0] ? data.content[0].text : null;
  } catch (e) { console.error('[WA-BOT] Claude error:', e.message); return callGPT(systemPrompt, messages, maxTokens); }
}

function detectComplexity(text) {
  if (!text) return 'simple';
  var lower = text.toLowerCase();
  var objectionWords = ['caro', 'precio', 'cuesta', 'dinero', 'pagar', 'costoso', 'barato', 'inversion',
    'tiempo', 'ocupado', 'no puedo', 'no tengo',
    'multinivel', 'piramide', 'estafa', 'scam', 'fraude', 'ilegal',
    'pensar', 'pensarlo', 'no se', 'no creo', 'seguro',
    'miedo', 'riesgo', 'funciona', 'garantia', 'devolucion'];
  var complexWords = ['por que', 'como funciona', 'que incluye', 'que ofrece', 'diferencia',
    'explica', 'necesito saber', 'tengo duda', 'no entiendo'];
  for (var i = 0; i < objectionWords.length; i++) if (lower.indexOf(objectionWords[i]) !== -1) return 'complex';
  for (var j = 0; j < complexWords.length; j++) if (lower.indexOf(complexWords[j]) !== -1) return 'complex';
  if (text.length > 120) return 'complex';
  return 'simple';
}

// ============================================================
// SLOT CALCULATOR (server-side)
// ============================================================
function toMins(t) { var p = (t || '00:00').split(':').map(Number); return p[0] * 60 + (p[1] || 0); }
function padZ(n) { return n < 10 ? '0' + n : '' + n; }

async function getAvailableSlots(username, maxDays, maxSlots) {
  maxDays = maxDays || 5;
  maxSlots = maxSlots || 8;

  var configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(username) + '&select=config');
  var cfg = configs && configs[0] ? configs[0].config : null;
  if (!cfg || !cfg.activa) return [];

  var dur = cfg.duracion || 25;
  var anticipMs = (cfg.anticipacionMin || 60) * 60000;

  var schedule = cfg.schedule || null;
  if (!schedule) {
    var diasOk = cfg.dias || {};
    var globalBloques = cfg.bloques && cfg.bloques.length ? cfg.bloques : [{ ini: '09:00', fin: '18:00' }];
    schedule = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(function (d) {
      schedule[d] = { activo: !!(diasOk[d]), bloques: globalBloques };
    });
  }

  var now = new Date();
  var futureDate = new Date(now.getTime() + maxDays * 86400000);
  var bookings = await sb('bookings?username=eq.' + encodeURIComponent(username) +
    '&status=in.(activa,completada,verificada,sospechosa)&fecha_iso=gte.' + now.toISOString() +
    '&fecha_iso=lte.' + futureDate.toISOString() + '&select=fecha_iso');
  var bookedISOs = (bookings || []).map(function (b) {
    try { return new Date(b.fecha_iso).toISOString(); } catch (e) { return b.fecha_iso; }
  });

  var bogotaNow = new Date(now.getTime() - 5 * 3600000);
  var fechaIni = bogotaNow.toISOString().slice(0, 10);
  var fechaFin = new Date(bogotaNow.getTime() + maxDays * 86400000).toISOString().slice(0, 10);
  var planBlocks = await sb('plan_diario?username=eq.' + encodeURIComponent(username) +
    '&fecha=gte.' + fechaIni + '&fecha=lte.' + fechaFin + '&select=fecha,hora_inicio,hora_fin');
  var personalByDate = {};
  if (planBlocks && Array.isArray(planBlocks)) {
    planBlocks.forEach(function (pb) {
      if (!personalByDate[pb.fecha]) personalByDate[pb.fecha] = [];
      personalByDate[pb.fecha].push({ ini: pb.hora_inicio.slice(0, 5), fin: pb.hora_fin.slice(0, 5) });
    });
  }

  var slots = [];
  for (var di = 0; di < maxDays && slots.length < maxSlots; di++) {
    var base = new Date(now);
    base.setDate(base.getDate() + di);
    var y, mo, d, dow;
    try {
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(base);
      var pm = {}; parts.forEach(function (p) { pm[p.type] = p.value; });
      y = parseInt(pm.year); mo = parseInt(pm.month) - 1; d = parseInt(pm.day);
      var dm = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      dow = dm[pm.weekday] !== undefined ? dm[pm.weekday] : base.getDay();
    } catch (e) { y = base.getFullYear(); mo = base.getMonth(); d = base.getDate(); dow = base.getDay(); }

    var daySchedule = schedule[dow] || { activo: false, bloques: [] };
    if (!daySchedule.activo) continue;

    var dateKey = y + '-' + padZ(mo + 1) + '-' + padZ(d);
    var personalBlks = personalByDate[dateKey] || [];
    var dayBloques = daySchedule.bloques || [];

    for (var bi = 0; bi < dayBloques.length && slots.length < maxSlots; bi++) {
      var bIni = toMins(dayBloques[bi].ini);
      var bFin = toMins(dayBloques[bi].fin);
      if (bFin <= bIni) continue;

      for (var m = bIni; m + dur <= bFin && slots.length < maxSlots; m += dur) {
        var slotDate = new Date(Date.UTC(y, mo, d, Math.floor(m / 60), m % 60) + 5 * 3600000);
        if (slotDate.getTime() < now.getTime() + anticipMs) continue;
        var slotISO = slotDate.toISOString();
        if (bookedISOs.indexOf(slotISO) !== -1) continue;

        var blocked = false;
        for (var pi = 0; pi < personalBlks.length; pi++) {
          var pIni = toMins(personalBlks[pi].ini), pFin = toMins(personalBlks[pi].fin);
          if (m < pFin && m + dur > pIni) { blocked = true; break; }
        }
        if (blocked) continue;

        var hh = Math.floor(m / 60), mm = m % 60;
        var ampm = hh >= 12 ? 'PM' : 'AM';
        var h12 = hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh);
        var dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        var monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        slots.push({
          iso: slotISO,
          label: dayNames[dow] + ' ' + d + ' ' + monthNames[mo] + ' ' + h12 + ':' + padZ(mm) + ' ' + ampm,
          desc: dur + ' min'
        });
      }
    }
  }
  return slots;
}

// ============================================================
// LEAD MANAGEMENT
// ============================================================

// Normalize phone: remove 'whatsapp:' prefix and '+' if present
function normalizePhone(phone) {
  return (phone || '').replace('whatsapp:', '').replace(/^\+/, '').trim();
}

async function getOrCreateLead(phone, name) {
  var leads = await sb('wa_leads?phone=eq.' + encodeURIComponent(phone) + '&select=*');
  if (leads && leads.length > 0) {
    var lead = leads[0];
    await sb('wa_leads?phone=eq.' + encodeURIComponent(phone), {
      method: 'PATCH',
      body: JSON.stringify({ last_message_at: new Date().toISOString(), followup_stage: 0, updated_at: new Date().toISOString() })
    });
    lead.last_message_at = new Date().toISOString();
    lead.followup_stage = 0;
    return { lead, isNew: false };
  }

  var newLead = {
    phone: phone, name: name || 'Prospecto', bot_username: BOT_USERNAME,
    etapa: 'nuevo', temperatura: 'tibio', source: 'whatsapp_bot',
    last_message_at: new Date().toISOString()
  };
  var created = await sb('wa_leads', {
    method: 'POST', headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(newLead)
  });

  await sb('prospectos', {
    method: 'POST',
    body: JSON.stringify({
      username: BOT_USERNAME, nombre: name || 'Prospecto WA', telefono: phone,
      etapa: 'Contacto inicial', fuente: 'WhatsApp Bot', temperatura: 'tibio',
      notas: 'Lead automatico del bot de WhatsApp'
    })
  });

  return { lead: created && created[0] ? created[0] : newLead, isNew: true };
}

async function loadConversation(phone, limit) {
  var msgs = await sb('wa_conversations?phone=eq.' + encodeURIComponent(phone) +
    '&bot_username=eq.' + encodeURIComponent(BOT_USERNAME) +
    '&order=created_at.desc&limit=' + (limit || 12));
  if (!msgs) return [];
  return msgs.reverse().map(function (m) {
    return { role: m.direction === 'in' ? 'user' : 'assistant', content: m.content || '' };
  });
}

async function saveMessage(phone, direction, content, msgType, waMessageId) {
  await sb('wa_conversations', {
    method: 'POST',
    body: JSON.stringify({
      phone: phone, direction: direction, message_type: msgType || 'text',
      content: content, wa_message_id: waMessageId || null, bot_username: BOT_USERNAME
    })
  });
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

function buildSystemPrompt(lead, slotsText) {
  return `Eres el asistente de WhatsApp de SKYTEAM, una franquicia digital de educacion y negocios online. Tu nombre es "Asistente Sky". Respondes en nombre del asesor.

SOBRE EL NEGOCIO:
- SKYTEAM es una franquicia digital que ofrece educacion, herramientas de IA y una comunidad de emprendedores
- Los socios acceden a una plataforma con CRM inteligente, coach de IA, agenda profesional y red de equipo
- El modelo permite generar ingresos mientras aprendes marketing digital, ventas y liderazgo
- No es un esquema piramidal: es una franquicia con productos reales de educacion y tecnologia

TU OBJETIVO:
1. Responder preguntas del prospecto con honestidad y entusiasmo
2. Generar interes y confianza
3. Guiar hacia agendar una reunion PRIVADA de 25 minutos por videollamada
4. La reunion es GRATIS, sin compromiso, y es donde el asesor explica todo en detalle

INFORMACION DEL LEAD:
- Nombre: ${lead.name || 'Prospecto'}
- Etapa: ${lead.etapa || 'nuevo'}
- Objeciones previas: ${lead.objections && lead.objections.length ? lead.objections.join(', ') : 'ninguna registrada'}
${lead.context_summary ? '- Contexto previo: ' + lead.context_summary : ''}

MANEJO DE OBJECIONES:
- "Es caro / cuanto cuesta": "Entiendo tu preocupacion. Justamente en la reunion de 25 min te mostramos los diferentes planes y como se paga solo con lo que generas. Es gratis y sin compromiso."
- "No tengo tiempo": "La reunion es solo 25 minutos y el negocio es 100% digital, lo manejas a tu ritmo. Muchos de nuestros socios trabajan medio tiempo."
- "Es multinivel / piramide": "Es una franquicia digital con productos reales de educacion y tecnologia. En la reunion te mostramos exactamente como funciona el modelo."
- "Lo voy a pensar": "Claro, sin presion. Si quieres te reservo un espacio por si te animas, sin compromiso. Tambien puedo resolver cualquier duda que tengas."
- "No se vender": "No necesitas experiencia. La plataforma tiene herramientas de IA que te guian paso a paso."

REGLAS ESTRICTAS:
- Responde SIEMPRE en espanol
- Maximo 2-3 oraciones por mensaje (estilo WhatsApp, no parrafos largos)
- Se amigable y natural, como si hablaras por WhatsApp con un amigo
- Usa emojis con moderacion (1-2 por mensaje maximo)
- NUNCA inventes datos que no sepas (precios, numeros, resultados)
- NUNCA presiones. Si dicen que no, respeta con amabilidad
- Si preguntan algo que no sabes, di: "Esa es muy buena pregunta, el asesor te lo explica en la reunion"

ACCIONES ESPECIALES (incluye estas etiquetas EXACTAS cuando corresponda):
- Cuando el prospecto quiera agendar o diga "si" a la reunion: incluye [AGENDAR] al final de tu mensaje
- Cuando pida hablar con una persona real: incluye [ESCALAR] al final de tu mensaje
- Cuando muestre una objecion nueva: incluye [OBJECION:texto_de_la_objecion] al final

${slotsText ? 'HORARIOS DISPONIBLES PARA REUNION:\\n' + slotsText + '\\n(Si el prospecto quiere agendar, dile que le muestras los horarios disponibles e incluye [AGENDAR])' : ''}`;
}

// ============================================================
// BOOKING
// ============================================================

async function createBookingFromSlot(phone, name, slotISO) {
  var bookingId = crypto.randomUUID();
  await sb('bookings', {
    method: 'POST',
    body: JSON.stringify({
      id: bookingId, username: BOT_USERNAME, nombre: name || 'Prospecto WA',
      whatsapp: phone, fecha_iso: slotISO, status: 'activa', notas: 'Agendado via WhatsApp Bot'
    })
  });

  await sb('wa_leads?phone=eq.' + encodeURIComponent(phone), {
    method: 'PATCH',
    body: JSON.stringify({ etapa: 'agendado', temperatura: 'caliente', booking_id: bookingId, followup_paused: true, updated_at: new Date().toISOString() })
  });

  await sb('prospectos?username=eq.' + encodeURIComponent(BOT_USERNAME) + '&telefono=eq.' + encodeURIComponent(phone), {
    method: 'PATCH',
    body: JSON.stringify({ etapa: 'Reunion agendada', temperatura: 'caliente' })
  });

  return bookingId;
}

function formatSlotConfirmation(slotISO) {
  try {
    var d = new Date(slotISO);
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
  } catch (e) { return slotISO; }
}

// ============================================================
// MESSAGE PARSER — extracts from, text, name from Twilio or Meta
// ============================================================

function parseTwilioMessage(body) {
  if (!body || !body.From) return null;
  var phone = normalizePhone(body.From);
  var text = body.Body || '';
  var name = body.ProfileName || '';
  var msgId = body.MessageSid || '';
  var hasMedia = parseInt(body.NumMedia || '0') > 0;
  var mediaUrl = body.MediaUrl0 || '';
  var mediaType = body.MediaContentType0 || '';

  var msgType = 'text';
  if (hasMedia) {
    if (mediaType.indexOf('audio') !== -1 || mediaType.indexOf('ogg') !== -1) msgType = 'audio';
    else if (mediaType.indexOf('image') !== -1) msgType = 'image';
    else msgType = 'media';
  }

  return { phone, text, name, msgId, msgType, hasMedia, mediaUrl };
}

function parseMetaMessage(body) {
  if (!body || body.object !== 'whatsapp_business_account') return null;
  var entry = body.entry && body.entry[0];
  var changes = entry && entry.changes && entry.changes[0];
  var value = changes && changes.value;
  if (!value || value.statuses || !value.messages || !value.messages.length) return null;

  var msg = value.messages[0];
  var phone = normalizePhone(msg.from);
  var name = value.contacts && value.contacts[0] && value.contacts[0].profile ? value.contacts[0].profile.name : '';
  var msgId = msg.id;
  var msgType = msg.type;
  var text = '';

  if (msgType === 'text') text = msg.text && msg.text.body ? msg.text.body : '';
  else if (msgType === 'interactive') {
    if (msg.interactive && msg.interactive.type === 'button_reply') text = msg.interactive.button_reply.title || '';
    else if (msg.interactive && msg.interactive.type === 'list_reply') text = msg.interactive.list_reply.title || '';
  } else if (msgType === 'audio' || msgType === 'voice') text = '[Audio]';
  else if (msgType === 'image') text = '[Imagen]';
  else text = '[Mensaje tipo: ' + msgType + ']';

  return { phone, text, name, msgId, msgType, hasMedia: false, mediaUrl: '' };
}

// ============================================================
// SLOT SELECTION DETECTION
// ============================================================

// Cached slots per phone (in-memory, resets per cold start)
var _pendingSlots = {};

function detectSlotSelection(text, phone) {
  if (!text) return null;
  var clean = text.trim();
  // Check if it's a number 1-8
  if (/^[1-8]$/.test(clean)) {
    var idx = parseInt(clean) - 1;
    var pending = _pendingSlots[phone];
    if (pending && pending.length > idx) {
      return pending[idx].iso;
    }
  }
  return null;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // === GET: Meta Webhook Verification ===
  if (req.method === 'GET') {
    var mode = req.query['hub.mode'];
    var token = req.query['hub.verify_token'];
    var challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WA-BOT] Webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  try {
    // === PARSE MESSAGE (auto-detect provider) ===
    var parsed = null;

    if (req.body && req.body.From && req.body.From.indexOf('whatsapp') !== -1) {
      // Twilio format
      parsed = parseTwilioMessage(req.body);
    } else if (req.body && req.body.object === 'whatsapp_business_account') {
      // Meta Cloud API format
      parsed = parseMetaMessage(req.body);
      if (!parsed) return res.status(200).json({ status: 'ignored' });
    } else {
      return res.status(200).json({ status: 'unknown_format' });
    }

    if (!parsed || !parsed.phone || !parsed.text) {
      // Twilio expects TwiML response, return empty
      if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
      return res.status(200).json({ status: 'empty' });
    }

    var from = parsed.phone;
    var textContent = parsed.text;
    var contactName = parsed.name;
    var msgId = parsed.msgId;
    var msgType = parsed.msgType;

    console.log('[WA-BOT] From:', from, 'Type:', msgType, 'Text:', textContent.substring(0, 80));

    // Mark as read (Meta only)
    markRead(msgId);

    // === GET OR CREATE LEAD ===
    var result = await getOrCreateLead(from, contactName);
    var lead = result.lead;
    var isNew = result.isNew;

    // Save incoming message
    await saveMessage(from, 'in', textContent, msgType, msgId);

    // === DETECT SLOT SELECTION (user replied with a number) ===
    var selectedSlotISO = detectSlotSelection(textContent, from);

    if (selectedSlotISO) {
      try {
        var bookingId = await createBookingFromSlot(from, lead.name || contactName, selectedSlotISO);
        var fechaFormatted = formatSlotConfirmation(selectedSlotISO);

        var confirmText = '✅ *Tu reunion quedo confirmada:*\n\n' +
          '📅 ' + fechaFormatted + '\n' +
          '⏱ 25 minutos\n' +
          '📹 Videollamada\n\n' +
          'Te enviaremos un recordatorio antes. Nos vemos! 🙌';

        var confirmResult = await sendText(from, confirmText);
        await saveMessage(from, 'out', confirmText, 'text', confirmResult.messageId);
        delete _pendingSlots[from];

        notifySocio(lead.name || contactName, from, fechaFormatted).catch(function () { });

      } catch (bookErr) {
        console.error('[WA-BOT] Booking error:', bookErr.message);
        await sendText(from, 'Hubo un problema al reservar. Intenta de nuevo en un momento.');
      }

      if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
      return res.status(200).json({ status: 'booking_processed' });
    }

    // === NEW LEAD: Welcome flow ===
    if (isNew) {
      if (AUDIO_URL) {
        var audioResult = await sendAudio(from, AUDIO_URL);
        await saveMessage(from, 'out', '[Audio de bienvenida]', 'audio', audioResult.messageId);
      }
    }

    // === BUILD AI CONTEXT ===
    var history = await loadConversation(from, 12);
    var aiMessages = [];
    for (var hi = 0; hi < history.length - 1; hi++) {
      aiMessages.push(history[hi]);
    }
    aiMessages.push({ role: 'user', content: textContent });

    var slots = await getAvailableSlots(BOT_USERNAME, 5, 6);
    var slotsText = slots.length > 0
      ? slots.map(function (s, i) { return (i + 1) + '. ' + s.label; }).join('\n')
      : 'No hay horarios disponibles en los proximos 5 dias.';

    var systemPrompt = buildSystemPrompt(lead, slotsText);

    // === CALL AI (hybrid model) ===
    var complexity = detectComplexity(textContent);
    var aiResponse;
    if (complexity === 'complex') {
      aiResponse = await callClaude(systemPrompt, aiMessages, 400);
    } else {
      aiResponse = await callGPT(systemPrompt, aiMessages, 400);
    }

    if (!aiResponse) {
      aiResponse = 'Hola! Gracias por tu interes. Un asesor se pondra en contacto contigo pronto. 🙌';
    }

    // === PARSE SPECIAL TAGS ===
    var shouldShowSlots = aiResponse.indexOf('[AGENDAR]') !== -1;
    var shouldEscalate = aiResponse.indexOf('[ESCALAR]') !== -1;
    var objectionMatch = aiResponse.match(/\[OBJECION:([^\]]+)\]/);

    var cleanResponse = aiResponse
      .replace(/\[AGENDAR\]/g, '').replace(/\[ESCALAR\]/g, '').replace(/\[OBJECION:[^\]]+\]/g, '').trim();

    // === SEND RESPONSE ===
    if (cleanResponse) {
      var textResult = await sendText(from, cleanResponse);
      await saveMessage(from, 'out', cleanResponse, 'text', textResult.messageId);
    }

    if (shouldShowSlots && slots.length > 0) {
      // Cache slots for this phone (for number-based selection)
      _pendingSlots[from] = slots;
      await sendSlotList(from, 'Elige el horario que mejor te funcione 👇', slots);
      await saveMessage(from, 'out', '[Lista de horarios enviada]', 'interactive');
    } else if (shouldShowSlots && slots.length === 0) {
      var noSlotsText = 'En este momento no tengo horarios disponibles, pero te contactamos pronto para coordinar. 🙏';
      await sendText(from, noSlotsText);
      await saveMessage(from, 'out', noSlotsText, 'text');
    }

    if (shouldEscalate) {
      await sb('wa_leads?phone=eq.' + encodeURIComponent(from), {
        method: 'PATCH',
        body: JSON.stringify({ etapa: 'escalado', followup_paused: true, updated_at: new Date().toISOString() })
      });
      notifySocio(lead.name || contactName, from, 'solicita hablar con una persona').catch(function () { });
    }

    if (objectionMatch && objectionMatch[1]) {
      var currentObj = lead.objections || [];
      currentObj.push(objectionMatch[1].trim());
      await sb('wa_leads?phone=eq.' + encodeURIComponent(from), {
        method: 'PATCH',
        body: JSON.stringify({ objections: currentObj, updated_at: new Date().toISOString() })
      });
    }

    // Update context summary every 8 messages
    if (history.length > 0 && history.length % 8 === 0) {
      updateContextSummary(from, history).catch(function () { });
    }

    // Twilio expects TwiML, Meta expects JSON
    if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('[WA-BOT] Unhandled error:', error.message, error.stack);
    if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
    return res.status(200).json({ status: 'error', message: error.message });
  }
}

// ============================================================
// BACKGROUND TASKS
// ============================================================

async function notifySocio(leadName, leadPhone, detail) {
  var VAPID_PUB = process.env.VAPID_PUBLIC_KEY;
  var VAPID_PRIV = process.env.VAPID_PRIVATE_KEY;
  var VAPID_SUB = process.env.VAPID_SUBJECT;
  if (!VAPID_PUB || !VAPID_PRIV || !VAPID_SUB) return;
  try {
    var webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);
    var subs = await sb('push_subscriptions?username=ilike.' + encodeURIComponent(BOT_USERNAME));
    if (!subs || subs.length === 0) return;
    var payload = JSON.stringify({
      title: '📱 Nuevo lead WhatsApp', body: (leadName || 'Prospecto') + ' — ' + detail,
      url: '/?page=prospectos', tag: 'wa-lead-' + Date.now()
    });
    for (var i = 0; i < subs.length; i++) {
      webpush.sendNotification(subs[i].subscription, payload).catch(function () { });
    }
  } catch (e) { /* silent */ }
}

async function updateContextSummary(phone, history) {
  var text = history.map(function (m) { return m.role + ': ' + m.content; }).join('\n');
  var summary = await callGPT(
    'Resume esta conversacion de WhatsApp en 2-3 oraciones. Incluye: nombre del prospecto, que le interesa, objeciones que tuvo, y en que etapa quedo. Solo el resumen, nada mas.',
    [{ role: 'user', content: text }], 200
  );
  if (summary) {
    await sb('wa_leads?phone=eq.' + encodeURIComponent(phone), {
      method: 'PATCH',
      body: JSON.stringify({ context_summary: summary, updated_at: new Date().toISOString() })
    });
  }
}
