// One-time seed script — creates the original hardcoded users in Supabase
// Call GET /api/seed-users?key=skyteam2026seed to run
// Call GET /api/seed-users?key=skyteam2026seed&migrate=1 to add missing columns first
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

const SEED_USERS = [
  { username: 'angel', password: 'sky2024', name: 'Angel', rank: 7, ref: 'angel2026', ventas: 47, equipo: 23 },
  { username: 'genesis', password: 'genesis22', name: 'Genesis', rank: 3, ref: 'genesis22', ventas: 12, equipo: 5 },
  { username: 'carlos', password: 'demo', name: 'Carlos', rank: 2, ref: 'carlos01', ventas: 3, equipo: 0 },
  { username: 'maria', password: 'demo', name: 'Maria', rank: 1, ref: 'maria01', ventas: 0, equipo: 0 },
  { username: 'admin', password: 'skyadmin', name: 'Admin', rank: 8, ref: 'admin', ventas: 0, equipo: 0, is_admin: true },
  { username: 'cliente', password: 'demo', name: 'Cliente Demo', rank: 0, ref: 'cliente01', ventas: 0, equipo: 0 },
  { username: 'genesis22', password: 'genesis22', name: 'Genesis Rivera', rank: 3, ref: 'genesis22', ventas: 0, equipo: 0 },
  { username: 'yonfer', password: 'skyadmin2026', name: 'Yonfer Rojas', rank: 7, ref: 'angel2026', ventas: 47, equipo: 15, is_admin: true },
  { username: 'billonarios', password: 'billonarios26', name: 'Johan Gonzalez', rank: 1, ref: 'billonarios', ventas: 0, equipo: 0 },
  { username: 'demo', password: 'demo2026', name: 'Usuario Demo', rank: 1, ref: 'demo01', ventas: 2, equipo: 0 },
];

async function runSQL(sql) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query: sql })
  });
  return { status: r.status, body: await r.text() };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (req.query.key !== 'skyteam2026seed') return res.status(403).json({ error: 'Invalid key' });

  const migrate = req.query.migrate === '1';
  const migrationResults = [];

  // If migrate=1, try adding missing columns (ALTER TABLE is safe — IF NOT EXISTS style)
  if (migrate) {
    const columns = [
      { name: 'rank', type: 'integer', default: '0' },
      { name: 'ref', type: 'text', default: "''" },
      { name: 'sponsor', type: 'text', default: 'null' },
      { name: 'ventas', type: 'integer', default: '0' },
      { name: 'equipo', type: 'integer', default: '0' },
      { name: 'expiry', type: 'bigint', default: 'null' },
      { name: 'is_admin', type: 'boolean', default: 'false' },
      { name: 'whatsapp', type: 'text', default: "''" },
    ];
    for (const col of columns) {
      try {
        const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ query: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS ' + col.name + ' ' + col.type + ' DEFAULT ' + col.default })
        });
        migrationResults.push({ column: col.name, status: r.status, body: (await r.text()).substring(0, 100) });
      } catch (e) {
        migrationResults.push({ column: col.name, error: e.message });
      }
    }
  }

  // Seed users one by one using upsert
  const results = [];
  for (const user of SEED_USERS) {
    try {
      // Only send columns that the table should have
      const payload = {
        username: user.username,
        password: user.password,
        name: user.name
      };
      // Add optional columns — they may not exist if migrate wasn't run
      if (user.rank !== undefined) payload.rank = user.rank;
      if (user.ref) payload.ref = user.ref;
      if (user.ventas !== undefined) payload.ventas = user.ventas;
      if (user.equipo !== undefined) payload.equipo = user.equipo;
      if (user.is_admin) payload.is_admin = user.is_admin;

      const r = await fetch(SUPABASE_URL + '/rest/v1/users', {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      });
      const body = await r.text();
      results.push({ user: user.username, status: r.status, body: body.substring(0, 200) });
    } catch (e) {
      results.push({ user: user.username, error: e.message });
    }
  }

  return res.status(200).json({ seeded: results.length, migrate, migrationResults, results });
}
