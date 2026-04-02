// Content Locks API — SKY TEAM
// GET: returns current content locks
// POST: saves content locks (from admin panel)
// Uses onboarding_progress table with special username '_system_locks'
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const H = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Prefer: 'return=representation'
};

async function sb(path, opts) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: H, ...opts });
  var text = await r.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      var rows = await sb('onboarding_progress?username=eq._system_locks&limit=1');
      if (rows && rows[0] && rows[0].tasks) {
        return res.status(200).json(rows[0].tasks);
      }
      return res.status(200).json({});
    }

    if (req.method === 'POST') {
      var locks = req.body;
      if (!locks || typeof locks !== 'object') {
        return res.status(400).json({ error: 'Invalid locks data' });
      }

      // Check if system row exists
      var existing = await sb('onboarding_progress?username=eq._system_locks&limit=1');
      if (existing && existing.length > 0) {
        // Update existing
        await sb('onboarding_progress?username=eq._system_locks', {
          method: 'PATCH',
          body: JSON.stringify({ tasks: locks })
        });
      } else {
        // Create new system row
        await sb('onboarding_progress', {
          method: 'POST',
          headers: { ...H, Prefer: 'return=representation' },
          body: JSON.stringify({
            username: '_system_locks',
            current_day: 0,
            tasks: locks,
            started_at: new Date().toISOString()
          })
        });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
