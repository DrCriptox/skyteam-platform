// Check innova_user, email and whatsapp availability against users table
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
    const { innova_user, email, whatsapp } = req.body || {};

    const result = {
      innova_user: { count: 0, canRegister: true },
      email: { exists: false },
      whatsapp: { exists: false },
    };

    // Check innova_user count in users table
    if (innova_user) {
      const clean = innova_user.trim().toLowerCase();
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/users?innova_user=eq.' + encodeURIComponent(clean) + '&select=username',
        { headers: HEADERS }
      );
      const rows = await r.json();
      const count = (Array.isArray(rows)) ? rows.length : 0;
      result.innova_user.count = count;
      result.innova_user.canRegister = count < 2;
    }

    // Check email exists in users table
    if (email) {
      const clean = email.trim().toLowerCase();
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(clean) + '&select=username&limit=1',
        { headers: HEADERS }
      );
      const rows = await r.json();
      if (rows && rows.length > 0) {
        result.email.exists = true;
      }
    }

    // Check whatsapp exists in users table
    if (whatsapp) {
      const clean = whatsapp.trim();
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/users?whatsapp=eq.' + encodeURIComponent(clean) + '&select=username&limit=1',
        { headers: HEADERS }
      );
      const rows = await r.json();
      if (rows && rows.length > 0) {
        result.whatsapp.exists = true;
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('check-innova-user error:', error.message);
    return res.status(200).json({
      innova_user: { count: 0, canRegister: true },
      email: { exists: false },
      whatsapp: { exists: false },
    }); // fail open
  }
}
