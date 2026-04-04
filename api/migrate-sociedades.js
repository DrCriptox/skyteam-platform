// ONE-TIME migration: add innova_user column and backfill from username
// Call: GET /api/migrate-sociedades?key=skyteam2025migrate
// Delete this file after running successfully

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (req.query.key !== 'skyteam2025migrate') return res.status(403).json({ error: 'Invalid key' });

  // Step 1: Check if innova_user column already exists
  const checkR = await fetch(`${SUPABASE_URL}/rest/v1/users?select=innova_user&limit=1`, { headers: HEADERS });
  if (checkR.ok) {
    return res.status(200).json({ ok: true, message: 'innova_user column already exists, skipping ADD COLUMN.' });
  }

  // Step 2: Add innova_user column via RPC
  const addColumnSQL = `ALTER TABLE users ADD COLUMN IF NOT EXISTS innova_user text;`;
  const backfillSQL = `UPDATE users SET innova_user = username WHERE innova_user IS NULL;`;
  const fullSQL = addColumnSQL + '\n' + backfillSQL;

  const rpcAttempts = [
    { fn: 'pg_query', body: { query: fullSQL } },
    { fn: 'exec_sql', body: { sql: fullSQL } },
    { fn: 'query',    body: { sql: fullSQL } },
  ];

  for (const attempt of rpcAttempts) {
    try {
      const rpcR = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${attempt.fn}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(attempt.body)
      });
      if (rpcR.ok) {
        // Verify column now exists
        const vr = await fetch(`${SUPABASE_URL}/rest/v1/users?select=innova_user&limit=1`, { headers: HEADERS });
        if (vr.ok) {
          return res.status(200).json({ ok: true, method: attempt.fn, message: 'innova_user column added and backfilled' });
        }
        return res.status(200).json({ ok: true, method: attempt.fn, message: 'RPC succeeded but column not verified — check manually' });
      }
    } catch (e) { /* try next */ }
  }

  // RPC not available — return SQL for manual execution
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '').split('.')[0];

  return res.status(200).json({
    ok: false,
    message: 'Run these SQL statements in Supabase SQL Editor:',
    sqlEditorUrl: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    sql: fullSQL,
  });
}
