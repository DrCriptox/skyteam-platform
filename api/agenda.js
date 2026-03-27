export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  const BIN_URL = 'https://api.jsonbin.io/v3/b/' + process.env.JSONBIN_BIN_ID;
  const HEADERS = { 'Content-Type': 'application/json', 'X-Master-Key': process.env.JSONBIN_API_KEY, 'X-Bin-Versioning': 'false' };
 
  try {
    const r = await fetch(BIN_URL, { headers: HEADERS });
    const data = await r.json();
    const record = data.record || {};
    if (!record.agendas) record.agendas = {};
 
    if (req.method === 'GET') {
      const user = req.query?.user || (req.url && new URL('https://x.com' + req.url).searchParams.get('user'));
      if (!user) return res.status(400).json({ error: 'Missing user' });
      const ua = record.agendas[user] || {};
      return res.status(200).json({ config: ua.config || null, bookings: ua.bookings || [] });
    }
 
    if (req.method === 'POST') {
      const { action, user, config, booking, id } = req.body;
      if (!user) return res.status(400).json({ error: 'Missing user' });
      if (!record.agendas[user]) record.agendas[user] = { config: null, bookings: [] };
 
      if (action === 'saveConfig') {
        record.agendas[user].config = config;
      } else if (action === 'saveBooking') {
        if (!record.agendas[user].bookings) record.agendas[user].bookings = [];
        const taken = record.agendas[user].bookings.find(b => b.fechaISO === booking.fechaISO && b.status !== 'cancelada');
        if (taken) return res.status(409).json({ error: 'Slot already taken' });
        record.agendas[user].bookings.push(booking);
      } else if (action === 'cancelBooking') {
        if (record.agendas[user].bookings) {
          record.agendas[user].bookings = record.agendas[user].bookings.map(b => b.id === id ? { ...b, status: 'cancelada' } : b);
        }
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }
 
      const putRes = await fetch(BIN_URL, { method: 'PUT', headers: HEADERS, body: JSON.stringify(record) });
      if (!putRes.ok) {
        const putErr = await putRes.text().catch(() => 'unknown');
        console.error('JSONBin PUT failed:', putRes.status, putErr);
        return res.status(502).json({ error: 'Storage save failed', status: putRes.status, detail: putErr.substring(0, 200) });
      }
 
      if (action === 'saveBooking' && booking && process.env.RESEND_API_KEY) {
        const cfg = record.agendas[user].config || {};
        const fd = new Date(booking.fechaISO);
        const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const hStr = fd.getHours().toString().padStart(2,'0')+':'+fd.getMinutes().toString().padStart(2,'0');
        const fechaLabel = days[fd.getDay()]+' '+fd.getDate()+' '+months[fd.getMonth()]+' · '+hStr;
        const users = record.users || {};
        const socioEmail = (users[user]||{}).email;
        if (socioEmail) {
          const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:32px;border-radius:16px;"><div style="text-align:center;margin-bottom:20px;"><img src="https://skyteam.global/logo-skyteam.png" alt="SKY TEAM" style="height:44px;" /></div><h2 style="color:#FFD700;font-size:20px;">🔔 Nueva cita agendada</h2><div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;margin:16px 0;"><p style="margin:8px 0;font-size:14px;">👤 <strong>Prospecto:</strong> '+booking.nombre+'</p><p style="margin:8px 0;font-size:14px;">📱 <strong>WhatsApp:</strong> '+booking.whatsapp+'</p><p style="margin:8px 0;font-size:14px;">📅 <strong>Fecha:</strong> '+fechaLabel+'</p>'+(cfg.linkReunion?'<p style="margin:8px 0;font-size:14px;">🔗 <strong>Sala:</strong> <a href="'+cfg.linkReunion+'" style="color:#1CE8FF;">'+cfg.linkReunion+'</a></p>':'')+'</div><div style="text-align:center;"><a href="https://skyteam.global" style="background:linear-gradient(135deg,#1CE8FF,#0077FF);color:#030c1f;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:900;">Ver en SKY SYSTEM →</a></div><p style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;margin-top:20px;">SKY TEAM · skyteam.global</p></div>';
          fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.RESEND_API_KEY}, body: JSON.stringify({ from:'SKY TEAM <lideres@skyteam.global>', to:[socioEmail], subject:'🔔 Nueva cita: '+booking.nombre+' · '+fechaLabel, html }) });
        }
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
