// Onboarding & Achievements API — SKYTEAM V2
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

// ── PHOTO GENERATION V10: Inpainting Pipeline (SAM3 + Sharp + FLUX Fill) ──
// La cara NUNCA se toca — se protege con máscara negra
// Paso 1: SAM3 segmenta cara → máscara face=blanco
// Paso 2: Sharp invierte → face=negro (protegido), resto=blanco (inpaint)
// Paso 3: FLUX Pro Fill repinta ropa + fondo sobre la máscara
// Costo: ~$0.05/imagen vs $1.12 con OpenAI
const sharp = require('sharp');
const SUIT_COLORS = {
  '#1a1a2e': 'dark navy blue', '#0a3d62': 'royal blue', '#2d2d2d': 'charcoal gray',
  '#4a0e0e': 'deep burgundy wine', '#0d0d0d': 'black', '#1b4332': 'dark forest green',
  '#3d2b1f': 'dark brown chocolate', '#c4a35a': 'beige golden tan',
  '#c2185b': 'fuchsia pink', '#e91e90': 'hot pink rose'
};

// ── ESTILOS DE TRAJE ──
const SUIT_STYLES = {
  'clasico': {
    label: 'Cl\u00e1sico',
    desc_m: 'traditional corporate suit, conservative fit, classic lapels',
    desc_f: 'traditional corporate blazer, conservative fit, classic lapels'
  },
  'elegante': {
    label: 'Elegante',
    desc_m: 'premium executive suit, tailored fit, peak lapels, luxury fabric texture',
    desc_f: 'premium executive blazer, tailored fit, structured shoulders, luxury fabric texture'
  },
  'juvenil': {
    label: 'Juvenil',
    desc_m: 'modern slim-fit Dior-style suit, narrow lapels, fitted silhouette, fashion-forward contemporary design',
    desc_f: 'modern slim-fit Dior-style blazer, cropped cut, fashion-forward contemporary design, trendy silhouette'
  }
};
const SHIRT_COLORS = {
  '#FFFFFF': 'white', '#D6EAF8': 'light blue', '#FADBD8': 'pale pink',
  '#F9E79F': 'soft yellow', '#D5F5E3': 'mint green', '#E8DAEF': 'lavender',
  '#F0F0F0': 'light gray', '#1a1a2e': 'black'
};



async function sb(path, opts = {}) {
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: SB_HEADERS, ...opts, signal: ac.signal });
    clearTimeout(tm);
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  } catch(e) { clearTimeout(tm); throw e; }
}

// ── SETUP: Create tables if not exist ──
async function handleSetup(req, res) {
  const { adminKey } = req.body || {};
  if (adminKey !== process.env.ADMIN_PUSH_KEY) return res.status(401).json({ error: 'Unauthorized' });

  // Create tables via Supabase SQL API
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS onboarding_progress (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      username TEXT NOT NULL,
      current_day INT DEFAULT 1,
      tasks JSONB DEFAULT '{}',
      launch_date DATE,
      launch_photo_url TEXT,
      launch_flyer_data JSONB DEFAULT '{}',
      pro_photo_url TEXT,
      started_at TIMESTAMPTZ DEFAULT now(),
      completed_at TIMESTAMPTZ,
      UNIQUE(username)
    )`,
    `CREATE TABLE IF NOT EXISTS achievements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      username TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(username, achievement_id)
    )`,
    `CREATE TABLE IF NOT EXISTS script_bank (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      active BOOLEAN DEFAULT true
    )`
  ];

  const results = [];
  for (const sql of sqlStatements) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/', {
        method: 'POST',
        headers: { ...SB_HEADERS, 'Content-Profile': 'public' },
        body: JSON.stringify({ query: sql })
      });
      results.push({ sql: sql.substring(0, 50), status: r.status });
    } catch (e) {
      results.push({ sql: sql.substring(0, 50), error: e.message });
    }
  }

  return res.status(200).json({ ok: true, results, note: 'If RPC fails, create tables manually in Supabase SQL Editor' });
}

// ── GET PROGRESS ──
async function getProgress(username) {
  const rows = await sb('onboarding_progress?username=eq.' + encodeURIComponent(username) + '&limit=1');
  return rows && rows[0] ? rows[0] : null;
}

// ── INIT PROGRESS (first time) ──
async function initProgress(username) {
  const existing = await getProgress(username);
  if (existing) return existing;

  const row = await sb('onboarding_progress', {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({
      username,
      current_day: 1,
      tasks: {},
      started_at: new Date().toISOString()
    })
  });
  return row && row[0] ? row[0] : row;
}

// ── UPDATE TASK ──
async function completeTask(username, taskId) {
  let progress = await getProgress(username);
  if (!progress) progress = await initProgress(username);

  const tasks = progress.tasks || {};
  if (tasks[taskId]) return { progress, alreadyDone: true }; // Already completed

  tasks[taskId] = new Date().toISOString();

  // Calculate current day based on completed tasks
  // Day 5 = Launch Day (moved from day 6 per Yonfer's request)
  const dayTasks = {
    1: ['d1_tour', 'd1_video', 'd1_pwa', 'd1_photo'],
    2: ['d2_photo', 'd2_bio', 'd2_push'],
    3: ['d3_scripts', 'd3_personaliza', 'd3_practica'],
    4: ['d4_lista', 'd4_enviar', 'd4_seguimiento'],
    5: ['d5_agenda', 'd5_guion', 'd5_seguimiento'],
    6: ['d6_landing', 'd6_flyer', 'd6_post'],
    7: ['d7_seguimiento', 'd7_cierre', 'd7_plan']
  };

  let maxCompletedDay = 0;
  for (let day = 1; day <= 7; day++) {
    const allDone = dayTasks[day].every(t => tasks[t]);
    if (allDone) maxCompletedDay = day;
    else break;
  }

  const currentDay = Math.min(maxCompletedDay + 1, 7);
  const completedAt = maxCompletedDay >= 7 ? new Date().toISOString() : null;

  const updated = await sb('onboarding_progress?username=eq.' + encodeURIComponent(username), {
    method: 'PATCH',
    body: JSON.stringify({ tasks, current_day: currentDay, completed_at: completedAt })
  });

  return { progress: updated && updated[0] ? updated[0] : { ...progress, tasks, current_day: currentDay }, newTask: taskId };
}

// ── SAVE LAUNCH DATA ──
async function saveLaunchData(username, data) {
  const { launch_date, launch_photo_url, pro_photo_url, launch_flyer_data } = data;
  const patch = {};
  if (launch_date) patch.launch_date = launch_date;
  if (launch_photo_url) patch.launch_photo_url = launch_photo_url;
  if (pro_photo_url) patch.pro_photo_url = pro_photo_url;
  if (launch_flyer_data) patch.launch_flyer_data = launch_flyer_data;

  const updated = await sb('onboarding_progress?username=eq.' + encodeURIComponent(username), {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
  return updated && updated[0] ? updated[0] : null;
}

// ── ACHIEVEMENTS ──

const ACHIEVEMENT_DEFS = {
  first_login: { name: 'Primer paso', icon: '🚀', msg: '¡Bienvenido al equipo! Tu camino comienza aquí.' },
  photo_pro: { name: 'Imagen profesional', icon: '📸', msg: '¡Tu imagen profesional está lista! Primera impresión es todo.' },
  first_prospect: { name: 'Cazador de prospectos', icon: '🎯', msg: '¡Agregaste tu primer prospecto! Ya empezaste a construir tu negocio.' },
  ten_prospects: { name: 'Lista de oro', icon: '🏆', msg: '¡10 prospectos! Tu pipeline está tomando forma.' },
  first_message: { name: 'Rompehielos', icon: '💬', msg: '¡Enviaste tu primer mensaje! La acción es lo que genera resultados.' },
  launch_ready: { name: 'Listo para lanzar', icon: '🎨', msg: '¡Tu material de lanzamiento está listo! Es hora de brillar.' },
  launched: { name: '¡Lanzado!', icon: '🚀', msg: '¡FELICIDADES! Oficialmente lanzaste tu negocio. Esto es solo el comienzo.' },
  first_meeting: { name: 'Cerrando puertas', icon: '📅', msg: '¡Tu primera reunión agendada! Estás a un paso del cierre.' },
  first_close: { name: 'Primera venta', icon: '💰', msg: '¡PRIMERA VENTA! Lo que parecía imposible ya es REAL. ¡Sigue así!' },
  streak_3: { name: 'Constancia', icon: '🔥', msg: '3 días consecutivos activo. La consistencia es la clave del éxito.' },
  streak_7: { name: 'Imparable', icon: '⚡', msg: '¡7 días sin parar! Eres parte del top 10% del equipo.' },
  hot_pipeline: { name: 'Pipeline caliente', icon: '🌡️', msg: '¡5 prospectos calientes! Tu embudo está on fire.' }
};

async function getAchievements(username) {
  const rows = await sb('achievements?username=eq.' + encodeURIComponent(username) + '&order=unlocked_at.desc');
  return rows || [];
}

async function unlockAchievement(username, achievementId) {
  if (!ACHIEVEMENT_DEFS[achievementId]) return { error: 'Unknown achievement' };

  // Check if already unlocked
  const existing = await sb('achievements?username=eq.' + encodeURIComponent(username) + '&achievement_id=eq.' + encodeURIComponent(achievementId) + '&limit=1');
  if (existing && existing.length > 0) return { alreadyUnlocked: true };

  const row = await sb('achievements', {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ username, achievement_id: achievementId, unlocked_at: new Date().toISOString() })
  });

  return { unlocked: true, achievement: ACHIEVEMENT_DEFS[achievementId], data: row && row[0] ? row[0] : null };
}

// ── AUTO-CHECK ACHIEVEMENTS ──
async function checkAutoAchievements(username) {
  const newAchievements = [];

  // Check prospect count
  try {
    const prospects = await sb('prospectos?username=eq.' + encodeURIComponent(username) + '&select=id');
    if (prospects) {
      if (prospects.length >= 1) {
        const r = await unlockAchievement(username, 'first_prospect');
        if (r.unlocked) newAchievements.push(r.achievement);
      }
      if (prospects.length >= 10) {
        const r = await unlockAchievement(username, 'ten_prospects');
        if (r.unlocked) newAchievements.push(r.achievement);
      }
    }

    // Check hot pipeline (temp >= 70)
    const hot = await sb('prospectos?username=eq.' + encodeURIComponent(username) + '&temperatura=gte.70&etapa=not.in.(cerrado_ganado,cerrado_perdido)&select=id');
    if (hot && hot.length >= 5) {
      const r = await unlockAchievement(username, 'hot_pipeline');
      if (r.unlocked) newAchievements.push(r.achievement);
    }

    // Check first close
    const closes = await sb('prospectos?username=eq.' + encodeURIComponent(username) + '&etapa=eq.cerrado_ganado&select=id&limit=1');
    if (closes && closes.length > 0) {
      const r = await unlockAchievement(username, 'first_close');
      if (r.unlocked) newAchievements.push(r.achievement);
    }

    // Check first meeting (booking)
    const bookings = await sb('bookings?username=eq.' + encodeURIComponent(username) + '&select=id&limit=1');
    if (bookings && bookings.length > 0) {
      const r = await unlockAchievement(username, 'first_meeting');
      if (r.unlocked) newAchievements.push(r.achievement);
    }

    // Check interactions (first message)
    const interactions = await sb('interacciones?username=eq.' + encodeURIComponent(username) + '&select=id&limit=1');
    if (interactions && interactions.length > 0) {
      const r = await unlockAchievement(username, 'first_message');
      if (r.unlocked) newAchievements.push(r.achievement);
    }
  } catch (e) {
    // Non-critical, just skip
  }

  return newAchievements;
}

// ── SCRIPT BANK ──
async function getScripts() {
  const rows = await sb('script_bank?active=eq.true&order=category.asc,sort_order.asc');
  return rows || [];
}

// ── SIMPLIFIED DASHBOARD DATA ──
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

  return {
    contactsToday: todayInteractions ? todayInteractions.length : 0,
    meetingsThisWeek: weekBookings ? weekBookings.length : 0,
    closesThisMonth: monthCloses ? monthCloses.length : 0,
    onboarding: progress,
    achievementCount: achievements ? achievements.length : 0,
    totalAchievements: Object.keys(ACHIEVEMENT_DEFS).length
  };
}

// ── COACH CONTEXT ──
async function getCoachContext(username) {
  const [progress, prospects, achievements] = await Promise.all([
    getProgress(username).catch(() => null),
    sb('prospectos?username=eq.' + encodeURIComponent(username) + '&select=id,nombre,etapa,temperatura,updated_at&order=updated_at.desc&limit=10').catch(() => []),
    getAchievements(username).catch(() => [])
  ]);

  const prospectCount = prospects ? prospects.length : 0;
  const hotProspects = prospects ? prospects.filter(p => p.temperatura >= 70) : [];
  const staleProspects = prospects ? prospects.filter(p => {
    const daysSince = (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 2 && !['cerrado_ganado', 'cerrado_perdido'].includes(p.etapa);
  }) : [];

  return {
    onboardingDay: progress ? progress.current_day : 0,
    onboardingTasks: progress ? progress.tasks : {},
    prospectCount,
    hotProspects: hotProspects.length,
    staleProspects: staleProspects.map(p => p.nombre),
    achievementsUnlocked: achievements ? achievements.map(a => a.achievement_id) : [],
    isNewUser: !progress || Object.keys(progress.tasks || {}).length < 3
  };
}

// ══════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    // Route photo generation requests (from /api/photo rewrite)
  const { image_base64, suit_color, shirt_color, tie_option, gender, style, username: photoUser } = req.body || {};
  if (image_base64) {
    // \u2500\u2500 L\u00edmite de 3 fotos por usuario \u2500\u2500
    const MAX_PHOTOS = 3;
    if (photoUser) {
      try {
        const progress = await getProgress(photoUser);
        const count = (progress && progress.tasks && progress.tasks._photo_gen_count) || 0;
        if (count >= MAX_PHOTOS) {
          return res.status(429).json({
            success: false,
            error: 'Has alcanzado el l\u00edmite de ' + MAX_PHOTOS + ' fotos profesionales.',
            photo_count: count,
            max: MAX_PHOTOS
          });
        }
      } catch (e) { /* Si falla la verificaci\u00f3n, dejamos pasar */ }
    }
    return handlePhotoGeneration(req, res, image_base64, suit_color, shirt_color, tie_option, gender, style || 'clasico', photoUser);
  }

  const { action, username } = req.body || {};
    if (!action) return res.status(400).json({ error: 'Missing action' });

    // Setup (admin only)
    if (action === 'setup') return handleSetup(req, res);

    // All other actions require username
    if (!username) return res.status(400).json({ error: 'Missing username' });

    // Onboarding
    if (action === 'getProgress') {
      const progress = await getProgress(username);
      if (!progress) {
        const init = await initProgress(username);
        const r1 = await unlockAchievement(username, 'first_login');
        return res.status(200).json({ progress: init, newAchievement: r1.unlocked ? r1.achievement : null });
      }
      return res.status(200).json({ progress });
    }

    if (action === 'completeTask') {
      const { taskId } = req.body;
      if (!taskId) return res.status(400).json({ error: 'Missing taskId' });
      const result = await completeTask(username, taskId);
      return res.status(200).json(result);
    }

    if (action === 'saveLaunchData') {
      const result = await saveLaunchData(username, req.body);
      return res.status(200).json({ ok: true, progress: result });
    }

    // Achievements
    if (action === 'getAchievements') {
      const achs = await getAchievements(username);
      const defs = ACHIEVEMENT_DEFS;
      return res.status(200).json({ achievements: achs, definitions: defs });
    }

    if (action === 'unlockAchievement') {
      const { achievementId } = req.body;
      if (!achievementId) return res.status(400).json({ error: 'Missing achievementId' });
      const result = await unlockAchievement(username, achievementId);
      return res.status(200).json(result);
    }

    if (action === 'checkAchievements') {
      const newOnes = await checkAutoAchievements(username);
      return res.status(200).json({ newAchievements: newOnes });
    }

    // Dashboard
    if (action === 'getDashboard') {
      const data = await getDashboardData(username);
      return res.status(200).json(data);
    }

    // Coach context
    if (action === 'getCoachContext') {
      const ctx = await getCoachContext(username);
      return res.status(200).json(ctx);
    }

    // Scripts
    if (action === 'getScripts') {
      const scripts = await getScripts();
      return res.status(200).json({ scripts });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ── Photo Generation Handler V10: Inpainting Pipeline ──
// CARA INTOCABLE — pixel-perfect preservation
// Pipeline: SAM3 (face mask) → Sharp (invert) → FLUX Pro Fill (inpaint clothing + bg)
// La IA NUNCA genera ni un solo píxel de la cara — queda exactamente igual
async function handlePhotoGeneration(req, res, image_base64, suit_color, shirt_color, tie_option, gender, style, photoUser) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured' });

  const falHeaders = {
    'Authorization': 'Key ' + FAL_KEY,
    'Content-Type': 'application/json'
  };

  try {
    // Extraer base64 puro
    let rawBase64 = image_base64;
    if (rawBase64.startsWith('data:')) {
      rawBase64 = rawBase64.split(',')[1];
    }
    // ── PRE-PROCESO: Redimensionar para que SAM3 y FLUX trabajen bien ──
    // Selfies de celular llegan en 3000-4000px, SAM3 falla con imágenes muy grandes
    const imgBuffer = Buffer.from(rawBase64, 'base64');
    const resized = await sharp(imgBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
    const resizedB64 = resized.toString('base64');
    const imageDataUri = 'data:image/jpeg;base64,' + resizedB64;

    // ════════════════════════════════════════════
    // PASO 1: Segmentar cara con SAM3
    // Resultado: máscara donde cara=blanco, resto=negro
    // ════════════════════════════════════════════
    const sam3Res = await fetch('https://fal.run/fal-ai/sam-3/image', {
      method: 'POST',
      headers: falHeaders,
      body: JSON.stringify({
        image_url: imageDataUri,
        prompt: 'face, mouth, chin, jaw, neck, head, hair',
        output_format: 'png',
        apply_mask: false,
        return_multiple_masks: false
      })
    });

    if (!sam3Res.ok) {
      const errText = await sam3Res.text().catch(function() { return ''; });
      return res.status(500).json({
        success: false,
        error: 'SAM3 segmentation failed (' + sam3Res.status + ')',
        details: errText.substring(0, 500)
      });
    }

    const sam3Data = await sam3Res.json();
    // SAM3 response format varía: { image: {url}, masks: [{url}] } o variantes
    var faceMaskUrl = null;
    if (sam3Data.masks && sam3Data.masks.length > 0) {
      faceMaskUrl = sam3Data.masks[0].url || (typeof sam3Data.masks[0] === 'string' ? sam3Data.masks[0] : null);
    }
    if (!faceMaskUrl && sam3Data.image) {
      faceMaskUrl = sam3Data.image.url || (typeof sam3Data.image === 'string' ? sam3Data.image : null);
    }
    if (!faceMaskUrl && sam3Data.output) {
      faceMaskUrl = sam3Data.output.url || (typeof sam3Data.output === 'string' ? sam3Data.output : null);
    }
    if (!faceMaskUrl && sam3Data.result) {
      faceMaskUrl = sam3Data.result.url || (typeof sam3Data.result === 'string' ? sam3Data.result : null);
    }

    if (!faceMaskUrl) {
      // ── FALLBACK: Reintentar SAM3 con prompt más simple ──
      const sam3Retry = await fetch('https://fal.run/fal-ai/sam-3/image', {
        method: 'POST',
        headers: falHeaders,
        body: JSON.stringify({
          image_url: imageDataUri,
          prompt: 'person face',
          output_format: 'png',
          return_multiple_masks: false
        })
      });
      if (sam3Retry.ok) {
        const retryData = await sam3Retry.json();
        if (retryData.masks && retryData.masks.length > 0) {
          faceMaskUrl = retryData.masks[0].url || retryData.masks[0];
        } else if (retryData.image) {
          faceMaskUrl = retryData.image.url || retryData.image;
        }
      }
    }

    if (!faceMaskUrl) {
      return res.status(500).json({
        success: false,
        error: 'SAM3 returned no face mask',
        debug: {
          keys: Object.keys(sam3Data),
          masks: sam3Data.masks ? sam3Data.masks.length : 0,
          hasImage: !!sam3Data.image,
          sample: JSON.stringify(sam3Data).substring(0, 300)
        }
      });
    }

    // ════════════════════════════════════════════
    // PASO 2: Descargar máscara e invertir con Sharp
    // face=blanco → face=NEGRO (protegido)
    // resto=negro → resto=BLANCO (inpaint)
    // ════════════════════════════════════════════
    const maskDownload = await fetch(faceMaskUrl);
    if (!maskDownload.ok) {
      return res.status(500).json({
        success: false,
        error: 'Failed to download face mask from SAM3'
      });
    }
    const maskBuffer = Buffer.from(await maskDownload.arrayBuffer());

    // Invertir + DILATAR: expandir máscara 30px para cubrir bordes cuello/hombros
    // Evita artefactos del fondo original en los bordes de la cara
    const dilateKernel = 30;
    const invertedMaskBuffer = await sharp(maskBuffer)
      .negate({ alpha: false })
      .threshold(128)
      .blur(dilateKernel)
      .threshold(20)
      .png()
      .toBuffer();

    const invertedMaskB64 = invertedMaskBuffer.toString('base64');
    const maskDataUri = 'data:image/png;base64,' + invertedMaskB64;

    // ════════════════════════════════════════════
    // PASO 3: FLUX Pro Fill — inpaint ropa + fondo
    // Negro = protegido (cara intacta)
    // Blanco = regenerar (ropa + fondo)
    // ════════════════════════════════════════════
    const suitName = SUIT_COLORS[suit_color] || 'dark navy blue';
    const shirtName = SHIRT_COLORS[shirt_color] || 'white';
    const isFemale = gender === 'female';
    const wantsTie = tie_option === 'yes' && !isFemale;
    const suitStyle = SUIT_STYLES[style] || SUIT_STYLES['clasico'];
    const styleDesc = isFemale ? suitStyle.desc_f : suitStyle.desc_m;

    var clothingDesc;
    if (isFemale) {
      clothingDesc = suitName + ' ' + styleDesc + ' fully buttoned, worn over ' + shirtName + ' silk blouse with high neckline, formal and conservative business attire';
    } else if (wantsTie) {
      clothingDesc = suitName + ' ' + styleDesc + ', ' + shirtName + ' dress shirt buttoned to neck, ' + suitName + ' tie in Windsor knot';
    } else {
      clothingDesc = suitName + ' ' + styleDesc + ', ' + shirtName + ' dress shirt with open collar, no tie';
    }

    var fillPrompt = 'Professional corporate headshot photograph, studio portrait. ' +
      'Person wearing ' + clothingDesc + '. ' +
      'Clean solid uniform dark charcoal gray backdrop, no patterns, no objects, no text. ' +
      'Half-body portrait from waist up, centered composition, arms naturally posed. ' +
      'Professional studio lighting, soft key light, subtle fill light, sharp focus. ' +
      'No watermarks, no logos, no text, no words, no letters, no captions, no overlay graphics.';

    const fillRes = await fetch('https://fal.run/fal-ai/flux-pro/v1/fill', {
      method: 'POST',
      headers: falHeaders,
      body: JSON.stringify({
        prompt: fillPrompt,
        image_url: imageDataUri,
        mask_url: maskDataUri,
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: 6
      })
    });

    if (!fillRes.ok) {
      const errText = await fillRes.text().catch(function() { return ''; });
      return res.status(500).json({
        success: false,
        error: 'FLUX Fill inpainting failed (' + fillRes.status + ')',
        details: errText.substring(0, 500)
      });
    }

    const fillData = await fillRes.json();

    if (!fillData.images || !fillData.images[0] || !fillData.images[0].url) {
      return res.status(500).json({
        success: false,
        error: 'FLUX Fill returned no image',
        debug: { keys: Object.keys(fillData), images: fillData.images ? fillData.images.length : 0 }
      });
    }

    // Descargar imagen resultado y convertir a base64
    const resultDownload = await fetch(fillData.images[0].url);
    const resultBuffer = Buffer.from(await resultDownload.arrayBuffer());
    const resultB64 = resultBuffer.toString('base64');

    // Incrementar contador de fotos
    var newCount = 1;
    if (photoUser) {
      try {
        var prog = await getProgress(photoUser);
        if (prog) {
          var tasks = prog.tasks || {};
          newCount = (tasks._photo_gen_count || 0) + 1;
          tasks._photo_gen_count = newCount;
          await sb('onboarding_progress?username=eq.' + encodeURIComponent(photoUser), {
            method: 'PATCH',
            body: JSON.stringify({ tasks })
          });
        }
      } catch (e) { /* Non-critical */ }
    }

    return res.status(200).json({
      success: true,
      image_b64: resultB64,
      image_url: fillData.images[0].url,
      photo_count: newCount,
      max_photos: 3,
      pipeline: 'V10-inpaint',
      cost_estimate: '$0.05'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error generating photo V10 (Inpainting Pipeline)',
      details: error.message
    });
  }
}
