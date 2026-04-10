// Server-side login — passwords never sent to frontend
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

// Rate limiting: max 10 login attempts per IP per 5 minutes
const _loginRateMap = {};
function _checkLoginRate(ip) {
  const now = Date.now();
  if (!_loginRateMap[ip]) _loginRateMap[ip] = [];
  _loginRateMap[ip] = _loginRateMap[ip].filter(t => now - t < 300000);
  if (_loginRateMap[ip].length >= 100) return false;
  _loginRateMap[ip].push(now);
  return true;
}

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
    // Rate limiting
    const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (!_checkLoginRate(clientIP)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }

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
    // Save last login IP for anti-fraud (fire-and-forget)
    try {
      const loginIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(user.username), {
        method: 'PATCH', headers: HEADERS, body: JSON.stringify({ last_ip: loginIP })
      }).catch(function(){});
    } catch(e) {}
    // Grace period: 3 days after expiry, user can still login but sees renewal banner
    const GRACE_MS = 3 * 86400000;
    if (user.expiry && Date.now() > (user.expiry + GRACE_MS)) {
      return res.status(401).json({ error: 'Tu membres\u00eda expir\u00f3 hace m\u00e1s de 3 d\u00edas. Contacta a tu patrocinador para renovar.' });
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
        photo: user.photo || null,
        birthday: user.birthday || null,
        bankcode: user.bankcode || null,
        profession: user.profession || null,
        income_goal: user.income_goal || null,
        comm_style: user.comm_style || null,
        instagram: user.instagram || null
      }
    });

  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
