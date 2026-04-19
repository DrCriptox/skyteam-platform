// TEMPORARY DEBUG ENDPOINT — DELETE AFTER USE
// Used 2026-04-19 by Claude to audit Sofi conversations that had 0 bookings
// Access: /api/_debug-logs?secret=YONFER_2026_AUDIT_SOFI_LOGS_K9XJ_TEMP

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SECRET = 'YONFER_2026_AUDIT_SOFI_LOGS_K9XJ_TEMP';

async function sb(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY
    }
  });
  if (!r.ok) return { error: r.status, body: await r.text().catch(()=>'') };
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.query.secret !== SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    // Get last 30 leads
    const leads = await sb('wa_leads?bot_username=eq.dradmin&order=last_message_at.desc&limit=30&select=phone,name,etapa,temperatura,timezone,source,last_message_at,followup_stage,objections,context_summary,created_at,booking_id');

    if (leads.error) return res.status(500).json({ step: 'leads', ...leads });

    // Get all conversations for these leads
    const phones = (leads || []).map(l => l.phone);
    const conversations = {};
    for (const phone of phones) {
      const msgs = await sb('wa_conversations?phone=eq.' + encodeURIComponent(phone) + '&bot_username=eq.dradmin&order=created_at.asc&limit=50&select=direction,content,message_type,created_at');
      conversations[phone] = msgs && !msgs.error ? msgs : [];
    }

    // Bookings stats
    const bookings = await sb('bookings?username=eq.dradmin&order=fecha_iso.desc&limit=10&select=nombre,whatsapp,fecha_iso,status,created_at');

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      summary: {
        total_leads: leads.length,
        leads_with_bookings: leads.filter(l => l.booking_id).length,
        stages: leads.reduce((a, l) => { a[l.etapa] = (a[l.etapa]||0)+1; return a; }, {}),
        temperatures: leads.reduce((a, l) => { a[l.temperatura] = (a[l.temperatura]||0)+1; return a; }, {}),
        total_bookings: bookings ? bookings.length : 0
      },
      leads,
      conversations,
      bookings
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
