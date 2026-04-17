// One-time user merge endpoint — consolidates duplicate accounts into a single canonical user.
// Call: POST /api/merge-users?key=<MERGE_USERS_KEY>
// Body: { from: ['yonfer', 'legend2'], to: 'dradmin' }
//
// SAFETY: Protected by MERGE_USERS_KEY env var. Designed to be idempotent per row
// (PATCH will be a no-op if already merged). Supports dryRun=true to preview changes.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Prefer: 'return=representation'
};

// Tables with a `username` column that should be migrated
const USERNAME_TABLES = [
  'bookings',
  'booking_proofs',
  'interacciones',
  'prospectos',
  'recordatorios',
  'proof_images',
  'agenda_configs',
  'push_subscriptions',
  'chat_messages',
  'solicitudes'
];

// Tables with a `ref` column (landing-related) that should be migrated
const REF_TABLES = [
  'landing_profiles',
  'landing_visits'
];

async function sb(path, opts) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: HEADERS,
    ...opts
  });
  const text = await r.text();
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + text.substring(0, 300));
  return text ? JSON.parse(text) : null;
}

// Count rows matching a filter (for dry-run preview)
async function countRows(table, column, value) {
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/' + table + '?' + column + '=eq.' + encodeURIComponent(value) + '&select=' + column,
      { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }
    );
    const range = r.headers.get('content-range') || '0-0/0';
    const total = parseInt(range.split('/')[1]) || 0;
    return total;
  } catch (e) {
    return -1; // table missing / error
  }
}

// Update all rows in a table where column=fromValue to column=toValue
async function patchRows(table, column, fromValue, toValue) {
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/' + table + '?' + column + '=eq.' + encodeURIComponent(fromValue),
      {
        method: 'PATCH',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ [column]: toValue })
      }
    );
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: r.status + ': ' + t.substring(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const VALID_KEY = process.env.MERGE_USERS_KEY || process.env.ADMIN_PUSH_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!VALID_KEY) {
    return res.status(500).json({ ok: false, error: 'No MERGE_USERS_KEY env configured' });
  }
  const providedKey = req.query.key || (req.body && req.body.key);
  if (providedKey !== VALID_KEY) {
    return res.status(403).json({ ok: false, error: 'Invalid key' });
  }

  // Params
  const body = req.method === 'POST' ? (req.body || {}) : {};
  const fromList = Array.isArray(body.from) ? body.from : (req.query.from ? req.query.from.split(',') : []);
  const to = body.to || req.query.to || '';
  const dryRun = body.dryRun === true || req.query.dryRun === 'true';

  if (!fromList.length || !to) {
    return res.status(400).json({ ok: false, error: 'Missing from[] and to' });
  }
  if (fromList.includes(to)) {
    return res.status(400).json({ ok: false, error: '"to" cannot also be in "from"' });
  }

  // Verify target user exists
  try {
    const targetCheck = await sb('users?username=eq.' + encodeURIComponent(to) + '&select=username,name&limit=1');
    if (!targetCheck || !targetCheck.length) {
      return res.status(400).json({ ok: false, error: 'Target user "' + to + '" not found in users table' });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Error checking target user: ' + e.message });
  }

  const summary = { from: fromList, to: to, dryRun: dryRun, tables: {}, refTables: {}, sponsor: {}, usersDeleted: [] };

  // ─── DRY RUN: just count rows ───
  if (dryRun) {
    for (const from of fromList) {
      for (const table of USERNAME_TABLES) {
        const key = table + '|' + from;
        summary.tables[key] = await countRows(table, 'username', from);
      }
      for (const table of REF_TABLES) {
        const key = table + '|' + from;
        summary.refTables[key] = await countRows(table, 'ref', from);
      }
      summary.sponsor[from] = await countRows('users', 'sponsor', from);
    }
    return res.status(200).json({ ok: true, dryRun: true, summary: summary });
  }

  // ─── LIVE RUN: patch everything ───
  const errors = [];

  for (const from of fromList) {
    // 1. Migrate username-keyed tables
    for (const table of USERNAME_TABLES) {
      const result = await patchRows(table, 'username', from, to);
      summary.tables[table + '|' + from] = result.ok ? 'OK' : 'ERR: ' + result.error;
      if (!result.ok && !(result.error || '').includes('does not exist')) {
        errors.push(table + '/' + from + ': ' + result.error);
      }
    }
    // 2. Migrate ref-keyed tables (landing)
    for (const table of REF_TABLES) {
      const result = await patchRows(table, 'ref', from, to);
      summary.refTables[table + '|' + from] = result.ok ? 'OK' : 'ERR: ' + result.error;
      if (!result.ok && !(result.error || '').includes('does not exist')) {
        errors.push(table + '/' + from + ': ' + result.error);
      }
    }
    // 3. Update sponsor field in users table (downline pointing to old user)
    const sponsorResult = await patchRows('users', 'sponsor', from, to);
    summary.sponsor[from] = sponsorResult.ok ? 'OK' : 'ERR: ' + sponsorResult.error;

    // 4. Delete the old user row (no longer needed — all data transferred)
    try {
      const delR = await fetch(
        SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(from),
        { method: 'DELETE', headers: { ...HEADERS, Prefer: 'return=minimal' } }
      );
      if (delR.ok) {
        summary.usersDeleted.push(from);
      } else {
        const txt = await delR.text();
        errors.push('delete user ' + from + ': ' + delR.status + ' ' + txt.substring(0, 200));
      }
    } catch (e) {
      errors.push('delete user ' + from + ': ' + e.message);
    }
  }

  return res.status(200).json({ ok: errors.length === 0, summary: summary, errors: errors });
};
