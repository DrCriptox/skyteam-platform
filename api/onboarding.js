// Onboarding & Achievements API — SKY TEAM V2
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

// ── PHOTO GENERATION V3: sharp composite — face pixels are NEVER modified by AI ──
const sharp = require('sharp');

const SUIT_COLORS = {
  '#1a1a2e': 'dark navy blue', '#0a3d62': 'royal blue',
  '#2d2d2d': 'charcoal gray', '#4a0e0e': 'deep burgundy wine',
  '#0d0d0d': 'black', '#1b4332': 'dark forest green',
  '#3d2b1f': 'dark brown chocolate', '#c4a35a': 'beige golden tan'
};
const SHIRT_COLORS = {
  '#FFFFFF': 'white', '#D6EAF8': 'light blue',
  '#FADBD8': 'pale pink', '#F9E79F': 'soft yellow',
  '#D5F5E3': 'mint green', '#E8DAEF': 'lavender',
  '#F0F0F0': 'light gray', '#1a1a2e': 'black'
};

async function sb(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: SB_HEADERS, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function handleSetup(req, res) {
  const { adminKey } = req.body || {};
  if (adminKey !== process.env.ADMIN_PUSH_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS onboarding_progress (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, username TEXT NOT NULL, current_day INT DEFAULT 1, tasks JSONB DEFAULT '{}', launch_date DATE, launch_photo_url TEXT, launch_flyer_data JSONB DEFAULT '{}', pro_photo_url TEXT, started_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ, UNIQUE(username))`,
    `CREATE TABLE IF NOT EXISTS achievements (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, username TEXT NOT NULL, achievement_id TEXT NOT NULL, unlocked_at TIMESTAMPTZ DEFAULT now(), UNIQUE(username, achievement_id))`,
    `CREATE TABLE IF NOT EXISTS script_bank (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, sort_order INT DEFAULT 0, active BOOLEAN DEFAULT true)`
  ];
  const results = [];
  for (const sql of sqlStatements) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/', { method: 'POST', headers: { ...SB_HEADERS, 'Content-Profile': 'public' }, body: JSON.stringify({ query: sql }) });
      results.push({ sql: sql.substring(0, 50), status: r.status });
    } catch (e) { results.push({ sql: sql.substring(0, 50), error: e.message }); }
  }
  return res.status(200).json({ ok: true, results, note: 'If RPC fails, create tables manually in Supabase SQL Editor' });
}

async function getProgress(username) {
  const rows = await sb('onboarding_progress?username=eq.' + encodeURIComponent(username) + '&limit=1');
  return rows && rows[0] ? rows[0] : null;
}

async function initProgress(username) {
  const existing = await getProgress(username);
  if (existing) return existing;
  const row = await sb('onboarding_progress', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'return=representation' }, body: JSON.stringify({ username, current_day: 1, tasks: {}, started_at: new Date().toISOString() }) });
  return row && row[0] ? row[0] : row;
}

async function completeTask(username, taskId) {
  let progress = await getProgress(username);
  if (!progress) progress = await initProgress(username);
  const tasks = progress.tasks || {};
  if (tasks[taskId]) return { progress, alreadyDone: true };
  tasks[taskId] = new Date().toISOString();
  const dayTasks = { 1: ['day1_photo','day1_profile','day1_landing'], 2: ['day2_tour','day2_pwa','day2_push'], 3: ['day3_prospects','day3_qualify'], 4: ['day4_scripts','day4_message','day4_interaction'], 5: ['day5_flyer','day5_date','day5_stories'], 6: ['day6_publish','day6_stories','day6_contacts'], 7: ['day7_respond','day7_meeting','day7_prepare'] };
  let maxCompletedDay = 0;
  for (let day = 1; day <= 7; day++) { if (dayTasks[day].every(t => tasks[t])) maxCompletedDay = day; else break; }
  const currentDay = Math.min(maxCompletedDay + 1, 7);
  const completedAt = maxCompletedDay >= 7 ? new Date().toISOString() : null;
  const updated = await sb('onboarding_progress?username=eq.' + encodeURIComponent(username), { method: 'PATCH', body: JSON.stringify({ tasks, current_day: currentDay, completed_at: completedAt }) });
  return { progress: updated && updated[0] ? updated[0] : { ...progress, tasks, current_day: currentDay }, newTask: taskId };
}

async function saveLaunchData(username, data) {
  const { launch_date, launch_photo_url, pro_photo_url, launch_flyer_data } = data;
  const patch = {};
  if (launch_date) patch.launch_date = launch_date;
  if (launch_photo_url) patch.launch_photo_url = launch_photo_url;
  if (pro_photo_url) patch.pro_photo_url = pro_photo_url;
  if (launch_flyer_data) patch.launch_flyer_data = launch_flyer_data;
  const updated = await sb('onboarding_progress?username=eq.' + encodeURIComponent(username), { method: 'PATCH', body: JSON.stringify(patch) });
  return updated && updated[0] ? updated[0] : null;
}

const ACHIEVEMENT_DEFS = {
  first_login: { name: 'Primer paso', icon: '🚀', msg: '¡Bienvenido al equipo! Tu camino comienza aquí.' },
  photo_pro: { name: 'Imagen profesional', icon: '📸', msg: '¡Tu imagen profesional está lista! Primera impresión es todo.' },
  first_prospect: { name: 'Cazador de prospectos', icon: '🎯', msg: '¡Agregaste tu primer prospecto!' },
  ten_prospects: { name: 'Lista de oro', icon: '🏆', msg: '¡10 prospectos! Tu pipeline está tomando forma.' },
  first_message: { name: 'Rompehielos', icon: '💬', msg: '¡Enviaste tu primer mensaje!' },
  launch_ready: { name: 'Listo para lanzar', icon: '🎨', msg: '¡Tu material de lanzamiento está listo!' },
  launched: { name: '¡Lanzado!', icon: '🚀', msg: '¡FELICIDADES! Oficialmente lanzaste tu negocio.' },
  first_meeting: { name: 'Cerrando puertas', icon: '📅', msg: '¡Tu primera reunión agendada!' },
  first_close: { name: 'Primera venta', icon: '💰', msg: '¡PRIMERA VENTA! Lo que parecía imposible ya es REAL.' },
  streak_3: { name: 'Constancia', icon: '🔥', msg: '3 días consecutivos activo.' },
  streak_7: { name: 'Imparable', icon: '⚡', msg: '¡7 días sin parar! Top 10% del equipo.' },
  hot_pipeline: { name: 'Pipeline caliente', icon: '🌡️', msg: '¡5 prospectos calientes! Tu embudo está on fire.' }
};

async function getAchievements(username) {
  const rows = await sb('achievements?username=eq.' + encodeURIComponent(username) + '&order=unlocked_at.desc');
  return rows || [];
}

async function unlockAchievement(username, achievementId) {
  if (!ACHIEVEMENT_DEFS[achievementId]) return { error: 'Unknown achievement' };
  const existing = await sb('achievements?username=eq.' + encodeURIComponent(username) + '&achievement_id=eq.' + encodeURIComponent(achievementId) + '&limit=1');
  if (existing && existing.length > 0) return { alreadyUnlocked: true };
  const row = await sb('achievements', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ username, achievement_id: achievementId, unlocked_at: new Date().toISOString() }) });
  return { unlocked: true, achievement: ACHIEVEMENT_DEFS[achievementId], data: row && row[0] ? row[0] : null };
}

async function checkAutoAchievements(username) {
  const newAchievements = [];
  try {
    const prospects = await sb('prospectos?username=eq.' + encodeURIComponent(username) + '&select=id');
    if (prospects) {
      if (prospects.length >= 1) { const r = await unlockAchievement(username, 'first_prospect'); if (r.unlocked) newAchievements.push(r.achievement); }
      if (prospects.length >= 10) { const r = await unlockAchievement(username, 'ten_prospects'); if (r.unlocked) newAchievements.push(r.achievement); }
    }
    const hot = await sb('prospectos?username=eq.' + encodeURIComponent(username) + '&temperatura=gte.70&etapa=not.in.(cerrado_ganado,cerrado_perdido)&select=id');
    if (hot && hot.length >= 5) { const r = await unlockAchievement(username, 'hot_pipeline'); if (r.unlocked) newAchievements.push(r.achievement); }
    const closes = await sb('prospectos?username=eq.' + encodeURIComponent(username) + '&etapa=eq.cerrado_ganado&select=id&limit=1');
    if (closes && closes.length > 0) { const r = await unlockAchievement(username, 'first_close'); if (r.unlocked) newAchievements.push(r.achievement); }
    const bookings = await sb('bookings?username=eq.' + encodeURIComponent(username) + '&select=id&limit=1');
    if (bookings && bookings.length > 0) { const r = await unlockAchievement(username, 'first_meeting'); if (r.unlocked) newAchievements.push(r.achievement); }
    const interactions = await sb('interacciones?username=eq.' + encodeURIComponent(username) + '&select=id&limit=1');
    if (interactions && interactions.length > 0) { const r = await unlockAchievement(username, 'first_message'); if (r.unlocked) newAchievements.push(r.achievement); }
  } catch (e) {}
  return newAchievements;
}

async function getScripts() {
  const rows = await sb('script_bank?active=eq.true&order=category.asc,sort_order.asc');
  return rows || [];
}

async function getDashboardData(username) {
  const now = new Date();
  const todayStart = now.toISOString().slice(0, 10) + 'T00:00:00Z';
  const weekStart = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + 'T00:00:00Z';
  const monthStart = now.toISOString().slice(0, 7) + '-01T00:00:00Z';
  const [todayInteractions, weekBookings, monthCloses, progress, achievements] = await Promise.all([
    sb('interacciones?username=eq.' + encodeURIComponent(username) + '&created_at=gte.' + todayStart + '&select=id').catch(() => []),
    sb('bookings?username=eq.' + encodeURIComponent(username) + '&fecha_iso=gte.' + weekStart + '&status=eq.activa&select=id').catch(() => []),
    sb('prospectos?username=eq.' + encodeURIComponent(username) + '&etapa=eq.cerrado_ganado&updated_at=gte.' + monthStart + '&select=id').catch(() => []),
    getProgress(username).catch(() => null),
    getAchievements(username).catch(() => [])
  ]);
  return { contactsToday: todayInteractions ? todayInteractions.length : 0, meetingsThisWeek: weekBookings ? weekBookings.length : 0, closesThisMonth: monthCloses ? monthCloses.length : 0, onboarding: progress, achievementCount: achievements ? achievements.length : 0, totalAchievements: Object.keys(ACHIEVEMENT_DEFS).length };
}

async function getCoachContext(username) {
  const [progress, prospects, achievements] = await Promise.all([
    getProgress(username).catch(() => null),
    sb('prospectos?username=eq.' + encodeURIComponent(username) + '&select=id,nombre,etapa,temperatura,updated_at&order=updated_at.desc&limit=10').catch(() => []),
    getAchievements(username).catch(() => [])
  ]);
  const prospectCount = prospects ? prospects.length : 0;
  const hotProspects = prospects ? prospects.filter(p => p.temperatura >= 70) : [];
  const staleProspects = prospects ? prospects.filter(p => { const d = (Date.now() - new Date(p.updated_at).getTime()) / 864e5; return d > 2 && !['cerrado_ganado','cerrado_perdido'].includes(p.etapa); }) : [];
  return { onboardingDay: progress ? progress.current_day : 0, onboardingTasks: progress ? progress.tasks : {}, prospectCount, hotProspects: hotProspects.length, staleProspects: staleProspects.map(p => p.nombre), achievementsUnlocked: achievements ? achievements.map(a => a.achievement_id) : [], isNewUser: !progress || Object.keys(progress.tasks || {}).length < 3 };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { image_base64, suit_color, shirt_color, tie_option, gender } = req.body || {};
    if (image_base64) return handlePhotoGeneration(req, res, image_base64, suit_color, shirt_color, tie_option, gender);
    const { action, username } = req.body || {};
    if (!action) return res.status(400).json({ error: 'Missing action' });
    if (action === 'setup') return handleSetup(req, res);
    if (!username) return res.status(400).json({ error: 'Missing username' });
    if (action === 'getProgress') {
      const progress = await getProgress(username);
      if (!progress) { const init = await initProgress(username); const r1 = await unlockAchievement(username, 'first_login'); return res.status(200).json({ progress: init, newAchievement: r1.unlocked ? r1.achievement : null }); }
      return res.status(200).json({ progress });
    }
    if (action === 'completeTask') { const { taskId } = req.body; if (!taskId) return res.status(400).json({ error: 'Missing taskId' }); return res.status(200).json(await completeTask(username, taskId)); }
    if (action === 'saveLaunchData') { return res.status(200).json({ ok: true, progress: await saveLaunchData(username, req.body) }); }
    if (action === 'getAchievements') { return res.status(200).json({ achievements: await getAchievements(username), definitions: ACHIEVEMENT_DEFS }); }
    if (action === 'unlockAchievement') { const { achievementId } = req.body; if (!achievementId) return res.status(400).json({ error: 'Missing achievementId' }); return res.status(200).json(await unlockAchievement(username, achievementId)); }
    if (action === 'checkAchievements') { return res.status(200).json({ newAchievements: await checkAutoAchievements(username) }); }
    if (action === 'getDashboard') { return res.status(200).json(await getDashboardData(username)); }
    if (action === 'getCoachContext') { return res.status(200).json(await getCoachContext(username)); }
    if (action === 'getScripts') { return res.status(200).json({ scripts: await getScripts() }); }
    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// ── PHOTO GENERATION V3: Face is MECHANICALLY preserved, NEVER processed by AI ──
async function handlePhotoGeneration(req, res, image_base64, suit_color, shirt_color, tie_option, gender) {
  var OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  try {
    var base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    var imageBuffer = Buffer.from(base64Data, 'base64');

    var suitName = SUIT_COLORS[suit_color] || 'dark navy blue';
    var shirtName = SHIRT_COLORS[shirt_color] || 'white';
    var isFemale = gender === 'female';
    var wantsTie = tie_option === 'yes' && !isFemale;

    var clothingDesc;
    if (isFemale) clothingDesc = suitName + " women's executive blazer with " + shirtName + ' blouse';
    else if (wantsTie) clothingDesc = suitName + " men's suit jacket, " + shirtName + ' dress shirt, matching tie in Windsor knot';
    else clothingDesc = suitName + " men's suit jacket, " + shirtName + ' dress shirt with open collar, no tie';

    var SIZE = 1024;

    // ── Step 1: Resize user photo to 1024×1024, get raw RGBA pixels ──
    var userRaw = await sharp(imageBuffer)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'top' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    var userPixels = Buffer.from(userRaw.data);

    // ── Step 2: Create PNG with face opaque + body transparent ──
    var FACE_END = Math.round(SIZE * 0.50);
    var GRAD = 40;

    var editPixels = Buffer.from(userPixels);
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var aIdx = (y * SIZE + x) * 4 + 3;
        if (y > FACE_END + GRAD) {
          editPixels[aIdx] = 0;
        } else if (y > FACE_END) {
          editPixels[aIdx] = Math.round(255 * (1 - (y - FACE_END) / GRAD));
        }
      }
    }

    var pngBuffer = await sharp(editPixels, {
      raw: { width: SIZE, height: SIZE, channels: 4 }
    }).png().toBuffer();

    // ── Step 3: Send to OpenAI edit (image carries its own alpha mask) ──
    var prompt = clothingDesc + '. Solid clean light gray studio background. Professional corporate portrait, photorealistic, studio lighting.';

    var boundary = '----FB' + Date.now().toString(16);
    function tp(n, v) { return '--' + boundary + '\r\nContent-Disposition: form-data; name="' + n + '"\r\n\r\n' + v; }
    function fp(n, fn, buf, ct) {
      var h = '--' + boundary + '\r\nContent-Disposition: form-data; name="' + n + '"; filename="' + fn + '"\r\nContent-Type: ' + (ct || 'image/png') + '\r\n\r\n';
      return Buffer.concat([Buffer.from(h, 'utf-8'), buf, Buffer.from('\r\n', 'utf-8')]);
    }

    var textParts = [tp('model', 'gpt-image-1'), tp('prompt', prompt), tp('size', '1024x1024'), tp('quality', 'high')].join('\r\n') + '\r\n';
    var bodyParts = [Buffer.from(textParts, 'utf-8'), fp('image', 'photo.png', pngBuffer, 'image/png')];
    bodyParts.push(Buffer.from('--' + boundary + '--\r\n', 'utf-8'));

    var response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: Buffer.concat(bodyParts)
    });

    var aiData = await response.json();
    if (!aiData.data || !aiData.data[0]) {
      return res.status(response.status).json({ success: false, error: aiData.error ? aiData.error.message : 'OpenAI returned no image', raw: aiData });
    }

    var aiImgBuf;
    if (aiData.data[0].b64_json) {
      aiImgBuf = Buffer.from(aiData.data[0].b64_json, 'base64');
    } else if (aiData.data[0].url) {
      var dl = await fetch(aiData.data[0].url);
      aiImgBuf = Buffer.from(await dl.arrayBuffer());
    } else {
      return res.status(500).json({ success: false, error: 'No image data in AI response' });
    }

    // ── Step 4: FORCE original face onto AI result (pixel-level guarantee) ──
    var aiRaw = await sharp(aiImgBuf)
      .resize(SIZE, SIZE, { fit: 'cover' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    var aiPixels = Buffer.from(aiRaw.data);

    var BLEND_START = FACE_END - 10;
    var BLEND_END = FACE_END + 60;

    for (var y2 = 0; y2 < SIZE; y2++) {
      for (var x2 = 0; x2 < SIZE; x2++) {
        var idx = (y2 * SIZE + x2) * 4;
        if (y2 < BLEND_START) {
          aiPixels[idx]     = userPixels[idx];
          aiPixels[idx + 1] = userPixels[idx + 1];
          aiPixels[idx + 2] = userPixels[idx + 2];
          aiPixels[idx + 3] = 255;
        } else if (y2 < BLEND_END) {
          var t = (y2 - BLEND_START) / (BLEND_END - BLEND_START);
          aiPixels[idx]     = Math.round(userPixels[idx] * (1 - t) + aiPixels[idx] * t);
          aiPixels[idx + 1] = Math.round(userPixels[idx + 1] * (1 - t) + aiPixels[idx + 1] * t);
          aiPixels[idx + 2] = Math.round(userPixels[idx + 2] * (1 - t) + aiPixels[idx + 2] * t);
          aiPixels[idx + 3] = 255;
        }
      }
    }

    // ── Step 5: Encode final composited image ──
    var finalImage = await sharp(aiPixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
      .jpeg({ quality: 92 })
      .toBuffer();

    return res.status(200).json({ success: true, image_b64: finalImage.toString('base64'), image_url: null });

  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error generating photo', details: error.message });
  }
}
