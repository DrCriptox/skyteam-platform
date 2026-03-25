export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const BIN_URL = 'https://api.jsonbin.io/v3/b/' + process.env.JSONBIN_BIN_ID;
    const HEADERS = { 'Content-Type': 'application/json', 'X-Master-Key': process.env.JSONBIN_API_KEY, 'X-Bin-Versioning': 'false' };
    const r = await fetch(BIN_URL, { headers: HEADERS });
    const data = await r.json();
    const record = data.record || {};
    const solicitudes = record.solicitudes || [];
    const sol = solicitudes.find(s => s.id === id);
    if (!sol) return res.status(404).json({ error: 'Solicitud not found', available: solicitudes.length });
    const remaining = solicitudes.filter(s => s.id !== id);
    await fetch(BIN_URL, { method: 'PUT', headers: HEADERS, body: JSON.stringify({ ...record, solicitudes: remaining }) });
    const username = sol.innovaUser ? sol.innovaUser.toLowerCase().replace(/\s+/g,'') : (sol.ref || String(id).slice(-6));
    const primerNombre = sol.name.split(' ')[0];
    const refLink = 'https://innovaia.app?ref=' + (sol.ref || username);
    const password = sol.password || 'skyteam2026';
    if (sol.email && process.env.RESEND_API_KEY) {
      const logoUrl = 'https://skyteam.global/logo-skyteam.png';
      const html1 = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#0a1628,#0d2045,#0a1628);padding:32px;text-align:center;border-bottom:1px solid rgba(28,232,255,0.15);"><img src="' + logoUrl + '" alt="SKY TEAM" style="height:44px;" /></div><div style="padding:32px;"><div style="text-align:center;margin-bottom:24px;"><div style="font-size:48px;">🚀</div><h2 style="color:#fff;font-size:22px;margin:8px 0;">¡Bienvenido al equipo, ' + primerNombre + '!</h2><p style="color:#1CE8FF;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Tu acceso ha sido aprobado</p></div><div style="background:rgba(28,232,255,0.06);border:1px solid rgba(28,232,255,0.2);border-radius:12px;padding:20px;margin:20px 0;"><p style="margin:8px 0;font-size:14px;">🌐 <strong>Plataforma:</strong> <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p><p style="margin:8px 0;font-size:14px;">👤 <strong>Usuario:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">' + username + '</span></p><p style="margin:8px 0;font-size:14px;">🔑 <strong>Contraseña:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">' + password + '</span></p>' + (sol.sponsor ? '<p style="margin:8px 0;font-size:14px;">🤝 <strong>Sponsor:</strong> ' + sol.sponsor + '</p>' : '') + '</div><div style="text-align:center;margin:24px 0;"><a href="https://skyteam.global" style="background:linear-gradient(135deg,#1CE8FF,#0077FF);color:#030c1f;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">Entrar a SKY SYSTEM →</a></div><div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;margin-top:20px;"><p style="color:#FFD700;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">⚡ Empieza hoy</p><p style="color:rgba(255,255,255,0.8);font-size:13px;line-height:1.8;margin:0;">🤖 <strong style="color:#1CE8FF;">Activa Sky Sales IA</strong> — 6 agentes entrenados.<br>🎓 <strong style="color:#1CE8FF;">Entra a la Academia</strong> — de cero a resultados.<br>🔗 <strong style="color:#FFD700;">Tu link personalizado</strong> llega en el próximo email.</p></div></div><div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);"><p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKY TEAM Líderes · <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p></div></div>';
      const html2 = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:0;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#0a1628,#0d2045,#0a1628);padding:32px;text-align:center;border-bottom:1px solid rgba(28,232,255,0.15);"><img src="' + logoUrl + '" alt="SKY TEAM" style="height:44px;" /></div><div style="padding:32px;"><h2 style="color:#FFD700;font-size:22px;text-align:center;">🚀 Tu link de duplicación está listo</h2><p style="color:rgba(255,255,255,0.8);line-height:1.7;">Hola <strong>' + primerNombre + '</strong>, este es tu link:</p><div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);border-radius:12px;padding:20px;text-align:center;margin:20px 0;"><p style="font-family:monospace;color:#FFD700;font-size:15px;word-break:break-all;margin:0;">' + refLink + '</p></div><ol style="color:rgba(255,255,255,0.7);font-size:13px;line-height:2.2;padding-left:18px;"><li>Comparte este link con personas que quieran ingresos extra</li><li>Quien se registre quedará en tu red automáticamente</li><li>Usa los Agentes IA para responder objeciones</li><li>Revisa la Academia para capacitarte</li></ol><div style="text-align:center;margin:24px 0;"><a href="' + refLink + '" style="background:linear-gradient(135deg,#FFD700,#FF8C00);color:#030c1f;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:900;font-size:15px;">Ver mi landing →</a></div></div><div style="background:rgba(0,0,0,0.3);padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);"><p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">SKY TEAM Líderes · skyteam.global</p></div></div>';
      await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.RESEND_API_KEY}, body: JSON.stringify({ from:'SKY TEAM Líderes <lideres@skyteam.global>', to:[sol.email], subject:'🎉 ¡Bienvenido a SKY SYSTEM, ' + primerNombre + '! Tu acceso está activo', html:html1 }) });
      fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.RESEND_API_KEY}, body: JSON.stringify({ from:'SKY TEAM Líderes <lideres@skyteam.global>', to:[sol.email], subject:'🔗 Tu link de duplicación personalizado — SKY TEAM', html:html2 }) });
    }
    return res.status(200).json({ ok:true, username, nombre:sol.name, emailSent:!!sol.email });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
