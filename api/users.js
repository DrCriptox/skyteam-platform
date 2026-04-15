// Supabase-powered users API — serves user list for frontend login
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // SECURITY: Removed email, birthday, bankcode, income_goal from public response.
    // These are highly sensitive and leak PII to anyone who hits /api/users.
    // Socios ven whatsapp/instagram de su equipo en /api/team (que tiene cierta auth por ref).
    // Para email/bankcode/birthday, usar endpoint privado con identificación del caller.
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?select=username,name,ref,sponsor,rank,ventas,equipo,expiry,is_admin,whatsapp,profession,comm_style,instagram,photo,created_at,innova_user&limit=1000',
      { headers: HEADERS }
    );
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error('Supabase GET failed: ' + r.status + ' — ' + errBody);
    }
    const rows = await r.json();

    // Convert array to keyed object — NO passwords, emails, birthdays or bankcodes sent to frontend
    const users = {};
    for (const row of rows) {
      users[row.username] = {
        name: row.name || row.username,
        rank: row.rank != null ? row.rank : 0,
        ref: row.ref || row.username,
        sponsor: row.sponsor || null,
        wa: row.whatsapp || null,
        whatsapp: row.whatsapp || null,
        ventas: row.ventas || 0,
        equipo: row.equipo || 0,
        expiry: row.expiry || null,
        createdAt: row.created_at || null,
        isAdmin: row.is_admin || false,
        innova_user: row.innova_user || null,
        photo: row.photo || null,
        instagram: row.instagram || null
      };
    }

    // No CDN cache — admin changes must reflect immediately
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json({ users });

  } catch (error) {
    console.error('users API error:', error.message);
    return res.status(500).json({ error: 'Error loading users' });
  }
}
