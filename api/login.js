// Server-side login — passwords never sent to frontend
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

// Verifica contraseña: soporta hash nuevo (salt:hash) y texto plano legacy
function checkPassword(plain, stored) {
  if (!plain || !stored) return false;
  if (stored.includes(':')) {
    // Formato hashed: salt:hash (scrypt)
    const [salt, hash] = stored.split(':');
    try {
      const check = crypto.scryptSync(plain, salt, 32).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
    } catch { return false; }
  }
  // Legacy plaintext — solo para cuentas admin existentes, usar timingSafeEqual
  try {
    const a = Buffer.from(stored);
    const b = Buffer.alloc(a.length);
    Buffer.from(plain.substring(0, a.length)).copy(b);
    return stored === plain && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body || {};

    // Input validation
    if (!username || !password) return res.status(400).json({ error: 'Credenciales requeridas' });
    if (typeof username !== 'string' || username.length > 50)  return res.status(400).json({ error: 'Usuario inválido' });
    if (typeof password !== 'string' || password.length > 200) return res.status(400).json({ error: 'Contraseña inválida' });

    const clean = username.trim().toLowerCase();

    // Support login by email or username
    const isEmail = clean.includes('@');
    const query = isEmail
      ? SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(clean) + '&select=*&limit=1'
      : SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(clean) + '&select=*&limit=1';

    const r = await fetch(query, { headers: HEADERS });
    if (!r.ok) throw new Error('DB error');
    const rows = await r.json();

    if (!rows.length || !checkPassword(password, rows[0].password)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = rows[0];
    if (user.expiry && Date.now() > user.expiry) {
      return res.status(401).json({ error: 'Este usuario ha expirado' });
    }

    return res.status(200).json({
      user: {
        username: user.username,
        name: user.name || user.username,
        rank: user.rank || 0,
        ref: user.ref || user.username,
        sponsor: user.sponsor || null,
        email: user.email || null,
        whatsapp: user.whatsapp || null,
        ventas: user.ventas || 0,
        equipo: user.equipo || 0,
        expiry: user.expiry || null,
        isAdmin: user.is_admin || false,
        photo: user.photo || null
      }
    });

  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
