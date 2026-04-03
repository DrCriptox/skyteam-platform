// Supabase-powered aprobar (approve) API
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 32).toString('hex');
  return salt + ':' + hash;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id, expiryTs, directData } = req.body;
    if (!id && !directData) return res.status(400).json({ error: 'Missing id or directData' });

    // Use directData if provided (auto-registration), otherwise lookup solicitud
    let sol;
    if (directData) {
      sol = directData; // { name, email, password, sponsor, innova_user, ref }
    } else {
      const sr = await fetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), { headers: HEADERS });
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
    const refLink = 'https://innovaia.app?ref=' + (sol.ref || username);
    const password = hashPassword(sol.password); // Always hash before storing

    // Check if user already exists (prevent duplicates from race conditions)
    const existCheck = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username) + '&limit=1', { headers: HEADERS });
    const existUsers = await existCheck.json();
    if (existUsers && existUsers.length > 0) {
      // User already exists — just delete solicitud and return success
      await fetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: HEADERS });
      return res.status(200).json({ ok: true, username, nombre: sol.name, emailSent: false, refLink, alreadyExisted: true });
    }

    // Delete the solicitud (only if it came from DB)
    if (!directData && id) {
      await fetch(SUPABASE_URL + '/rest/v1/solicitudes?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: HEADERS });
    }

    // Create user in users table — use 'return=representation' to verify insertion
    const insertR = await fetch(SUPABASE_URL + '/rest/v1/users', {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ username, email: sol.email || null, name: sol.name || null, sponsor: sol.sponsor || null, ref: sol.ref || username, password, expiry: expiryTs || null })
    });
    if (!insertR.ok) {
      const errText = await insertR.text();
      console.error('[aprobar] User INSERT failed:', insertR.status, errText);
      throw new Error('No se pudo crear el usuario: ' + insertR.status);
    }

    // Create empty agenda config for the new user
    await fetch(SUPABASE_URL + '/rest/v1/agenda_configs', {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ username, config: {} })
    });

    // Send emails
    // Format expiry for display
    let expiryHtml = '';
    if (expiryTs) {
      const d = new Date(expiryTs);
      const label = d.getUTCDate().toString().padStart(2,'0') + '/' + (d.getUTCMonth()+1).toString().padStart(2,'0') + '/' + d.getUTCFullYear();
      const days = Math.max(0, Math.ceil((expiryTs - Date.now()) / 86400000));
      expiryHtml = '<p style="margin:8px 0;font-size:14px;">📅 <strong>Acceso hasta:</strong> <span style="color:#4ade80;font-weight:700;">' + label + '</span> <span style="color:rgba(255,255,255,0.4);font-size:12px;">(' + days + ' días)</span></p>';
    }

    let emailSent = false;
    if (sol.email && process.env.RESEND_API_KEY) {
      const logoUrl = 'https://skyteam.global/logo-skyteam.png';
      const FROM = 'SKYTEAM <soporte@skyteam.global>';

      const html1 = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#0a1628,#0d2045,#0a1628);padding:32px;text-align:center;border-bottom:1px solid rgba(28,232,255,0.15);"><img src="' + logoUrl + '" alt="SKYTEAM" style="height:44px;max-width:240px;" /></div><div style="padding:32px;"><div style="text-align:center;margin-bottom:24px;"><div style="font-size:48px;">🚀</div><h2 style="color:#fff;font-size:22px;margin:8px 0;">¡Bienvenido al equipo, ' + primerNombre + '!</h2><p style="color:#1CE8FF;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0;">Tu acceso ha sido aprobado</p></div><div style="background:rgba(28,232,255,0.06);border:1px solid rgba(28,232,255,0.2);border-radius:12px;padding:20px;margin:20px 0;"><p style="margin:8px 0;font-size:14px;">🌐 <strong>Plataforma:</strong> <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p><p style="margin:8px 0;font-size:14px;">👤 <strong>Usuario:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">' + username + '</span></p><p style="margin:8px 0;font-size:14px;">🔑 <strong>Contraseña:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">' + password + '</span></p>' + expiryHtml + (sol.sponsor && sol.sponsor !== 'Sin especificar' ? '<p style="margin:8px 0;font-size:14px;">🤝 <strong>Sponsor:</strong> ' + sol.sponsor + '</p>' : '') + '</div><div style="text-align:center;margin:24px 0;"><a href="https://skyteam.global" style="background:linear-gradient(135deg,#1CE8FF,#0077FF);color:#030c1f;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">Entrar a SKY SYSTEM →</a></div><div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;"><p style="color:#FFD700;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">⚡ Empieza hoy</p><p style="color:rgba(255,255,255,0.8);font-size:13px;line-height:1.9;margin:0;">🤖 <strong style="color:#1CE8FF;">Activa Sky Sales IA</strong> — 6 agentes entrenados.<br>🎓 <strong style="color:#1CE8FF;">Entra a la Academia</strong> — de cero a resultados.<br>🔗 <strong style="color:#FFD700;">Tu link personalizado</strong> llega en el próximo email.</p></div></div><div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);"><p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKYTEAM · <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p></div></div>';

      const html2 = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#0a1628,#0d2045,#0a1628);padding:32px;text-align:center;border-bottom:1px solid rgba(28,232,255,0.15);"><img src="' + logoUrl + '" alt="SKYTEAM" style="height:44px;max-width:240px;" /></div><div style="padding:32px;"><h2 style="color:#FFD700;font-size:22px;text-align:center;margin:0 0 20px;">🚀 Tu link de duplicación está listo</h2><p style="color:rgba(255,255,255,0.8);line-height:1.7;">Hola <strong>' + primerNombre + '</strong>, este es tu link personalizado:</p><div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);border-radius:12px;padding:20px;text-align:center;margin:20px 0;"><p style="font-family:monospace;color:#FFD700;font-size:15px;word-break:break-all;margin:0;">' + refLink + '</p></div><ol style="color:rgba(255,255,255,0.7);font-size:13px;line-height:2.2;padding-left:18px;"><li>Comparte este link con personas que quieran ingresos extra</li><li>Quien se registre quedará en tu red automáticamente</li><li>Usa los Agentes IA para responder objeciones</li><li>Revisa la Academia para capacitarte</li></ol><div style="text-align:center;margin:24px 0;"><a href="' + refLink + '" style="background:linear-gradient(135deg,#FFD700,#FF8C00);color:#030c1f;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">Ver mi landing →</a></div></div><div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);"><p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKYTEAM · <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p></div></div>';

      try {
        const e1 = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
          body: JSON.stringify({ from: FROM, to: [sol.email], subject: '🎉 ¡Bienvenido a SKY SYSTEM, ' + primerNombre + '! Tu acceso está activo', html: html1 })
        });
        if (e1.ok) {
          emailSent = true;
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
            body: JSON.stringify({ from: FROM, to: [sol.email], subject: '🔗 Tu link de duplicación personalizado — SKYTEAM', html: html2 })
          });
        }
      } catch (e) { /* email is best-effort */ }
    }

    return res.status(200).json({ ok: true, username, nombre: sol.name, emailSent, refLink });

  } catch (error) {
    console.error('aprobar error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
