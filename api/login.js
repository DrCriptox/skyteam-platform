// Server-side login — passwords never sent to frontend
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const clean = username.trim().toLowerCase();

    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(clean) + '&select=username,password,name,rank,ref,sponsor,ventas,equipo,expiry,is_admin&limit=1',
      { headers: HEADERS }
    );
    if (!r.ok) throw new Error('DB error');
    const rows = await r.json();

    if (!rows.length || rows[0].password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = rows[0];
    if (user.expiry && Date.now() > user.expiry) {
      return res.status(401).json({ error: 'Este usuario ha expirado' });
    }

    // Return user data WITHOUT password
    return res.status(200).json({
      user: {
        username: user.username,
        name: user.name || user.username,
        rank: user.rank || 0,
        ref: user.ref || user.username,
        sponsor: user.sponsor || null,
        ventas: user.ventas || 0,
        equipo: user.equipo || 0,
        expiry: user.expiry || null,
        isAdmin: user.is_admin || false
      }
    });

  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
