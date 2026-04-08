// Server-side user updates — keeps Supabase credentials secure
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

// Fields that ONLY admins can change
const ADMIN_ONLY_FIELDS = ['rank', 'is_admin', 'expiry', 'ventas', 'equipo', 'sponsor', 'original_sponsor', 'ref'];
// Fields that leaders (NOVA+ rank>=3) can change on team members
const LEADER_FIELDS = ['bankcode'];
// Fields that the user can change on their own profile
const SELF_FIELDS = ['name', 'email', 'whatsapp', 'photo', 'birthday', 'valor_inscripcion', 'bankcode', 'profession', 'income_goal', 'comm_style'];

async function getUserRole(username) {
  if (!username) return { isAdmin: false, isLeader: false, rank: 0 };
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username) + '&select=is_admin,rank', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' } });
    const rows = await r.json();
    if (!rows || !rows[0]) return { isAdmin: false, isLeader: false, rank: 0 };
    const rank = rows[0].rank || 0;
    return { isAdmin: rows[0].is_admin === true || rank >= 7, isLeader: rank >= 3, rank };
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
    const { username, updates, requestedBy } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Missing username' });

    // Determine who is making the request
    const caller = (requestedBy || username).toLowerCase().trim();
    const target = username.toLowerCase().trim();
    const callerRole = await getUserRole(caller);
    const callerIsAdmin = callerRole.isAdmin;
    const callerIsLeader = callerRole.isLeader;
    const isSelfUpdate = caller === target;

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

    return res.status(200).json({ ok: true, updated: rows.length });
  } catch (error) {
    console.error('update-user error:', error.message);
    return res.status(500).json({ error: 'Error updating user' });
  }
}
