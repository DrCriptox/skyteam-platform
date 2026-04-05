// SKYTEAM – Team / Red API (Vercel Serverless + Supabase REST)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

async function sb(path, opts) {
  const url = SUPABASE_URL + '/rest/v1/' + path;
  const r = await fetch(url, {
    method: (opts && opts.method) || 'GET',
    headers: { ...HEADERS, ...(opts && opts.headers ? opts.headers : {}) },
    body: opts && opts.body ? opts.body : undefined
  });
  if (!r.ok) return [];
  const text = await r.text();
  if (!text) return [];
  return JSON.parse(text);
}

function getServerDownline(allUsers, userRef, maxLevel) {
  // Build lookup: index users by BOTH ref AND username (case-insensitive)
  var byKey = {};
  allUsers.forEach(function(u) {
    var uname = (u.username || '').toLowerCase();
    var uref = (u.ref || '').toLowerCase();
    if (uref) byKey[uref] = u;
    if (uname && !byKey[uname]) byKey[uname] = u;
  });

  // Build tree: sponsor → array of child keys
  // Each child is stored by BOTH ref and username so either lookup path works
  var tree = {};
  allUsers.forEach(function(u) {
    if (!u.sponsor) return;
    var sk = u.sponsor.toLowerCase();
    if (!tree[sk]) tree[sk] = [];
    var childKey = (u.ref || u.username || '').toLowerCase();
    if (childKey) tree[sk].push(childKey);
  });

  var result = [];
  var visited = new Set();

  function recurse(key, level) {
    if (level > maxLevel || visited.has(key)) return;
    visited.add(key);

    // Check children under this key
    var children = tree[key] || [];

    // Also check under the user's other identifier (ref vs username)
    var user = byKey[key];
    if (user) {
      var altKey = key === (user.ref || '').toLowerCase()
        ? (user.username || '').toLowerCase()
        : (user.ref || '').toLowerCase();
      if (altKey && altKey !== key && !visited.has(altKey)) {
        visited.add(altKey);
        children = children.concat(tree[altKey] || []);
      }
    }

    children.forEach(function(childKey) {
      var child = byKey[childKey];
      if (!child) return;
      var cKey = (child.ref || child.username || '').toLowerCase();
      if (result.some(function(r) { return (r.username || '').toLowerCase() === (child.username || '').toLowerCase(); })) return; // skip duplicates
      result.push(Object.assign({}, child, { level: level }));
      recurse(cKey, level + 1);
      // Also recurse with alternate key
      var altCKey = cKey === (child.ref || '').toLowerCase()
        ? (child.username || '').toLowerCase()
        : (child.ref || '').toLowerCase();
      if (altCKey && altCKey !== cKey) recurse(altCKey, level + 1);
    });
  }

  recurse(userRef.toLowerCase(), 1);

  // Also try with the user's username if ref was passed (or vice versa)
  var rootUser = byKey[userRef.toLowerCase()];
  if (rootUser) {
    var altRoot = userRef.toLowerCase() === (rootUser.ref || '').toLowerCase()
      ? (rootUser.username || '').toLowerCase()
      : (rootUser.ref || '').toLowerCase();
    if (altRoot && altRoot !== userRef.toLowerCase()) {
      recurse(altRoot, 1);
    }
  }

  return result;
}

async function handleDashboard(req, res, user, ref) {
  if (!ref) return res.status(400).json({ error: 'Missing ref' });

  // 1. Fetch ALL users (include whatsapp for contact)
  var allUsers = await sb('users?select=username,name,ref,sponsor,rank,ventas,equipo,expiry,created_at,innova_user,whatsapp&limit=5000');

  console.log('[Team API] User:', user, 'Ref:', ref, 'Total users:', allUsers.length);
  // Debug: show sponsor relationships for this user
  var relevantUsers = allUsers.filter(function(u) { return (u.sponsor || '').toLowerCase() === ref.toLowerCase() || (u.sponsor || '').toLowerCase() === user.toLowerCase(); });
  console.log('[Team API] Direct children of', ref, ':', relevantUsers.map(function(u) { return u.username + '(ref:' + u.ref + ',sponsor:' + u.sponsor + ')'; }).join(', '));

  // 2. Get downline members (10 levels)
  var members = getServerDownline(allUsers, ref, 10);
  console.log('[Team API] Downline members found:', members.length, members.map(function(m) { return m.username + '(L' + m.level + ')'; }).join(', '));

  // 3. Batch queries for supplementary data
  var gamData = [], onbData = [], prospData = [], bookData = [];
  var usernames = members.map(function(m) { return m.username; });
  if (usernames.length > 0) {
    var uList = usernames.map(function(u) { return encodeURIComponent(u); }).join(',');
    var results = await Promise.all([
      sb('gamification?user_ref=in.(' + uList + ')&select=user_ref,xp,level,streak_current,streak_last_date'),
      sb('onboarding_progress?username=in.(' + uList + ')&select=username,current_day,started_at'),
      sb('prospectos?username=in.(' + uList + ')&select=username,etapa'),
      sb('bookings?username=in.(' + uList + ')&status=neq.cancelada&select=username')
    ]);
    gamData = results[0] || [];
    onbData = results[1] || [];
    prospData = results[2] || [];
    bookData = results[3] || [];
  }

  // 4. Calculate Sky Score per member
  var now = Date.now();
  members.forEach(function(m) {
    var gam = gamData.find(function(g) { return g.user_ref === m.username || g.user_ref === m.ref; }) || {};
    var onb = onbData.find(function(o) { return o.username === m.username; }) || {};
    var prosCount = prospData.filter(function(p) { return p.username === m.username; }).length;
    var closedCount = prospData.filter(function(p) { return p.username === m.username && p.etapa === 'cerrado_ganado'; }).length;
    var bookCount = bookData.filter(function(b) { return b.username === m.username; }).length;

    m.score_prospects = (prosCount * 2) + (closedCount * 5);
    m.score_sales = (m.ventas || 0) * 10;
    m.score_day = ((onb.current_day || 0) * 3) + ((gam.streak_current || 0) * 2) + (bookCount * 4);
    m.sky_score = m.score_prospects + m.score_sales + m.score_day;
    m.prospectos_count = prosCount;
    m.prospectos_cerrados = closedCount;
    m.prospectos_por_etapa = {};
    prospData.filter(function(p){return p.username===m.username;}).forEach(function(p){ m.prospectos_por_etapa[p.etapa] = (m.prospectos_por_etapa[p.etapa]||0)+1; });
    m.bookings_count = bookCount;
    m.streak_current = gam.streak_current || 0;
    m.streak_last_date = gam.streak_last_date || null;
    m.onboarding_day = onb.current_day || 0;
    m.onboarding_started = onb.started_at || null;
    m.xp = gam.xp || 0;

    // Calculate status
    var expiryMs = m.expiry ? (typeof m.expiry === 'number' || /^\d+$/.test(m.expiry) ? Number(m.expiry) : new Date(m.expiry).getTime()) : 0;
    var daysRemaining = expiryMs > 0 ? Math.ceil((expiryMs - now) / 86400000) : 999;
    m.days_remaining = daysRemaining;
    var lastActive = gam.streak_last_date ? Math.ceil((now - new Date(gam.streak_last_date).getTime()) / 86400000) : 999;
    var daysSinceRegistration = m.created_at ? Math.ceil((now - new Date(m.created_at).getTime()) / 86400000) : 999;
    m.days_since_registration = daysSinceRegistration;

    // New members (< 7 days) are "new", not "inactive"
    if (daysSinceRegistration <= 7 && lastActive >= 14) {
      m.status = 'new';
    } else if (daysRemaining <= 7 || (lastActive >= 14 && daysSinceRegistration > 7)) {
      m.status = 'inactive';
    } else if (daysRemaining <= 14 || lastActive >= 7) {
      m.status = 'risk';
    } else {
      m.status = 'active';
    }
  });

  // 5. Generate alerts
  var alerts = [];
  members.forEach(function(m) {
    if (m.days_remaining > 0 && m.days_remaining <= 7) {
      alerts.push({ type: 'expiring', category: 'urgente', username: m.username, name: (m.name || m.username || 'Socio'), message: (m.name || m.username || 'Socio') + ' vence en ' + m.days_remaining + ' dias', action: 'contact' });
    }
    if (m.status === 'inactive' && m.days_remaining > 7) {
      var daysInactive = m.streak_last_date ? Math.ceil((now - new Date(m.streak_last_date).getTime()) / 86400000) : (m.days_since_registration || 0);
      if (daysInactive > 3) {
        alerts.push({ type: 'inactive', category: 'urgente', username: m.username, name: (m.name || m.username || 'Socio'), message: (m.name || m.username || 'Socio') + ' lleva ' + daysInactive + ' dias sin actividad', action: 'contact' });
      }
    }
    // New members get a positive alert instead
    if (m.status === 'new') {
      alerts.push({ type: 'new_member', category: 'positivo', username: m.username, name: (m.name || m.username || 'Socio'), message: 'Nuevo socio: ' + (m.name || m.username || 'Socio') + ' (hace ' + (m.days_since_registration || 0) + ' dias)', action: 'profile' });
    }
    if (m.onboarding_day <= 1 && m.onboarding_started) {
      var daysSinceStart = Math.ceil((now - new Date(m.onboarding_started).getTime()) / 86400000);
      if (daysSinceStart > 7) {
        alerts.push({ type: 'no_onboarding', category: 'atencion', username: m.username, name: (m.name || m.username || 'Socio'), message: (m.name || m.username || 'Socio') + ' no ha avanzado en el onboarding', action: 'profile' });
      }
    }
    if (m.prospectos_count === 0) {
      var daysSinceReg = m.created_at ? Math.ceil((now - new Date(m.created_at).getTime()) / 86400000) : 0;
      if (daysSinceReg > 14) {
        alerts.push({ type: 'zero_prospects', category: 'atencion', username: m.username, name: (m.name || m.username || 'Socio'), message: (m.name || m.username || 'Socio') + ' no tiene prospectos', action: 'profile' });
      }
    }
    if (m.created_at) {
      var daysSinceReg2 = Math.ceil((now - new Date(m.created_at).getTime()) / 86400000);
      if (daysSinceReg2 <= 7) {
        alerts.push({ type: 'new_member', category: 'positivo', username: m.username, name: (m.name || m.username || 'Socio'), message: 'Nuevo socio: ' + (m.name || m.username || 'Socio'), action: 'profile' });
      }
    }
    if (m.streak_current >= 7) {
      alerts.push({ type: 'streak', category: 'positivo', username: m.username, name: (m.name || m.username || 'Socio'), message: (m.name || m.username || 'Socio') + ' tiene racha de ' + m.streak_current + ' dias', action: 'profile' });
    }
  });
  // Sort: urgente first, then atencion, then positivo
  var catOrder = { urgente: 0, atencion: 1, positivo: 2 };
  alerts.sort(function(a, b) { return (catOrder[a.category] || 9) - (catOrder[b.category] || 9); });

  // 6. Network stats
  var active7d = members.filter(function(m) { return m.status === 'active'; }).length;
  var thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  var newThisMonth = members.filter(function(m) { return m.created_at && new Date(m.created_at) >= thisMonth; }).length;
  var directCount = members.filter(function(m) { return m.level === 1; }).length;

  // Weekly growth (last 7 days)
  var dias = ['Dom', 'Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b'];
  var growth = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    var dEnd = new Date(d); dEnd.setDate(dEnd.getDate() + 1);
    var count = members.filter(function(m) { return m.created_at && new Date(m.created_at) >= d && new Date(m.created_at) < dEnd; }).length;
    growth.push({ label: dias[d.getDay()], count: count });
  }

  // 7. Return response
  res.setHeader('Cache-Control', 's-maxage=30, max-age=10, stale-while-revalidate=60');
  return res.status(200).json({
    network: { total_members: members.length, active_7d: active7d, new_this_month: newThisMonth, direct_count: directCount, growth_weekly: growth },
    members: members.sort(function(a, b) { return a.level - b.level || b.sky_score - a.sky_score; }),
    alerts: alerts.slice(0, 50)
  });
}

async function handleCoach(req, res, user, ref) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ recommendations: ['Configura ANTHROPIC_API_KEY para activar Coach IA'] });
  if (!ref) return res.status(400).json({ error: 'Missing ref' });

  // Get all users and build downline
  var allUsers = await sb('users?select=username,name,ref,sponsor,rank,ventas,equipo,expiry,created_at,innova_user&limit=5000');
  var members = getServerDownline(allUsers, ref, 10);

  // Batch queries for supplementary data
  var gamData = [], onbData = [], prospData = [], bookData = [];
  var usernames = members.map(function(m) { return m.username; });
  if (usernames.length > 0) {
    var uList = usernames.map(function(u) { return encodeURIComponent(u); }).join(',');
    var results = await Promise.all([
      sb('gamification?user_ref=in.(' + uList + ')&select=user_ref,xp,level,streak_current,streak_last_date'),
      sb('onboarding_progress?username=in.(' + uList + ')&select=username,current_day,started_at'),
      sb('prospectos?username=in.(' + uList + ')&select=username,etapa'),
      sb('bookings?username=in.(' + uList + ')&status=neq.cancelada&select=username')
    ]);
    gamData = results[0] || [];
    onbData = results[1] || [];
    prospData = results[2] || [];
    bookData = results[3] || [];
  }

  // Calculate scores
  var now = Date.now();
  members.forEach(function(m) {
    var gam = gamData.find(function(g) { return g.user_ref === m.username || g.user_ref === m.ref; }) || {};
    var onb = onbData.find(function(o) { return o.username === m.username; }) || {};
    var prosCount = prospData.filter(function(p) { return p.username === m.username; }).length;
    var closedCount = prospData.filter(function(p) { return p.username === m.username && p.etapa === 'cerrado_ganado'; }).length;
    var bookCount = bookData.filter(function(b) { return b.username === m.username; }).length;

    m.score_prospects = (prosCount * 2) + (closedCount * 5);
    m.score_sales = (m.ventas || 0) * 10;
    m.score_day = ((onb.current_day || 0) * 3) + ((gam.streak_current || 0) * 2) + (bookCount * 4);
    m.sky_score = m.score_prospects + m.score_sales + m.score_day;

    var expiryMs = m.expiry ? (typeof m.expiry === 'number' || /^\d+$/.test(m.expiry) ? Number(m.expiry) : new Date(m.expiry).getTime()) : 0;
    var daysRemaining = expiryMs > 0 ? Math.ceil((expiryMs - now) / 86400000) : 999;
    var lastActive = gam.streak_last_date ? Math.ceil((now - new Date(gam.streak_last_date).getTime()) / 86400000) : 999;
    var daysSinceReg = m.created_at ? Math.ceil((now - new Date(m.created_at).getTime()) / 86400000) : 999;
    if (daysSinceReg <= 7 && lastActive >= 14) m.status = 'new';
    else if (daysRemaining <= 7 || (lastActive >= 14 && daysSinceReg > 7)) m.status = 'inactive';
    else if (daysRemaining <= 14 || lastActive >= 7) m.status = 'risk';
    else m.status = 'active';
  });

  // Sort by score
  members.sort(function(a, b) { return b.sky_score - a.sky_score; });

  // Build alerts count
  var urgentAlerts = members.filter(function(m) { return m.status === 'inactive'; }).length;
  var active7d = members.filter(function(m) { return m.status === 'active'; }).length;

  // Build sanitized summary
  var summary = 'Red de ' + user + ': ' + members.length + ' socios. ';
  summary += 'Activos: ' + active7d + '. ';
  summary += 'Top 3: ' + members.slice(0, 3).map(function(m) { return m.name + ' (score:' + m.sky_score + ')'; }).join(', ') + '. ';
  summary += 'Alertas urgentes: ' + urgentAlerts + '. ';

  var OPENAI_KEY = process.env.OPENAT_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!OPENAI_KEY) return res.status(200).json({ recommendations: ['API key no configurada'] });

  var r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'Eres un coach experto en network marketing y liderazgo de equipos. Respondes en español latinoamericano, cercano y motivador. Analiza los datos del equipo y da 5 recomendaciones accionables, cortas y específicas. Formato: JSON array de strings. Solo el array, sin explicación.' },
        { role: 'user', content: summary }
      ]
    })
  });
  var data = await r.json();
  var text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '[]';
  var recommendations = [];
  try { recommendations = JSON.parse(text.match(/\[[\s\S]*\]/)[0]); } catch (e) { recommendations = [text]; }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ recommendations: recommendations });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, user, ref } = req.body || {};
    if (!action || !user) return res.status(400).json({ error: 'Missing action or user' });

    if (action === 'dashboard') {
      return handleDashboard(req, res, user, ref);
    }
    if (action === 'coach') {
      return handleCoach(req, res, user, ref);
    }
    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Team API error:', error.message);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
