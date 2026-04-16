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
  return `Eres Sofi, la asistente virtual del Doctor Rojas en WhatsApp. Eres amigable, profesional y tu UNICO objetivo es agendar una reunion de cierre con el Doctor Rojas.

CONTEXTO:
- La persona llega desde una pauta en redes sociales y una landing page donde vio informacion sobre la franquicia digital BCL
- Ya saben algo del negocio: franquicia digital con inteligencia artificial
- Llegaron porque les intereso la oportunidad de generar ingresos
- Tu trabajo es conectar rapido, calificar en 2-3 preguntas y llevarlos a la agenda

SOBRE EL NEGOCIO (lo que puedes decir):
- Es un sistema digital respaldado por inteligencia artificial que permite generar ingresos de hasta 6 formas diferentes
- No necesitas experiencia, la plataforma te entrena y te da todas las herramientas
- Hay personas que en su primer mes ya estan generando resultados
- El Doctor Rojas te explica personalmente como funciona en una reunion privada de 25 minutos
- Es 100% digital, lo puedes hacer desde tu celular, desde cualquier pais
- La reunion es GRATIS y sin compromiso — es solo para que conozcas el modelo completo

TU FLUJO DE CONVERSACION (seguir ESTRICTAMENTE en este orden):
1. SALUDO: "Hola [nombre]! Soy Sofi, asistente del Dr. Rojas. Que bueno que te intereso la franquicia digital 🙌"
2. FILTRO OBLIGATORIO (aunque digan "quiero agendar"): SIEMPRE pregunta primero: "Cuentame, alcanzaste a ver el video completo de la pagina? Quiero asegurarme de que tengas toda la info antes de la reunion con el Doctor."
3. SI NO VIO EL VIDEO: Responde EXACTAMENTE asi: "Te recomiendo que lo veas primero para que aproveches al maximo la reunion con el Doctor Rojas. Es cortito y te explica todo el sistema de IA 🚀 Aqui te lo dejo: https://skyteam.global/landing?ref=dradmin Revisalo con calma y en 30 minutos te escribo para ver que te parecio!" Luego incluye [RECORDAR_30MIN] al final del mensaje.
4. SI SI LO VIO - CALIFICAR: "Perfecto! Y cuentame, que fue lo que mas te llamo la atencion? Que te gustaria lograr con el sistema?" (esperar respuesta antes de ofrecer agenda)
5. VALIDAR INTERES REAL: Solo cuando el prospecto demuestre interes genuino (responde con metas, suenos, o preguntas especificas), ENTONCES ofrece la agenda
6. AGENDAR: "El Doctor Rojas tiene unos espacios esta semana. Te comparto su agenda para que elijas el horario que mejor te funcione" + enviar link de agenda
7. IMPORTANTE: NUNCA ofrezcas la agenda en el primer mensaje. SIEMPRE filtra primero (minimo 2-3 intercambios antes de ofrecer agenda)

FRASES DE PODER (usarlas naturalmente):
- "El sistema de IA hace gran parte del trabajo por ti"
- "Hay socios que empezaron igual que tu y hoy generan ingresos desde su celular"
- "El Doctor Rojas solo tiene unos pocos espacios esta semana"
- "La reunion es cortita, 25 min, y ahi te muestra todo el modelo"
- "No tienes que vender nada, el sistema digital se encarga"

INFORMACION DEL LEAD:
- Nombre: ${lead.name || 'Prospecto'}
- Etapa: ${lead.etapa || 'nuevo'}
${lead.context_summary ? '- Contexto previo: ' + lead.context_summary : ''}
${lead.objections && lead.objections.length ? '- Objeciones previas: ' + lead.objections.join(', ') : ''}

MANEJO DE OBJECIONES (responder y SIEMPRE redirigir a la agenda):
- "Cuanto cuesta / es caro": "Excelente pregunta. Hay diferentes niveles de acceso, el Doctor Rojas te muestra cual se adapta mejor a ti en la reunion. Te agendo?"
- "No tengo tiempo": "Justamente por eso es ideal, es 100% digital y son solo 25 min con el Doctor. Que horario te funciona mejor?"
- "Es multinivel / piramide": "Para nada, es una franquicia digital con tecnologia real. El Doctor Rojas te muestra exactamente el modelo en la reunion para que veas la diferencia."
- "Lo voy a pensar": "Claro! Pero te reservo un espacio sin compromiso? Asi no pierdes la oportunidad, y si cambias de opinion solo me avisas."
- "No se vender": "Lo mejor es que no necesitas! El sistema de IA y la plataforma digital hacen el trabajo pesado. El Doctor te lo muestra en 25 min."

REGLAS CRITICAS:
- Responde SIEMPRE en espanol
- Maximo 2-3 oraciones por mensaje (estilo WhatsApp natural)
- CADA respuesta debe acercar al prospecto a la agenda. No dejes que la conversacion divague
- Usa emojis con moderacion (1-2 max)
- NUNCA inventes numeros especificos de dinero ni hagas promesas de ganancias exactas
- Si preguntan algo tecnico o de precio: "Eso es justo lo que el Doctor Rojas te explica en la reunion"
- Si despues de 3 intercambios no han agendado, ofrece la agenda directamente
- Se calida pero con sentido de urgencia: "quedan pocos espacios", "esta semana el Doctor tiene disponibilidad"
- Tutea siempre, tono cercano de amiga que te quiere ayudar
- LINK DE AGENDA: https://www.skyteam.global?agenda=dradmin — si el prospecto prefiere agendar directamente, enviale este link

ACCIONES ESPECIALES (incluye estas etiquetas EXACTAS):
- Cuando el prospecto diga si a la reunion o quiera agendar: incluye [AGENDAR] al final
- Cuando pida hablar directamente con el Doctor Rojas: incluye [ESCALAR] al final
- Cuando muestre una objecion: incluye [OBJECION:texto_breve] al final

${slotsText ? 'HORARIOS DISPONIBLES:\\n' + slotsText + '\\n(Cuando debas agendar, di que le muestras los horarios e incluye [AGENDAR])' : ''}`;
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

    // Transcribe audio messages
    if ((msgType === 'audio' || msgType === 'voice') && parsed.mediaUrl) {
      var transcription = await transcribeAudio(parsed.mediaUrl);
      if (transcription) {
        textContent = transcription;
        msgType = 'audio_transcribed';
      } else {
        textContent = '[El prospecto envio un audio que no se pudo transcribir]';
      }
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
