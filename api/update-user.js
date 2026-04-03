// Server-side user updates — keeps Supabase credentials secure
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, updates } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Missing username' });

    // Only allow safe fields to be updated
    const allowed = ['rank', 'name', 'ventas', 'equipo', 'expiry', 'ref', 'sponsor', 'email', 'whatsapp', 'photo'];
    const safe = {};
    for (const key of allowed) {
      if (updates && updates[key] !== undefined) safe[key] = updates[key];
    }
    if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields' });

    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username),
      { method: 'PATCH', headers: HEADERS, body: JSON.stringify(safe) }
    );
    if (!r.ok) {
      const body = await r.text();
      console.error('Supabase PATCH failed:', r.status, body);
      throw new Error('Update failed: ' + r.status);
    }
    const rows = await r.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found', ok: false });
    }

    return res.status(200).json({ ok: true, updated: rows.length });
  } catch (error) {
    console.error('update-user error:', error.message);
    return res.status(500).json({ error: 'Error updating user' });
  }
}
