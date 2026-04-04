// Cancel a user account for data inconsistency — deletes user + sends cancellation email
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
    const { username, adminUser } = req.body || {};

    // Verify requester is an admin
    if (!adminUser || typeof adminUser !== 'string' || adminUser.length > 50) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const adminCheck = await fetch(
      SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(adminUser.trim().toLowerCase()) + '&select=is_admin&limit=1',
      { headers: HEADERS }
    );
    const adminRows = await adminCheck.json();
    if (!adminRows || adminRows.length === 0 || !adminRows[0].is_admin) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    if (!username || typeof username !== 'string' || username.length > 50) {
      return res.status(400).json({ error: 'username inválido' });
    }

    // Fetch user to get email and name before deleting
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username) + '&select=username,email,name,sponsor&limit=1',
      { headers: HEADERS }
    );
    const users = await r.json();
    if (!users || users.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = users[0];
    const primerNombre = user.name ? user.name.split(' ')[0] : 'Socio';

    // Delete user from Supabase
    const del = await fetch(
      SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(username),
      { method: 'DELETE', headers: HEADERS }
    );
    if (!del.ok) throw new Error('No se pudo eliminar el usuario: ' + del.status);

    // Also clean up agenda_configs
    await fetch(
      SUPABASE_URL + '/rest/v1/agenda_configs?username=eq.' + encodeURIComponent(username),
      { method: 'DELETE', headers: HEADERS }
    ).catch(() => {});

    // Send cancellation email if email exists
    let emailSent = false;
    if (user.email && process.env.RESEND_API_KEY) {
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a12;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0a0a12,#0f0f18,#0a0a12);padding:32px;text-align:center;border-bottom:1px solid rgba(248,113,113,0.15);">
          <img src="https://skyteam.global/logo-skyteam.png" alt="SKYTEAM" style="height:44px;max-width:240px;" />
        </div>
        <div style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">⚠️</div>
            <h2 style="color:#fff;font-size:22px;margin:8px 0;">Acceso cancelado</h2>
            <p style="color:#f87171;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0;">Inconsistencia en los datos registrados</p>
          </div>
          <p style="color:rgba(255,255,255,0.7);line-height:1.8;">Hola <strong>${primerNombre}</strong>, te informamos que tu acceso a <strong>SKY SYSTEM</strong> ha sido cancelado por inconsistencia en los datos de membresía que enviaste al registrarte.</p>
          <div style="background:rgba(248,113,113,0.06);border:0.5px solid rgba(248,113,113,0.2);border-radius:12px;padding:20px;margin:20px 0;">
            <p style="color:#f87171;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">¿Qué puedes hacer?</p>
            <p style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.9;margin:0;">
              🤝 <strong style="color:#fff;">Contacta a tu patrocinador</strong>${user.sponsor ? ' (<strong style="color:#C9A84C;">' + user.sponsor + '</strong>)' : ''} para verificar tu membresía activa.<br>
              🔄 <strong style="color:#fff;">Vuelve a registrarte</strong> en <a href="https://skyteam.global" style="color:#C9A84C;">skyteam.global</a> con una captura actualizada de tu membresía.<br>
              📧 <strong style="color:#fff;">Escríbenos</strong> a <a href="mailto:soporte@skyteam.global" style="color:#C9A84C;">soporte@skyteam.global</a> si crees que es un error.
            </p>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKYTEAM · <a href="https://skyteam.global" style="color:#C9A84C;text-decoration:none;">skyteam.global</a></p>
        </div>
      </div>`;

      const er = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
        body: JSON.stringify({
          from: 'SKYTEAM <soporte@skyteam.global>',
          to: [user.email],
          subject: '⚠️ Tu acceso a SKYTEAM ha sido cancelado',
          html
        })
      });
      if (er.ok) emailSent = true;
    }

    return res.status(200).json({ ok: true, emailSent, nombre: user.name });

  } catch (error) {
    console.error('cancelar error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
