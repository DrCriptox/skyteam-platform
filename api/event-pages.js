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
      var MIN_RANK = 3; // NOVA 1500
      try {
        var rkR = await SB('users?username=eq.' + encodeURIComponent(b.username) + '&select=rank,is_admin&limit=1');
        var rkRows = await rkR.json();
        if (Array.isArray(rkRows) && rkRows.length) {
          var userRango = parseInt(rkRows[0].rank) || 0;
          var isAdm = rkRows[0].is_admin;
          if (userRango < MIN_RANK && !isAdm) {
            return res.status(403).json({ error: 'Se requiere rango NOVA 1500 o superior para crear eventos' });
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
        whatsapp_pago: b.whatsapp_pago || '',
        vsl_url: b.vsl_url || '',
        testimonios: b.testimonios || null,
        status: 'draft',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

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
        var uR = await SB('users?username=eq.' + encodeURIComponent(ev.created_by) + '&select=name,rango,photo&limit=1');
        var uRows = await uR.json();
        if (Array.isArray(uRows) && uRows.length) {
          creatorInfo.name = uRows[0].name || ev.created_by;
          creatorInfo.rango = uRows[0].rango || '';
          creatorInfo.photo = uRows[0].photo || '';
        }
      } catch(e) {}

      // ── Step 1: GPT-4o-mini generates content ──
      var aiContent = null;
      if (OPENAI_KEY) {
        var tipoLabel = ev.tipo === 'virtual' ? 'virtual (online)' : ev.tipo === 'hibrido' ? 'hibrido (presencial + online)' : 'presencial';
        var prompt = 'Genera contenido en ESPANOL para la landing page de un evento de negocios/network marketing.\n'
          + 'Evento: "' + ev.titulo + '"\n'
          + 'Tipo: ' + tipoLabel + '\n'
          + 'Fecha: ' + ev.fecha + (ev.hora ? ' a las ' + ev.hora : '') + '\n'
          + (ev.ciudad ? 'Ciudad: ' + ev.ciudad + '\n' : '')
          + (ev.descripcion ? 'Descripcion del organizador: ' + ev.descripcion + '\n' : '')
          + (ev.precio && ev.precio !== 'Gratis' ? 'Precio: ' + ev.precio + '\n' : 'Entrada GRATUITA\n')
          + '\nResponde SOLO JSON valido (sin markdown):\n'
          + '{"headline":"titulo impactante corto","subheadline":"subtitulo motivacional","about":"3 parrafos HTML con <p> describiendo el evento y por que asistir",'
          + '"bullets":["beneficio 1","beneficio 2","beneficio 3","beneficio 4","beneficio 5"],'
          + '"speaker_intro":"presentacion breve del host/organizador",'
          + '"cta_text":"texto del boton principal (ej: Reserva tu lugar)","urgency_text":"texto de urgencia (ej: Cupos limitados!)"}';

        try {
          var aiR = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
            body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 600, temperature: 0.7,
              messages: [{ role: 'user', content: prompt }] })
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
          subheadline: 'Un evento que transformara tu vision de los negocios',
          about: '<p>Te invitamos a ' + ev.titulo + ', un evento exclusivo donde descubriras las mejores estrategias para hacer crecer tu negocio digital.</p><p>Conecta con emprendedores exitosos y aprende de los mejores en la industria.</p><p>No te pierdas esta oportunidad unica de transformar tu futuro financiero.</p>',
          bullets: ['Estrategias probadas de crecimiento', 'Networking con emprendedores exitosos', 'Herramientas digitales de ultima generacion', 'Mentorias personalizadas', 'Comunidad de apoyo continuo'],
          speaker_intro: 'Lider y emprendedor digital con amplia experiencia en el sector.',
          cta_text: 'Reserva tu Lugar',
          urgency_text: 'Cupos limitados — No te quedes fuera!'
        };
      }

      // ── Step 2: FAL.ai generates poster ──
      var posterUrl = '';
      if (FAL_KEY) {
        var imgPrompt = 'Professional modern event poster for a business networking event called "' + ev.titulo + '"'
          + (ev.ciudad ? ' in ' + ev.ciudad : '') + '. '
          + 'Elegant dark blue and gold color scheme, abstract geometric shapes, premium corporate feel, '
          + 'soft glowing lights, no text, no faces, no people, clean minimalist design, '
          + 'suitable as hero background for a landing page.';
        try {
          var imgR = await fetch('https://fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: { 'Authorization': 'Key ' + FAL_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: imgPrompt, image_size: { width: 1344, height: 768 }, num_images: 1, num_inference_steps: 4, enable_safety_checker: false })
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
    if (action === 'update' && req.method === 'POST') {
      var b = req.body;
      if (!b.event_id || !b.username) return res.status(400).json({ error: 'event_id + username required' });

      var evR = await SB('event_pages?id=eq.' + b.event_id + '&select=created_by&limit=1');
      var evRows = await evR.json();
      if (!Array.isArray(evRows) || !evRows.length) return res.status(404).json({ error: 'Not found' });
      if (evRows[0].created_by !== b.username) return res.status(403).json({ error: 'Only creator can update' });

      var updates = {};
      ['titulo', 'descripcion', 'tipo', 'fecha', 'hora', 'ciudad', 'lugar', 'direccion',
       'link_virtual', 'capacidad', 'precio', 'whatsapp_pago', 'vsl_url', 'testimonios', 'status'].forEach(function(f) {
        if (b[f] !== undefined) updates[f] = b[f];
      });
      updates.updated_at = new Date().toISOString();

      await SB('event_pages?id=eq.' + b.event_id, { method: 'PATCH', body: JSON.stringify(updates) });
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
      if (!slug) return res.status(400).json({ error: 'slug required' });
      var r = await SB('event_pages?slug=eq.' + encodeURIComponent(slug) + '&select=*&limit=1');
      var rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Event not found' });
      // Don't send ai_html in API response (too large), only in event-landing.js
      var ev = rows[0];
      delete ev.ai_html;
      return res.status(200).json({ ok: true, event: ev });
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
              from: 'SkyTeam Events <eventos@skyteam.global>',
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

      // Lookup referrer's WhatsApp (so payment goes to the socio who shared the link)
      var refWhatsapp = '';
      var refName = '';
      if (b.ref_username) {
        try {
          var refR = await SB('users?username=eq.' + encodeURIComponent(b.ref_username) + '&select=whatsapp,name&limit=1');
          var refRows = await refR.json();
          if (Array.isArray(refRows) && refRows.length) {
            refWhatsapp = refRows[0].whatsapp || '';
            refName = refRows[0].name || b.ref_username;
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
  var direccion = ev.direccion || '';
  var tipo = ev.tipo || 'presencial';
  var precio = ev.precio || 'Gratis';
  var capacidad = ev.capacidad || 100;

  var heroImg = posterUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80';
  var creatorPhoto = creator.photo && creator.photo.length < 500 ? '' : (creator.photo || '');

  return '<!DOCTYPE html><html lang="es"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(ev.titulo) + ' — SkyTeam Event</title>'
    + '<meta name="description" content="' + esc(content.subheadline || ev.titulo) + '">'
    + '<meta property="og:title" content="' + esc(ev.titulo) + '">'
    + '<meta property="og:description" content="' + esc(content.subheadline || '') + '">'
    + (posterUrl ? '<meta property="og:image" content="' + esc(posterUrl) + '">' : '')
    + '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:"Outfit",sans-serif;background:#0a0a1a;color:#e0e0e0;overflow-x:hidden}'
    + '.ev-hero{position:relative;min-height:90vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 20px}'
    + '.ev-hero-bg{position:absolute;inset:0;background:url("' + esc(heroImg) + '") center/cover no-repeat;filter:brightness(0.3)}'
    + '.ev-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,26,0.6) 0%,rgba(10,10,26,0.95) 100%)}'
    + '.ev-hero-content{position:relative;z-index:2;max-width:700px}'
    + '.ev-badge{display:inline-block;padding:6px 18px;border-radius:20px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);color:#d4af37;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px}'
    + '.ev-h1{font-size:clamp(2rem,6vw,3.5rem);font-weight:800;color:#fff;line-height:1.15;margin-bottom:16px;background:linear-gradient(135deg,#fff 30%,#d4af37);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}'
    + '.ev-sub{font-size:clamp(1rem,3vw,1.3rem);color:rgba(255,255,255,0.75);font-weight:300;margin-bottom:30px}'
    + '.ev-meta{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:30px}'
    + '.ev-meta-item{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);font-size:14px;color:rgba(255,255,255,0.8)}'
    + '.ev-meta-icon{font-size:18px}'
    + '.ev-cta-btn{display:inline-block;padding:16px 40px;border-radius:14px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0a0a1a;font-size:18px;font-weight:700;text-decoration:none;cursor:pointer;border:none;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 4px 20px rgba(212,175,55,0.3)}'
    + '.ev-cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(212,175,55,0.4)}'
    + '.ev-countdown{display:flex;gap:12px;justify-content:center;margin:24px 0}'
    + '.ev-cd-item{text-align:center;min-width:64px}'
    + '.ev-cd-num{font-size:2rem;font-weight:700;color:#d4af37}'
    + '.ev-cd-label{font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px}'
    + '.ev-section{max-width:700px;margin:0 auto;padding:60px 20px}'
    + '.ev-section h2{font-size:1.8rem;font-weight:700;color:#fff;margin-bottom:20px;text-align:center}'
    + '.ev-about p{color:rgba(255,255,255,0.7);line-height:1.8;margin-bottom:16px;font-size:1.05rem}'
    + '.ev-bullets{list-style:none;padding:0}'
    + '.ev-bullets li{padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:flex-start;gap:12px;color:rgba(255,255,255,0.8);font-size:1.05rem}'
    + '.ev-bullet-icon{color:#d4af37;font-size:20px;flex-shrink:0;margin-top:2px}'
    + '.ev-speaker{display:flex;align-items:center;gap:20px;padding:24px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)}'
    + '.ev-speaker-photo{width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,175,55,0.3);background:#1a1a2e}'
    + '.ev-speaker-name{font-size:1.2rem;font-weight:600;color:#fff}'
    + '.ev-speaker-role{color:#d4af37;font-size:14px;margin-top:4px}'
    + '.ev-speaker-bio{color:rgba(255,255,255,0.6);font-size:14px;margin-top:8px}'
    + '.ev-form-section{background:linear-gradient(180deg,rgba(212,175,55,0.05),rgba(10,10,26,0));padding:60px 20px}'
    + '.ev-form{max-width:500px;margin:0 auto;padding:32px;border-radius:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)}'
    + '.ev-form h2{text-align:center;color:#fff;margin-bottom:24px}'
    + '.ev-form input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#fff;font-size:15px;font-family:inherit;margin-bottom:12px;outline:none;transition:border 0.2s}'
    + '.ev-form input:focus{border-color:rgba(212,175,55,0.5)}'
    + '.ev-form input::placeholder{color:rgba(255,255,255,0.35)}'
    + '.ev-form-submit{width:100%;padding:16px;border-radius:14px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0a0a1a;font-size:17px;font-weight:700;border:none;cursor:pointer;margin-top:8px}'
    + '.ev-form-msg{text-align:center;margin-top:12px;font-size:14px}'
    + '.ev-urgency{text-align:center;color:#d4af37;font-size:14px;margin-top:16px;font-weight:600}'
    + '.ev-ref-badge{text-align:center;padding:12px;margin-top:16px;border-radius:12px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.15);font-size:13px;color:rgba(255,255,255,0.6)}'
    + '.ev-ref-name{color:#d4af37;font-weight:600}'
    + '.ev-footer{text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3);font-size:13px}'
    + '.ev-footer a{color:rgba(212,175,55,0.6);text-decoration:none}'
    + '.ev-vsl{max-width:700px;margin:0 auto;padding:40px 20px;text-align:center}'
    + '.ev-vsl-wrap{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:#000}'
    + '.ev-vsl-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}'
    + '.ev-testimonials{max-width:700px;margin:0 auto;padding:40px 20px}'
    + '.ev-testimonial{padding:20px;margin-bottom:14px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)}'
    + '.ev-testimonial-text{color:rgba(255,255,255,0.75);font-style:italic;line-height:1.6;margin-bottom:8px;font-size:1rem}'
    + '.ev-testimonial-author{color:#d4af37;font-weight:600;font-size:14px}'
    + '@media(max-width:600px){.ev-speaker{flex-direction:column;text-align:center}.ev-meta{flex-direction:column;align-items:center}}'
    + '</style></head><body>'

    // ── HERO ──
    + '<section class="ev-hero">'
    + '<div class="ev-hero-bg"></div>'
    + '<div class="ev-hero-overlay"></div>'
    + '<div class="ev-hero-content">'
    + '<div class="ev-badge">' + (tipo === 'virtual' ? '💻 Evento Virtual' : tipo === 'hibrido' ? '🌐 Evento Hibrido' : '📍 Evento Presencial') + '</div>'
    + '<h1 class="ev-h1">' + esc(content.headline || ev.titulo) + '</h1>'
    + '<p class="ev-sub">' + esc(content.subheadline || '') + '</p>'
    + '<div class="ev-meta">'
    + '<div class="ev-meta-item"><span class="ev-meta-icon">📅</span>' + esc(fecha) + (hora ? ' • ' + esc(hora) : '') + '</div>'
    + (ciudad ? '<div class="ev-meta-item"><span class="ev-meta-icon">📍</span>' + esc(ciudad) + (lugar ? ' — ' + esc(lugar) : '') + '</div>' : '')
    + '<div class="ev-meta-item"><span class="ev-meta-icon">💰</span>' + esc(precio) + '</div>'
    + '</div>'
    + '<div class="ev-countdown" id="ev-countdown"></div>'
    + '<a href="#ev-registro" class="ev-cta-btn">' + esc(content.cta_text || 'Reserva tu Lugar') + '</a>'
    + '</div></section>'

    // ── ABOUT ──
    + '<section class="ev-section"><h2>Sobre el Evento</h2>'
    + '<div class="ev-about">' + (content.about || '') + '</div>'
    + '</section>'

    // ── VSL VIDEO ──
    + (ev.vsl_url ? '<section class="ev-vsl"><h2 style="font-size:1.8rem;font-weight:700;color:#fff;margin-bottom:20px">Mira este Video</h2><div class="ev-vsl-wrap"><iframe src="' + esc(_toEmbed(ev.vsl_url)) + '" allowfullscreen allow="autoplay;encrypted-media"></iframe></div></section>' : '')

    // ── BENEFITS ──
    + '<section class="ev-section"><h2>Lo que Obtendras</h2>'
    + '<ul class="ev-bullets">'
    + (content.bullets || []).map(function(b) { return '<li><span class="ev-bullet-icon">✦</span>' + esc(b) + '</li>'; }).join('')
    + '</ul></section>'

    // ── SPEAKER ──
    + '<section class="ev-section"><h2>Tu Anfitrion</h2>'
    + '<div class="ev-speaker">'
    + (creatorPhoto ? '<img class="ev-speaker-photo" src="' + esc(creatorPhoto) + '" alt="">' : '<div class="ev-speaker-photo" style="display:flex;align-items:center;justify-content:center;font-size:2rem;color:#d4af37">👤</div>')
    + '<div>'
    + '<div class="ev-speaker-name">' + esc(creator.name) + '</div>'
    + (creator.rango ? '<div class="ev-speaker-role">' + esc(creator.rango) + '</div>' : '')
    + '<div class="ev-speaker-bio">' + esc(content.speaker_intro || '') + '</div>'
    + '</div></div></section>'

    // ── TESTIMONIALS ──
    + (Array.isArray(ev.testimonios) && ev.testimonios.length ? '<section class="ev-testimonials"><h2 style="font-size:1.8rem;font-weight:700;color:#fff;margin-bottom:20px;text-align:center">Lo que Dicen Nuestros Asistentes</h2>' + ev.testimonios.map(function(t) { return '<div class="ev-testimonial"><div class="ev-testimonial-text">"' + esc(t.texto || t.text || '') + '"</div><div class="ev-testimonial-author">— ' + esc(t.nombre || t.name || 'Anonimo') + '</div></div>'; }).join('') + '</section>' : '')

    // ── REGISTRATION FORM ──
    + '<section class="ev-form-section" id="ev-registro">'
    + '<div class="ev-form">'
    + '<h2>' + esc(content.cta_text || 'Reserva tu Lugar') + '</h2>'
    + '<input type="text" id="ev-reg-nombre" placeholder="Tu nombre completo" required>'
    + '<input type="tel" id="ev-reg-wa" placeholder="WhatsApp (con codigo de pais)" required>'
    + '<input type="email" id="ev-reg-email" placeholder="Email (opcional)">'
    + '<input type="text" id="ev-reg-ciudad" placeholder="Ciudad">'
    + '<button class="ev-form-submit" id="ev-reg-btn" onclick="submitEventReg()">' + esc(content.cta_text || 'Reserva tu Lugar') + '</button>'
    + '<div class="ev-form-msg" id="ev-reg-msg"></div>'
    + '<div class="ev-urgency">' + esc(content.urgency_text || 'Cupos limitados!') + '</div>'
    + '<div class="ev-ref-badge" id="ev-ref-badge" style="display:none"></div>'
    + '</div></section>'

    // ── FOOTER ──
    + '<footer class="ev-footer">'
    + '<p>Organizado con <a href="https://skyteam.global">SkyTeam Global</a></p>'
    + '</footer>'

    // ── SCRIPTS ──
    + '<script>'
    + 'var EVT_ID="' + ev.id + '";'
    + 'var EVT_SLUG="' + esc(ev.slug) + '";'
    + 'var EVT_DATE="' + esc(fecha) + '";'
    + 'var EVT_TIME="' + esc(hora) + '";'
    + 'var EVT_WA_PAGO="' + esc(ev.whatsapp_pago || '') + '";'
    + 'var EVT_PRECIO="' + esc(precio) + '";'
    + 'var REF=new URLSearchParams(location.search).get("ref")||"";'

    // Show referrer badge
    + 'if(REF){var rb=document.getElementById("ev-ref-badge");if(rb){rb.style.display="block";rb.innerHTML="Invitado por <span class=\\"ev-ref-name\\">"+REF+"</span>";}}'

    // Track visit
    + 'try{var fp=screen.width+"x"+screen.height+"."+screen.colorDepth+"."+Intl.DateTimeFormat().resolvedOptions().timeZone+"."+navigator.language;'
    + 'var dv=window.innerWidth<768?"mobile":"desktop";'
    + 'fetch("/api/event-pages?action=track",{method:"POST",headers:{"Content-Type":"application/json"},'
    + 'body:JSON.stringify({event_id:EVT_ID,ref_username:REF||null,fingerprint:fp,device:dv})}).catch(function(){});}catch(e){}'

    // Countdown
    + 'function updateCD(){'
    + 'var t=EVT_DATE;if(EVT_TIME)t+="T"+EVT_TIME+":00";var end=new Date(t).getTime();if(isNaN(end))return;'
    + 'var now=Date.now();var d=end-now;if(d<=0){document.getElementById("ev-countdown").innerHTML="<div style=\\"color:#d4af37;font-size:1.2rem\\">El evento ya inicio!</div>";return;}'
    + 'var days=Math.floor(d/86400000);var hrs=Math.floor((d%86400000)/3600000);var mins=Math.floor((d%3600000)/60000);var secs=Math.floor((d%60000)/1000);'
    + 'document.getElementById("ev-countdown").innerHTML='
    + '"<div class=\\"ev-cd-item\\"><div class=\\"ev-cd-num\\">"+days+"</div><div class=\\"ev-cd-label\\">Dias</div></div>"'
    + '+"<div class=\\"ev-cd-item\\"><div class=\\"ev-cd-num\\">"+hrs+"</div><div class=\\"ev-cd-label\\">Horas</div></div>"'
    + '+"<div class=\\"ev-cd-item\\"><div class=\\"ev-cd-num\\">"+mins+"</div><div class=\\"ev-cd-label\\">Min</div></div>"'
    + '+"<div class=\\"ev-cd-item\\"><div class=\\"ev-cd-num\\">"+secs+"</div><div class=\\"ev-cd-label\\">Seg</div></div>";'
    + '}updateCD();setInterval(updateCD,1000);'

    // Submit registration
    + 'function submitEventReg(){'
    + 'var btn=document.getElementById("ev-reg-btn");var msg=document.getElementById("ev-reg-msg");'
    + 'var nombre=document.getElementById("ev-reg-nombre").value.trim();'
    + 'var wa=document.getElementById("ev-reg-wa").value.trim();'
    + 'var email=document.getElementById("ev-reg-email").value.trim();'
    + 'var ciudad=document.getElementById("ev-reg-ciudad").value.trim();'
    + 'if(!nombre||!wa){msg.innerHTML="<span style=\\"color:#ff6b6b\\">Nombre y WhatsApp son obligatorios</span>";return;}'
    + 'btn.disabled=true;btn.textContent="Registrando...";'
    + 'fetch("/api/event-pages?action=register",{method:"POST",headers:{"Content-Type":"application/json"},'
    + 'body:JSON.stringify({event_id:EVT_ID,nombre:nombre,whatsapp:wa,email:email,ciudad:ciudad,ref_username:REF||null})})'
    + '.then(function(r){return r.json()}).then(function(d){'
    + 'if(d.ok){msg.innerHTML="<span style=\\"color:#4ecdc4\\">✅ Registro exitoso! Redirigiendo a WhatsApp...</span>";btn.textContent="Registrado!";'
    + 'if(d.whatsapp_target){setTimeout(function(){'
    + 'var waName=d.whatsapp_name||"";'
    + 'var waMsg=d.precio&&d.precio!=="Gratis"'
    + '?encodeURIComponent("Hola"+( waName?" "+waName:"")+", quiero asistir al evento \\""+( d.evento_titulo||EVT_SLUG)+"\\". Mi nombre es "+nombre+". Quiero realizar el pago de "+d.precio+".")'
    + ':encodeURIComponent("Hola"+(waName?" "+waName:"")+", quiero asistir al evento \\""+( d.evento_titulo||EVT_SLUG)+"\\". Mi nombre es "+nombre+". Ya quede registrado!");'
    + 'window.open("https://wa.me/"+d.whatsapp_target.replace(/[^0-9]/g,"")+"?text="+waMsg,"_blank");},1500);}'
    + '}else{msg.innerHTML="<span style=\\"color:#ff6b6b\\">"+(d.error||"Error al registrar")+"</span>";btn.disabled=false;btn.textContent="Intentar de nuevo";}'
    + '}).catch(function(){msg.innerHTML="<span style=\\"color:#ff6b6b\\">Error de conexion</span>";btn.disabled=false;btn.textContent="Intentar de nuevo";});'
    + '}'

    + '</script></body></html>';
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Convert YouTube/Vimeo URLs to embed format
function _toEmbed(url) {
  if (!url) return '';
  // YouTube: various formats
  var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1] + '?rel=0';
  // Vimeo
  var vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return 'https://player.vimeo.com/video/' + vmMatch[1];
  // Already embed or other URL — return as-is
  return url;
}
