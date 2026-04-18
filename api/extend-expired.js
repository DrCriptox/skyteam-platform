// ══════════════════════════════════════════════════════════════
// Extend expired users endpoint — grants a grace period to all
// users whose expiry has passed. Optionally emails each user.
//
// Call: POST /api/extend-expired?key=<ADMIN_PUSH_KEY>
// Body: { days?: 7, sendEmail?: true, dryRun?: false,
//         onlyUsernames?: ['u1','u2']  // optional whitelist }
//
// Behavior:
//  - Finds all users with expiry < Date.now()
//  - Sets expiry = Date.now() + days * 86400000 (fresh countdown)
//  - If sendEmail AND user.email present, sends Resend email
//  - dryRun=true: returns the list without writing anything
//  - onlyUsernames: restrict to that subset (useful for retries)
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  Prefer: 'return=representation'
};

async function sb(path, opts) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: HEADERS, ...opts });
  const text = await r.text();
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + text.substring(0, 300));
  return text ? JSON.parse(text) : null;
}

const LOGO = 'https://skyteam.global/logo-skyteam-white.png';

// Email template: N días de obsequio. Keeps messaging simple and professional;
// reinforces the "tu mensualidad se paga sola con una venta" angle to turn
// expired users into active ones.
function renderGraceEmail(name, days) {
  const firstName = (name || 'Socio').split(' ')[0];
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:32px 28px;border-radius:16px;">'
    + '<div style="text-align:center;margin-bottom:22px;"><img src="' + LOGO + '" alt="SKYTEAM" style="height:36px;" /></div>'
    + '<div style="text-align:center;margin-bottom:20px;">'
    + '<div style="font-size:48px;margin-bottom:8px;">🎁</div>'
    + '<h2 style="color:#C9A84C;font-size:22px;margin:0 0 8px;font-weight:900;">' + firstName + ', te regalamos ' + days + ' días de obsequio</h2>'
    + '<p style="color:rgba(255,255,255,0.55);font-size:14px;margin:0;line-height:1.55;">Tu mensualidad estaba por vencer — te habilitamos <strong>' + days + ' días de obsequio</strong> para que aproveches el sistema completo y cierres tus primeras ventas.</p>'
    + '</div>'
    + '<div style="background:linear-gradient(135deg,rgba(201,168,76,0.10),rgba(127,119,221,0.08));border:1px solid rgba(201,168,76,0.25);border-radius:14px;padding:18px;margin-bottom:16px;">'
    + '<p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#F0EDE6;">En estos ' + days + ' días de obsequio puedes:</p>'
    + '<ul style="margin:6px 0 0;padding-left:18px;color:rgba(255,255,255,0.75);font-size:13px;line-height:1.7;">'
    + '<li>Cerrar citas desde tu <strong>agenda pública</strong></li>'
    + '<li>Generar tu <strong>foto profesional con IA</strong></li>'
    + '<li>Usar el <strong>CRM + recordatorios automáticos</strong></li>'
    + '<li>Subir en el <strong>ranking diario, semanal y mensual</strong></li>'
    + '<li>Avanzar a tu siguiente <strong>rango Nova</strong></li>'
    + '</ul>'
    + '</div>'
    + '<div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.25);border-radius:12px;padding:14px;margin-bottom:18px;text-align:center;">'
    + '<p style="margin:0;font-size:13px;color:#1D9E75;font-weight:700;">💡 Con una sola venta cubres varias mensualidades y ganas mucho más.</p>'
    + '</div>'
    + '<div style="text-align:center;margin:20px 0;">'
    + '<a href="https://skyteam.global" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">🚀 Entrar al sistema</a>'
    + '</div>'
    + '<p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.55;margin:16px 0 0;text-align:center;">Si necesitas extender tu acceso permanentemente, renueva tu paquete en Innova y sube el pantallazo en tu perfil.</p>'
    + '<p style="text-align:center;color:rgba(255,255,255,0.15);font-size:10px;margin-top:20px;">SKYTEAM · skyteam.global · Recibiste este correo porque tu cuenta estaba por vencer.</p>'
    + '</div>'
  );
}

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) return { ok: false, error: 'RESEND_API_KEY not set' };
  if (!to) return { ok: false, error: 'no recipient' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + RESEND_KEY },
      body: JSON.stringify({
        from: 'SKYTEAM <soporte@skyteam.global>',
        to: [to],
        subject: subject,
        html: html
      })
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.error) return { ok: false, error: (body.error && body.error.message) || ('status ' + r.status) };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  // Auth — prefer env var; temporary hardcoded TEMP_KEY fallback because
  // ADMIN_PUSH_KEY is not yet set in Vercel production. REMOVE TEMP_KEY
  // in a follow-up commit after the one-time grace extension is done.
  const TEMP_KEY = 'sky_extend_2026_04_18_grace7d';
  const VALID_KEY = process.env.EXTEND_EXPIRED_KEY || process.env.ADMIN_PUSH_KEY || TEMP_KEY;
  const providedKey = req.query.key || (req.body && req.body.key);
  if (providedKey !== VALID_KEY) return res.status(403).json({ ok: false, error: 'Invalid key' });

  const body = req.body || {};
  const days = Math.max(1, Math.min(30, parseInt(body.days) || 6)); // clamp 1-30 days, default 6 "días de obsequio"
  const sendEmailFlag = body.sendEmail !== false; // default true
  const dryRun = body.dryRun === true;
  const onlyList = Array.isArray(body.onlyUsernames) ? body.onlyUsernames.map(s => String(s).toLowerCase()) : null;

  const now = Date.now();
  const newExpiry = now + days * 86400000;

  try {
    // 1. Find expired users (expiry < now). Use pagination to be safe.
    // Supabase returns up to 1000 rows per query by default — we're unlikely
    // to ever have >1000 expired users at once, but guard with limit=5000.
    const expiredRows = await sb(
      'users?expiry=lt.' + now +
      '&select=username,name,email,rank,expiry,whatsapp,sponsor' +
      '&order=expiry.asc' +
      '&limit=5000'
    ) || [];

    // Optionally filter by onlyList
    const targets = onlyList
      ? expiredRows.filter(u => onlyList.includes(String(u.username).toLowerCase()))
      : expiredRows;

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        days: days,
        newExpiryISO: new Date(newExpiry).toISOString(),
        foundExpired: expiredRows.length,
        willExtend: targets.length,
        withEmail: targets.filter(u => !!u.email).length,
        withoutEmail: targets.filter(u => !u.email).length,
        preview: targets.map(u => ({
          username: u.username,
          name: u.name,
          email: u.email || null,
          oldExpiry: new Date(Number(u.expiry)).toISOString().slice(0, 10),
          daysOverdue: Math.floor((now - Number(u.expiry)) / 86400000),
          rank: u.rank,
          sponsor: u.sponsor || null
        }))
      });
    }

    // 2. LIVE: extend expiry + send email in parallel (per user).
    // We do one user at a time to keep error attribution clean; total volume
    // is small (~36) so latency is fine.
    const results = { extended: [], failedExtend: [], emailed: [], noEmail: [], failedEmail: [] };

    for (const u of targets) {
      // Step A: extend expiry (MANDATORY — this is what gives them access)
      try {
        const patchR = await fetch(
          SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(u.username),
          {
            method: 'PATCH',
            headers: { ...HEADERS, Prefer: 'return=minimal' },
            body: JSON.stringify({ expiry: newExpiry })
          }
        );
        if (patchR.ok) {
          results.extended.push(u.username);
        } else {
          const t = await patchR.text();
          results.failedExtend.push({ username: u.username, error: patchR.status + ': ' + t.substring(0, 150) });
          continue; // don't email if extension failed
        }
      } catch (e) {
        results.failedExtend.push({ username: u.username, error: e.message });
        continue;
      }

      // Step B: mark user as being in grace period (OPTIONAL — used by the
      // frontend to show "N días de obsequio" instead of "N días restantes").
      // Silently ignored if the column doesn't exist in the schema yet.
      try {
        await fetch(
          SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(u.username),
          {
            method: 'PATCH',
            headers: { ...HEADERS, Prefer: 'return=minimal' },
            body: JSON.stringify({ grace_granted_at: now, grace_days: days })
          }
        );
      } catch (e) { /* column may not exist yet; non-fatal */ }

      // Send email (if flagged and email present)
      if (sendEmailFlag && u.email) {
        const subject = '🎁 ' + (u.name || 'Socio').split(' ')[0] + ', te regalamos ' + days + ' días en SKYTEAM';
        const emailR = await sendEmail(u.email, subject, renderGraceEmail(u.name, days));
        if (emailR.ok) {
          results.emailed.push({ username: u.username, email: u.email, id: emailR.id });
        } else {
          results.failedEmail.push({ username: u.username, email: u.email, error: emailR.error });
        }
      } else if (!u.email) {
        results.noEmail.push(u.username);
      }
    }

    return res.status(200).json({
      ok: results.failedExtend.length === 0,
      days: days,
      newExpiryISO: new Date(newExpiry).toISOString(),
      totalTargets: targets.length,
      extended: results.extended.length,
      emailed: results.emailed.length,
      noEmail: results.noEmail.length,
      failedExtend: results.failedExtend.length,
      failedEmail: results.failedEmail.length,
      details: results
    });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
