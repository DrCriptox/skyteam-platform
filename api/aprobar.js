// Supabase-powered aprobar (approve) API
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

// Rate limiting: max 30 registrations per IP per 5 minutes (high for launch events)
const _regRateMap = {};
function _checkRateLimit(ip) {
  const now = Date.now();
  if (!_regRateMap[ip]) _regRateMap[ip] = [];
  _regRateMap[ip] = _regRateMap[ip].filter(t => now - t < 300000);
  if (_regRateMap[ip].length >= 30) return false;
  _regRateMap[ip].push(now);
  return true;
}

// Fetch with timeout (15s)
async function sbFetch(url, opts) {
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(url, { ...opts, signal: ac.signal });
    clearTimeout(tm);
    return r;
  } catch(e) { clearTimeout(tm); throw e; }
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 32).toString('hex');
  return salt + ':' + hash;
}

// Map Innova "Clasificación Actual" text → platform rank number (0–8)
// 0=Cliente, 1=INN200, 2=INN500, 3=NOVA1500, 4=NOVA5K, 5=NOVA10K, 6=NOVA DIAMOND(25K), 7=NOVA50K, 8=NOVA100K
function mapInnovaRank(classification) {
  if (!classification) return 0;
  const c = classification.toUpperCase().trim().replace(/\s+/g, ' ').replace(/[^A-Z0-9 ]/g, '');
  console.log('[RANK] Mapping: "' + c + '"');
  if (c.includes('100K'))                                    return 8;
  if (c.includes('50K'))                                     return 7;
  if (c.includes('DIAMOND') || c.includes('DIAMANTE') || c.includes('25K')) return 6;
  if (c.includes('10K'))                                     return 5;
  if (c.includes('5K'))                                      return 4;
  if (c.includes('1500'))                                    return 3;
  // NOVA solo (sin número) = NOVA 1500, pero NO matchear INNOVA
  if (/\bNOVA\b/.test(c) && !c.includes('INNOVA'))          return 3;
  if (c.includes('500'))                                     return 2;
  if (c.includes('200'))                                     return 1;
  if (/\bINN\b/.test(c) && !c.includes('INNOVA'))           return 1;
  return 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting: 3 registrations per IP per 5 minutes
  const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!_checkRateLimit(clientIP)) {
    return res.status(429).json({ error: 'Demasiados registros desde esta IP. Espera unos minutos.' });
  }

  try {
    const { id, expiryTs, directData } = req.body;
    if (!id && !directData) return res.status(400).json({ error: 'Missing id or directData' });

    // Use directData if provided (auto-registration), otherwise lookup solicitud
    let sol;
    if (directData) {
      sol = directData; // { name, email, password, sponsor, innova_user, ref }
    } else {
      const sr = await sbFetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), { headers: HEADERS });
      if (!sr.ok) throw new Error('Supabase GET failed: ' + sr.status);
      const sols = await sr.json();
      if (!sols || sols.length === 0) return res.status(404).json({ error: 'Solicitud not found' });
      sol = sols[0];
    }

    // Validate password
    if (!sol.password || sol.password.length < 6) {
      return res.status(400).json({ error: 'Contraseña inválida o no proporcionada' });
    }
    if (sol.password.length > 200) {
      return res.status(400).json({ error: 'Contraseña demasiado larga' });
    }

    // Generate user credentials
    const rawUser = (sol.innova_user || sol.ref || String(id || Date.now()).slice(-6));
    const username = rawUser.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
    const primerNombre = sol.name ? sol.name.split(' ')[0] : 'Socio';
    const refLink = 'https://skyteam.global/landing?ref=' + (sol.ref || username);
    const password = hashPassword(sol.password); // Always hash before storing
    const rank = mapInnovaRank(sol.classification || null); // Auto-assign rank from Innova classification

    // ── Validate: username must NOT match sponsor (common OCR confusion) ──
    const sponsorClean0 = (sol.sponsor || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sponsorClean0 && username === sponsorClean0) {
      return res.status(400).json({ error: 'El usuario detectado ("' + username + '") es igual al patrocinador. Tu foto puede estar confundiendo los campos. Sube una captura donde se vea claramente TU usuario (debajo de tu nombre).' });
    }

    // Check innova_user count — max 2 sociedades per innova_user
    const innovaUser = (sol.innova_user || username).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
    const innovaCheck = await sbFetch(SUPABASE_URL + '/rest/v1/users?innova_user=eq.' + encodeURIComponent(innovaUser) + '&select=username,name,email', { headers: HEADERS });
    const innovaRows = await innovaCheck.json();
    const innovaCount = Array.isArray(innovaRows) ? innovaRows.length : 0;
    if (innovaCount >= 2) {
      return res.status(400).json({ error: 'Este usuario de Innova ya tiene 2 sociedades registradas. No se puede crear otra.' });
    }
    // If innova_user already has 1 account, verify it's the SAME person before creating "2" account
    let finalUsername = username;
    if (innovaCount === 1) {
      const existingUser = innovaRows[0];
      // Safety: the new registrant's name or email should partially match the existing account
      const existName = (existingUser.name || '').toLowerCase();
      const newName = (sol.name || '').toLowerCase();
      const existEmail = (existingUser.email || '').toLowerCase();
      const newEmail = (sol.email || '').toLowerCase();
      const nameMatch = newName && existName && (existName.includes(newName.split(' ')[0]) || newName.includes(existName.split(' ')[0]));
      const emailMatch = newEmail && existEmail && newEmail === existEmail;
      if (!nameMatch && !emailMatch) {
        return res.status(400).json({ error: 'El usuario "' + innovaUser + '" ya pertenece a ' + (existingUser.name || existingUser.username) + '. Si esta es tu segunda sociedad, tu nombre o email debe coincidir con la cuenta existente. Si no es tu usuario, sube una foto donde se vea claramente TU perfil de Innova.' });
      }
      finalUsername = username + '2';
    }

    // Check duplicate email (if provided)
    if (sol.email) {
      const emailClean = sol.email.toLowerCase().trim();
      const emailCheck = await sbFetch(SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(emailClean) + '&select=username&limit=1', { headers: HEADERS });
      const emailRows = await emailCheck.json();
      if (Array.isArray(emailRows) && emailRows.length > 0) {
        return res.status(400).json({ error: 'El email ' + emailClean + ' ya est\u00e1 registrado con el usuario "' + emailRows[0].username + '". Usa otro email.' });
      }
    }

    // Check duplicate WhatsApp (if provided)
    if (sol.whatsapp) {
      const waClean = sol.whatsapp.replace(/[^0-9]/g, '');
      if (waClean.length >= 8) {
        const waCheck = await sbFetch(SUPABASE_URL + '/rest/v1/users?whatsapp=like.*' + encodeURIComponent(waClean.slice(-8)) + '*&select=username&limit=1', { headers: HEADERS });
        const waRows = await waCheck.json();
        if (Array.isArray(waRows) && waRows.length > 0) {
          return res.status(400).json({ error: 'El WhatsApp ' + sol.whatsapp + ' ya est\u00e1 registrado con el usuario "' + waRows[0].username + '". Usa otro n\u00famero.' });
        }
      }
    }

    // Check if user already exists (prevent duplicates from race conditions)
    const existCheck = await sbFetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(finalUsername) + '&limit=1', { headers: HEADERS });
    const existUsers = await existCheck.json();
    if (existUsers && existUsers.length > 0) {
      // User already exists — just delete solicitud and return success
      await sbFetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: HEADERS });
      return res.status(200).json({ ok: true, username: finalUsername, nombre: sol.name, emailSent: false, refLink, alreadyExisted: true });
    }

    // Check if sponsor exists in DB — if not, assign to "legend" temporarily and save original
    let finalSponsor = sol.sponsor || null;
    let originalSponsor = null;
    if (finalSponsor) {
      const sponsorClean = finalSponsor.toLowerCase().trim();
      const sponsorCheck = await sbFetch(SUPABASE_URL + '/rest/v1/users?or=(username.eq.' + encodeURIComponent(sponsorClean) + ',ref.eq.' + encodeURIComponent(sponsorClean) + ')&select=username&limit=1', { headers: HEADERS });
      const sponsorRows = await sponsorCheck.json();
      if (!Array.isArray(sponsorRows) || sponsorRows.length === 0) {
        console.log('[APROBAR] Sponsor "' + finalSponsor + '" not found in DB — assigning to LEGEND temporarily');
        originalSponsor = finalSponsor; // save for later reassignment
        finalSponsor = 'LEGEND';
      }
    }

    // NOTE: solicitud deletion moved AFTER successful INSERT (prevents data loss on failure)

    // Create user in users table — try progressively minimal payloads if columns are missing
    // Migration grace: if expiry is past or null, give 8 days from now
    const { daysRemaining } = req.body || {};

    // Calculate expiry from BOTH sources and use the BEST one
    const expiryFromTs = expiryTs && expiryTs > Date.now() ? expiryTs : null;
    const expiryFromDays = (typeof daysRemaining === 'number' && daysRemaining > 0) ? Date.now() + (daysRemaining * 86400000) : null;

    let finalExpiry = null;
    if (expiryFromTs && expiryFromDays) {
      // Both available: use the one that gives MORE days (OCR can miscalculate either)
      finalExpiry = Math.max(expiryFromTs, expiryFromDays);
      console.log('[APROBAR] Both sources: ts=' + new Date(expiryFromTs).toISOString() + ' days=' + new Date(expiryFromDays).toISOString() + ' → using max:', new Date(finalExpiry).toISOString());
    } else {
      finalExpiry = expiryFromTs || expiryFromDays || null;
      if (finalExpiry) console.log('[APROBAR] Single source → expiry:', new Date(finalExpiry).toISOString());
    }

    // If still no valid expiry → give 7 days trial
    if (!finalExpiry || finalExpiry <= (Date.now() + 86400000)) {
      finalExpiry = Date.now() + (7 * 86400000);
      console.log('[APROBAR] Trial period: 7 days granted. Expiry:', new Date(finalExpiry).toISOString());
    }
    // Core: fields that MUST be in every INSERT attempt (never lose email, expiry, whatsapp)
    // ref MUST be unique per user — for 2nd account, use finalUsername (with "2" suffix) as ref
    const finalRef = innovaCount === 1 ? finalUsername : (sol.ref || finalUsername);
    const corePayload = { username: finalUsername, name: sol.name || null, sponsor: finalSponsor, ref: finalRef, password, expiry: finalExpiry, email: sol.email || null, whatsapp: sol.whatsapp || null, innova_user: innovaUser };
    const fullPayload = { ...corePayload, rank, birthday: sol.birthday || null, original_sponsor: originalSponsor, valor_inscripcion: sol.valor_inscripcion || null };
    const attempts = [
      fullPayload,                                                                                 // 1. all fields
      { ...fullPayload, original_sponsor: undefined },                                             // 2. no original_sponsor (column may not exist yet)
      { ...fullPayload, original_sponsor: undefined, birthday: undefined },                        // 3. no birthday
      { ...fullPayload, original_sponsor: undefined, birthday: undefined, rank: undefined },       // 4. no rank
      corePayload,                                                                                 // 5. core (email+expiry+whatsapp always present)
    ].map(o => Object.fromEntries(Object.entries(o).filter(([,v]) => v !== undefined)));
    let insertR = null;
    let insertAttemptIdx = 0;
    for (let i = 0; i < attempts.length; i++) {
      insertR = await sbFetch(SUPABASE_URL + '/rest/v1/users', {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(attempts[i])
      });
      if (insertR.ok) { insertAttemptIdx = i; console.log('[aprobar] INSERT succeeded on attempt', i + 1, 'fields:', Object.keys(attempts[i]).join(',')); break; }
      const errTxt = await insertR.text();
      console.error('[aprobar] INSERT attempt', i + 1, 'failed', insertR.status, errTxt.substring(0, 200));
      if (insertR.status !== 400 || i === attempts.length - 1) {
        throw new Error('No se pudo crear el usuario: ' + insertR.status + ' — ' + errTxt.substring(0, 120));
      }
    }

    // DELETE solicitud AFTER successful INSERT (data is safe now)
    if (!directData && id) {
      try { await sbFetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: HEADERS }); } catch(e) {}
    }

    // If INSERT succeeded on a fallback attempt that dropped original_sponsor,
    // try to PATCH it now so orphan reassignment can work later.
    if (originalSponsor && insertAttemptIdx > 0 && !attempts[insertAttemptIdx].original_sponsor) {
      try {
        await sbFetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(finalUsername), {
          method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({ original_sponsor: originalSponsor })
        });
        console.log('[aprobar] PATCH original_sponsor saved for', finalUsername, '→', originalSponsor);
      } catch(e) { console.warn('[aprobar] Could not save original_sponsor via PATCH:', e.message); }
    }

    // Auto-reassign orphaned users: if someone registered before their sponsor,
    // they were temporarily assigned to LEGEND with original_sponsor saved.
    // Now that this new user exists, check if anyone was waiting for them.
    const newUserRef = (sol.ref || finalUsername).toLowerCase();
    const newUserName = finalUsername.toLowerCase();
    try {
      // Build search terms: exact ref, exact username, and first+last name parts (min 4 chars)
      const searchTerms = new Set([newUserRef, newUserName]);
      if (sol.name) {
        sol.name.toLowerCase().split(/\s+/).forEach(function(p) {
          if (p.length >= 4) searchTerms.add(p);
        });
      }
      // Search with % wildcards so partial matches work (e.g. "belly bane" matches "bellybane")
      const pct = '%25'; // URL-encoded %
      const orClauses = Array.from(searchTerms).map(function(t) {
        return 'original_sponsor.ilike.' + pct + encodeURIComponent(t) + pct;
      }).join(',');
      const orphanCheck = await sbFetch(SUPABASE_URL + '/rest/v1/users?or=(' + orClauses + ')&select=username,original_sponsor,sponsor', { headers: HEADERS });
      const orphans = await orphanCheck.json();
      if (Array.isArray(orphans) && orphans.length > 0) {
        for (const orphan of orphans) {
          const newSponsor = sol.ref || finalUsername;
          console.log('[APROBAR] Reassigning orphan "' + orphan.username + '" original_sponsor="' + orphan.original_sponsor + '" → sponsor="' + newSponsor + '"');
          await sbFetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(orphan.username), {
            method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' },
            body: JSON.stringify({ sponsor: newSponsor, original_sponsor: null })
          });
        }
      }
    } catch(e) { console.warn('[APROBAR] Orphan reassign check failed:', e.message); }

    // Create empty agenda config for the new user
    await sbFetch(SUPABASE_URL + '/rest/v1/agenda_configs', {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ username: finalUsername, config: {} })
    });

    // Send emails
    // Format expiry for display
    let expiryHtml = '';
    if (finalExpiry) {
      const d = new Date(finalExpiry);
      const label = d.getUTCDate().toString().padStart(2,'0') + '/' + (d.getUTCMonth()+1).toString().padStart(2,'0') + '/' + d.getUTCFullYear();
      const days = Math.max(0, Math.ceil((finalExpiry - Date.now()) / 86400000));
      expiryHtml = '<p style="margin:8px 0;font-size:14px;">📅 <strong>Acceso hasta:</strong> <span style="color:#4ade80;font-weight:700;">' + label + '</span> <span style="color:rgba(255,255,255,0.4);font-size:12px;">(' + days + ' días)</span></p>';
    }

    let emailSent = false;
    console.log('[APROBAR] Email check — sol.email:', sol.email || 'EMPTY', '| RESEND_KEY exists:', !!process.env.RESEND_API_KEY);
    if (sol.email && process.env.RESEND_API_KEY) {
      const logoUrl = 'https://skyteam.global/logo-skyteam.png';
      const FROM = 'SKYTEAM <soporte@skyteam.global>';

      const html1 = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#0a0a12,#0f0f18,#0a0a12);padding:32px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.15);"><img src="' + logoUrl + '" alt="SKYTEAM" style="height:44px;max-width:240px;" /></div><div style="padding:32px;"><div style="text-align:center;margin-bottom:24px;"><div style="font-size:48px;">🚀</div><h2 style="color:#fff;font-size:22px;margin:8px 0;">¡Bienvenido al equipo, ' + primerNombre + '!</h2><p style="color:#C9A84C;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0;">Tu acceso ha sido aprobado</p></div><div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:20px;margin:20px 0;"><p style="margin:8px 0;font-size:14px;">🌐 <strong>Plataforma:</strong> <a href="https://skyteam.global" style="color:#C9A84C;">skyteam.global</a></p><p style="margin:8px 0;font-size:14px;">👤 <strong>Usuario:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">' + finalUsername + '</span></p><p style="margin:8px 0;font-size:14px;">🔑 <strong>Contraseña:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">' + sol.password + '</span></p>' + expiryHtml + (sol.sponsor && sol.sponsor !== 'Sin especificar' ? '<p style="margin:8px 0;font-size:14px;">🤝 <strong>Sponsor:</strong> ' + sol.sponsor + '</p>' : '') + '</div><div style="text-align:center;margin:24px 0;"><a href="https://skyteam.global" style="background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">Entrar a SKY SYSTEM →</a></div><div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;"><p style="color:#FFD700;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">⚡ Empieza hoy</p><p style="color:rgba(255,255,255,0.8);font-size:13px;line-height:1.9;margin:0;">🤖 <strong style="color:#C9A84C;">Activa Sky Sales IA</strong> — 6 agentes entrenados.<br>🎓 <strong style="color:#C9A84C;">Entra a la Academia</strong> — de cero a resultados.<br>🔗 <strong style="color:#FFD700;">Tu link personalizado</strong> llega en el próximo email.</p></div></div><div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);"><p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKYTEAM · <a href="https://skyteam.global" style="color:#C9A84C;">skyteam.global</a></p></div></div>';

      const html2 = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;border-radius:16px;overflow:hidden;">'
      // Header - contrasting teal/gold
      + '<div style="background:linear-gradient(135deg,#0a1628 0%,#0d1f3c 50%,#0a1628 100%);padding:36px 32px;text-align:center;border-bottom:2px solid rgba(201,168,76,0.25);">'
      + '<img src="https://skyteam.global/logo-skyteam-white.png" alt="SKYTEAM" style="height:50px;margin-bottom:14px;" />'
      + '<h1 style="color:#FFD700;font-size:22px;font-weight:900;margin:0;letter-spacing:1px;">¡Tu Landing Page está lista!</h1>'
      + '<p style="color:rgba(255,255,255,0.5);font-size:12px;margin:6px 0 0;">Tu sistema de captación está activo 24/7</p>'
      + '</div>'
      // Link section
      + '<div style="padding:28px 32px;">'
      + '<p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 16px;">Hola <strong style="color:#C9A84C;">' + primerNombre + '</strong>, tu landing page personalizada está publicada:</p>'
      + '<div style="background:linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,140,0,0.05));border:1.5px solid rgba(255,215,0,0.25);border-radius:14px;padding:20px;text-align:center;margin:0 0 20px;">'
      + '<p style="font-size:10px;color:rgba(255,215,0,0.6);text-transform:uppercase;letter-spacing:2px;font-weight:800;margin:0 0 8px;">Tu link personal</p>'
      + '<p style="font-family:monospace;color:#FFD700;font-size:16px;word-break:break-all;margin:0;font-weight:700;">' + refLink + '</p>'
      + '</div>'
      + '<div style="text-align:center;margin-bottom:24px;">'
      + '<a href="' + refLink + '" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#FFD700,#FF8C00);color:#0a0a12;border-radius:14px;font-size:16px;font-weight:900;text-decoration:none;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(255,215,0,0.3);">Ver mi Landing →</a>'
      + '</div>'
      // Why share section
      + '<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">'
      + '<p style="color:#C9A84C;font-size:15px;font-weight:900;margin:0 0 14px;text-align:center;">¿Por qué compartir tu link?</p>'
      + '<div style="margin-bottom:10px;padding:12px 14px;background:rgba(255,215,0,0.04);border-radius:10px;border-left:3px solid #FFD700;">'
      + '<p style="margin:0;font-size:13px;color:#F0EDE6;"><strong>🌐 Visible 24/7</strong> — Tu página trabaja por ti mientras duermes</p></div>'
      + '<div style="margin-bottom:10px;padding:12px 14px;background:rgba(29,158,117,0.04);border-radius:10px;border-left:3px solid #1D9E75;">'
      + '<p style="margin:0;font-size:13px;color:#F0EDE6;"><strong>📱 Te escriben a WhatsApp</strong> — Los interesados te contactan directo</p></div>'
      + '<div style="margin-bottom:10px;padding:12px 14px;background:rgba(33,150,243,0.04);border-radius:10px;border-left:3px solid #2196F3;">'
      + '<p style="margin:0;font-size:13px;color:#F0EDE6;"><strong>📊 Tu red crece</strong> — Cada registro queda en tu equipo automáticamente</p></div>'
      + '<div style="margin-bottom:10px;padding:12px 14px;background:rgba(226,75,74,0.04);border-radius:10px;border-left:3px solid #E24B4A;">'
      + '<p style="margin:0;font-size:13px;color:#F0EDE6;"><strong>🤖 IA responde por ti</strong> — 6 agentes entrenados atienden a tus prospectos</p></div>'
      + '</div>'
      // Tips
      + '<div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.12);border-radius:12px;padding:16px;margin-top:16px;">'
      + '<p style="color:#C9A84C;font-size:12px;font-weight:800;margin:0 0 8px;">💡 Comparte en:</p>'
      + '<p style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.8;margin:0;">Estados de WhatsApp · Historias de Instagram · Facebook · TikTok · Grupos de Telegram · Bio de redes sociales</p>'
      + '</div>'
      + '</div>'
      // Footer
      + '<div style="background:rgba(0,0,0,0.3);padding:14px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.04);">'
      + '<p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">SKYTEAM · Franquicia Digital · <a href=\"https://skyteam.global\" style=\"color:#C9A84C;text-decoration:none;\">skyteam.global</a></p>'
      + '</div></div>';

      try {
        console.log('[APROBAR] Sending welcome email to:', sol.email);
        const e1 = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
          body: JSON.stringify({ from: FROM, to: [sol.email], subject: '🎉 ¡Bienvenido a SKYTEAM, ' + primerNombre + '! Tu acceso está activo', html: html1 })
        });
        const e1Body = await e1.text();
        console.log('[APROBAR] Email 1 status:', e1.status, 'response:', e1Body);
        if (e1.ok) {
          emailSent = true;
          const e2 = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
            body: JSON.stringify({ from: FROM, to: [sol.email], subject: '🔗 Tu link de duplicación personalizado — SKYTEAM', html: html2 })
          });
          console.log('[APROBAR] Email 2 status:', e2.status);
        }
      } catch (e) { console.error('[APROBAR] Email error:', e.message); }
    }

    // ── INSTANT PUSH: Notify sponsor + 2 levels up ──
    try {
      const VAPID_PUB = process.env.VAPID_PUBLIC_KEY;
      const VAPID_PRIV = process.env.VAPID_PRIVATE_KEY;
      const VAPID_SUB = process.env.VAPID_SUBJECT;
      if (VAPID_PUB && VAPID_PRIV && finalSponsor) {
        const webpush = require('web-push');
        webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV);
        const SB_H2 = { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' };
        // Get all users for sponsor chain
        const allU = await (await sbFetch(SUPABASE_URL + '/rest/v1/users?select=username,name,sponsor&limit=5000', { headers: HEADERS })).json();
        const uMap = {}; if(Array.isArray(allU)) allU.forEach(function(u){ uMap[(u.username||'').toLowerCase()] = u; });
        const valor = sol.valor_inscripcion ? '$' + sol.valor_inscripcion + ' USD' : '';
        const fullName = sol.name || finalUsername;
        const levels = ['1ra linea (directo)', '2da linea', '3ra linea'];
        let curSponsor = finalSponsor.toLowerCase();
        for (let lvl = 0; lvl < 3 && curSponsor; lvl++) {
          // Get push subscriptions for this sponsor
          // Find subscriptions for this sponsor AND their "2" account (same team)
          var _spUser = curSponsor.replace(/2$/, ''); // base username
          var _sp2User = _spUser + '2'; // second account
          const subsR = await sbFetch(SUPABASE_URL + '/rest/v1/push_subscriptions?or=(username.ilike.' + encodeURIComponent(_spUser) + ',username.ilike.' + encodeURIComponent(_sp2User) + ')', { headers: SB_H2 });
          const subs = await subsR.json();
          if (Array.isArray(subs) && subs.length > 0) {
            var _hora = new Date().toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Bogota'});
            var _titulo = valor ? '\uD83D\uDCB0 \u00a1VENTA ' + valor + '!' : '\uD83C\uDF89 \u00a1Nueva venta!';
            var _cuerpo = fullName + ' \u2014 ' + levels[lvl] + (valor ? '\n\uD83D\uDCB0 Membresia: ' + valor : '') + '\n\u23F0 ' + _hora + '\n\uD83D\uDE80 \u00a1Tu equipo sigue creciendo!';
            const payload = JSON.stringify({
              title: _titulo,
              body: _cuerpo,
              url: '/?nav=home', tag: 'skyteam-newclient-' + finalUsername + '-' + Date.now()
            });
            for (const sub of subs) {
              try { await webpush.sendNotification(sub.subscription, payload); } catch(e) {
                if (e.statusCode === 410 || e.statusCode === 404) {
                  try { await sbFetch(SUPABASE_URL + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(sub.endpoint), { method: 'DELETE', headers: SB_H2 }); } catch(x){}
                }
              }
            }
          }
          const sponsorData = uMap[curSponsor];
          curSponsor = sponsorData && sponsorData.sponsor ? sponsorData.sponsor.toLowerCase() : null;
        }
      }
    } catch(e) { console.warn('[APROBAR] Push notification error:', e.message); }

    return res.status(200).json({ ok: true, username: finalUsername, nombre: sol.name, emailSent, refLink });

  } catch (error) {
    console.error('aprobar error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
