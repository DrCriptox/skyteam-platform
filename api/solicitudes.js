// Supabase-powered solicitudes API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await fetch(SUPABASE_URL + '/rest/v1/solicitudes?order=created_at.desc', { headers: HEADERS });
      if (!r.ok) throw new Error('Supabase GET failed: ' + r.status);
      const rows = await r.json();
      // Map to old format for frontend compatibility
      const solicitudes = rows.map(s => ({
        id: s.id, name: s.name, email: s.email, phone: s.phone,
        innovaUser: s.innova_user, ref: s.ref, sponsor: s.sponsor,
        password: s.password, status: s.status, timestamp: s.created_at
      }));
      return res.status(200).json({ solicitudes });
    }

    if (req.method === 'POST') {
      const { action, solicitud, id } = req.body;

      if (action === 'add' && solicitud) {
        const r = await fetch(SUPABASE_URL + '/rest/v1/solicitudes', {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({
            id: solicitud.id || crypto.randomUUID(),
            name: solicitud.name, email: solicitud.email, phone: solicitud.phone,
            innova_user: solicitud.innovaUser, ref: solicitud.ref,
            sponsor: solicitud.sponsor, password: solicitud.password
          })
        });
        if (!r.ok) { const t = await r.text(); throw new Error('Insert failed: ' + t.substring(0, 200)); }

      } else if (action === 'remove' && id) {
        await fetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), {
          method: 'DELETE', headers: HEADERS
        });

      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('solicitudes error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
