// ONE-TIME migration: add missing columns to users table
// Call: GET /api/migrate?key=skyteam2026migrate
// Delete this file after running successfully

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (req.query.key !== 'skyteam2026migrate') return res.status(403).json({ error: 'Invalid key' });

  // Columns to ensure exist in the users table
  const columnsToAdd = [
    { name: 'email',   type: 'text' },
    { name: 'rank',    type: 'integer', default: 0 },
    { name: 'ventas',  type: 'integer', default: 0 },
    { name: 'equipo',  type: 'integer', default: 0 },
    { name: 'expiry',  type: 'bigint' },
  ];

  // First detect which columns already exist
  const detected = [];
  const missing = [];
  for (const col of columnsToAdd) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?select=${col.name}&limit=1`, { headers: HEADERS });
    if (r.ok) {
      detected.push(col.name);
    } else {
      missing.push(col);
    }
  }

  if (missing.length === 0) {
    return res.status(200).json({ ok: true, message: 'All columns already exist', detected });
  }

  // Try pg_query RPC (may not be available)
  const sqlStatements = missing.map(col => {
    const def = col.default !== undefined ? ` DEFAULT ${col.default}` : '';
    return `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${def};`;
  });
  const fullSQL = sqlStatements.join('\n');

  // Try calling pg_query RPC
  const rpcAttempts = [
    { fn: 'pg_query',   body: { query: fullSQL } },
    { fn: 'exec_sql',   body: { sql: fullSQL } },
    { fn: 'query',      body: { sql: fullSQL } },
  ];

  for (const attempt of rpcAttempts) {
    try {
      const rpcR = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${attempt.fn}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(attempt.body)
      });
      if (rpcR.ok) {
        // Verify columns now exist
        const verified = [];
        for (const col of missing) {
          const vr = await fetch(`${SUPABASE_URL}/rest/v1/users?select=${col.name}&limit=1`, { headers: HEADERS });
          if (vr.ok) verified.push(col.name);
        }
        return res.status(200).json({ ok: true, method: attempt.fn, added: verified, sql: fullSQL });
      }
    } catch (e) { /* try next */ }
  }

  // RPC not available — return the SQL for manual execution in Supabase SQL editor
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '').split('.')[0];
  return res.status(200).json({
    ok: false,
    message: 'Automatic migration not available. Run this SQL in Supabase SQL Editor:',
    sqlEditorUrl: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    sql: fullSQL,
    missingColumns: missing.map(c => c.name),
    detectedColumns: detected
  });
}
