import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

// Secret requerido — sin fallback hardcodeado
const RESET_SECRET = process.env.RESET_SECRET;

function generateToken(username, email) {
  if (!RESET_SECRET) throw new Error('RESET_SECRET not configured');
  const payload = Buffer.from(JSON.stringify({ u: username, e: email, exp: Date.now() + 3600000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', RESET_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // TEMPORARY DEBUG MODE — remove after diagnosis
  const isDebug = req.body && req.body.debugKey === 'SKYTEAM_DEBUG_4F2A_2026';
  const debugInfo = { env: {}, steps: [] };
  if (isDebug) {
    debugInfo.env.SUPABASE_URL = !!SUPABASE_URL;
    debugInfo.env.SUPABASE_SERVICE_KEY = !!SUPABASE_KEY;
    debugInfo.env.RESET_SECRET = !!RESET_SECRET;
    debugInfo.env.RESET_SECRET_value = RESET_SECRET ? RESET_SECRET.substring(0, 8) + '...(' + RESET_SECRET.length + ' chars)' : null;
    debugInfo.env.RESEND_API_KEY = !!process.env.RESEND_API_KEY;
    debugInfo.env.RESEND_API_KEY_prefix = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) + '...' : null;
    // List ALL env vars that match patterns of interest (names only, not values)
    debugInfo.env.ALL_keys = Object.keys(process.env).filter(k =>
      /^(RESEND|RESET|SUPABASE|OPENAI|VAPID|ADMIN|NEXT|MIGRATE|WHATSAPP|META_|FACEBOOK)/i.test(k)
    ).sort();
  }

  try {
    const { email } = req.body || {};

    // Siempre retorna 200 para evitar enumeración de emails
    if (!email || typeof email !== 'string' || email.length > 200) {
      console.log('[FORGOT-PASSWORD] Missing or invalid email');
      if (isDebug) { debugInfo.steps.push('missing_email'); return res.status(200).json({ ok: true, debug: debugInfo }); }
      return res.status(200).json({ ok: true });
    }

    const clean = email.trim().toLowerCase();
    console.log('[FORGOT-PASSWORD] Request received for:', clean);
    if (isDebug) debugInfo.steps.push('email_clean:' + clean);

    // Check that required env vars are set
    if (!RESET_SECRET) {
      console.error('[FORGOT-PASSWORD] RESET_SECRET not configured in Vercel env vars!');
      if (isDebug) { debugInfo.steps.push('FAIL_no_reset_secret'); return res.status(200).json({ ok: true, debug: debugInfo }); }
      return res.status(200).json({ ok: true });
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('[FORGOT-PASSWORD] RESEND_API_KEY not configured in Vercel env vars!');
      if (isDebug) debugInfo.steps.push('WARN_no_resend_key');
    }

    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(clean) + '&select=username,name&limit=1',
      { headers: HEADERS }
    );
    const users = await r.json();
    if (isDebug) debugInfo.steps.push('db_query_result:' + JSON.stringify(users).substring(0, 200));

    if (!users || users.length === 0) {
      console.log('[FORGOT-PASSWORD] Email not found in DB:', clean);
      if (isDebug) { debugInfo.steps.push('email_not_found'); return res.status(200).json({ ok: true, debug: debugInfo }); }
      return res.status(200).json({ ok: true });
    }

    const user = users[0];
    console.log('[FORGOT-PASSWORD] Match found: username=' + user.username);
    if (isDebug) debugInfo.steps.push('match_found:' + user.username);
    const token = generateToken(user.username, clean);
    const resetLink = 'https://skyteam.global?reset=' + token;
    const primerNombre = user.name ? user.name.split(' ')[0] : 'Socio';

    if (process.env.RESEND_API_KEY) {
      console.log('[FORGOT-PASSWORD] Sending email via Resend to:', clean);
      if (isDebug) debugInfo.steps.push('attempting_resend');
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0a0a12,#0f0f18,#0a0a12);padding:32px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.15);">
          <img src="https://skyteam.global/logo-skyteam-white.png" alt="SKYTEAM" style="height:44px;max-width:240px;" />
        </div>
        <div style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">🔑</div>
            <h2 style="color:#fff;font-size:22px;margin:8px 0;">Restablecer contraseña</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Solicitud recibida para la cuenta de ${primerNombre}</p>
          </div>
          <p style="color:rgba(255,255,255,0.7);line-height:1.7;">Hola <strong>${primerNombre}</strong>, haz clic en el botón para crear una nueva contraseña. Este enlace expira en <strong>1 hora</strong>.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetLink}" style="background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;display:inline-block;">Crear nueva contraseña →</a>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-top:20px;">
            <p style="color:rgba(255,255,255,0.35);font-size:11px;margin:0;line-height:1.6;">Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.<br>Si tienes problemas escríbenos a soporte@skyteam.global</p>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKYTEAM · <a href="https://skyteam.global" style="color:#C9A84C;text-decoration:none;">skyteam.global</a></p>
        </div>
      </div>`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
        body: JSON.stringify({
          from: 'SKYTEAM <soporte@skyteam.global>',
          to: [clean],
          subject: '🔑 Restablece tu contraseña de SKYTEAM',
          html
        })
      });
      const emailBody = await emailRes.text().catch(() => '');
      if (emailRes.ok) {
        console.log('[FORGOT-PASSWORD] Email sent successfully to', clean, '| Resend status:', emailRes.status);
        if (isDebug) debugInfo.steps.push('RESEND_OK:' + emailRes.status + ':' + emailBody.substring(0, 200));
      } else {
        console.error('[FORGOT-PASSWORD] Resend FAILED:', emailRes.status, emailBody.substring(0, 300));
        if (isDebug) debugInfo.steps.push('RESEND_FAIL:' + emailRes.status + ':' + emailBody.substring(0, 400));
      }
    }

    if (isDebug) return res.status(200).json({ ok: true, debug: debugInfo });
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('[FORGOT-PASSWORD] error:', error.message, error.stack ? error.stack.substring(0, 300) : '');
    if (isDebug) { debugInfo.steps.push('EXCEPTION:' + error.message); return res.status(200).json({ ok: true, debug: debugInfo }); }
    return res.status(200).json({ ok: true });
  }
}
