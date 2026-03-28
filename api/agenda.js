// Supabase-powered agenda API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };
 
async function sb(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: HEADERS, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  try {
    if (req.method === 'GET') {
      const user = req.query?.user || (req.url && new URL('https://x.com' + req.url).searchParams.get('user'));
      if (!user) return res.status(400).json({ error: 'Missing user' });
 
      const configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
      const bookings = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&status=neq.cancelada&order=fecha_iso.asc');
 
      return res.status(200).json({
        config: configs && configs[0] ? configs[0].config : null,
        bookings: (bookings || []).map(b => ({ id: b.id, nombre: b.nombre, whatsapp: b.whatsapp, fechaISO: b.fecha_iso, status: b.status, notas: b.notas }))
      });
    }
 
    if (req.method === 'POST') {
      const { action, user, config, booking, id } = req.body;
      if (!user) return res.status(400).json({ error: 'Missing user' });
 
      if (action === 'saveConfig') {
        // Ensure user exists in users table (FK constraint)
        const existing = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=username');
        if (!existing || existing.length === 0) {
          await sb('users', {
            method: 'POST',
            headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ username: user, name: config.nombre || user, email: null, password: null, sponsor: null, ref: user })
          });
        }
        // Upsert agenda config
        await sb('agenda_configs', {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ username: user, config, updated_at: new Date().toISOString() })
        });
 
      } else if (action === 'saveBooking') {
        // Check for duplicate slot
        const taken = await sb('bookings?username=eq.' + encodeURIComponent(user) + '&fecha_iso=eq.' + encodeURIComponent(booking.fechaISO) + '&status=neq.cancelada');
        if (taken && taken.length > 0) return res.status(409).json({ error: 'Slot already taken' });
 
        // Insert booking
        await sb('bookings', {
          method: 'POST',
          body: JSON.stringify({ id: booking.id || crypto.randomUUID(), username: user, nombre: booking.nombre, whatsapp: booking.whatsapp, fecha_iso: booking.fechaISO, status: 'activa', notas: booking.notas || null })
        });
 
        // Send email notification
        if (process.env.RESEND_API_KEY) {
          try {
            const configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
            const cfg = configs && configs[0] ? configs[0].config : {};
            const users = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=email');
            const socioEmail = users && users[0] ? users[0].email : null;
 
            if (socioEmail) {
              const fd = new Date(booking.fechaISO);
              const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
              const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
              const hStr = fd.getHours().toString().padStart(2,'0') + ':' + fd.getMinutes().toString().padStart(2,'0');
              const fechaLabel = days[fd.getDay()] + ' ' + fd.getDate() + ' ' + months[fd.getMonth()] + ' · ' + hStr;
 
              const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:32px;border-radius:16px;"><div style="text-align:center;margin-bottom:20px;"><img src="https://skyteam.global/logo-skyteam.png" alt="SKY TEAM" style="height:44px;" /></div><h2 style="color:#FFD700;font-size:20px;">🔔 Nueva cita agendada</h2><div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;margin:16px 0;"><p style="margin:8px 0;font-size:14px;">👤 <strong>Prospecto:</strong> ' + booking.nombre + '</p><p style="margin:8px 0;font-size:14px;">📱 <strong>WhatsApp:</strong> ' + booking.whatsapp + '</p><p style="margin:8px 0;font-size:14px;">📅 <strong>Fecha:</strong> ' + fechaLabel + '</p>' + (cfg.linkReunion ? '<p style="margin:8px 0;font-size:14px;">🔗 <strong>Sala:</strong> <a href="' + cfg.linkReunion + '" style="color:#1CE8FF;">' + cfg.linkReunion + '</a></p>' : '') + '</div><div style="text-align:center;"><a href="https://skyteam.global" style="background:linear-gradient(135deg,#1CE8FF,#0077FF);color:#030c1f;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:900;">Ver en SKY SYSTEM →</a></div><p style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;margin-top:20px;">SKY TEAM · skyteam.global</p></div>';
              fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY }, body: JSON.stringify({ from: 'SKY TEAM <lideres@skyteam.global>', to: [socioEmail], subject: '🔔 Nueva cita: ' + booking.nombre + ' · ' + fechaLabel, html }) });
            }
          } catch (e) { /* email is best-effort */ }
        }
 
      } else if (action === 'cancelBooking') {
        await sb('bookings?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelada' })
        });
 
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }
 
      return res.status(200).json({ ok: true });
    }
 
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('agenda error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
