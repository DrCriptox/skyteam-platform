// One-time seed script — creates the original hardcoded users in Supabase
// Call GET /api/seed-users?key=skyteam2026seed to run
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'resolution=merge-duplicates' };

const SEED_USERS = [
  { username: 'angel', password: 'sky2024', name: 'Angel', rank: 7, ref: 'angel2026', ventas: 47, equipo: 23 },
  { username: 'genesis', password: 'genesis22', name: 'Genesis', rank: 3, ref: 'genesis22', ventas: 12, equipo: 5 },
  { username: 'carlos', password: 'demo', name: 'Carlos', rank: 2, ref: 'carlos01', ventas: 3, equipo: 0 },
  { username: 'maria', password: 'demo', name: 'María', rank: 1, ref: 'maria01', ventas: 0, equipo: 0 },
  { username: 'admin', password: 'skyadmin', name: 'Admin', rank: 8, ref: 'admin', ventas: 0, equipo: 0, is_admin: true },
  { username: 'cliente', password: 'demo', name: 'Cliente Demo', rank: 0, ref: 'cliente01', ventas: 0, equipo: 0 },
  { username: 'genesis22', password: 'genesis22', name: 'Genesis Rivera', rank: 3, ref: 'genesis22', ventas: 0, equipo: 0 },
  { username: 'yonfer', password: 'skyadmin2026', name: 'Yonfer Rojas', rank: 7, ref: 'angel2026', ventas: 47, equipo: 15, is_admin: true },
  { username: 'billonarios', password: 'billonarios26', name: 'Johan Gonzalez', rank: 1, ref: 'billonarios', ventas: 0, equipo: 0 },
  { username: 'demo', password: 'demo2026', name: 'Usuario Demo', rank: 1, ref: 'demo01', ventas: 2, equipo: 0 },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (req.query.key !== 'skyteam2026seed') return res.status(403).json({ error: 'Invalid key' });

  const results = [];
  for (const user of SEED_USERS) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/users', {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(user)
      });
      const body = await r.text();
      results.push({ user: user.username, status: r.status, body: body.substring(0, 200) });
    } catch (e) {
      results.push({ user: user.username, error: e.message });
    }
  }

  return res.status(200).json({ seeded: results.length, results });
}
