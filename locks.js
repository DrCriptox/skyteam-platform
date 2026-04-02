// Content Locks API — SKY TEAM
// GET: returns current locks object
// POST: saves locks object (admin only sends full object)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Prefer: 'return=representation'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // Fetch locks from Supabase
      const r = await fetch(SUPABASE_URL + '/rest/v1/platform_settings?key=eq.content_locks&limit=1', { headers: HEADERS });
      if (!r.ok) return res.status(200).json({}); // No locks = empty object
      const rows = await r.json();
      if (rows && rows[0] && rows[0].value) {
        return res.status(200).json(rows[0].value);
      }
      return res.status(200).json({});
    }

    if (req.method === 'POST') {
      const locks = req.body;
      if (!locks || typeof locks !== 'object') {
        return res.status(400).json({ error: 'Invalid locks data' });
      }

      // Upsert locks into Supabase
      const r = await fetch(SUPABASE_URL + '/rest/v1/platform_settings', {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          key: 'content_locks',
          value: locks,
          updated_at: new Date().toISOString()
        })
      });

      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ error: 'Failed to save locks', details: err.substring(0, 200) });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
