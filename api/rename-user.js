// ══════════════════════════════════════════════════════════════
// Rename user endpoint — changes a user's primary identifier
// safely by creating the new row, migrating all references, and
// deleting the old row. Use when a user was registered with a
// wrong username (e.g. email was used as username by mistake).
//
// Call: POST /api/rename-user?key=<ADMIN_PUSH_KEY>
// Body: { from: 'billonairewoman777', to: 'yennifer', dryRun?: true }
//
// Idempotent behavior:
//  - If target already exists AND has data → 409, refuse (to avoid merge)
//  - If target already exists AND empty   → still 409 (use merge-users)
//  - If source doesn't exist              → 404
//  - dryRun=true returns a preview of what WOULD change, no writes
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Prefer: 'return=representation'
};

// Tables with a `username` column to migrate
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
  'plan_diario'
];

// Tables with a `ref` column to migrate (landing-related)
const REF_TABLES = [
  'landing_profiles',
  'landing_visits'
];

async function sb(path, opts) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: HEADERS, ...opts });
  const text = await r.text();
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + text.substring(0, 300));
  return text ? JSON.parse(text) : null;
}

async function countRows(table, column, value) {
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/' + table + '?' + column + '=eq.' + encodeURIComponent(value) + '&select=' + column,
      { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }
    );
    const range = r.headers.get('content-range') || '0-0/0';
    return parseInt(range.split('/')[1]) || 0;
  } catch (e) { return -1; }
}

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
    if (r.ok) return { ok: true };
    const t = await r.text();
    // Table missing → treat as no-op (schema differences between envs)
    if (t.includes('does not exist') || t.includes('PGRST205')) return { ok: true, note: 'table absent' };
    // Unique-constraint conflict → unlikely here since target is fresh, but
    // fall back to DELETE of source rows so we don't block the whole rename
    if (r.status === 409 || t.includes('23505') || t.includes('duplicate key')) {
      const delR = await fetch(
        SUPABASE_URL + '/rest/v1/' + table + '?' + column + '=eq.' + encodeURIComponent(fromValue),
        { method: 'DELETE', headers: { ...HEADERS, Prefer: 'return=minimal' } }
      );
      if (delR.ok) return { ok: true, resolved: 'deleted-source-on-conflict' };
      const dt = await delR.text();
      return { ok: false, error: 'patch+delete failed: ' + r.status + ' / ' + delR.status + ': ' + dt.substring(0, 150) };
    }
    return { ok: false, error: r.status + ': ' + t.substring(0, 200) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Normalize a username the same way the platform does (lowercase, trim).
// The DB stores usernames in lowercase; PostgREST eq. is case-sensitive, so
// callers passing "Yennifer" would never find the row otherwise.
function normUser(s) { return (s == null ? '' : String(s)).trim().toLowerCase(); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth — prefer env var; fallback to temporary hardcoded key ONLY if env is
  // unset in this Vercel environment. REMOVE the TEMP_KEY after the one-time
  // rename is done (follow-up commit).
  const TEMP_KEY = 'sky_rename_2026_04_18_yennifer';
  const VALID_KEY = process.env.RENAME_USER_KEY || process.env.ADMIN_PUSH_KEY || TEMP_KEY;
  const providedKey = req.query.key || (req.body && req.body.key);
  if (providedKey !== VALID_KEY) return res.status(403).json({ ok: false, error: 'Invalid key' });

  const body = req.method === 'POST' ? (req.body || {}) : {};
  const from = normUser(body.from || req.query.from);
  const to = normUser(body.to || req.query.to);
  const dryRun = body.dryRun === true || req.query.dryRun === 'true';

  if (!from || !to) return res.status(400).json({ ok: false, error: 'Missing "from" and/or "to"' });
  if (from === to) return res.status(400).json({ ok: false, error: '"from" and "to" are equal' });
  if (!/^[a-z0-9_.-]{2,40}$/.test(to)) return res.status(400).json({ ok: false, error: 'Target username invalid (allowed: a-z 0-9 _ . -, length 2-40)' });

  try {
    // 1. Verify source exists, get FULL row
    const srcRows = await sb('users?username=eq.' + encodeURIComponent(from) + '&select=*&limit=1');
    if (!srcRows || !srcRows.length) {
      return res.status(404).json({ ok: false, error: 'Source user "' + from + '" not found' });
    }
    const src = srcRows[0];

    // 2. Verify target does NOT exist
    const tgtRows = await sb('users?username=eq.' + encodeURIComponent(to) + '&select=username&limit=1');
    if (tgtRows && tgtRows.length) {
      return res.status(409).json({
        ok: false,
        error: 'Target "' + to + '" already exists. Use /api/merge-users to consolidate.'
      });
    }

    // 3. Build preview of row counts that WILL be migrated
    const preview = { tables: {}, refTables: {}, sponsor: 0 };
    for (const t of USERNAME_TABLES) preview.tables[t] = await countRows(t, 'username', from);
    for (const t of REF_TABLES) preview.refTables[t] = await countRows(t, 'ref', from);
    preview.sponsor = await countRows('users', 'sponsor', from);

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        from: from,
        to: to,
        sourceName: src.name,
        sourceEmail: src.email,
        sourceExpiry: src.expiry,
        sourceRank: src.rank,
        preview: preview,
        plan: [
          '1. INSERT users row with username="' + to + '" and ref="' + to + '" (all other fields copied from "' + from + '")',
          '2. PATCH ' + Object.values(preview.tables).reduce((a,b) => a + (b > 0 ? b : 0), 0) + ' rows across ' + Object.keys(preview.tables).length + ' username-keyed tables',
          '3. PATCH ' + Object.values(preview.refTables).reduce((a,b) => a + (b > 0 ? b : 0), 0) + ' rows across ' + Object.keys(preview.refTables).length + ' ref-keyed tables',
          '4. PATCH ' + preview.sponsor + ' users where sponsor="' + from + '" → sponsor="' + to + '"',
          '5. DELETE old users row with username="' + from + '"'
        ]
      });
    }

    // ─── LIVE RUN ───────────────────────────────────────────────
    const summary = { from: from, to: to, steps: {} };
    const errors = [];

    // Step 1: INSERT new users row. Copy ALL fields, overriding username+ref
    // to the target. Also copy created_at so history stays intact.
    const newUser = { ...src, username: to, ref: to, renamed_from: from };
    // Some columns are auto-managed — don't copy them
    delete newUser.id; // if there's an id column, let DB assign new one
    try {
      const insR = await fetch(SUPABASE_URL + '/rest/v1/users', {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify(newUser)
      });
      if (!insR.ok) {
        const it = await insR.text();
        // Retry without renamed_from (column may not exist in schema)
        if (it.includes('renamed_from') || it.includes('PGRST204')) {
          delete newUser.renamed_from;
          const retry = await fetch(SUPABASE_URL + '/rest/v1/users', {
            method: 'POST',
            headers: { ...HEADERS, Prefer: 'return=minimal' },
            body: JSON.stringify(newUser)
          });
          if (!retry.ok) {
            const rt = await retry.text();
            return res.status(500).json({ ok: false, step: 'insert', error: retry.status + ': ' + rt.substring(0, 300) });
          }
          summary.steps.insert = 'OK (without renamed_from)';
        } else {
          return res.status(500).json({ ok: false, step: 'insert', error: insR.status + ': ' + it.substring(0, 300) });
        }
      } else {
        summary.steps.insert = 'OK';
      }
    } catch (e) {
      return res.status(500).json({ ok: false, step: 'insert', error: e.message });
    }

    // Step 2+3: migrate username/ref tables
    for (const t of USERNAME_TABLES) {
      const r = await patchRows(t, 'username', from, to);
      summary.steps[t] = r.ok ? (r.resolved || r.note || 'OK') : 'ERR: ' + r.error;
      if (!r.ok) errors.push(t + ': ' + r.error);
    }
    for (const t of REF_TABLES) {
      const r = await patchRows(t, 'ref', from, to);
      summary.steps[t] = r.ok ? (r.resolved || r.note || 'OK') : 'ERR: ' + r.error;
      if (!r.ok) errors.push(t + ': ' + r.error);
    }

    // Step 4: update sponsor chain (downline pointing at old username)
    const sponsorResult = await patchRows('users', 'sponsor', from, to);
    summary.steps.sponsor = sponsorResult.ok ? 'OK' : 'ERR: ' + sponsorResult.error;
    if (!sponsorResult.ok) errors.push('sponsor: ' + sponsorResult.error);

    // Step 5: delete old users row
    try {
      const delR = await fetch(
        SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(from),
        { method: 'DELETE', headers: { ...HEADERS, Prefer: 'return=minimal' } }
      );
      if (delR.ok) {
        summary.steps.delete = 'OK';
      } else {
        const dt = await delR.text();
        errors.push('delete source: ' + delR.status + ' ' + dt.substring(0, 200));
        summary.steps.delete = 'ERR';
      }
    } catch (e) {
      errors.push('delete source: ' + e.message);
      summary.steps.delete = 'ERR';
    }

    return res.status(errors.length === 0 ? 200 : 207).json({
      ok: errors.length === 0,
      summary: summary,
      errors: errors,
      hint: errors.length === 0
        ? 'Done. The user now logs in with "' + to + '". Their previous email/password still work.'
        : 'Partial success — review errors. The new user "' + to + '" was created; some reference updates may have failed.'
    });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
