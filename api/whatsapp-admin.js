// WhatsApp Admin Dashboard API - gated al admin configurado (default: dradmin)
// Endpoints para el dashboard de conversaciones de Sofi en skyteam.global

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Prefer: 'return=representation'
};

// Twilio (para envio manual desde dashboard)
const PROVIDER = process.env.WA_PROVIDER || 'twilio';
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const META_API = 'https://graph.facebook.com/v21.0';
const META_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const META_TOKEN = process.env.WHATSAPP_TOKEN || '';

const BOT_USERNAME = process.env.WA_BOT_USERNAME || 'dradmin'; // identidad del bot (para wa_leads.bot_username)
const ADMIN_USERNAME = process.env.SOFI_ADMIN_USERNAME || 'dradmin'; // quien puede acceder al dashboard

// ============================================================
// HELPERS
// ============================================================

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
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('[WA-ADMIN] SB', r.status, path.substring(0, 60), t.substring(0, 120));
      return null;
    }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    clearTimeout(tm);
    console.error('[WA-ADMIN] SB error:', e.message);
    return null;
  }
}

async function sendWhatsApp(to, text) {
  if (PROVIDER === 'twilio') {
    if (!TWILIO_SID || !TWILIO_TOKEN) return { ok: false, error: 'Twilio not configured' };
    const params = new URLSearchParams();
    params.append('To', to.indexOf('whatsapp:') === 0 ? to : 'whatsapp:+' + to);
    params.append('From', TWILIO_FROM);
    params.append('Body', text);
    const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_SID + '/Messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
      },
      body: params.toString()
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: data };
    return { ok: true, messageId: data.sid };
  }
  // Meta
  const r2 = await fetch(META_API + '/' + META_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + META_TOKEN },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: true, body: text } })
  });
  const data2 = await r2.json();
  return { ok: r2.ok, messageId: data2.messages && data2.messages[0] ? data2.messages[0].id : null };
}

function normalizePhone(p) {
  return (p || '').replace('whatsapp:', '').replace(/^\+/, '').trim();
}

function isoStartOfTodayBogota() {
  // Colombia es UTC-5 sin DST. Medianoche Bogota = 05:00 UTC.
  const now = new Date();
  const bogNow = new Date(now.getTime() - 5 * 3600000);
  const y = bogNow.getUTCFullYear();
  const m = String(bogNow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(bogNow.getUTCDate()).padStart(2, '0');
  // Medianoche Bogota en UTC = YYYY-MM-DDT05:00:00Z
  return y + '-' + m + '-' + d + 'T05:00:00.000Z';
}

function iso7daysAgo() {
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

// ============================================================
// ACTIONS
// ============================================================

async function listConversations(filters) {
  filters = filters || {};
  let query = 'wa_leads?bot_username=eq.' + encodeURIComponent(BOT_USERNAME) + '&order=last_message_at.desc&limit=200';
  if (filters.etapa && filters.etapa !== 'all') {
    if (filters.etapa === 'paused') {
      query += '&followup_paused=eq.true';
    } else {
      query += '&etapa=eq.' + encodeURIComponent(filters.etapa);
    }
  }
  if (filters.search) {
    const s = encodeURIComponent('%' + filters.search + '%');
    query += '&or=(name.ilike.' + s + ',phone.ilike.' + s + ')';
  }
  const leads = await sb(query);
  if (!leads) return [];

  // Obtener ultimo mensaje por lead (batch)
  const phones = leads.map(l => l.phone);
  if (phones.length === 0) return [];

  const phoneList = phones.map(p => '"' + p + '"').join(',');
  const msgsQ = 'wa_conversations?phone=in.(' + encodeURIComponent(phoneList) +
    ')&bot_username=eq.' + encodeURIComponent(BOT_USERNAME) +
    '&order=created_at.desc&limit=500&select=phone,direction,content,message_type,created_at,metadata';
  const allMsgs = await sb(msgsQ);

  const lastByPhone = {};
  if (allMsgs) {
    for (const m of allMsgs) {
      if (!lastByPhone[m.phone]) lastByPhone[m.phone] = m;
    }
  }

  return leads.map(l => ({
    phone: l.phone,
    name: l.name || 'Prospecto',
    etapa: l.etapa || 'nuevo',
    temperatura: l.temperatura || 'tibio',
    last_message_at: l.last_message_at,
    followup_paused: !!l.followup_paused,
    followup_stage: l.followup_stage || 0,
    booking_id: l.booking_id,
    objections: l.objections || [],
    context_summary: l.context_summary || '',
    created_at: l.created_at,
    last_message: lastByPhone[l.phone]
      ? {
          direction: lastByPhone[l.phone].direction,
          content: lastByPhone[l.phone].content,
          type: lastByPhone[l.phone].message_type,
          created_at: lastByPhone[l.phone].created_at
        }
      : null
  }));
}

async function getMessages(phone, since) {
  if (!phone) return [];
  const p = normalizePhone(phone);
  let query = 'wa_conversations?phone=eq.' + encodeURIComponent(p) +
    '&bot_username=eq.' + encodeURIComponent(BOT_USERNAME) +
    '&order=created_at.asc&limit=500';
  if (since) {
    query += '&created_at=gt.' + encodeURIComponent(since);
  }
  const msgs = await sb(query);
  return msgs || [];
}

async function sendManualMessage(phone, text) {
  if (!phone || !text) return { ok: false, error: 'Missing phone or text' };
  const p = normalizePhone(phone);

  const result = await sendWhatsApp(p, text);
  if (!result.ok) return { ok: false, error: result.error };

  // Guardar en conversations con flag manual
  await sb('wa_conversations', {
    method: 'POST',
    body: JSON.stringify({
      phone: p,
      direction: 'out',
      message_type: 'text',
      content: text,
      wa_message_id: result.messageId || null,
      bot_username: BOT_USERNAME,
      metadata: { manual: true, sent_by: ADMIN_USERNAME }
    })
  });

  // Auto-pausar bot al tomar control + actualizar last_message_at
  await sb('wa_leads?phone=eq.' + encodeURIComponent(p), {
    method: 'PATCH',
    body: JSON.stringify({
      followup_paused: true,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  return { ok: true, messageId: result.messageId };
}

async function pauseBot(phone, paused) {
  if (!phone) return { ok: false, error: 'Missing phone' };
  const p = normalizePhone(phone);
  await sb('wa_leads?phone=eq.' + encodeURIComponent(p), {
    method: 'PATCH',
    body: JSON.stringify({
      followup_paused: !!paused,
      updated_at: new Date().toISOString()
    })
  });
  return { ok: true, paused: !!paused };
}

async function updateEtapa(phone, etapa) {
  if (!phone || !etapa) return { ok: false, error: 'Missing params' };
  const valid = ['nuevo', 'esperando_video', 'calificando', 'agenda_enviada', 'agendado', 'escalado', 'frio', 'descartado'];
  if (valid.indexOf(etapa) === -1) return { ok: false, error: 'Invalid etapa' };
  const p = normalizePhone(phone);
  await sb('wa_leads?phone=eq.' + encodeURIComponent(p), {
    method: 'PATCH',
    body: JSON.stringify({
      etapa: etapa,
      updated_at: new Date().toISOString()
    })
  });
  return { ok: true };
}

async function getStats() {
  const todayISO = isoStartOfTodayBogota();
  const weekISO = iso7daysAgo();

  const [msgsToday, leadsToday, agendadosToday, leadsWeek, agendadosWeek] = await Promise.all([
    sb('wa_conversations?bot_username=eq.' + BOT_USERNAME + '&created_at=gte.' + encodeURIComponent(todayISO) + '&select=id'),
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&created_at=gte.' + encodeURIComponent(todayISO) + '&select=id'),
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&etapa=eq.agendado&updated_at=gte.' + encodeURIComponent(todayISO) + '&select=id'),
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&created_at=gte.' + encodeURIComponent(weekISO) + '&select=id'),
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&etapa=eq.agendado&updated_at=gte.' + encodeURIComponent(weekISO) + '&select=id')
  ]);

  const lw = (leadsWeek || []).length;
  const aw = (agendadosWeek || []).length;

  return {
    msgs_today: (msgsToday || []).length,
    leads_today: (leadsToday || []).length,
    agendados_today: (agendadosToday || []).length,
    leads_week: lw,
    agendados_week: aw,
    conversion_week: lw > 0 ? Math.round((aw / lw) * 1000) / 10 : 0
  };
}

async function getLead(phone) {
  if (!phone) return null;
  const p = normalizePhone(phone);
  const leads = await sb('wa_leads?phone=eq.' + encodeURIComponent(p) + '&select=*');
  return leads && leads[0] ? leads[0] : null;
}

// ============================================================
// FOLLOW-UP v2 STATS & REVIVAL CAMPAIGNS
// ============================================================

async function getFollowupStats() {
  const todayISO = isoStartOfTodayBogota();
  const weekISO = iso7daysAgo();
  const monthISO = new Date(Date.now() - 30 * 86400000).toISOString();

  // Query todos los mensajes de follow-up enviados (metadata.type='followup')
  // Supabase REST no permite filtrar metadata JSONB facil, asi que traemos todos outbound 30d y filtramos en memoria
  const convs = await sb(
    'wa_conversations?bot_username=eq.' + BOT_USERNAME +
    '&direction=eq.out&created_at=gte.' + encodeURIComponent(monthISO) +
    '&select=phone,content,metadata,created_at&order=created_at.desc&limit=1000'
  );
  const followups = (convs || []).filter(c => c.metadata && c.metadata.type === 'followup');

  const counts = { today: 0, week: 0, month: 0 };
  const byStage = {};
  const byWindow = { morning: 0, lunch: 0, evening: 0 };
  const aiVsTemplate = { ai: 0, template: 0 };

  const tMonth = new Date(monthISO).getTime();
  const tWeek = new Date(weekISO).getTime();
  const tToday = new Date(todayISO).getTime();

  for (const f of followups) {
    const t = new Date(f.created_at).getTime();
    if (t >= tToday) counts.today++;
    if (t >= tWeek) counts.week++;
    if (t >= tMonth) counts.month++;
    const stage = (f.metadata && f.metadata.stage) || 0;
    byStage[stage] = (byStage[stage] || 0) + 1;
    const win = (f.metadata && f.metadata.window);
    if (win && byWindow[win] !== undefined) byWindow[win]++;
    if (f.metadata && f.metadata.ai) aiVsTemplate.ai++;
    else aiVsTemplate.template++;
  }

  // Reply rate: para cada follow-up, revisar si el lead respondio despues
  // Simplificamos: contamos cuantos leads que recibieron follow-up tienen last_message_at > followup_sent_at
  const uniquePhones = Array.from(new Set(followups.map(f => f.phone)));
  let repliedAfter = 0;
  if (uniquePhones.length > 0) {
    // Batch query leads
    const chunkSize = 50;
    for (let i = 0; i < uniquePhones.length; i += chunkSize) {
      const chunk = uniquePhones.slice(i, i + chunkSize);
      const inList = chunk.map(p => '"' + p + '"').join(',');
      const leads = await sb(
        'wa_leads?phone=in.(' + encodeURIComponent(inList) +
        ')&select=phone,last_message_at,last_followup_sent_at'
      );
      if (leads) {
        for (const l of leads) {
          if (!l.last_followup_sent_at) continue;
          const lastMsg = new Date(l.last_message_at).getTime();
          const lastFu = new Date(l.last_followup_sent_at).getTime();
          if (lastMsg > lastFu) repliedAfter++;
        }
      }
    }
  }
  const replyRate = uniquePhones.length > 0 ? Math.round((repliedAfter / uniquePhones.length) * 1000) / 10 : 0;

  // Revival stats: leads actualmente en etapa terminal
  const [frioLeads, cerradoLeads, dormidosLeads] = await Promise.all([
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&etapa=eq.frio&select=phone'),
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&etapa=eq.cerrado_sin_respuesta&select=phone'),
    sb('wa_leads?bot_username=eq.' + BOT_USERNAME + '&followup_stage=gte.4&etapa=not.in.(agendado,cerrado)&select=phone')
  ]);

  return {
    followups_today: counts.today,
    followups_week: counts.week,
    followups_month: counts.month,
    total_followups_30d: followups.length,
    unique_leads_contacted_30d: uniquePhones.length,
    replied_after_followup: repliedAfter,
    reply_rate_percent: replyRate,
    by_stage: byStage,
    by_window: byWindow,
    ai_vs_template: aiVsTemplate,
    revival_pool: {
      frio: (frioLeads || []).length,
      cerrado_sin_respuesta: (cerradoLeads || []).length,
      en_seguimiento_stage_4plus: (dormidosLeads || []).length
    }
  };
}

async function getRevivalCandidates(etapaFilter) {
  const filter = etapaFilter || 'all';
  let etapaClause = '&etapa=in.(frio,cerrado_sin_respuesta)';
  if (filter === 'frio') etapaClause = '&etapa=eq.frio';
  else if (filter === 'cerrado') etapaClause = '&etapa=eq.cerrado_sin_respuesta';
  else if (filter === 'seguimiento') etapaClause = '&etapa=eq.calificando&followup_stage=gte.4';

  const leads = await sb(
    'wa_leads?bot_username=eq.' + BOT_USERNAME +
    etapaClause +
    '&followup_paused=eq.false' +
    '&order=last_message_at.desc&limit=200' +
    '&select=phone,name,etapa,temperatura,followup_stage,last_message_at,context_summary,objections'
  );
  return (leads || []).map(l => ({
    phone: l.phone,
    name: l.name || 'Prospecto',
    etapa: l.etapa,
    temperatura: l.temperatura,
    followup_stage: l.followup_stage,
    last_message_at: l.last_message_at,
    context_summary: l.context_summary || '',
    objections: l.objections || []
  }));
}

async function sendRevivalCampaign(phones, messageTemplate, campaignName) {
  if (!Array.isArray(phones) || phones.length === 0) return { ok: false, error: 'No phones' };
  if (!messageTemplate || messageTemplate.trim().length < 5) return { ok: false, error: 'Mensaje vacio o muy corto' };
  if (phones.length > 100) return { ok: false, error: 'Max 100 leads por campana (para evitar spam detection)' };

  const campaignId = 'revival_' + Date.now();
  const name = campaignName || 'Revival ' + new Date().toISOString().slice(0, 10);
  const sentList = [];
  const failedList = [];

  for (let i = 0; i < phones.length; i++) {
    const phone = normalizePhone(phones[i]);
    // Personalizar {{firstName}} si el template lo tiene
    const lead = await sb('wa_leads?phone=eq.' + encodeURIComponent(phone) + '&select=name&limit=1');
    const firstName = lead && lead[0] && lead[0].name ? lead[0].name.split(' ')[0] : '';
    const msg = messageTemplate.replace(/\{\{firstName\}\}/g, firstName).replace(/\{\{name\}\}/g, firstName);

    const sendResult = await sendWhatsApp(phone, msg);
    if (sendResult.ok) {
      // Guardar en wa_conversations con campaign metadata
      await sb('wa_conversations', {
        method: 'POST',
        body: JSON.stringify({
          phone: phone, direction: 'out', message_type: 'text', content: msg,
          wa_message_id: sendResult.messageId || null,
          bot_username: BOT_USERNAME,
          metadata: { type: 'revival', campaign_id: campaignId, campaign_name: name, sent_by: ADMIN_USERNAME }
        })
      });
      // Revivir lead a 'calificando' + reset follow-up cycle
      await sb('wa_leads?phone=eq.' + encodeURIComponent(phone), {
        method: 'PATCH',
        body: JSON.stringify({
          etapa: 'calificando',
          temperatura: 'tibio',
          followup_stage: 0,
          last_followup_sent_at: null,
          followup_variant: null,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      sentList.push(phone);
    } else {
      failedList.push({ phone: phone, error: sendResult.error || 'send failed' });
    }
    // Rate limit: 2 sec entre mensajes para evitar spam detection
    if (i < phones.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return {
    ok: true,
    campaign_id: campaignId,
    campaign_name: name,
    sent: sentList.length,
    failed: failedList.length,
    failures: failedList.slice(0, 10)
  };
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, user } = req.body || {};

    // === GATE: solo el admin configurado (default dradmin) ===
    if (user !== ADMIN_USERNAME) return res.status(403).json({ error: 'Forbidden' });

    if (!action) return res.status(400).json({ error: 'Missing action' });

    switch (action) {
      case 'listConversations': {
        const list = await listConversations({
          etapa: req.body.etapa || 'all',
          search: req.body.search || ''
        });
        return res.status(200).json({ ok: true, conversations: list });
      }

      case 'getMessages': {
        const msgs = await getMessages(req.body.phone, req.body.since);
        const lead = await getLead(req.body.phone);
        return res.status(200).json({ ok: true, messages: msgs, lead: lead });
      }

      case 'sendManualMessage': {
        const r = await sendManualMessage(req.body.phone, req.body.text);
        return res.status(r.ok ? 200 : 500).json(r);
      }

      case 'pauseBot': {
        const r = await pauseBot(req.body.phone, true);
        return res.status(r.ok ? 200 : 500).json(r);
      }

      case 'resumeBot': {
        const r = await pauseBot(req.body.phone, false);
        return res.status(r.ok ? 200 : 500).json(r);
      }

      case 'updateEtapa': {
        const r = await updateEtapa(req.body.phone, req.body.etapa);
        return res.status(r.ok ? 200 : 500).json(r);
      }

      case 'stats': {
        const s = await getStats();
        return res.status(200).json({ ok: true, stats: s });
      }

      case 'getLead': {
        const lead = await getLead(req.body.phone);
        return res.status(200).json({ ok: true, lead: lead });
      }

      case 'followupStats': {
        const stats = await getFollowupStats();
        return res.status(200).json({ ok: true, stats: stats });
      }

      case 'revivalCandidates': {
        const candidates = await getRevivalCandidates(req.body.filter || 'all');
        return res.status(200).json({ ok: true, candidates: candidates });
      }

      case 'sendRevivalCampaign': {
        const r = await sendRevivalCampaign(
          req.body.phones || [],
          req.body.message || '',
          req.body.campaignName || ''
        );
        return res.status(r.ok ? 200 : 400).json(r);
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (e) {
    console.error('[WA-ADMIN] Error:', e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
