export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, nombre, usuario, password, sponsor, membresia, linkRef } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing email' });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:32px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#1CE8FF;font-size:28px;margin:0;">SKY<span style="color:#fff"> SYSTEM</span></h1>
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:4px;">Plataforma del Equipo SKYTEAM</p>
        </div>
        <h2 style="color:#1CE8FF;font-size:20px;">🎉 ¡Bienvenido al equipo, ${nombre}!</h2>
        <p style="color:rgba(255,255,255,0.8);line-height:1.7;">Tu acceso a la plataforma ha sido <strong style="color:#1CE8FF;">activado</strong>. Ya puedes entrar con tus datos:</p>
        <div style="background:rgba(28,232,255,0.08);border:1px solid rgba(28,232,255,0.2);border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:6px 0;font-size:14px;">🌐 <strong>Plataforma:</strong> <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p>
          <p style="margin:6px 0;font-size:14px;">👤 <strong>Usuario:</strong> ${usuario}</p>
          <p style="margin:6px 0;font-size:14px;">🔑 <strong>Contraseña:</strong> ${password}</p>
          ${sponsor ? '<p style="margin:6px 0;font-size:14px;">🤝 <strong>Sponsor:</strong> ' + sponsor + '</p>' : ''}
          ${membresia ? '<p style="margin:6px 0;font-size:14px;">💎 <strong>Membresía:</strong> ' + membresia + '</p>' : ''}
        </div>
        ${linkRef ? '<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:16px;margin:16px 0;"><p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Tu link de referidos</p><p style="margin:0;font-family:monospace;color:#FFD700;font-size:13px;word-break:break-all;">' + linkRef + '</p></div>' : ''}
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:24px;text-align:center;">Enviado por el equipo SKY TEAM · <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p>
      </div>
    `;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: 'SKY TEAM <lideres@skyteam.global>',
        to: [to],
        subject: '🎉 ¡Tu acceso a SKY SYSTEM está activo, ' + nombre + '!',
        html: html
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.status(200).json({ ok: true, id: data.id });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
