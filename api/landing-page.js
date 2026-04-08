// Serve landing page directly from skyteam.global
const REPO = 'DrCriptox/innova-ia-landing';
const BRANCH = 'main';

async function ghFetch(file) {
  try {
    // Use raw.githubusercontent.com directly (works for any file size, no token needed)
    const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + file);
    if (!r.ok) return {};
    const text = await r.text();
    return JSON.parse(text);
  } catch(e) { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const ref = req.query?.ref || '';
  const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Read asesor data
  let asesor = null;
  try {
    const data = await ghFetch('asesores-skyteam.json');
    asesor = data[slug] || null;
    if (!asesor) {
      const old = await ghFetch('asesores.json');
      asesor = old[slug] || null;
    }
  } catch(e) {}

  if (!asesor) {
    return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYTEAM</title></head><body style="background:#0a0a12;color:#fff;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;"><div><img src="/logo-skyteam-white.png" style="height:50px;margin-bottom:20px;"><h2>Link no encontrado</h2><p style="color:rgba(255,255,255,0.5);">Este enlace no tiene un perfil asociado.</p><a href="https://skyteam.global" style="color:#C9A84C;">Ir a SKYTEAM</a></div></body></html>`);
  }

  const nombre = asesor.nombre || 'Asesor';
  const rol = asesor.rol || 'Asesor Estratégico';
  const foto = asesor.foto || '';
  const mensaje = asesor.mensaje || 'Quizá esta sea la oportunidad que estabas esperando encontrar';
  const wa = (asesor.whatsapp || '').replace(/[^0-9+]/g, '');
  const waLink = wa ? 'https://wa.me/' + wa.replace('+','') + '?text=' + encodeURIComponent('Hola ' + nombre + ', vi tu página y me interesa saber más sobre la franquicia digital') : '#';
  const fotoHTML = foto && !foto.startsWith('data:') ? `<img src="${foto}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #C9A84C;">` : foto && foto.startsWith('data:') ? `<img src="${foto}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid #C9A84C;">` : `<div style="width:120px;height:120px;border-radius:50%;background:rgba(201,168,76,0.15);border:3px solid #C9A84C;display:flex;align-items:center;justify-content:center;font-size:40px;color:#C9A84C;">${nombre[0]||'S'}</div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nombre} — Franquicia Digital SKYTEAM</title>
<meta name="description" content="${mensaje}">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0a0a12;color:#F0EDE6;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;background:radial-gradient(ellipse at top,rgba(201,168,76,0.08),transparent 60%);}
.logo{height:40px;margin-bottom:30px;opacity:0.7;}
.avatar{margin-bottom:16px;}
.name{font-size:24px;font-weight:900;margin-bottom:4px;}
.rol{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:6px;}
.badge{display:inline-flex;align-items:center;gap:4px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:4px 12px;font-size:11px;color:#C9A84C;font-weight:700;margin-bottom:20px;}
.msg{font-size:16px;line-height:1.6;color:rgba(255,255,255,0.7);max-width:400px;margin:0 auto 30px;}
.wa-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;padding:16px 32px;border-radius:14px;text-decoration:none;font-size:16px;font-weight:800;box-shadow:0 6px 24px rgba(37,211,102,0.3);transition:transform 0.2s;}
.wa-btn:hover{transform:translateY(-2px);}
.wa-svg{width:24px;height:24px;fill:#fff;}
.features{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:30px;max-width:400px;}
.feat{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;font-size:11px;color:rgba(255,255,255,0.5);flex:1;min-width:100px;text-align:center;}
.feat b{display:block;font-size:18px;color:#C9A84C;margin-bottom:2px;}
.footer{padding:20px;text-align:center;font-size:11px;color:rgba(255,255,255,0.2);}
</style>
</head>
<body>
<div class="hero">
<img src="https://skyteam.global/logo-skyteam-white.png" class="logo" alt="SKYTEAM">
<div class="avatar">${fotoHTML}</div>
<div class="name">${nombre}</div>
<div class="rol">${rol}</div>
<div class="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C"><path d="M12 1l3.09 3.26L19 3.64l-.64 3.91L21.5 12l-3.14 4.45.64 3.91-3.91.64L12 23l-3.09-3.26L5 20.36l.64-3.91L2.5 12l3.14-4.45L5 3.64l3.91-.64L12 1z"/><path d="M9 12l2 2 4-4" stroke="#0a0a12" stroke-width="2" fill="none"/></svg> Asesor verificado</div>
<p class="msg">${mensaje}</p>
<a href="${waLink}" class="wa-btn" target="_blank">
<svg class="wa-svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.7 14.9L2 22l5.2-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.2 1.2-1.7 1.3-.5 0-.9.2-3.1-.7-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c0 .1-.1.4-.2.5-.1.2-.2.3-.4.5-.2.2-.4.4-.2.7.2.4.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.7-.1s.8-1 1-1.3c.2-.3.4-.3.7-.2.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.1.1.7-.1 1.3z"/></svg>
Escríbeme por WhatsApp
</a>
<div class="features">
<div class="feat"><b>🤖</b>IA Entrenada</div>
<div class="feat"><b>📊</b>Sistema Probado</div>
<div class="feat"><b>💰</b>Ingresos Reales</div>
</div>
</div>
<div class="footer">SKYTEAM · Franquicia Digital · skyteam.global</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
