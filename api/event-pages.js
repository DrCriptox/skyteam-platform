// api/event-pages.js — EPIC Event Management: CRUD + AI Generation + Registration + Analytics
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const FAL_KEY = process.env.FAL_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const RESEND_KEY = process.env.RESEND_API_KEY || process.env.RESEND_KEY;

const SB_H = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };
const SB = (path, opts) => fetch(SUPABASE_URL + '/rest/v1/' + path, { ...opts, headers: { ...SB_H, ...(opts && opts.headers || {}) } });

// ── Push to specific user ──
async function pushToUser(username, title, body, url) {
  if (!VAPID_PRIVATE_KEY) return;
  try {
    var webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    var r = await SB('push_subscriptions?username=eq.' + encodeURIComponent(username) + '&select=subscription');
    var subs = await r.json();
    if (!Array.isArray(subs) || !subs.length) return;
    var payload = JSON.stringify({ title: title, body: body, url: url || '/', tag: 'event-' + Date.now(), data: { url: url || '/' } });
    for (var i = 0; i < subs.length; i++) {
      try { await webpush.sendNotification(subs[i].subscription, payload); } catch(e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          try { await SB('push_subscriptions?endpoint=eq.' + encodeURIComponent(subs[i].subscription.endpoint), { method: 'DELETE' }); } catch(x) {}
        }
      }
    }
  } catch(e) { console.error('[EVENT] Push error:', e.message); }
}

// ── Push to ALL subscribers ──
async function broadcastPush(title, body, url) {
  if (!VAPID_PRIVATE_KEY) return;
  try {
    var webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    var r = await SB('push_subscriptions?select=subscription,username');
    var subs = await r.json();
    if (!Array.isArray(subs) || !subs.length) return;
    var payload = JSON.stringify({ title: title, body: body, url: url || '/', tag: 'event-broadcast-' + Date.now(), data: { url: url || '/' } });
    for (var i = 0; i < subs.length; i++) {
      try { await webpush.sendNotification(subs[i].subscription, payload); } catch(e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          try { await SB('push_subscriptions?endpoint=eq.' + encodeURIComponent(subs[i].subscription.endpoint), { method: 'DELETE' }); } catch(x) {}
        }
      }
    }
  } catch(e) { console.error('[EVENT] Broadcast error:', e.message); }
}

// ── Slug generator ──
function makeSlug(titulo, ciudad) {
  var base = (titulo + ' ' + (ciudad || '')).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').substring(0, 60);
  return base + '-' + Date.now().toString(36).slice(-4);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    var action = (req.body && req.body.action) || (req.query && req.query.action) || '';

    // ═══════════════════════════════════════════════════
    //  CREATE — Nuevo evento draft
    // ═══════════════════════════════════════════════════
    if (action === 'create' && req.method === 'POST') {
      var b = req.body;
      if (!b.username || !b.titulo || !b.fecha) return res.status(400).json({ error: 'titulo, fecha, username required' });

      // Rank check: only NOVA 1500+ (rango >= 3) or admin can create events
      var MIN_RANK = 4; // NOVA 5K
      try {
        var rkR = await SB('users?username=eq.' + encodeURIComponent(b.username) + '&select=rank,is_admin&limit=1');
        var rkRows = await rkR.json();
        if (Array.isArray(rkRows) && rkRows.length) {
          var userRango = parseInt(rkRows[0].rank) || 0;
          var isAdm = rkRows[0].is_admin;
          if (userRango < MIN_RANK && !isAdm) {
            return res.status(403).json({ error: 'Se requiere rango NOVA 5K o superior para crear eventos' });
          }
        } else {
          return res.status(403).json({ error: 'Usuario no encontrado' });
        }
      } catch(e) { return res.status(500).json({ error: 'Error verificando rango' }); }

      var slug = makeSlug(b.titulo, b.ciudad);
      var eventData = {
        created_by: b.username,
        slug: slug,
        titulo: b.titulo,
        descripcion: b.descripcion || '',
        tipo: b.tipo || 'presencial',
        fecha: b.fecha,
        hora: b.hora || '',
        ciudad: b.ciudad || '',
        lugar: b.lugar || '',
        direccion: b.direccion || '',
        link_virtual: b.link_virtual || '',
        capacidad: parseInt(b.capacidad) || 100,
        precio: b.precio || 'Gratis',
        whatsapp_pago: '',
        vsl_url: b.vsl_url || '',
        flyer_url: b.flyer_url || '',
        testimonios: b.testimonios || null,
        status: 'draft',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Auto-fill WhatsApp from creator's profile
      try {
        var waR = await SB('users?username=eq.' + encodeURIComponent(b.username) + '&select=whatsapp&limit=1');
        var waRows = await waR.json();
        if (Array.isArray(waRows) && waRows.length && waRows[0].whatsapp) {
          eventData.whatsapp_pago = waRows[0].whatsapp;
        }
      } catch(e) {}

      var r = await SB('event_pages', { method: 'POST', body: JSON.stringify(eventData) });
      if (!r.ok) { var err = await r.text(); return res.status(500).json({ error: 'Save failed: ' + err.substring(0, 200) }); }
      var saved = await r.json();
      console.log('[EVENT] Created:', slug, 'by', b.username);
      return res.status(201).json({ ok: true, event: saved[0], slug: slug });
    }

    // ═══════════════════════════════════════════════════
    //  GENERATE — AI content + poster
    // ═══════════════════════════════════════════════════
    if (action === 'generate' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id && !b.slug) return res.status(400).json({ error: 'event_id or slug required' });

      // Fetch event
      var q = b.event_id ? 'id=eq.' + b.event_id : 'slug=eq.' + encodeURIComponent(b.slug);
      var evR = await SB('event_pages?' + q + '&select=*&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Event not found' });
      var ev = evRows[0];

      // Fetch creator info for speaker section
      var creatorInfo = { name: ev.created_by, rango: '', photo: '' };
      try {
        var uR = await SB('users?username=eq.' + encodeURIComponent(ev.created_by) + '&select=name,rank,photo&limit=1');
        var uRows = await uR.json();
        if (Array.isArray(uRows) && uRows.length) {
          creatorInfo.name = uRows[0].name || ev.created_by;
          creatorInfo.rango = _rankName(parseInt(uRows[0].rank) || 0);
          creatorInfo.photo = uRows[0].photo || '';
        }
      } catch(e) {}

      // ── Step 1: GPT-4o generates PREMIUM copy ──
      var aiContent = null;
      if (OPENAI_KEY) {
        var tipoLabel = ev.tipo === 'virtual' ? 'virtual (online)' : ev.tipo === 'hibrido' ? 'hibrido' : 'presencial';
        var prompt = 'Evento: "' + ev.titulo + '"\nTipo: ' + tipoLabel
          + '\nAnfitrion: ' + creatorInfo.name + (creatorInfo.rango ? ' (' + creatorInfo.rango + ')' : '')
          + '\nFecha: ' + ev.fecha + (ev.hora ? ' a las ' + ev.hora : '')
          + (ev.ciudad ? '\nCiudad: ' + ev.ciudad : '')
          + (ev.descripcion ? '\nDescripcion: ' + ev.descripcion : '')
          + '\n' + (ev.precio && ev.precio !== 'Gratis' ? 'Precio: ' + ev.precio : 'Entrada GRATUITA')
          + '\nCapacidad: ' + (ev.capacidad || 100) + ' personas'
          + '\n\nResponde UNICAMENTE JSON valido sin markdown ni backticks:\n'
          + '{"headline":"maximo 8 palabras, poderoso, genera curiosidad",'
          + '"subheadline":"frase que active el deseo de asistir, 15 palabras max",'
          + '"hook":"1 parrafo corto que toque el dolor del lector y prometa la solucion (60 palabras)",'
          + '"about":"HTML con 3 bloques <p>. Bloque 1: dolor (que le frustra al lector). Bloque 2: la transformacion que vivira en el evento. Bloque 3: por que este evento es diferente.",'
          + '"bullets":["emoji beneficio 1","emoji beneficio 2","emoji beneficio 3","emoji beneficio 4","emoji beneficio 5","emoji beneficio 6","emoji beneficio 7"],'
          + '"speaker_intro":"bio de ' + (creatorInfo.name || 'el anfitrion') + ' en 30 palabras, USA SU NOMBRE REAL, profesional y humano",'
          + '"cta_text":"texto boton, max 5 palabras, urgente",'
          + '"urgency_text":"frase escasez con numero de cupos",'
          + '"social_proof":"frase tipo: Ya +X emprendedores confirmaron su asistencia",'
          + '"guarantee":"frase de garantia o promesa del evento",'
          + '"faq":[{"q":"pregunta frecuente 1","a":"respuesta corta"},{"q":"pregunta 2","a":"respuesta"},{"q":"pregunta 3","a":"respuesta"}]}';

        try {
          var aiR = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
            body: JSON.stringify({ model: 'gpt-4o', max_tokens: 1200, temperature: 0.8,
              messages: [
                { role: 'system', content: 'Eres el copywriter #1 del mundo en eventos de negocios y network marketing. Creas copy que LLENA estadios. Tu estilo combina a Tony Robbins, Russell Brunson, Grant Cardone y Robert Kiyosaki. REGLAS ESTRICTAS:\n- Headline: EXACTAMENTE 4-8 palabras, poderoso, genera curiosidad inmediata\n- Hook: usa formula PAS (Pain-Agitate-Solve) en EXACTAMENTE 2-3 frases cortas\n- About: usa <strong> para resaltar 2-3 frases clave por parrafo. Max 35 palabras por parrafo. Formato dolor→transformacion→diferenciador\n- Bullets: CADA uno empieza con emoji DIFERENTE y relevante. Son beneficios TRANSFORMADORES, no caracteristicas\n- CTA: verbo de ACCION urgente, max 4 palabras\n- Urgency: incluye numero de cupos especifico\n- Social proof: debe sonar REAL y especifico\n- Guarantee: promesa concreta y medible\n- FAQ: respuestas de MAX 20 palabras, directas y que eliminen objeciones\nContexto: SkyTeam Global es una franquicia digital que ensena a generar multiples fuentes de ingresos desde el celular. Los asistentes son emprendedores, lideres de equipo y personas que buscan libertad financiera. El evento es en ' + (ev.ciudad || 'Latinoamerica') + '.' },
                { role: 'user', content: prompt }
              ] })
          });
          if (aiR.ok) {
            var aiData = await aiR.json();
            var txt = (aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) || '';
            var jsonM = txt.match(/\{[\s\S]*\}/);
            if (jsonM) aiContent = JSON.parse(jsonM[0]);
          }
        } catch(e) { console.error('[EVENT] AI content error:', e.message); }
      }

      // Fallback content if AI fails
      if (!aiContent) {
        aiContent = {
          headline: ev.titulo,
          subheadline: 'El evento que va a transformar tu forma de generar ingresos',
          hook: 'Si estas cansado de trabajar mas y ganar menos, este evento es para ti. Descubre el sistema que esta cambiando la vida de miles de emprendedores en todo el continente.',
          about: '<p>Muchos emprendedores trabajan 12 horas al dia sin ver resultados reales. El sistema tradicional no funciona — y lo sabes.</p><p>En este evento exclusivo descubriras un modelo de negocio digital que ya esta generando resultados para personas como tu, sin importar tu experiencia previa.</p><p>Este no es otro seminario motivacional. Es un evento practico donde saldras con un plan de accion claro para los proximos 90 dias.</p>',
          bullets: ['🚀 Sistema probado para generar ingresos desde tu celular', '💰 Modelo de franquicia digital sin inversion millonaria', '🤝 Networking con lideres que ya generan resultados', '📱 Herramientas digitales que automatizan tu negocio', '🧠 Mentorias con emprendedores de alto nivel', '🔥 Plan de accion de 90 dias personalizado', '🎯 Acceso a comunidad exclusiva de soporte'],
          speaker_intro: 'Lider y emprendedor digital con amplia experiencia transformando vidas a traves de la franquicia digital.',
          cta_text: 'Reserva tu Cupo YA',
          urgency_text: 'Solo ' + (ev.capacidad || 100) + ' cupos disponibles — Se agotan rapido!',
          social_proof: 'Ya +50 emprendedores confirmaron su asistencia',
          guarantee: 'Si no sales con al menos 3 estrategias nuevas para generar ingresos, te devolvemos tu tiempo.',
          faq: [{ q: 'Necesito experiencia previa?', a: 'No. El evento esta disenado para principiantes y expertos por igual.' }, { q: 'Que necesito llevar?', a: 'Solo tu celular y muchas ganas de aprender. Todo el material se entrega digital.' }, { q: 'Puedo llevar invitados?', a: 'Si, pero cada persona debe registrarse por separado. Los cupos son limitados.' }]
        };
      }

      // ── Step 2: FAL.ai generates CINEMA poster ──
      var posterUrl = '';
      if (FAL_KEY) {
        var imgPrompt = 'Cinematic movie poster style, dramatic lighting from below, '
          + 'dark navy blue and gold color palette, epic scale, '
          + 'abstract luxurious geometric shapes, bokeh light particles, '
          + 'volumetric fog, golden rim lighting, lens flares, '
          + 'premium exclusive VIP event atmosphere, '
          + 'no text, no letters, no words, no people, no faces, '
          + 'ultra-high quality, 8K, photorealistic rendering, '
          + 'suitable as a Hollywood movie poster background for a business event'
          + (ev.ciudad ? ' in ' + ev.ciudad : '') + '.';
        try {
          var imgR = await fetch('https://fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: { 'Authorization': 'Key ' + FAL_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: imgPrompt, image_size: { width: 1024, height: 1536 }, num_images: 1, num_inference_steps: 8, enable_safety_checker: false })
          });
          if (imgR.ok) {
            var imgData = await imgR.json();
            if (imgData.images && imgData.images[0]) posterUrl = imgData.images[0].url;
          }
        } catch(e) { console.error('[EVENT] FAL poster error:', e.message); }
      }

      // ── Step 3: Build HTML landing ──
      var aiHtml = buildEventHTML(ev, aiContent, creatorInfo, posterUrl);

      // Save to DB
      var upR = await SB('event_pages?id=eq.' + ev.id, {
        method: 'PATCH',
        body: JSON.stringify({
          ai_html: aiHtml,
          ai_poster_url: posterUrl,
          ai_content: aiContent,
          updated_at: new Date().toISOString()
        })
      });

      console.log('[EVENT] Generated AI landing for:', ev.slug, 'poster:', posterUrl ? 'yes' : 'no');
      return res.status(200).json({ ok: true, aiContent: aiContent, posterUrl: posterUrl, htmlLength: aiHtml.length });
    }

    // ═══════════════════════════════════════════════════
    //  PUBLISH — Make event public
    // ═══════════════════════════════════════════════════
    if (action === 'publish' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id || !b.username) return res.status(400).json({ error: 'event_id + username required' });

      var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=created_by,titulo,ciudad,slug&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Not found' });
      if (evRows[0].created_by !== b.username) return res.status(403).json({ error: 'Only creator can publish' });

      await SB('event_pages?id=eq.' + b.event_id, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published', is_public: true, updated_at: new Date().toISOString() })
      });

      // Broadcast push to team
      var titulo = evRows[0].titulo;
      var ciudad = evRows[0].ciudad;
      broadcastPush(
        '🎪 Nuevo Evento: ' + titulo,
        (ciudad ? ciudad + ' — ' : '') + 'Comparte tu link personalizado!',
        '/?nav=skyteam'
      ).catch(function(){});

      console.log('[EVENT] Published:', evRows[0].slug);
      return res.status(200).json({ ok: true, slug: evRows[0].slug });
    }

    // ═══════════════════════════════════════════════════
    //  UPDATE — Edit event data
    // ═══════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════
    //  BROADCAST PUSH — Send push to all users (admin only)
    // ═══════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════
    //  MIXLR — Get current daily image URL (cache-busted)
    // ═══════════════════════════════════════════════════
    if (action === 'getMixlrImage') {
      var url = SUPABASE_URL + '/storage/v1/object/public/event-assets/mixlr/daily.jpg?v=' + Math.floor(Date.now() / 60000);
      return res.status(200).json({ ok: true, url: url });
    }

    // ═══════════════════════════════════════════════════
    //  MIXLR — Send daily email (manual or cron)
    // ═══════════════════════════════════════════════════
    if (action === 'sendMixlrEmail' && req.method === 'POST') {
      if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_KEY not configured' });
      // Get all unique user emails
      var uR2 = await SB('users?select=email&email=neq.null&email=neq.&limit=1000');
      var users2 = await uR2.json();
      if (!Array.isArray(users2)) return res.status(500).json({ error: 'Failed to fetch users' });
      var rawEmails2 = users2.map(function(u) { return (u.email || '').toLowerCase().trim(); }).filter(function(e) { return e && e.indexOf('@') > 0; });
      var emails2 = Array.from(new Set(rawEmails2));

      var imgUrl = SUPABASE_URL + '/storage/v1/object/public/event-assets/mixlr/daily.jpg?v=' + Math.floor(Date.now() / 60000);
      var subject = '🎙️ Tu dosis diaria MIXLR — Conéctate AHORA';
      var html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a1a;color:#fff;padding:0;border-radius:16px;overflow:hidden">'
        + '<div style="position:relative;overflow:hidden;max-height:320px;">'
        + '<img src="' + imgUrl + '" alt="MIXLR" style="width:100%;display:block;opacity:0.35;" />'
        + '<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(10,10,26,0.3) 0%,rgba(10,10,26,0.85) 60%,rgba(10,10,26,1) 100%);"></div>'
        + '<div style="position:absolute;bottom:0;left:0;right:0;padding:24px 30px 30px;">'
        + '<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#E24B4A;padding:6px 18px;border-radius:8px;"><span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:4px;">MIXLR</span></td></tr></table>'
        + '<h1 style="color:#fff;font-size:24px;margin:12px 0 6px;font-weight:800;">Dosis Diaria MIXLR</h1>'
        + '<p style="color:#d4af37;font-size:12px;font-weight:600;margin:0;text-transform:uppercase;letter-spacing:2px;">Crecimiento Personal &bull; Mentalidad</p>'
        + '</div>'
        + '</div>'
        + '<div style="padding:30px">'
        + '<p style="color:rgba(255,255,255,0.85);font-size:16px;line-height:1.7;margin:0 0 16px">Tu <strong style="color:#d4af37">dosis diaria de crecimiento personal y mentalidad</strong> que te va a ayudar a:</p>'
        + '<div style="background:rgba(212,175,55,0.05);border-left:3px solid #d4af37;padding:16px 20px;margin:20px 0;border-radius:8px"><div style="color:rgba(255,255,255,0.85);font-size:15px;line-height:2">🧠 <strong>Expandir tu mente</strong><br>💪 <strong>Desarrollar tus habilidades</strong><br>📚 <strong>Aumentar tu conocimiento</strong><br>🎯 <strong>Lograr los resultados</strong> que siempre has soñado</div></div>'
        + '<p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.7;text-align:center;margin:24px 0">No te lo pierdas. Una sesión diaria que cambia vidas.</p>'
        + '<div style="text-align:center;margin:30px 0 10px"><a href="https://innovationsimplifies.mixlr.com/" style="display:inline-block;padding:18px 50px;border-radius:14px;background:linear-gradient(135deg,#E24B4A,#c0392b);color:#fff;font-size:18px;font-weight:800;text-decoration:none;box-shadow:0 4px 20px rgba(226,75,74,0.4);letter-spacing:0.5px">🔗 Conectarme AHORA</a></div>'
        + '<p style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;margin-top:20px">Si el botón no funciona, copia este link:<br><a href="https://innovationsimplifies.mixlr.com/" style="color:#d4af37;word-break:break-all">https://innovationsimplifies.mixlr.com/</a></p>'
        + '</div>'
        + '<div style="padding:14px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.3)"><img src="https://skyteam.global/logo-skyteam-white.png" alt="SkyTeam" width="100" style="opacity:0.7;margin-bottom:6px"><br><p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0">SkyTeam Global — Tu plataforma de crecimiento</p></div>'
        + '</div>';

      var sent2 = 0;
      for (var i2 = 0; i2 < emails2.length; i2 += 100) {
        var batch2 = emails2.slice(i2, i2 + 100);
        var batchBody2 = batch2.map(function(em) { return { from: 'SkyTeam Global <lideres@skyteam.global>', to: [em], subject: subject, html: html }; });
        try {
          var er = await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(batchBody2)
          });
          if (er.ok) sent2 += batch2.length;
        } catch(e) {}
      }
      console.log('[MIXLR] Daily email sent to', sent2, 'unique users');
      return res.status(200).json({ ok: true, sent: sent2 });
    }

    if (action === 'broadcastPush' && req.method === 'POST') {
      var b = req.body;
      if (!b.title || !b.body) return res.status(400).json({ error: 'title + body required' });
      await broadcastPush(b.title, b.body, b.url || '/');
      return res.status(200).json({ ok: true, sent: true });
    }

    // ═══════════════════════════════════════════════════
    //  BROADCAST EMAIL — Send email to all users (admin)
    // ═══════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════
    //  SEND TICKET — Email ticket image to guest
    // ═══════════════════════════════════════════════════
    if (action === 'sendTicket' && req.method === 'POST') {
      var b = req.body;
      if (!b.email || !b.image) return res.status(400).json({ error: 'email + image required' });
      if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_KEY not configured' });
      // Get event info
      var evInfo = { titulo: 'Evento SkyTeam', fecha: '', ciudad: '' };
      if (b.event_id) {
        try {
          var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=titulo,fecha,hora,ciudad,lugar&limit=1');
          var evRows = await evR.json();
          if (Array.isArray(evRows) && evRows.length) evInfo = evRows[0];
        } catch(e) {}
      }
      // Strip data URI prefix
      var imgData = b.image;
      if (imgData.indexOf(',') > -1) imgData = imgData.split(',')[1];
      // Build email with attached ticket
      try {
        var emailR = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SkyTeam Events <lideres@skyteam.global>',
            to: [b.email],
            subject: '🎫 Tu entrada para ' + evInfo.titulo,
            html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a1a;color:#fff;padding:30px;border-radius:16px">'
              + '<h1 style="color:#d4af37;font-size:22px;margin:0 0 10px">🎫 ¡Tu entrada esta lista!</h1>'
              + '<p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6">Hola <strong>' + (b.nombre || 'Invitado') + '</strong>,</p>'
              + '<p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6">Te esperamos en <strong>' + evInfo.titulo + '</strong>.</p>'
              + '<p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6">📅 ' + (evInfo.fecha || '') + (evInfo.hora ? ' — ' + evInfo.hora : '') + '</p>'
              + (evInfo.ciudad ? '<p style="color:rgba(255,255,255,0.7);font-size:14px">📍 ' + evInfo.ciudad + (evInfo.lugar ? ' — ' + evInfo.lugar : '') + '</p>' : '')
              + '<p style="color:rgba(255,255,255,0.7);font-size:14px;margin-top:20px">Tu entrada esta adjunta a este correo. Guardala bien, la necesitaras al ingresar.</p>'
              + (b.ticketCode ? '<p style="color:#d4af37;font-size:12px;font-family:monospace;margin-top:14px;padding:10px;background:rgba(212,175,55,0.1);border-radius:8px;text-align:center">Codigo: ' + b.ticketCode + '</p>' : '')
              + '<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:24px;text-align:center">SkyTeam Global</p>'
              + '</div>',
            attachments: [{ filename: 'entrada_' + (b.nombre || 'invitado').replace(/\s+/g, '_') + '.png', content: imgData }]
          })
        });
        if (!emailR.ok) {
          var errT = await emailR.text();
          console.error('[TICKET] Send failed:', emailR.status, errT.substring(0, 200));
          return res.status(500).json({ error: 'Email failed' });
        }
        return res.status(200).json({ ok: true, sent: true });
      } catch(e) {
        console.error('[TICKET] Error:', e.message);
        return res.status(500).json({ error: e.message });
      }
    }

    if (action === 'broadcastEmail' && req.method === 'POST') {
      var b = req.body;
      if (!b.subject || !b.html) return res.status(400).json({ error: 'subject + html required' });
      if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_KEY not configured' });
      // Get all user emails
      var uR = await SB('users?select=email&email=neq.null&email=neq.&limit=1000');
      var users = await uR.json();
      if (!Array.isArray(users)) return res.status(500).json({ error: 'Failed to fetch users' });
      var rawEmails = users.map(function(u) { return (u.email || '').toLowerCase().trim(); }).filter(function(e) { return e && e.indexOf('@') > 0; });
      // Deduplicate emails (some users have 2 accounts with same email)
      var emails = Array.from(new Set(rawEmails));
      // Send in batches of 50 (Resend limit)
      var sent = 0, errors = 0;
      // Use Resend Batch API: up to 100 emails per call
      for (var i = 0; i < emails.length; i += 100) {
        var batch = emails.slice(i, i + 100);
        var batchBody = batch.map(function(email) {
          return { from: 'SkyTeam Global <lideres@skyteam.global>', to: [email], subject: b.subject, html: b.html };
        });
        try {
          var eR = await fetch('https://api.resend.com/emails/batch', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(batchBody)
          });
          if (eR.ok) { sent += batch.length; }
          else { var eTxt = await eR.text(); errors += batch.length; console.error('[BROADCAST] Batch error:', eR.status, eTxt.substring(0, 300)); }
        } catch(e) { errors += batch.length; console.error('[BROADCAST] Batch exception:', e.message); }
      }
      console.log('[BROADCAST] Sent email to', sent, 'users');
      return res.status(200).json({ ok: true, sent: sent });
    }

    // ═══════════════════════════════════════════════════
    //  DELETE — Remove event and all related data
    // ═══════════════════════════════════════════════════
    if (action === 'delete' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id || !b.username) return res.status(400).json({ error: 'event_id + username required' });
      var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=created_by&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Not found' });
      if (evRows[0].created_by !== b.username) return res.status(403).json({ error: 'Only creator can delete' });
      // Delete related data first (FK cascade should handle this, but be explicit)
      await SB('event_visits?event_id=eq.' + b.event_id, { method: 'DELETE' });
      await SB('event_registrations?event_id=eq.' + b.event_id, { method: 'DELETE' });
      await SB('event_pages?id=eq.' + b.event_id, { method: 'DELETE' });
      console.log('[EVENT] Deleted:', b.event_id, 'by', b.username);
      return res.status(200).json({ ok: true });
    }

    if (action === 'update' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id || !b.username) return res.status(400).json({ error: 'event_id + username required' });

      var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=created_by&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Not found' });
      if (evRows[0].created_by !== b.username) return res.status(403).json({ error: 'Only creator can update' });

      var updates = {};
      ['titulo', 'descripcion', 'tipo', 'fecha', 'hora', 'ciudad', 'lugar', 'direccion',
       'link_virtual', 'capacidad', 'precio', 'whatsapp_pago', 'vsl_url', 'flyer_url', 'testimonios', 'status'].forEach(function(f) {
        if (b[f] !== undefined) updates[f] = b[f];
      });
      updates.updated_at = new Date().toISOString();

      await SB('event_pages?id=eq.' + b.event_id, { method: 'PATCH', body: JSON.stringify(updates) });
      return res.status(200).json({ ok: true });
    }

    // ═══════════════════════════════════════════════════
    //  REBUILD — Rebuild HTML from edited ai_content
    // ═══════════════════════════════════════════════════
    if (action === 'rebuild' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id || !b.ai_content) return res.status(400).json({ error: 'event_id + ai_content required' });

      var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=*&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Event not found' });
      var ev = evRows[0];

      // Fetch creator info
      var creatorInfo = { name: ev.created_by, rango: '', photo: '' };
      try {
        var uR = await SB('users?username=eq.' + encodeURIComponent(ev.created_by) + '&select=name,rank,photo&limit=1');
        var uRows = await uR.json();
        if (Array.isArray(uRows) && uRows.length) {
          creatorInfo.name = uRows[0].name || ev.created_by;
          creatorInfo.rango = _rankName(parseInt(uRows[0].rank) || 0);
          creatorInfo.photo = uRows[0].photo || '';
        }
      } catch(e) {}

      // Rebuild HTML with edited content
      var aiHtml = buildEventHTML(ev, b.ai_content, creatorInfo, ev.ai_poster_url || '');

      await SB('event_pages?id=eq.' + b.event_id, {
        method: 'PATCH',
        body: JSON.stringify({ ai_html: aiHtml, ai_content: b.ai_content, updated_at: new Date().toISOString() })
      });

      console.log('[EVENT] Rebuilt landing for:', ev.slug);
      return res.status(200).json({ ok: true });
    }

    // ═══════════════════════════════════════════════════
    //  LIST — Published events for the team
    // ═══════════════════════════════════════════════════
    if (action === 'list') {
      var r = await SB('event_pages?status=eq.published&is_public=eq.true&select=id,slug,titulo,tipo,fecha,hora,ciudad,lugar,precio,ai_poster_url,created_by,capacidad,created_at&order=fecha.desc&limit=30');
      var events = await r.json();

      // Count registrations per event
      if (Array.isArray(events) && events.length) {
        try {
          var ids = events.map(function(e) { return e.id; });
          var regR = await SB('event_registrations?event_id=in.(' + ids.join(',') + ')&select=event_id');
          var regs = await regR.json();
          var counts = {};
          if (Array.isArray(regs)) regs.forEach(function(r) { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
          events.forEach(function(e) { e.registrations_count = counts[e.id] || 0; });
        } catch(e) {}
      }

      return res.status(200).json({ ok: true, events: events || [] });
    }

    // ═══════════════════════════════════════════════════
    //  MY EVENTS — Events I created
    // ═══════════════════════════════════════════════════
    if (action === 'myEvents') {
      var username = (req.body && req.body.username) || (req.query && req.query.username);
      if (!username) return res.status(400).json({ error: 'username required' });

      var r = await SB('event_pages?created_by=eq.' + encodeURIComponent(username) + '&select=id,slug,titulo,tipo,fecha,hora,ciudad,status,ai_poster_url,capacidad,created_at&order=created_at.desc&limit=20');
      var events = await r.json();

      // Count registrations
      if (Array.isArray(events) && events.length) {
        try {
          var ids = events.map(function(e) { return e.id; });
          var regR = await SB('event_registrations?event_id=in.(' + ids.join(',') + ')&select=event_id');
          var regs = await regR.json();
          var counts = {};
          if (Array.isArray(regs)) regs.forEach(function(r) { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
          events.forEach(function(e) { e.registrations_count = counts[e.id] || 0; });
        } catch(e) {}
      }

      return res.status(200).json({ ok: true, events: events || [] });
    }

    // ═══════════════════════════════════════════════════
    //  GET — Single event by slug (public)
    // ═══════════════════════════════════════════════════
    if (action === 'get') {
      var slug = (req.body && req.body.slug) || (req.query && req.query.slug);
      var eventId = (req.body && req.body.event_id) || (req.query && req.query.event_id);
      if (!slug && !eventId) return res.status(400).json({ error: 'slug or event_id required' });
      var query = eventId ? 'event_pages?id=eq.' + eventId : 'event_pages?slug=eq.' + encodeURIComponent(slug);
      var r = await SB(query + '&select=*&limit=1');
      var rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Event not found' });
      var ev = rows[0];
      delete ev.ai_html;
      return res.status(200).json(ev);
    }

    // ═══════════════════════════════════════════════════
    //  REGISTER — Public registration from landing
    // ═══════════════════════════════════════════════════
    if (action === 'register' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id || !b.nombre || !b.whatsapp) return res.status(400).json({ error: 'event_id, nombre, whatsapp required' });

      // Check event exists and is published
      var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=id,titulo,created_by,capacidad,slug,whatsapp_pago,precio&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Event not found' });
      var ev = evRows[0];

      // Check capacity
      var countR = await SB('event_registrations?event_id=eq.' + b.event_id + '&select=id', { headers: { ...SB_H, Prefer: 'count=exact' } });
      var countH = countR.headers.get('content-range');
      var totalRegs = 0;
      if (countH) { var m = countH.match(/\/(\d+)/); if (m) totalRegs = parseInt(m[1]); }
      if (ev.capacidad && totalRegs >= ev.capacidad) return res.status(400).json({ error: 'Evento lleno — no quedan cupos' });

      // Check duplicate (same whatsapp + same event)
      try {
        var dupR = await SB('event_registrations?event_id=eq.' + b.event_id + '&whatsapp=eq.' + encodeURIComponent(b.whatsapp) + '&select=id&limit=1');
        var dups = await dupR.json();
        if (Array.isArray(dups) && dups.length) return res.status(400).json({ error: 'Ya estas registrado en este evento' });
      } catch(e) {}

      // Get IP
      var ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || '').split(',')[0].trim();

      var regData = {
        event_id: b.event_id,
        ref_username: b.ref_username || null,
        nombre: b.nombre,
        whatsapp: b.whatsapp,
        email: b.email || null,
        ciudad: b.ciudad || null,
        notas: b.notas || null,
        status: 'registered',
        ip_address: ip,
        created_at: new Date().toISOString()
      };

      var r = await SB('event_registrations', { method: 'POST', body: JSON.stringify(regData) });
      if (!r.ok) { var err = await r.text(); return res.status(500).json({ error: 'Registration failed: ' + err.substring(0, 200) }); }

      // Push to creator
      pushToUser(ev.created_by,
        '🎉 Nuevo registro: ' + ev.titulo,
        b.nombre + ' se registro' + (b.ref_username ? ' via ' + b.ref_username : ''),
        '/?nav=skyteam'
      ).catch(function(){});

      // Push to referrer (if different from creator)
      if (b.ref_username && b.ref_username !== ev.created_by) {
        pushToUser(b.ref_username,
          '🎯 Tu link funciono!',
          b.nombre + ' se registro a "' + ev.titulo + '" con tu enlace',
          '/?nav=skyteam'
        ).catch(function(){});
      }

      // Email confirmation to registrant
      if (b.email && RESEND_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'SkyTeam Events <lideres@skyteam.global>',
              to: [b.email],
              subject: 'Confirmacion: ' + ev.titulo,
              html: '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">'
                + '<h2 style="color:#1a1a2e">🎪 Registro Confirmado</h2>'
                + '<p>Hola <strong>' + b.nombre + '</strong>,</p>'
                + '<p>Tu registro para <strong>' + ev.titulo + '</strong> esta confirmado.</p>'
                + '<p>Te esperamos!</p>'
                + '<p style="color:#888;font-size:12px">— SkyTeam Global</p></div>'
            })
          });
        } catch(e) { console.error('[EVENT] Email error:', e.message); }
      }

      // Gamification: +5 XP to referrer (direct Supabase update)
      if (b.ref_username) {
        try {
          // Get or create gamification profile
          var gR = await SB('gamification?user_ref=eq.' + encodeURIComponent(b.ref_username) + '&select=xp,level');
          var gRows = await gR.json();
          var currentXP = 0;
          if (Array.isArray(gRows) && gRows.length) {
            currentXP = gRows[0].xp || 0;
          } else {
            // Create profile
            await SB('gamification', { method: 'POST', body: JSON.stringify({ user_ref: b.ref_username, xp: 0, level: 1, streak_current: 0, streak_best: 0, achievements: [] }) });
          }
          var newXP = currentXP + 5;
          await SB('gamification?user_ref=eq.' + encodeURIComponent(b.ref_username), { method: 'PATCH', body: JSON.stringify({ xp: newXP, updated_at: new Date().toISOString() }) });
          await SB('xp_log', { method: 'POST', body: JSON.stringify({ user_ref: b.ref_username, action: 'event_referral', xp_amount: 5, details: 'Registro en ' + ev.titulo + ': ' + b.nombre }) });
        } catch(e) { console.error('[EVENT] Gamification error:', e.message); }
      }

      // Lookup referrer's WhatsApp — try landing_profiles first (same as Sky Sales IA), then users
      var refWhatsapp = '';
      var refName = '';
      if (b.ref_username) {
        try {
          // landing_profiles has the WhatsApp the socio configured for their personal landing
          var lpR = await SB('landing_profiles?ref=eq.' + encodeURIComponent(b.ref_username) + '&select=whatsapp,nombre&limit=1');
          var lpRows = await lpR.json();
          if (Array.isArray(lpRows) && lpRows.length) {
            refWhatsapp = lpRows[0].whatsapp || '';
            refName = lpRows[0].nombre || b.ref_username;
          }
          // Fallback to users table
          if (!refWhatsapp) {
            var refR = await SB('users?username=eq.' + encodeURIComponent(b.ref_username) + '&select=whatsapp,name&limit=1');
            var refRows = await refR.json();
            if (Array.isArray(refRows) && refRows.length) {
              if (!refWhatsapp) refWhatsapp = refRows[0].whatsapp || '';
              if (!refName || refName === b.ref_username) refName = refRows[0].name || b.ref_username;
            }
          }
        } catch(e) {}
      }

      console.log('[EVENT] Registration:', b.nombre, 'for', ev.slug, 'ref:', b.ref_username || 'direct');
      var result = { ok: true, registered: true, evento_titulo: ev.titulo };
      // WhatsApp priority: referrer > event creator
      var waTarget = refWhatsapp || ev.whatsapp_pago || '';
      var waName = refWhatsapp ? refName : ev.created_by;
      if (waTarget) {
        result.whatsapp_target = waTarget;
        result.whatsapp_name = waName;
      }
      if (ev.precio && ev.precio !== 'Gratis') result.precio = ev.precio;
      return res.status(201).json(result);
    }

    // ═══════════════════════════════════════════════════
    //  TRACK — Visit tracking from landing
    // ═══════════════════════════════════════════════════
    if (action === 'track' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id) return res.status(400).json({ error: 'event_id required' });
      var ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim();
      await SB('event_visits', { method: 'POST', body: JSON.stringify({
        event_id: b.event_id,
        ref_username: b.ref_username || null,
        ip: ip,
        fingerprint: b.fingerprint || null,
        device: b.device || null,
        created_at: new Date().toISOString()
      })});
      return res.status(200).json({ ok: true });
    }

    // ═══════════════════════════════════════════════════
    //  STATS — Analytics for event creator
    // ═══════════════════════════════════════════════════
    if (action === 'stats') {
      var eventId = (req.body && req.body.event_id) || (req.query && req.query.event_id);
      if (!eventId) return res.status(400).json({ error: 'event_id required' });

      // Visits by referrer
      var vR = await SB('event_visits?event_id=eq.' + eventId + '&select=ref_username,created_at');
      var visits = await vR.json();

      // Registrations by referrer
      var rR = await SB('event_registrations?event_id=eq.' + eventId + '&select=ref_username,nombre,whatsapp,ciudad,status,created_at&order=created_at.desc');
      var regs = await rR.json();

      // Aggregate by referrer
      var byRef = {};
      if (Array.isArray(visits)) visits.forEach(function(v) {
        var ref = v.ref_username || 'direct';
        if (!byRef[ref]) byRef[ref] = { visits: 0, registrations: 0 };
        byRef[ref].visits++;
      });
      if (Array.isArray(regs)) regs.forEach(function(r) {
        var ref = r.ref_username || 'direct';
        if (!byRef[ref]) byRef[ref] = { visits: 0, registrations: 0 };
        byRef[ref].registrations++;
      });

      return res.status(200).json({
        ok: true,
        totalVisits: Array.isArray(visits) ? visits.length : 0,
        totalRegistrations: Array.isArray(regs) ? regs.length : 0,
        byReferrer: byRef,
        registrations: regs || []
      });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch(err) {
    console.error('[EVENT] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  BUILD EVENT HTML — Full landing page template
// ═══════════════════════════════════════════════════════════════
function buildEventHTML(ev, content, creator, posterUrl) {
  var fecha = ev.fecha || '';
  var hora = ev.hora || '';
  var ciudad = ev.ciudad || '';
  var lugar = ev.lugar || '';
  var tipo = ev.tipo || 'presencial';
  var precio = ev.precio || 'Gratis';
  var capacidad = ev.capacidad || 100;
  var heroImg = posterUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80';
  var creatorPhoto = creator.photo && creator.photo.length < 500 ? '' : (creator.photo || '');
  var faq = content.faq || [];

  return '<!DOCTYPE html><html lang="es"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(ev.titulo) + ' — SkyTeam Event</title>'
    + '<meta name="description" content="' + esc(content.subheadline || ev.titulo) + '">'
    + '<meta property="og:title" content="' + esc(ev.titulo) + '">'
    + '<meta property="og:description" content="' + esc(content.subheadline || '') + '">'
    + '<meta property="og:image" content="' + esc(ev.flyer_url ? _driveImg(ev.flyer_url) : (posterUrl || '')) + '">'
    + '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
    + '<meta property="og:type" content="website">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:image" content="' + esc(ev.flyer_url ? _driveImg(ev.flyer_url) : (posterUrl || '')) + '">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:"Outfit",sans-serif;color:#e0e0e0;overflow-x:hidden;background:#06061a;background-image:radial-gradient(ellipse at 20% 10%, rgba(212,175,55,0.06) 0%, transparent 50%),radial-gradient(ellipse at 80% 60%, rgba(127,119,221,0.04) 0%, transparent 50%),radial-gradient(ellipse at 40% 90%, rgba(212,175,55,0.04) 0%, transparent 50%);background-attachment:fixed}'
    // Decorative orbs
    + 'body::before{content:"";position:fixed;top:30%;right:-150px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,0.08) 0%,transparent 70%);pointer-events:none;z-index:0}'
    + 'body::after{content:"";position:fixed;bottom:20%;left:-150px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(127,119,221,0.06) 0%,transparent 70%);pointer-events:none;z-index:0}'
    + '.ev-hero,.ev-s,.ev-hook,.ev-vsl,.ev-testimonials,.ev-faq,.ev-form-section,.ev-guarantee-premium,.ev-social-proof,.ev-footer{position:relative;z-index:1}'
    // Section divider with gold gradient line
    + '.ev-section-divider{max-width:600px;margin:20px auto;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.3),transparent)}'
    + '.ev-hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:60px 20px 40px}'
    + '.ev-hero-bg{position:absolute;inset:0;background:url("' + esc(heroImg) + '") center/cover no-repeat;filter:brightness(0.2) saturate(0.8)}'
    + '.ev-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,6,26,0.5) 0%,rgba(6,6,26,0.7) 40%,rgba(6,6,26,0.97) 100%)}'
    + '.ev-hero-content{position:relative;z-index:2;max-width:720px;animation:evFadeUp .8s ease}'
    + '@keyframes evFadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}'
    + '.ev-live{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;background:rgba(255,59,48,0.15);border:1px solid rgba(255,59,48,0.3);color:#ff3b30;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px}'
    + '.ev-live-dot{width:8px;height:8px;border-radius:50%;background:#ff3b30;animation:evPulse 1.5s infinite}'
    + '@keyframes evPulse{0%,100%{opacity:1}50%{opacity:0.3}}'
    + '.ev-badge{display:inline-block;padding:6px 18px;border-radius:20px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.25);color:#d4af37;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px}'
    + '.ev-h1{font-size:clamp(2.2rem,7vw,4rem);font-weight:800;color:#fff;line-height:1.1;margin-bottom:16px;text-shadow:0 4px 40px rgba(212,175,55,0.15)}'
    + '.ev-sub{font-size:clamp(1rem,3vw,1.25rem);color:rgba(255,255,255,0.7);font-weight:300;margin-bottom:24px;line-height:1.5}'
    + '.ev-social{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:20px;background:rgba(78,205,196,0.1);border:1px solid rgba(78,205,196,0.2);color:#4ecdc4;font-size:13px;font-weight:600;margin-bottom:24px}'
    + '.ev-meta{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:24px}'
    + '.ev-meta-item{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.06);font-size:13px;color:rgba(255,255,255,0.8)}'
    + '.ev-cd{display:flex;gap:10px;justify-content:center;margin:20px 0 28px}'
    + '.ev-cd-box{padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);text-align:center;min-width:64px}'
    + '.ev-cd-num{font-size:1.8rem;font-weight:700;color:#d4af37;line-height:1}'
    + '.ev-cd-label{font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-top:4px}'
    + '.ev-cta{display:inline-block;padding:16px 44px;border-radius:14px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0a0a1a;font-size:17px;font-weight:700;text-decoration:none;cursor:pointer;border:none;transition:all .25s;box-shadow:0 4px 24px rgba(212,175,55,0.3)}'
    + '.ev-cta:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(212,175,55,0.45)}'
    // Sections
    + '.ev-s{max-width:700px;margin:0 auto;padding:60px 20px}'
    + '.ev-s h2{font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px;text-align:center}'
    + '.ev-hook{max-width:700px;margin:0 auto;padding:40px 20px;text-align:center}'
    + '.ev-hook p{font-size:clamp(1.05rem,2.5vw,1.2rem);color:rgba(255,255,255,0.7);line-height:1.7;max-width:600px;margin:0 auto}'
    + '.ev-about p{color:rgba(255,255,255,0.7);line-height:1.8;margin-bottom:16px;font-size:1.05rem}'
    + '.ev-about strong{color:#d4af37}'
    // Benefits
    + '.ev-bullets{list-style:none;padding:0;display:grid;gap:10px}'
    + '.ev-bullets li{padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.85);font-size:1.05rem;line-height:1.4;transition:border .2s}'
    + '.ev-bullets li:hover{border-color:rgba(212,175,55,0.2)}'
    // Speaker
    + '.ev-speaker{display:flex;align-items:center;gap:20px;padding:28px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}'
    + '.ev-speaker-photo{width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid rgba(212,175,55,0.4);background:#1a1a2e;flex-shrink:0}'
    + '.ev-speaker-name{font-size:1.2rem;font-weight:700;color:#fff}'
    + '.ev-speaker-rank{display:inline-block;padding:3px 10px;border-radius:8px;background:rgba(212,175,55,0.12);color:#d4af37;font-size:11px;font-weight:600;margin-top:4px}'
    + '.ev-speaker-bio{color:rgba(255,255,255,0.6);font-size:14px;margin-top:8px;line-height:1.5}'
    // VSL
    + '.ev-vsl{max-width:700px;margin:0 auto;padding:40px 20px;text-align:center}'
    + '.ev-vsl-wrap{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:#000}'
    + '.ev-vsl-wrap iframe,.ev-vsl-wrap>div{position:absolute;top:0;left:0;width:100%;height:100%;border:0}'
    // Testimonials
    + '.ev-testimonials{max-width:700px;margin:0 auto;padding:40px 20px}'
    + '.ev-testimonial{padding:20px;margin-bottom:14px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)}'
    + '.ev-testimonial-written{display:flex;gap:14px;align-items:flex-start}'
    + '.ev-testimonial-photo{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,175,55,0.3);flex-shrink:0}'
    + '.ev-testimonial-text{color:rgba(255,255,255,0.75);font-style:italic;line-height:1.6;margin-bottom:8px;font-size:1rem}'
    + '.ev-testimonial-author{color:#d4af37;font-weight:600;font-size:14px}'
    + '.ev-testimonial-vid{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin-bottom:8px}'
    + '.ev-testimonial-vid iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}'
    // FAQ
    + '.ev-faq{max-width:700px;margin:0 auto;padding:40px 20px}'
    + '.ev-faq-item{border-bottom:1px solid rgba(255,255,255,0.06);padding:16px 0}'
    + '.ev-faq-q{color:#fff;font-weight:600;font-size:1rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center}'
    + '.ev-faq-q::after{content:"+";color:#d4af37;font-size:1.3rem;transition:transform .2s}'
    + '.ev-faq-q.open::after{transform:rotate(45deg)}'
    + '.ev-faq-a{color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s}'
    + '.ev-faq-a.open{max-height:200px;padding-top:10px}'
    // Form
    + '.ev-form-section{background:linear-gradient(180deg,rgba(212,175,55,0.04),rgba(6,6,26,0));padding:60px 20px}'
    + '.ev-form{max-width:480px;margin:0 auto;padding:32px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}'
    + '.ev-form h2{text-align:center;color:#fff;margin-bottom:20px;font-size:1.4rem}'
    + '.ev-form input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:#fff;font-size:15px;font-family:inherit;margin-bottom:12px;outline:none;transition:border .2s}'
    + '.ev-form input:focus{border-color:rgba(212,175,55,0.5)}'
    + '.ev-form input::placeholder{color:rgba(255,255,255,0.3)}'
    + '.ev-form-submit{width:100%;padding:16px;border-radius:14px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0a0a1a;font-size:17px;font-weight:700;border:none;cursor:pointer;margin-top:4px;transition:all .2s}'
    + '.ev-form-submit:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(212,175,55,0.3)}'
    + '.ev-form-msg{text-align:center;margin-top:12px;font-size:14px}'
    + '.ev-urgency{text-align:center;padding:10px;margin-top:14px;border-radius:10px;background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.15);color:#ff6b6b;font-size:13px;font-weight:600}'
    + '.ev-ref-card{display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:20px;border-radius:12px;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.12)}'
    + '.ev-ref-photo{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,175,55,0.3);flex-shrink:0}'
    + '.ev-ref-info{font-size:13px;color:rgba(255,255,255,0.6)}'
    + '.ev-ref-name{color:#fff;font-weight:600;font-size:14px}'
    // WA btn
    + '.ev-wa-btn{display:block;width:100%;padding:18px;margin-top:16px;border-radius:14px;background:#25D366;color:#fff;font-size:18px;font-weight:700;text-align:center;text-decoration:none;box-shadow:0 4px 15px rgba(37,211,102,0.4);transition:transform .2s}'
    + '.ev-wa-btn:hover{transform:translateY(-2px)}'
    // Guarantee + footer
    + '.ev-guarantee{max-width:700px;margin:0 auto;padding:30px 20px;text-align:center}'
    + '.ev-guarantee-box{padding:20px;border-radius:14px;background:rgba(78,205,196,0.05);border:1px solid rgba(78,205,196,0.1);color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6}'
    + '.ev-footer{text-align:center;padding:40px 20px 100px;color:rgba(255,255,255,0.25);font-size:12px}'
    + '.ev-footer a{color:rgba(212,175,55,0.5);text-decoration:none}'
    // Sticky CTA mobile
    + '.ev-sticky{position:fixed;bottom:0;left:0;right:0;z-index:100;padding:12px 16px;background:rgba(6,6,26,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(212,175,55,0.15);transform:translateY(100%);transition:transform .3s;display:flex;gap:10px;align-items:center}'
    + '.ev-sticky.show{transform:translateY(0)}'
    + '.ev-sticky-text{flex:1;font-size:12px;color:rgba(255,255,255,0.6);line-height:1.3}'
    + '.ev-sticky-text strong{color:#ff6b6b;display:block;font-size:13px}'
    + '.ev-sticky a{padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0a0a1a;font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0}'
    // Cupos bar
    + '.ev-cupos{max-width:400px;margin:16px auto 0;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,0.04);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.06)}'
    + '.ev-cupos-bar{height:6px;border-radius:3px;background:rgba(255,255,255,0.06);margin-top:6px;overflow:hidden}'
    + '.ev-cupos-fill{height:100%;border-radius:3px;transition:width 1s ease}'
    // Social proof avatars
    + '.ev-social-proof{max-width:700px;margin:0 auto;padding:20px;text-align:center}'
    + '.ev-avatars{display:flex;justify-content:center;gap:0;margin-top:10px}'
    + '.ev-avatar-circle{width:36px;height:36px;border-radius:50%;border:2px solid #06061a;margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff}'
    // Guarantee visual
    + '.ev-guarantee-premium{max-width:700px;margin:0 auto;padding:30px 20px;text-align:center}'
    + '.ev-guarantee-card{display:flex;align-items:center;gap:14px;padding:20px;border-radius:16px;background:rgba(78,205,196,0.04);border:1px solid rgba(78,205,196,0.12);text-align:left}'
    + '.ev-guarantee-shield{width:48px;height:48px;border-radius:12px;background:rgba(78,205,196,0.1);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}'
    // Scroll animations
    + '.ev-reveal{opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s}.ev-reveal.visible{opacity:1;transform:translateY(0)}'
    + '@media(max-width:600px){.ev-speaker{flex-direction:column;text-align:center}.ev-meta{flex-direction:column;align-items:center}}'
    + '</style></head><body>'

    // ── HERO (full-screen cinema) ──
    + '<section class="ev-hero">'
    + '<div class="ev-hero-bg"></div>'
    + '<div class="ev-hero-overlay"></div>'
    + '<div class="ev-hero-content">'
    + '<div class="ev-live"><span class="ev-live-dot"></span>' + (tipo === 'virtual' ? 'EVENTO VIRTUAL' : 'EVENTO EXCLUSIVO') + '</div><br>'
    + '<div class="ev-badge">' + (tipo === 'virtual' ? '💻 Online' : '📍 ' + esc(ciudad || 'Presencial')) + ' • ' + esc(fecha) + '</div>'
    + '<h1 class="ev-h1">' + esc(content.headline || ev.titulo) + '</h1>'
    + '<p class="ev-sub">' + esc(content.subheadline || '') + '</p>'
    + (content.social_proof ? '<div class="ev-social">🔥 ' + esc(content.social_proof) + '</div><br>' : '')
    + '<div class="ev-meta">'
    + '<div class="ev-meta-item">📅 ' + esc(fecha) + (hora ? ' • ' + esc(hora) : '') + '</div>'
    + (ciudad ? '<div class="ev-meta-item">📍 ' + esc(ciudad) + (lugar ? ' — ' + esc(lugar) : '') + '</div>' : '')
    + '<div class="ev-meta-item">💰 ' + esc(precio) + '</div>'
    + '<div class="ev-meta-item">👥 ' + capacidad + ' cupos</div>'
    + '</div>'
    + '<div class="ev-cd" id="ev-countdown"></div>'
    + '<a href="#ev-registro" class="ev-cta">' + esc(content.cta_text || 'Reserva tu Cupo YA') + '</a>'
    + '<div class="ev-cupos" id="ev-cupos"><div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:rgba(255,255,255,0.5)">Cupos reservados</span><span id="ev-cupos-text" style="color:#d4af37;font-weight:700">Cargando...</span></div><div class="ev-cupos-bar"><div id="ev-cupos-fill" class="ev-cupos-fill" style="width:0%;background:#d4af37"></div></div></div>'
    + '</div></section>'

    // ── FLYER (cartelera de cine) ──
    + (ev.flyer_url ? '<section class="ev-s ev-reveal" style="text-align:center;padding:40px 20px"><img src="' + esc(_driveImg(ev.flyer_url)) + '" alt="' + esc(ev.titulo) + '" style="max-width:100%;max-height:600px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 40px rgba(0,0,0,0.5);object-fit:contain"></section>' : '')

    // ── HOOK ──
    + (content.hook ? '<section class="ev-hook ev-reveal"><p>' + esc(content.hook) + '</p></section>' : '')

    // ── SOCIAL PROOF AVATARS (populated by JS) ──
    + '<section class="ev-social-proof ev-reveal" id="ev-social-section" style="display:none"><div style="font-size:13px;color:rgba(255,255,255,0.5)">Ellos ya confirmaron su asistencia</div><div class="ev-avatars" id="ev-avatars"></div><div id="ev-social-count" style="margin-top:8px;font-size:12px;color:#4ecdc4;font-weight:600"></div></section>'

    // ── VSL VIDEO ──
    + (function() {
      if (!ev.vsl_url) return '';
      var vi = _extractVideoId(ev.vsl_url);
      if (vi.platform === 'youtube') {
        return '<section class="ev-vsl ev-reveal"><h2 style="font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px">Mira este Video</h2>'
          + '<div class="ev-vsl-wrap"><div id="ev-vsl-player"></div></div>'
          + '<div id="ev-vsl-bar" style="max-width:700px;margin:8px auto 0;height:4px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden"><div id="ev-vsl-progress" style="width:0%;height:100%;background:linear-gradient(90deg,#d4af37,#b8860b);border-radius:2px;transition:width 0.3s"></div></div>'
          + '</section>';
      }
      if (vi.platform === 'drive') {
        return '<section class="ev-vsl ev-reveal"><h2 style="font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px">Mira este Video</h2>'
          + '<div class="ev-vsl-wrap"><iframe src="https://drive.google.com/file/d/' + vi.id + '/preview" allowfullscreen allow="autoplay"></iframe></div></section>';
      }
      return '<section class="ev-vsl ev-reveal"><h2 style="font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px">Mira este Video</h2>'
        + '<div class="ev-vsl-wrap"><iframe src="' + esc(_toEmbed(ev.vsl_url)) + '" allowfullscreen></iframe></div></section>';
    })()

    // ── ABOUT (pain → desire → bridge) ──
    + '<section class="ev-s ev-reveal"><h2>Lo que vas a Descubrir</h2>'
    + '<div class="ev-about">' + (content.about || '') + '</div>'
    + '</section>'

    // ── BENEFITS ──
    + '<section class="ev-s ev-reveal"><h2>Esto es lo que Obtendras</h2>'
    + '<ul class="ev-bullets">'
    + (content.bullets || []).map(function(b) { return '<li>' + esc(b) + '</li>'; }).join('')
    + '</ul></section>'

    // ── SPEAKER ──
    + '<section class="ev-s ev-reveal"><h2>Tu Anfitrion</h2>'
    + '<div class="ev-speaker">'
    + (creatorPhoto ? '<img class="ev-speaker-photo" src="' + esc(creatorPhoto) + '" alt="">' : '<div class="ev-speaker-photo" style="display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#d4af37">👤</div>')
    + '<div>'
    + '<div class="ev-speaker-name">' + esc(creator.name) + '</div>'
    + (creator.rango ? '<span class="ev-speaker-rank">' + esc(creator.rango) + '</span>' : '')
    + '<div class="ev-speaker-bio">' + esc(content.speaker_intro || '') + '</div>'
    + '</div></div></section>'

    // ── TESTIMONIALS ──
    + (Array.isArray(ev.testimonios) && ev.testimonios.length ? '<section class="ev-testimonials ev-reveal"><h2 style="font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px;text-align:center">Lo que Dicen Quienes Ya Asistieron</h2>' + ev.testimonios.map(function(t) {
      var tt = t.tipo || 'escrito';
      if (tt === 'video' && t.video_url) {
        return '<div class="ev-testimonial"><div class="ev-testimonial-vid"><iframe src="' + esc(_toEmbed(t.video_url)) + '" allowfullscreen></iframe></div>'
          + '<div class="ev-testimonial-author">— ' + esc(t.nombre || 'Anonimo') + '</div></div>';
      }
      var hasPhoto = t.foto_url && t.foto_url.trim();
      return '<div class="ev-testimonial"><div class="ev-testimonial-written">'
        + (hasPhoto ? '<img class="ev-testimonial-photo" src="' + esc(_driveImg(t.foto_url)) + '" alt="">' : '')
        + '<div><div class="ev-testimonial-text">"' + esc(t.texto || t.text || '') + '"</div>'
        + '<div class="ev-testimonial-author">— ' + esc(t.nombre || t.name || 'Anonimo') + '</div></div></div></div>';
    }).join('') + '</section>' : '')

    // ── FAQ ──
    + (faq.length ? '<section class="ev-faq ev-reveal"><h2 style="font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px;text-align:center">Preguntas Frecuentes</h2>'
      + faq.map(function(f, i) { return '<div class="ev-faq-item"><div class="ev-faq-q" onclick="this.classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')">' + esc(f.q || '') + '</div><div class="ev-faq-a">' + esc(f.a || '') + '</div></div>'; }).join('')
      + '</section>' : '')

    // ── REGISTRATION FORM + PROMOTER BADGE ──
    + '<section class="ev-form-section" id="ev-registro">'
    + '<div class="ev-form">'
    + '<!--REF_BADGE-->'
    + '<h2>' + esc(content.cta_text || 'Reserva tu Cupo') + '</h2>'
    + '<input type="text" id="ev-reg-nombre" placeholder="Tu nombre completo" required>'
    + '<input type="tel" id="ev-reg-wa" placeholder="WhatsApp (con codigo de pais)" required>'
    + '<input type="email" id="ev-reg-email" placeholder="Email (opcional)">'
    + '<button class="ev-form-submit" id="ev-reg-btn" onclick="submitEventReg()">' + esc(content.cta_text || 'Reserva tu Cupo YA') + ' →</button>'
    + '<div class="ev-form-msg" id="ev-reg-msg"></div>'
    + '<div class="ev-urgency">' + esc(content.urgency_text || 'Solo ' + capacidad + ' cupos — Se agotan rapido!') + '</div>'
    + '</div></section>'

    // ── GUARANTEE (premium visual) ──
    + (content.guarantee ? '<section class="ev-guarantee-premium ev-reveal"><div class="ev-guarantee-card"><div class="ev-guarantee-shield">🛡️</div><div><div style="font-size:13px;font-weight:700;color:#4ecdc4;margin-bottom:4px">Nuestra Garantia</div><div style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6">' + esc(content.guarantee) + '</div></div></div></section>' : '')

    // ── FOOTER ──
    + '<footer class="ev-footer">'
    + '<p>Organizado con <a href="https://skyteam.global">SkyTeam Global</a></p>'
    + '</footer>'

    // ── STICKY CTA (mobile) ──
    + '<div class="ev-sticky" id="ev-sticky"><div class="ev-sticky-text"><strong>Cupos limitados</strong>' + esc(content.urgency_text || '') + '</div><a href="#ev-registro">' + esc(content.cta_text || 'Reservar') + '</a></div>'

    // ── SCRIPTS ──
    + '<script>'
    + 'var EVT_ID="' + ev.id + '";'
    + 'var EVT_SLUG="' + esc(ev.slug) + '";'
    + 'var EVT_DATE="' + esc(fecha) + '";'
    + 'var EVT_TIME="' + esc(hora) + '";'
    + 'var EVT_WA_PAGO="' + esc(ev.whatsapp_pago || '') + '";'
    + 'var EVT_PRECIO="' + esc(precio) + '";'
    + 'var REF=new URLSearchParams(location.search).get("ref")||"";'

    // Load cupos + social proof dynamically
    + 'fetch("/api/event-pages?action=stats&event_id="+EVT_ID).then(function(r){return r.json()}).then(function(d){'
    + 'if(!d.ok)return;'
    + 'var realRegs=d.totalRegistrations||0;var cap=' + capacidad + ';'
    // Social proof formula:
    // - Base: arranca en 65% del capacity para generar urgencia
    // - Reales: cada registro real suma 1:1 hasta llegar a cap-10
    // - Ultimos 10: cada 10 registros reales sube solo 1 (ritmo lento)
    // - NUNCA muestra "lleno" (max 99%)
    + 'var base=Math.floor(cap*0.65);'
    + 'var displayRegs;'
    + 'var umbral=cap-10;'  // cuando displayRegs llega aqui, frena
    + 'var normalCrecimiento=base+realRegs;'
    + 'if(normalCrecimiento<=umbral){displayRegs=normalCrecimiento;}'
    + 'else{var excedente=normalCrecimiento-umbral;var lento=Math.floor(excedente/10);displayRegs=Math.min(cap-1,umbral+lento);}'
    + 'var displayRemaining=Math.max(1,cap-displayRegs);'
    + 'var pct=Math.min(99,Math.round(displayRegs/cap*100));'
    + 'var cuposEl=document.getElementById("ev-cupos-text");'
    + 'var fillEl=document.getElementById("ev-cupos-fill");'
    + 'if(cuposEl)cuposEl.textContent=displayRegs+" de "+cap+" reservados";'
    + 'if(fillEl){fillEl.style.width=pct+"%";fillEl.style.background=pct>85?"#E24B4A":pct>70?"#FF8C00":"#d4af37";}'
    // Social proof avatars
    + 'var names=(d.registrations||[]).slice(0,8);'
    + 'var avEl=document.getElementById("ev-avatars");'
    + 'var secEl=document.getElementById("ev-social-section");'
    + 'if(names.length>0&&avEl&&secEl){'
    + 'secEl.style.display="block";'
    + 'var colors=["#d4af37","#7F77DD","#1D9E75","#E24B4A","#4ecdc4","#FF8C00","#25D366","#85B7EB"];'
    + 'var avH="";names.forEach(function(n,i){var ini=((n.nombre||"?")[0]||"?").toUpperCase();avH+="<div class=\\"ev-avatar-circle\\" style=\\"background:"+colors[i%8]+"\\">"+ini+"</div>";});'
    + 'avEl.innerHTML=avH;'
    + 'var countEl=document.getElementById("ev-social-count");'
    + 'if(countEl&&realRegs>8)countEl.textContent="+ "+(realRegs-8)+" personas mas";'
    + '}'
    // Update sticky CTA with cupos (display version for urgency)
    + 'var stickyText=document.querySelector(".ev-sticky-text strong");'
    + 'if(stickyText)stickyText.textContent="Solo quedan "+displayRemaining+" cupos";'
    + '}).catch(function(){});'

    // Track visit
    + 'try{var fp=screen.width+"x"+screen.height+"."+screen.colorDepth+"."+Intl.DateTimeFormat().resolvedOptions().timeZone+"."+navigator.language;'
    + 'var dv=window.innerWidth<768?"mobile":"desktop";'
    + 'fetch("/api/event-pages?action=track",{method:"POST",headers:{"Content-Type":"application/json"},'
    + 'body:JSON.stringify({event_id:EVT_ID,ref_username:REF||null,fingerprint:fp,device:dv})}).catch(function(){});}catch(e){}'

    // Countdown (glassmorphism boxes)
    + 'function updateCD(){'
    + 'var t=EVT_DATE;if(EVT_TIME)t+="T"+EVT_TIME+":00";var end=new Date(t).getTime();if(isNaN(end))return;'
    + 'var now=Date.now();var d=end-now;if(d<=0){document.getElementById("ev-countdown").innerHTML="<div style=\\"color:#d4af37;font-size:1.2rem\\">El evento ya inicio!</div>";return;}'
    + 'var days=Math.floor(d/86400000);var hrs=Math.floor((d%86400000)/3600000);var mins=Math.floor((d%3600000)/60000);var secs=Math.floor((d%60000)/1000);'
    + 'document.getElementById("ev-countdown").innerHTML='
    + '"<div class=\\"ev-cd-box\\"><div class=\\"ev-cd-num\\">"+days+"</div><div class=\\"ev-cd-label\\">Dias</div></div>"'
    + '+"<div class=\\"ev-cd-box\\"><div class=\\"ev-cd-num\\">"+hrs+"</div><div class=\\"ev-cd-label\\">Horas</div></div>"'
    + '+"<div class=\\"ev-cd-box\\"><div class=\\"ev-cd-num\\">"+mins+"</div><div class=\\"ev-cd-label\\">Min</div></div>"'
    + '+"<div class=\\"ev-cd-box\\"><div class=\\"ev-cd-num\\">"+secs+"</div><div class=\\"ev-cd-label\\">Seg</div></div>";'
    + '}updateCD();setInterval(updateCD,1000);'
    // Scroll reveal animations
    + 'var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add("visible");});},{threshold:0.1});'
    + 'document.querySelectorAll(".ev-reveal").forEach(function(el){obs.observe(el);});'
    // Sticky CTA on scroll
    + 'var sticky=document.getElementById("ev-sticky");'
    + 'window.addEventListener("scroll",function(){if(window.scrollY>600){sticky.classList.add("show");}else{sticky.classList.remove("show");}});'

    // Submit registration — shows WA button instead of window.open (fixes mobile popup blocker)
    + 'function submitEventReg(){'
    + 'var btn=document.getElementById("ev-reg-btn");var msg=document.getElementById("ev-reg-msg");'
    + 'var nombre=document.getElementById("ev-reg-nombre").value.trim();'
    + 'var wa=document.getElementById("ev-reg-wa").value.trim();'
    + 'var email=document.getElementById("ev-reg-email").value.trim();'
    + 'if(!nombre||!wa){msg.innerHTML="<span style=\\"color:#ff6b6b\\">Nombre y WhatsApp son obligatorios</span>";return;}'
    + 'btn.disabled=true;btn.textContent="Registrando...";'
    + 'fetch("/api/event-pages?action=register",{method:"POST",headers:{"Content-Type":"application/json"},'
    + 'body:JSON.stringify({event_id:EVT_ID,nombre:nombre,whatsapp:wa,email:email,ref_username:REF||null})})'
    + '.then(function(r){return r.json()}).then(function(d){'
    + 'if(d.ok){'
    + 'var waName=d.whatsapp_name||"";'
    + 'var waMsg=d.precio&&d.precio!=="Gratis"'
    + '?encodeURIComponent("Hola"+(waName?" "+waName:"")+", quiero asistir al evento "+(d.evento_titulo||EVT_SLUG)+". Mi nombre es "+nombre+". Quiero realizar el pago de "+d.precio+".")'
    + ':encodeURIComponent("Hola"+(waName?" "+waName:"")+", quiero asistir al evento "+(d.evento_titulo||EVT_SLUG)+". Mi nombre es "+nombre+". Ya quede registrado!");'
    + 'var waUrl=d.whatsapp_target?"https://wa.me/"+d.whatsapp_target.replace(/[^0-9]/g,"")+"?text="+waMsg:"";'
    // Hide form inputs, show success + WA button
    + 'var inputs=document.querySelectorAll(".ev-form input,.ev-form select,.ev-form textarea");'
    + 'for(var i=0;i<inputs.length;i++)inputs[i].style.display="none";'
    + 'btn.style.display="none";'
    + 'msg.innerHTML="<div style=\\"text-align:center;padding:10px 0\\"><div style=\\"font-size:48px;margin-bottom:12px\\">🎉</div>"'
    + '+"<div style=\\"color:#4ecdc4;font-size:20px;font-weight:700;margin-bottom:8px\\">Registro Exitoso!</div>"'
    + '+"<div style=\\"color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:16px\\">Te esperamos en el evento</div>"'
    + '+(waUrl?"<a href=\\""+waUrl+"\\" target=\\"_blank\\" rel=\\"noopener\\" class=\\"ev-wa-btn\\">💬 Ir a WhatsApp</a>":"")+"</div>";'
    + '}else{msg.innerHTML="<span style=\\"color:#ff6b6b\\">"+(d.error||"Error al registrar")+"</span>";btn.disabled=false;btn.textContent="Intentar de nuevo";}'
    + '}).catch(function(){msg.innerHTML="<span style=\\"color:#ff6b6b\\">Error de conexion</span>";btn.disabled=false;btn.textContent="Intentar de nuevo";});'
    + '}'

    // YouTube player with progress bar + anti-seek
    + (function() {
      if (!ev.vsl_url) return '';
      var vi = _extractVideoId(ev.vsl_url);
      if (vi.platform !== 'youtube') return '';
      return ''
        + 'var _vP=null,_vLast=0,_vDur=0;'
        + 'var _ytS=document.createElement("script");_ytS.src="https://www.youtube.com/iframe_api";document.head.appendChild(_ytS);'
        + 'function onYouTubeIframeAPIReady(){'
        + 'try{_vP=new YT.Player("ev-vsl-player",{'
        + 'videoId:"' + vi.id + '",'
        + 'playerVars:{modestbranding:1,rel:0,showinfo:0,iv_load_policy:3,playsinline:1,origin:location.origin,cc_load_policy:0},'
        + 'events:{onReady:function(e){_vDur=e.target.getDuration()||1;},'
        + 'onStateChange:function(e){if(e.data===1&&_vDur<=1){_vDur=_vP.getDuration()||1;}}}'
        + '});}catch(e){}'
        + '}'
        // Progress bar + anti-seek (every 500ms)
        + 'setInterval(function(){if(!_vP||typeof _vP.getCurrentTime!=="function")return;'
        + 'var ct=_vP.getCurrentTime();'
        // Anti-seek: if jumped forward more than 5s, revert
        + 'if(_vLast>0&&ct-_vLast>5){_vP.seekTo(_vLast,true);return;}'
        + 'if(ct>_vLast)_vLast=ct;'
        // Update progress bar
        + 'var bar=document.getElementById("ev-vsl-progress");'
        + 'if(bar&&_vDur>1){bar.style.width=Math.min(100,Math.round(ct/_vDur*100))+"%";}'
        + '},500);';
    })()

    + '</script></body></html>';
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Rank number to display name
function _rankName(n) {
  var names = { 0: 'Cliente', 1: 'INN 200', 2: 'INN 500', 3: 'NOVA 1500', 4: 'NOVA 5K', 5: 'NOVA 10K', 6: 'NOVA DIAMOND', 7: 'NOVA 50K', 8: 'NOVA 100K', 99: 'Admin' };
  return names[n] || 'Emprendedor';
}

// Extract video platform + ID
function _extractVideoId(url) {
  if (!url) return { platform: '', id: '' };
  var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };
  var vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return { platform: 'vimeo', id: vmMatch[1] };
  // Instagram reel/post
  var igMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return { platform: 'instagram', id: igMatch[1] };
  // Google Drive
  var driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return { platform: 'drive', id: driveMatch[1] };
  return { platform: 'other', id: '' };
}

// Convert YouTube/Vimeo/Instagram URLs to embed format
function _toEmbed(url) {
  var vi = _extractVideoId(url);
  if (vi.platform === 'youtube') return 'https://www.youtube.com/embed/' + vi.id + '?rel=0';
  if (vi.platform === 'vimeo') return 'https://player.vimeo.com/video/' + vi.id;
  if (vi.platform === 'instagram') return 'https://www.instagram.com/reel/' + vi.id + '/embed/';
  if (vi.platform === 'drive') return 'https://drive.google.com/file/d/' + vi.id + '/preview';
  return url || '';
}

// Convert Google Drive share URLs to direct image URLs
function _driveImg(url) {
  if (!url) return url;
  var m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1200';
  return url;
}
