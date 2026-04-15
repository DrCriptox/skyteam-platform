// One-time migration — creates tables needed for push notifications
// Call: GET /api/migrate?key=skyteam2026migrate
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  // SECURITY: Key now required from env (not hardcoded). Endpoint is kept for future migrations.
  const VALID_KEY = process.env.MIGRATE_KEY;
  if (!VALID_KEY) return res.status(410).json({ error: 'Migration disabled — set MIGRATE_KEY env to re-enable' });
  if (req.query.key !== VALID_KEY) return res.status(403).json({ error: 'Invalid key' });

  const results = [];

  try {
    // Check if push_subscriptions table exists by trying to query it
    const checkR = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?select=id&limit=1', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });

    if (checkR.ok) {
      results.push({ table: 'push_subscriptions', status: 'already_exists' });
    } else if (checkR.status === 404 || (await checkR.text()).includes('does not exist')) {
      // Table doesn't exist — create it via SQL
      const sqlR = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            CREATE TABLE IF NOT EXISTS push_subscriptions (
              id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
              username text NOT NULL,
              endpoint text NOT NULL,
              subscription jsonb NOT NULL,
              created_at timestamptz DEFAULT now(),
              CONSTRAINT push_subs_endpoint_unique UNIQUE (endpoint)
            );
            CREATE INDEX IF NOT EXISTS idx_push_subs_username ON push_subscriptions(username);
            CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);
          `
        })
      });

      if (sqlR.ok) {
        results.push({ table: 'push_subscriptions', status: 'created' });
      } else {
        // RPC not available — try alternate approach: just test insert+delete
        results.push({ table: 'push_subscriptions', status: 'needs_manual_creation', error: await sqlR.text() });
      }
    } else {
      results.push({ table: 'push_subscriptions', status: 'check_error', code: checkR.status });
    }

    // Check recordatorios table
    const checkR2 = await fetch(SUPABASE_URL + '/rest/v1/recordatorios?select=id&limit=1', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    results.push({ table: 'recordatorios', status: checkR2.ok ? 'exists' : 'missing' });

    // Check if valor_inscripcion column exists in users table
    try {
      const colCheck = await fetch(SUPABASE_URL + '/rest/v1/users?select=valor_inscripcion&limit=1', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      });
      if (colCheck.ok) {
        results.push({ column: 'users.valor_inscripcion', status: 'exists' });
      } else {
        results.push({ column: 'users.valor_inscripcion', status: 'MISSING — run: ALTER TABLE users ADD COLUMN valor_inscripcion integer;' });
      }
    } catch(e) {
      results.push({ column: 'users.valor_inscripcion', status: 'check_error', error: e.message });
    }

  } catch (error) {
    results.push({ error: error.message });
  }

  return res.status(200).json({
    ok: true,
    results,
    instructions: 'If push_subscriptions needs manual creation, run this SQL in Supabase Dashboard > SQL Editor:\n\nCREATE TABLE push_subscriptions (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  username text NOT NULL,\n  endpoint text NOT NULL,\n  subscription jsonb NOT NULL,\n  created_at timestamptz DEFAULT now(),\n  CONSTRAINT push_subs_endpoint_unique UNIQUE (endpoint)\n);\nCREATE INDEX idx_push_subs_username ON push_subscriptions(username);\nCREATE INDEX idx_push_subs_endpoint ON push_subscriptions(endpoint);'
  });
}
