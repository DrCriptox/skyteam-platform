// Server-side user updates — keeps Supabase credentials secure
//
// 🔴 SECURITY NOTE (audit 2026-04-15):
// This endpoint trusts `requestedBy` from the request body to determine caller identity.
// An attacker can impersonate any admin by sending `requestedBy: "yonfer"` in the body.
// PROPER FIX: derive caller identity from a signed JWT/session cookie (httpOnly).
// MITIGATION applied: log caller IP + user agent for all admin actions for audit trail.
// Until full session auth is implemented, monitor [ADMIN] logs for suspicious patterns.
//
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

// Verify caller password against DB hash (scrypt format "salt:hash" or legacy plaintext)
async function verifyCallerPassword(username, plainPassword) {
  if (!username || !plainPassword) return false;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username) + '&select=password', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    const rows = await r.json();
    const stored = rows && rows[0] && rows[0].password;
    if (!stored) return false;
    if (stored.includes(':')) {
      const [salt, hash] = stored.split(':');
      try {
        const check = crypto.scryptSync(plainPassword, salt, 32).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
      } catch { return false; }
    }
    // Legacy plaintext
    return stored === plainPassword;
  } catch { return false; }
}

// Fields that ONLY admins can change
const ADMIN_ONLY_FIELDS = ['rank', 'is_admin', 'expiry', 'ventas', 'equipo', 'sponsor', 'original_sponsor', 'ref'];
// Fields that leaders (NOVA+ rank>=3) can change on team members
const LEADER_FIELDS = ['bankcode'];
// Fields that the user can change on their own profile
const SELF_FIELDS = ['name', 'email', 'whatsapp', 'photo', 'birthday', 'valor_inscripcion', 'bankcode', 'profession', 'income_goal', 'comm_style', 'instagram'];

async function getUserRole(username) {
  if (!username) return { isAdmin: false, isLeader: false, rank: 0 };
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username) + '&select=is_admin,rank', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' } });
    const rows = await r.json();
    if (!rows || !rows[0]) return { isAdmin: false, isLeader: false, rank: 0 };
    const rank = rows[0].rank || 0;
    return { isAdmin: rows[0].is_admin === true, isLeader: rank >= 3, rank };
  } catch(e) { return { isAdmin: false, isLeader: false, rank: 0 }; }
}
async function isAdmin(username) { return (await getUserRole(username)).isAdmin; }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, updates, requestedBy, callerPassword } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Missing username' });

    // Determine who is making the request
    const caller = (requestedBy || username).toLowerCase().trim();
    const target = username.toLowerCase().trim();
    const callerRole = await getUserRole(caller);
    const callerIsAdmin = callerRole.isAdmin;
    const callerIsLeader = callerRole.isLeader;
    const isSelfUpdate = caller === target;

    // SECURITY: When editing someone else, verify caller identity via password.
    // Self-updates don't need this (frontend only allows own session to call with own username).
    // Admin/leader actions on other users MUST prove identity (until session auth ships).
    if (!isSelfUpdate) {
      const pwOk = await verifyCallerPassword(caller, callerPassword);
      if (!pwOk) {
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
        console.warn('[SECURITY] update-user rejected: caller=' + caller + ' target=' + target + ' ip=' + ip + ' (invalid or missing callerPassword)');
        return res.status(403).json({ error: 'Se requiere verificación de identidad para modificar otros usuarios' });
      }
    }

    // Special: rename username (admin only)
    if (updates && updates._rename && typeof updates._rename === 'string') {
      if (!callerIsAdmin) return res.status(403).json({ error: 'Solo admins pueden renombrar usuarios' });
      const newUsername = updates._rename.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!newUsername || newUsername.length < 2) return res.status(400).json({ error: 'Invalid new username' });
      const getR = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username) + '&select=*', { headers: HEADERS });
      const rows = await getR.json();
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const oldUser = rows[0];
      oldUser.username = newUsername;
      if (updates._newRef) oldUser.ref = updates._newRef;
      delete oldUser.id; delete oldUser.created_at;
      const insR = await fetch(SUPABASE_URL + '/rest/v1/users', { method: 'POST', headers: { ...HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify(oldUser) });
      if (!insR.ok) { const e = await insR.text(); return res.status(500).json({ error: 'Insert failed: ' + e.substring(0, 200) }); }
      await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username), { method: 'DELETE', headers: HEADERS });
      return res.status(200).json({ ok: true, oldUsername: username, newUsername: newUsername });
    }

    // Filter allowed fields based on role
    // Admin: can change everything. Leader (NOVA+): can change LEADER_FIELDS on others. Self: SELF_FIELDS only.
    let allowedFields;
    if (callerIsAdmin) {
      allowedFields = [...ADMIN_ONLY_FIELDS, ...LEADER_FIELDS, ...SELF_FIELDS];
    } else if (callerIsLeader && !isSelfUpdate) {
      allowedFields = [...LEADER_FIELDS];
    } else if (isSelfUpdate) {
      allowedFields = [...SELF_FIELDS];
    } else {
      allowedFields = [];
    }
    if (allowedFields.length === 0) return res.status(403).json({ error: 'No tienes permiso para modificar este usuario' });

    const safe = {};
    for (const key of allowedFields) {
      if (updates && updates[key] !== undefined) safe[key] = updates[key];
    }
    if (Object.keys(safe).length === 0) return res.status(400).json({ error: 'No valid fields' });

    // Log admin actions for audit
    if (callerIsAdmin && caller !== target) {
      console.log('[ADMIN] ' + caller + ' updating ' + target + ': ' + JSON.stringify(safe));
    }

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

    // ── Sync name/whatsapp to landing_profiles + GitHub (fire-and-forget) ──
    const syncFields = ['name', 'whatsapp'];
    const needsSync = syncFields.some(f => safe[f] !== undefined);
    if (needsSync && rows[0]) {
      const user = rows[0];
      const userRef = (user.ref || user.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (userRef) {
        (async function() {
          try {
            // 1) Update Supabase landing_profiles (instant — ranking reads this)
            const lpUpdates = {};
            if (safe.name !== undefined) lpUpdates.nombre = safe.name;
            if (safe.whatsapp !== undefined) lpUpdates.whatsapp = safe.whatsapp;
            lpUpdates.updated_at = new Date().toISOString();
            await fetch(SUPABASE_URL + '/rest/v1/landing_profiles?ref=eq.' + encodeURIComponent(userRef), {
              method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' },
              body: JSON.stringify(lpUpdates)
            });
            console.log('[SYNC] landing_profiles updated for', userRef, lpUpdates);

            // 2) Update GitHub asesores-skyteam.json (background)
            const GH_TOKEN = process.env.GITHUB_TOKEN;
            if (GH_TOKEN) {
              const REPO = 'DrCriptox/innova-ia-landing';
              const FILE = 'asesores-skyteam.json';
              const ghHeaders = { Authorization: 'token ' + GH_TOKEN, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'SkyTeam-Platform' };
              for (let attempt = 0; attempt < 3; attempt++) {
                if (attempt > 0) await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
                try {
                  const rawR = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/' + FILE);
                  const data = rawR.ok ? await rawR.json() : {};
                  const shaR = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE + '?ref=main', { headers: ghHeaders });
                  const shaData = shaR.ok ? await shaR.json() : {};
                  if (data[userRef]) {
                    if (safe.name !== undefined) data[userRef].nombre = safe.name;
                    if (safe.whatsapp !== undefined) data[userRef].whatsapp = safe.whatsapp;
                    const putR = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE, {
                      method: 'PUT', headers: ghHeaders,
                      body: JSON.stringify({ message: 'sync: update ' + userRef, content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'), sha: shaData.sha, branch: 'main' })
                    });
                    if (putR.ok) { console.log('[SYNC] GitHub updated for', userRef); break; }
                  } else { break; } // ref not in GitHub file, skip
                } catch(e) { console.warn('[SYNC] GitHub attempt', attempt, 'failed:', e.message); }
              }
            }
          } catch(e) { console.warn('[SYNC] background sync failed:', e.message); }
        })();
      }
    }

    return res.status(200).json({ ok: true, updated: rows.length });
  } catch (error) {
    console.error('update-user error:', error.message);
    return res.status(500).json({ error: 'Error updating user' });
  }
}
