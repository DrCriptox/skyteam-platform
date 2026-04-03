// Check if an email already has an active account in users table
// Note: solicitudes is audit-only — does NOT block re-registration
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
    const { email } = req.body || {};
    if (!email) return res.status(200).json({ exists: false });

    const clean = email.trim().toLowerCase();

    // Only block if email already has an active user account
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(clean) + '&select=username&limit=1',
      { headers: HEADERS }
    );
    const users = await r.json();
    if (users && users.length > 0) {
      return res.status(200).json({ exists: true, where: 'active' });
    }

    return res.status(200).json({ exists: false });

  } catch (error) {
    console.error('check-email error:', error.message);
    return res.status(200).json({ exists: false }); // fail open — don't block registration on errors
  }
}
