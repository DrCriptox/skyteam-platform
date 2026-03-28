// Supabase-powered locks API
// This was used as a generic key-value store with JSONBin.
// Now it returns/saves user-specific data from the users table.
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
      // Return all users as a record keyed by username (compatible with old JSONBin format)
      const r = await fetch(SUPABASE_URL + '/rest/v1/users?select=*', { headers: HEADERS });
      if (!r.ok) throw new Error('Supabase GET failed: ' + r.status);
      const rows = await r.json();
      const users = {};
      rows.forEach(u => { users[u.username] = { email: u.email, name: u.name, whatsapp: u.whatsapp, sponsor: u.sponsor, ref: u.ref }; });

      // Also fetch solicitudes for the old format compatibility
      const sr = await fetch(SUPABASE_URL + '/rest/v1/solicitudes?select=*&order=created_at.desc', { headers: HEADERS });
      const solicitudes = sr.ok ? await sr.json() : [];

      return res.status(200).json({ users, solicitudes });
    }

    if (req.method === 'POST') {
      // The old locks API replaced the entire JSONBin record.
      // Now we handle specific user updates.
      const body = req.body;

      // If body has 'users' object, upsert each user
      if (body.users && typeof body.users === 'object') {
        for (const [username, data] of Object.entries(body.users)) {
          await fetch(SUPABASE_URL + '/rest/v1/users', {
            method: 'POST',
            headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ username, email: data.email || null, name: data.name || null, whatsapp: data.whatsapp || null, sponsor: data.sponsor || null, ref: data.ref || null })
          });
        }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('locks error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
