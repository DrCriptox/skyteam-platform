// SKY TEAM – Gamification API (Vercel Serverless + Supabase REST)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY
};

async function sb(path, opts = {}) {
  const h = { ...HEADERS, ...(opts.headers || {}) };
  delete opts.headers;
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: h, ...opts });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 300));
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

const LVL = [
  { min: 0, max: 99, lv: 1 }, { min: 100, max: 299, lv: 2 },
  { min: 300, max: 599, lv: 3 }, { min: 600, max: 999, lv: 4 },
  { min: 1000, max: 1999, lv: 5 }, { min: 2000, max: 3499, lv: 6 },
  { min: 3500, max: Infinity, lv: 7 }
];

function calcLevel(xp) {
  for (const t of LVL) { if (xp >= t.min && xp <= t.max) return t.lv; }
  return 7;
}

async function getOrCreate(user) {
  // Try to get existing profile
  const data = await sb(
    'gamification?user_ref=eq.' + encodeURIComponent(user) + '&select=*'
  );
  if (data && data.length > 0) return data[0];

  // Create new profile
  const np = {
    user_ref: user, xp: 0, level: 1,
    streak_current: 0, streak_best: 0, streak_last_date: null,
    total_closed: 0, total_contacted: 0, total_presentations: 0,
    achievements: []
  };
  const created = await sb('gamification', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(np)
  });
  return created && created[0] ? created[0] : np;
}

async function addXP(user, amt, actionType, details) {
  const p = await getOrCreate(user);
  const newXP = p.xp + amt;
  const newLv = calcLevel(newXP);

  await sb('gamification?user_ref=eq.' + encodeURIComponent(user), {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ xp: newXP, level: newLv, updated_at: new Date().toISOString() })
  });

  await sb('xp_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_ref: user, action: actionType, xp_amount: amt,
      details: typeof details === 'object' ? JSON.stringify(details) : details || null
    })
  });

  return { profile: { ...p, xp: newXP, level: newLv }, leveled_up: newLv > p.level, new_level: newLv };
}

async function checkStreak(user) {
  const p = await getOrCreate(user);
  const today = new Date().toISOString().split('T')[0];
  const last = p.streak_last_date ? p.streak_last_date.split('T')[0] : null;
  let ns = p.streak_current, nb = p.streak_best, bonus = 0;

  if (!last) { ns = 1; }
  else if (last === today) { return { data: { streak_current: ns, streak_best: nb, bonus_xp: 0 } }; }
  else {
    const yd = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (last === yd) { ns = p.streak_current + 1; if (ns > nb) nb = ns; bonus = Math.min(10 * ns, 100); }
    else { ns = 1; }
  }

  await sb('gamification?user_ref=eq.' + encodeURIComponent(user), {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ streak_current: ns, streak_best: nb, streak_last_date: today, updated_at: new Date().toISOString() })
  });

  if (bonus > 0) await addXP(user, bonus, 'streak_bonus', 'Racha de ' + ns + ' dias');
  return { data: { streak_current: ns, streak_best: nb, bonus_xp: bonus } };
}

async function unlockAch(user, id, name, emoji) {
  const p = await getOrCreate(user);
  const achs = p.achievements || [];
  if (achs.some(a => (typeof a === 'string' ? a : a.id) === id)) {
    return { data: { unlocked: false, achievements: achs } };
  }
  const updated = [...achs, { id, name, emoji, at: new Date().toISOString() }];

  await sb('gamification?user_ref=eq.' + encodeURIComponent(user), {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ achievements: updated, updated_at: new Date().toISOString() })
  });

  await addXP(user, 50, 'achievement', 'Logro: ' + name);
  return { data: { unlocked: true, achievements: updated } };
}

async function getLeaderboard() {
  const data = await sb('gamification?select=user_ref,xp,level,streak_current,achievements&order=xp.desc&limit=20');
  return {
    data: (data || []).map(u => ({
      user_ref: u.user_ref, xp: u.xp, level: u.level,
      streak_current: u.streak_current,
      achievements_count: (u.achievements || []).length
    }))
  };
}

async function getActivity(user) {
  const d = new Date(); d.setDate(d.getDate() - 7);
  const data = await sb(
    'xp_log?user_ref=eq.' + encodeURIComponent(user) +
    '&created_at=gte.' + d.toISOString() +
    '&select=xp_amount,created_at&order=created_at.asc'
  );
  const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const grouped = {};
  for (let i = 0; i < 7; i++) {
    const dd = new Date(); dd.setDate(dd.getDate() - 6 + i);
    const k = dd.toISOString().split('T')[0];
    grouped[k] = { xp: 0, label: days[dd.getDay()] };
  }
  (data || []).forEach(r => {
    const k = r.created_at.split('T')[0];
    if (grouped[k]) grouped[k].xp += r.xp_amount;
  });
  return { data: Object.values(grouped) };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, user } = req.body || {};
    if (!action || !user) return res.status(400).json({ error: 'Missing action or user' });

    let r;
    if (action === 'get_profile') {
      const p = await getOrCreate(user);
      r = { data: p };
    } else if (action === 'add_xp') {
      const { xp_amount, action_type, details } = req.body;
      r = { data: await addXP(user, xp_amount, action_type, details) };
    } else if (action === 'check_streak') {
      r = await checkStreak(user);
    } else if (action === 'unlock_achievement') {
      const { achievement_id, achievement_name, achievement_emoji } = req.body;
      r = await unlockAch(user, achievement_id, achievement_name, achievement_emoji);
    } else if (action === 'get_leaderboard') {
      r = await getLeaderboard();
    } else if (action === 'get_activity') {
      r = await getActivity(user);
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }
    return res.status(200).json(r);
  } catch (e) {
    console.error('Gamification API error:', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
