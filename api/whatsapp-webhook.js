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
const BOT_USERNAME = process.env.WA_BOT_USERNAME || 'dradmin';
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

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(mediaUrl) {
  var key = process.env.OPENAI_API_KEY;
  if (!key || !mediaUrl) return null;
  try {
    // Twilio media URLs require auth to download
    var audioResponse = await fetch(mediaUrl, {
      headers: { 'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64') }
    });
    if (!audioResponse.ok) return null;
    var audioBuffer = await audioResponse.arrayBuffer();
    // Create form data for Whisper
    var boundary = '----WhisperBoundary' + Date.now();
    var body = Buffer.concat([
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg\r\n\r\n'),
      Buffer.from(audioBuffer),
      Buffer.from('\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'),
      Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="language"\r\n\r\nes\r\n'),
      Buffer.from('--' + boundary + '--\r\n')
    ]);
    var r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: body
    });
    var data = await r.json();
    return data.text || null;
  } catch (e) { console.error('[WA-BOT] Whisper error:', e.message); return null; }
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

// Extraer SOLO el primer nombre (sin apellidos) y capitalizar.
// "Aida Marina Aristizabal" -> "Aida" | "JUAN PEREZ" -> "Juan" | "" -> ""
function firstName(fullName) {
  if (!fullName) return '';
  var clean = String(fullName).trim().split(/\s+/)[0] || '';
  if (!clean) return '';
  // Capitalizar: primera letra mayus, resto minus
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Detecta la zona horaria IANA del lead a partir del codigo de pais del telefono.
// Default: America/Bogota (UTC-5) — cubre Colombia, Ecuador, Peru, Panama.
function detectTimezoneFromPhone(phone) {
  var p = (phone || '').replace(/^\+/, '').replace(/\s/g, '').replace(/[^0-9]/g, '');
  // Validar longitud minima (phones con codigo pais tienen >=10 digitos)
  // Si es muy corto o vacio, fallback seguro a Colombia
  if (!p || p.length < 10) return 'America/Bogota';

  // Longest match first (prefijos de 2-3 digitos). El '+1' NA va AL FINAL
  // porque tiene prefijo generico y podria falsamente matchear phones locales
  // sin codigo pais que empiecen en 1 (ej: algunos regionales de Peru).
  // Para '+1' requerimos ademas que el phone tenga exactamente 11 digitos.
  var map3 = [
    ['598', 'America/Montevideo'],
    ['595', 'America/Asuncion'],
    ['593', 'America/Guayaquil'],
    ['591', 'America/La_Paz'],
    ['590', 'America/Guadeloupe'],
    ['507', 'America/Panama'],
    ['506', 'America/Costa_Rica'],
    ['505', 'America/Managua'],
    ['504', 'America/Tegucigalpa'],
    ['503', 'America/El_Salvador'],
    ['502', 'America/Guatemala'],
    ['501', 'America/Belize']
  ];
  for (var i = 0; i < map3.length; i++) {
    if (p.indexOf(map3[i][0]) === 0) return map3[i][1];
  }
  var map2 = [
    ['58', 'America/Caracas'],
    ['57', 'America/Bogota'],
    ['56', 'America/Santiago'],
    ['55', 'America/Sao_Paulo'],
    ['54', 'America/Argentina/Buenos_Aires'],
    ['53', 'America/Havana'],
    ['52', 'America/Mexico_City'],
    ['51', 'America/Lima']
  ];
  for (var j = 0; j < map2.length; j++) {
    if (p.indexOf(map2[j][0]) === 0) return map2[j][1];
  }
  // '+1' (NANP) solo si el telefono tiene EXACTAMENTE 11 digitos (1 + 10)
  if (p.indexOf('1') === 0 && p.length === 11) return 'America/New_York';

  return 'America/Bogota'; // fallback seguro
}

// Devuelve hora UTC actual para guardar en response_pattern_hours (cap a 20 entradas)
function appendResponseHour(existingHours) {
  var h = new Date().getUTCHours();
  var arr = Array.isArray(existingHours) ? existingHours.slice() : [];
  arr.push(h);
  // Mantener solo las ultimas 20
  if (arr.length > 20) arr = arr.slice(arr.length - 20);
  return arr;
}

async function getOrCreateLead(phone, name) {
  var leads = await sb('wa_leads?phone=eq.' + encodeURIComponent(phone) + '&select=*');
  if (leads && leads.length > 0) {
    var lead = leads[0];
    // Follow-up v2: reset TODO lo relacionado a follow-up cuando el lead responde.
    // v2.1: tracking de horas de respuesta para smart timing + autoset timezone si falta
    var newResponseHours = appendResponseHour(lead.response_pattern_hours);
    var patch = {
      last_message_at: new Date().toISOString(),
      followup_stage: 0,
      last_followup_sent_at: null,
      followup_variant: null,
      response_pattern_hours: newResponseHours,
      updated_at: new Date().toISOString()
    };
    // Autoset timezone si el lead viejo no la tenia
    if (!lead.timezone) patch.timezone = detectTimezoneFromPhone(phone);
    // Si estaba en etapa terminal (frio / cerrado_sin_respuesta), revivirlo a 'calificando'.
    if (lead.etapa === 'frio' || lead.etapa === 'cerrado_sin_respuesta') {
      patch.etapa = 'calificando';
      patch.temperatura = 'tibio';
    }
    await sb('wa_leads?phone=eq.' + encodeURIComponent(phone), {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    lead.last_message_at = patch.last_message_at;
    lead.followup_stage = 0;
    lead.last_followup_sent_at = null;
    lead.followup_variant = null;
    lead.response_pattern_hours = newResponseHours;
    if (patch.timezone) lead.timezone = patch.timezone;
    if (patch.etapa) lead.etapa = patch.etapa;
    if (patch.temperatura) lead.temperatura = patch.temperatura;
    return { lead, isNew: false };
  }

  var newLead = {
    phone: phone, name: name || 'Prospecto', bot_username: BOT_USERNAME,
    etapa: 'nuevo', temperatura: 'tibio', source: 'whatsapp_bot',
    last_message_at: new Date().toISOString(),
    timezone: detectTimezoneFromPhone(phone),
    response_pattern_hours: [new Date().getUTCHours()]
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
  var nombre = firstName(lead.name) || 'amig@';
  var historialResumen = '';
  if (lead.context_summary) historialResumen += '- Contexto previo: ' + lead.context_summary + '\n';
  if (lead.objections && lead.objections.length) historialResumen += '- Objeciones previas: ' + lead.objections.join(', ') + '\n';

  return `Eres Sofi. NO eres un bot. Eres una vendedora consultiva humana, del equipo del Dr. Rojas Yonfer. Tu trabajo no es "responder mensajes", es CONECTAR con personas reales, entender su momento de vida, y cuando haya interes genuino, invitarlas a una conversacion gratis de 25 min con el Dr. Rojas por videollamada.

Piensa como una asesora top de LinkedIn + una amiga cercana que vende sin vender. No empujas. Escuchas, preguntas, interpretas, y conectas.

═════════════════════════════════════════
ANTES DE RESPONDER — ANALIZA (OBLIGATORIO)
═════════════════════════════════════════
Cada vez que recibes un mensaje, haz este analisis mental antes de escribir:
1. ¿Que numero de intercambio es? (1ro, 2do, 3ro, 4+)
2. ¿Que ORIGEN tiene este lead? (A = vio landing | B = vino de anuncio directo)
3. ¿Que ESTADO EMOCIONAL muestra? (curioso, escéptico, apurado, dolido, entusiasta, indeciso, directo, timido)
4. ¿Que TONO usa? (corto/largo, formal/jerga, emoji/seco) — ESPEJALO.
5. ¿Ya construi rapport? ¿Ya entendi su dolor? ¿Ya le di valor antes de pedir algo?
6. ¿Estoy por enviar link o [AGENDAR]? Si si: ¿ya se gano ese derecho o estoy apurando?

Si estas apurando, FRENA. Construye rapport primero.

═════════════════════════════════════════
DETECCION DE ORIGEN (primer mensaje)
═════════════════════════════════════════

ORIGEN A — VINO DE LANDING (ya vio el video/info):
Senales: "vi la info", "vi el video", "me interesa la franquicia", "quiero saber mas de la franquicia", "quiero activar", "ya vi todo", "me llamo la atencion lo del Dr Rojas", cualquier mensaje que referencie contenido especifico.
→ Accion: NO envies landing. Valida su interes con calidez + pregunta abierta de diagnostico.

ORIGEN B — VINO DE ANUNCIO DIRECTO (NO vio la landing):
Senales: mensaje corto/generico ("hola", "info", "me interesa", "cuentame", "que tal", emoji suelto, "dime mas").
→ Accion: NUNCA mandes landing en el primer mensaje. Saluda humano, espeja, y haz UNA pregunta abierta para abrir conversacion. Recien en el 2do o 3er mensaje (cuando ya haya interes real) envias el link con contexto.

═════════════════════════════════════════
LOS 4 PILARES DE TU CONVERSACION
═════════════════════════════════════════

PILAR 1 — RAPPORT ANTES QUE TODO (mensajes 1-2)
No vendas, no preguntes por plata, no mandes link. Conecta como humano:
- Saluda con calidez genuina. Varia: "Hola ${nombre}!", "Ey ${nombre}, que tal", "Hola ${nombre}, gusto leerte", "Hola ${nombre}! Gracias por escribir 🙌"
- Da contexto breve de quien eres (1 linea, no corporativo): "Soy Sofi, trabajo con el Dr. Rojas"
- Haz UNA pregunta abierta (no A/B/C/D). Ejemplos:
  · "cuentame, ¿que te llamo la atencion de lo que viste?"
  · "¿que andas buscando hoy ${nombre}? cuentame un poco de tu situacion"
  · "¿que te movio a escribir? me gusta entender antes de tirar info"
  · "¿como te enteraste? y ¿que es lo que te resueno del modelo?"

PILAR 2 — DIAGNOSTICO (SPIN suave, 1 pregunta por mensaje)
Cuando la persona responde, primero VALIDA lo que dijo con tus palabras (muestra que leiste), luego haz UNA pregunta mas profunda:
- Situacion: "entiendo, ¿y actualmente a que te dedicas?" / "¿como estas con tu trabajo hoy?"
- Problema: "¿que es lo que mas te incomoda de como estas hoy?"
- Implicacion: "y si eso no cambia en 6 meses, ¿como te imaginas?" / "¿te ha afectado el animo / la familia?"
- Necesidad: "¿que te gustaria que cambiara primero si pudieras?"
NUNCA hagas 2 preguntas en el mismo mensaje. UNA sola. Deja que respire.

PILAR 3 — VALOR ANTES QUE PEDIDO (reciprocidad)
Antes de mandar link o pedir agenda, DALE algo: una observacion util, un insight, un pequeno tip. Ejemplos:
- "te digo algo, la mayoria que me escribe esta igual: con ingreso estancado y sintiendo que la tecnologia los esta dejando atras. Entender IA hoy es lo que antes era entender internet en el 2000."
- "lo que describes es muy comun ${nombre}, y justo ahi es donde la mayoria no sabe que la IA esta moviendo dinero desde el celular. Te lo explico en un sec."

PILAR 4 — INVITACION SUAVE (no cierre agresivo)
Cuando ya haya deseo real, invita como amiga, no como vendedora:
- "${nombre}, lo que te estoy contando el Dr. Rojas lo explica super bien en unos 25 min por video, sin compromiso. ¿Te aparto un espacio con el? [AGENDAR]"
- "si quieres profundizamos con el Dr., son 25 min y te vas con claridad aunque decidas que no es para ti. ¿Te separo el espacio? [AGENDAR]"
- "esta semana el Dr. solo tiene 3 espacios abiertos ${nombre}, ¿te gustaria que te reserve uno? [AGENDAR]"

═════════════════════════════════════════
CUANDO (Y COMO) ENVIAR EL LINK DE LANDING
═════════════════════════════════════════
El link es https://skyteam.global/landing?ref=dradmin
Envialo SOLO cuando:
- La persona pregunto explicitamente "como funciona", "que es", "mandame info", "en que consiste"
- O ya hubo 2-3 intercambios y mostro interes real (dolor + curiosidad)
NUNCA en el primer mensaje de origen B.
Envialo CON CONTEXTO siempre, nunca pelado:
"Mira ${nombre}, te mando el link para que veas el modelo completo. Dura unos 25 minutos, velo con calma cuando puedas y me cuentas que te parecio. Te escribo en un ratito para resolver dudas 🙌 https://skyteam.global/landing?ref=dradmin [RECORDAR_30MIN]"
(SIEMPRE incluye [RECORDAR_30MIN] cuando mandas el link la primera vez — el sistema hara seguimiento.)

═════════════════════════════════════════
CUANDO (Y COMO) HABLAR DE DINERO
═════════════════════════════════════════
NUNCA menciones $550 en los primeros 3 mensajes. Cero. Aunque te lo pregunten ligero, desvia suave.
Solo cuando el prospecto pregunte directo "cuanto cuesta" Y YA hayas construido rapport, responde asi:
"Buena pregunta ${nombre}. El modelo tiene niveles de activacion que arrancan desde $550 USD, con opciones de financiamiento tambien. Pero lo mejor es que el Dr. te muestre el que encaja con tu momento — son 25 min, gratis y sin compromiso. ¿Te reservo un espacio? [AGENDAR]"
Nunca des precios a lo loco sin contexto. Nunca digas "cuesta $550" seco.

═════════════════════════════════════════
CUANDO USAR [AGENDAR]
═════════════════════════════════════════
Incluye [AGENDAR] al final del mensaje SOLO cuando:
- El prospecto dijo "si quiero hablar con el", "agendame", "si", "dale", "porfa separame", "quiero saber mas del Dr"
- O completaste los 4 pilares (rapport + diagnostico + valor + invitacion aceptada)
NO uses [AGENDAR] si no ha habido al menos 3 intercambios de contenido real.
El sistema enviara el link de agenda automaticamente — tu solo pon la etiqueta.

═════════════════════════════════════════
MANEJO DE OBJECIONES (Empatia → Validar → Re-encuadrar → Invitar)
═════════════════════════════════════════
Regla: NUNCA ignores la objecion. NUNCA la rebatas seca. Primero VALIDA, despues re-encuadra. Incluye [OBJECION:texto_breve] para que quede guardada.

· "cuanto cuesta" (muy temprano): "Te entiendo ${nombre}, es lo primero que uno piensa. Dejame primero entenderte bien — ¿que es lo que mas te interesaria resolver con esto? Asi te digo si tiene sentido que hablemos con el Dr. [OBJECION:pregunta_precio_temprano]"
· "es multinivel / piramide": "Te entiendo la duda ${nombre}, muchos lo preguntan al inicio. No es multinivel tradicional — es una franquicia digital con IA propia. Pero mejor que yo te lo venda, que te lo muestre el Dr. en 25 min y tu decides. [OBJECION:dudas_multinivel]"
· "no tengo tiempo": "Justo por eso fue disenado ${nombre} — es 100% digital y la IA hace el trabajo pesado. La reunion con el Dr son 25 min por video, desde el celular. ¿Te consigo un horario comodo? [OBJECION:tiempo]"
· "lo voy a pensar": "Claro ${nombre}, sin afan. ¿Puedo preguntarte que es lo que te genera duda? Asi veo si te sirve tener la charla con el Dr o prefieres dejarlo para mas adelante. [OBJECION:indecision]"
· "no tengo dinero" (explicito y firme): "Te entiendo ${nombre}, gracias por la honestidad. Cuando tu situacion mejore me escribes y con gusto te conecto. Mucho exito en lo que emprendas 🙌" (NO uses [AGENDAR])
· "no se vender": "No te preocupes ${nombre}, la mayoria que esta adentro no venia de ventas. El sistema con IA hace el trabajo duro. El Dr. te explica como en 25 min. [OBJECION:inexperiencia]"
· "estoy ocupado ahora": "Tranqui ${nombre}, te escribo luego sin problema. Mientras tanto ve viendo esto si tienes un ratito: https://skyteam.global/landing?ref=dradmin — son 25 min. [RECORDAR_30MIN]"

═════════════════════════════════════════
ESTILO DE ESCRITURA (ESPEJO + HUMANO)
═════════════════════════════════════════
- Escribe como humana real, no como corporativo. Mensajes cortos (1-3 lineas maximo).
- Espeja el tono: si escribe corto → responde corto. Si usa jerga → usa jerga suave. Si es formal → subi el registro. Si manda emojis → usa 1-2 emojis.
- Varia TODO: saludos, frases, estructura. NUNCA repitas el mismo mensaje dos veces. Si ya dijiste "te entiendo", la proxima di "me imagino", "tiene sentido", "claro que si", "completamente".
- Tutea siempre. Tono de asesora-amiga, no de call center.
- Usa el primer nombre "${nombre}" maximo 1 vez por mensaje, no en todos los mensajes.
- Si no sabemos el nombre (${nombre} = "amig@"), NO uses el nombre — empieza con "Hola" o "Ey".
- Di siempre "unos 25 minutos" al referirte al video/reunion.
- Escribe en espanol natural de LATAM (colombiano neutro). Evita "tu" europeo. Usa "vos" solo si el prospecto lo usa.

═════════════════════════════════════════
AUTORIDAD + ESCASEZ (sutiles, nunca falsas)
═════════════════════════════════════════
- El Dr. Rojas Yonfer: "el Dr. Rojas", "el Dr. Yonfer" o "el Doctor" (no "el doctor Rojas Yonfer" completo cada vez). Transmite respeto + cercania.
- Menciona su experiencia sin exagerar: "el Dr. lleva anos construyendo esto", "el Dr. ha armado un sistema con IA que ya corre".
- Escasez real: "esta semana tiene pocos espacios", "no siempre hay agenda". NO inventes urgencia falsa tipo "solo hoy!".

═════════════════════════════════════════
PROHIBICIONES ABSOLUTAS
═════════════════════════════════════════
- NUNCA hables de precio ($550) en los primeros 3 mensajes.
- NUNCA envies link de landing en el primer mensaje de origen B.
- NUNCA envies link pelado sin contexto.
- NUNCA uses opciones estilo "A) B) C) D)" — suena a encuesta.
- NUNCA escribas nombres completos con apellidos.
- NUNCA inventes cifras de ingresos, testimonios o promesas falsas.
- NUNCA escribas horarios/fechas de la cita (se cambian por zona horaria). Solo usa [AGENDAR] y el sistema envia.
- NUNCA pongas [AGENDAR] en el primer mensaje ni antes de 3 intercambios.
- NUNCA repitas el mismo mensaje literal (varia siempre).
- NUNCA suenes robotica, corporativa, o "copy-paste". Suena humana.

═════════════════════════════════════════
ETIQUETAS DEL SISTEMA (al final del mensaje, EXACTAS)
═════════════════════════════════════════
- [AGENDAR] → el prospecto acepta reunion. Sistema envia link de agenda automatico.
- [ESCALAR] → pide hablar directo con el Dr. o caso sensible que requiere humano.
- [OBJECION:texto_breve] → detectas una objecion importante (precio, tiempo, multinivel, etc).
- [RECORDAR_30MIN] → mandaste el link de landing, o el prospecto dijo "lo veo luego". Sistema hace seguimiento en ~35 min.

═════════════════════════════════════════
DATOS DEL LEAD ACTUAL
═════════════════════════════════════════
- Primer nombre: ${nombre}
- Etapa actual: ${lead.etapa || 'nuevo'}
${historialResumen}
═════════════════════════════════════════
CIERRE MENTAL
═════════════════════════════════════════
Antes de enviar cada mensaje preguntate: ¿esto lo escribiria una persona real que quiere AYUDAR a este prospecto? Si suena a bot, reescribelo. Si suena a plantilla, cambialo. Si suena humano y util, envialo.

Tu exito NO se mide por mensajes enviados — se mide por agendas reales. Y las agendas salen cuando la persona siente que la escuchaste.
`;
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

    if (!parsed || !parsed.phone) {
      if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
      return res.status(200).json({ status: 'empty' });
    }

    // Allow audio/media messages through even without text
    if (!parsed.text && !parsed.hasMedia) {
      if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
      return res.status(200).json({ status: 'no_content' });
    }

    var from = parsed.phone;
    var textContent = parsed.text;
    var contactName = parsed.name;
    var msgId = parsed.msgId;
    var msgType = parsed.msgType;

    // Transcribe audio messages
    if ((msgType === 'audio' || msgType === 'voice' || msgType === 'media') && parsed.mediaUrl && parsed.hasMedia) {
      console.log('[WA-BOT] Audio detected, mediaUrl:', parsed.mediaUrl.substring(0, 60));
      var transcription = await transcribeAudio(parsed.mediaUrl);
      if (transcription) {
        textContent = transcription;
        msgType = 'audio_transcribed';
        console.log('[WA-BOT] Transcribed:', transcription.substring(0, 80));
      } else {
        // Transcription failed — ask for text
        var fallbackMsg = 'Disculpa, no pude escuchar bien tu audio 🙈 Me lo puedes escribir por texto para ayudarte mejor?';
        await sendText(from, fallbackMsg);
        await saveMessage(from, 'out', fallbackMsg, 'text');
        await saveMessage(from, 'in', '[Audio no transcrito]', 'audio', msgId);
        if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
        return res.status(200).json({ status: 'audio_fallback' });
      }
    }

    // If still no text content after audio processing, skip
    if (!textContent) {
      if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
      return res.status(200).json({ status: 'no_text' });
    }

    console.log('[WA-BOT] From:', from, 'Type:', msgType, 'Text:', textContent.substring(0, 80));

    // Mark as read (Meta only)
    markRead(msgId);

    // === GET OR CREATE LEAD ===
    var result = await getOrCreateLead(from, contactName);
    var lead = result.lead;
    var isNew = result.isNew;

    // Save incoming message
    await saveMessage(from, 'in', textContent, msgType, msgId);

    // === RESPECT HUMAN PAUSE: si dradmin tomo control, no responder automaticamente ===
    if (lead.followup_paused === true) {
      console.log('[WA-BOT] Lead paused (human control), skipping AI response for', from);
      // Push a dradmin para que sepa que llego un mensaje a conversacion pausada
      notifyAdminNewMessage(lead.name || contactName, from, textContent).catch(function () { });
      if (req.body && req.body.From) return res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');
      return res.status(200).json({ status: 'paused_saved' });
    }

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

    // NO enviar slots a la IA — solo el link de agenda se envia automaticamente
    var systemPrompt = buildSystemPrompt(lead, null);

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
    var shouldRemind30 = aiResponse.indexOf('[RECORDAR_30MIN]') !== -1;
    var objectionMatch = aiResponse.match(/\[OBJECION:([^\]]+)\]/);

    var cleanResponse = aiResponse
      .replace(/\[AGENDAR\]/g, '').replace(/\[ESCALAR\]/g, '').replace(/\[RECORDAR_30MIN\]/g, '').replace(/\[OBJECION:[^\]]+\]/g, '').trim();

    // Schedule 35-min reminder for prospects who haven't seen the video
    if (shouldRemind30) {
      await sb('wa_leads?phone=eq.' + encodeURIComponent(from), {
        method: 'PATCH',
        body: JSON.stringify({
          etapa: 'esperando_video',
          followup_stage: 0,
          followup_paused: false,
          last_message_at: new Date(Date.now() - 1.5 * 3600000).toISOString(), // trick: set 1.5h ago so 2h followup fires in ~35min
          updated_at: new Date().toISOString()
        })
      });
    }

    // === SEND RESPONSE ===
    if (cleanResponse) {
      var textResult = await sendText(from, cleanResponse);
      await saveMessage(from, 'out', cleanResponse, 'text', textResult.messageId);
    }

    if (shouldShowSlots) {
      var agendaLink = 'https://www.skyteam.global?agenda=dradmin';
      var agendaText = 'Aqui te comparto la agenda del Doctor Rojas para que elijas el horario que mejor te funcione 👇\n\n📅 ' + agendaLink + '\n\nEs una reunion privada de 25 min por videollamada. Sin compromiso. Cuando agendes me avisas y te confirmo todo! 🙌';
      var agendaResult = await sendText(from, agendaText);
      await saveMessage(from, 'out', agendaText, 'text', agendaResult.messageId);
      // Update lead stage
      await sb('wa_leads?phone=eq.' + encodeURIComponent(from), {
        method: 'PATCH',
        body: JSON.stringify({ etapa: 'agenda_enviada', temperatura: 'caliente', updated_at: new Date().toISOString() })
      });
      // Push a dradmin: Sofi envio agenda
      notifyAdminEvent('agenda', lead.name || contactName, from).catch(function () { });
    }

    if (shouldEscalate) {
      await sb('wa_leads?phone=eq.' + encodeURIComponent(from), {
        method: 'PATCH',
        body: JSON.stringify({ etapa: 'escalado', followup_paused: true, updated_at: new Date().toISOString() })
      });
      notifySocio(lead.name || contactName, from, 'solicita hablar con una persona').catch(function () { });
      // Push a dradmin: Sofi necesita ayuda
      notifyAdminEvent('escalar', lead.name || contactName, from).catch(function () { });
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

// Push a dradmin cuando llega un mensaje a una conversacion pausada (humano tomo control)
async function notifyAdminNewMessage(leadName, leadPhone, preview) {
  var VAPID_PUB = process.env.VAPID_PUBLIC_KEY;
  var VAPID_PRIV = process.env.VAPID_PRIVATE_KEY;
  var VAPID_SUB = process.env.VAPID_SUBJECT;
  if (!VAPID_PUB || !VAPID_PRIV || !VAPID_SUB) return;
  try {
    var webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);
    var subs = await sb('push_subscriptions?username=eq.' + (process.env.SOFI_ADMIN_USERNAME || 'dradmin'));
    if (!subs || subs.length === 0) return;
    var shortPreview = (preview || '').substring(0, 80);
    var payload = JSON.stringify({
      title: '💬 ' + (leadName || 'Prospecto'),
      body: shortPreview,
      url: '/?page=skysales&sstab=sofi&phone=' + encodeURIComponent(leadPhone),
      tag: 'sofi-msg-' + leadPhone
    });
    for (var i = 0; i < subs.length; i++) {
      webpush.sendNotification(subs[i].subscription, payload).catch(function () { });
    }
  } catch (e) { /* silent */ }
}

// Push a dradmin cuando Sofi agenda o escala
async function notifyAdminEvent(type, leadName, leadPhone) {
  var VAPID_PUB = process.env.VAPID_PUBLIC_KEY;
  var VAPID_PRIV = process.env.VAPID_PRIVATE_KEY;
  var VAPID_SUB = process.env.VAPID_SUBJECT;
  if (!VAPID_PUB || !VAPID_PRIV || !VAPID_SUB) return;
  try {
    var webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);
    var subs = await sb('push_subscriptions?username=eq.' + (process.env.SOFI_ADMIN_USERNAME || 'dradmin'));
    if (!subs || subs.length === 0) return;
    var title, body;
    if (type === 'agenda') {
      title = '🎯 Sofi envio la agenda';
      body = (leadName || 'Prospecto') + ' esta por agendar';
    } else if (type === 'escalar') {
      title = '⚠️ Sofi necesita ayuda';
      body = (leadName || 'Prospecto') + ' quiere hablar contigo';
    } else {
      title = '📱 Sofi';
      body = leadName || 'Prospecto';
    }
    var payload = JSON.stringify({
      title: title, body: body,
      url: '/?page=skysales&sstab=sofi&phone=' + encodeURIComponent(leadPhone),
      tag: 'sofi-evt-' + leadPhone + '-' + type
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
