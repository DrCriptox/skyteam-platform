import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
const RESET_SECRET = process.env.RESET_SECRET || 'skyteam-reset-secret-2026';

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', RESET_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const data = verifyToken(token);
    if (!data) return res.status(401).json({ error: 'El enlace ha expirado o es inválido. Solicita uno nuevo.' });

    // Update password in Supabase
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(data.u),
      {
        method: 'PATCH',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ password })
      }
    );

    if (!r.ok) throw new Error('DB update failed: ' + r.status);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('reset-password error:', error.message);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
