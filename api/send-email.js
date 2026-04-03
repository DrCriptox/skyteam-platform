// Communications API â handles email (Resend), push notifications (web-push), and smart triggers
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

const SB_HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

async function sb(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: SB_HEADERS, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 200)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function sendWebPush(subscription, payload) {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !VAPID_SUBJECT) {
    return { ok: false, reason: 'web-push not configured' };
  }
  try {
    let webpush;
    try { webpush = require('web-push'); } catch (e) {
      return { ok: false, reason: 'web-push not installed' };
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, result };
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { ok: false, expired: true, reason: 'subscription expired' };
    }
    return { ok: false, reason: error.message };
  }
}

// ââ Send push to a specific user (internal helper) ââ
async function pushToUser(username, title, body, url, tag) {
  const subs = await sb('push_subscriptions?username=eq.' + encodeURIComponent(username));
  if (!subs || subs.length === 0) return { sent: 0 };
  const payload = { title, body, url: url || '/', tag: tag || 'skyteam-' + Date.now(), data: { url: url || '/' } };
  let sent = 0, expired = [];
  for (const sub of subs) {
    const result = await sendWebPush(sub.subscription, payload);
    if (result.ok) sent++; else if (result.expired) expired.push(sub.endpoint);
  }
  if (expired.length > 0) {
    for (const ep of expired) await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {});
  }
  return { sent, expired: expired.length };
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SMART PUSH TRIGGERS â called by Vercel Cron every 15 minutes
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function handleTriggers(req, res) {
  // Verify cron secret (Vercel sends Authorization header for cron jobs)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    // Also allow adminKey in body for manual testing
    const { adminKey } = req.body || {};
    if (adminKey !== process.env.ADMIN_PUSH_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const now = new Date();
  const results = { triggers: [], sent: 0, errors: [] };

  try {
    // ââ TRIGGER 1: Prospectos sin seguimiento 3+ dÃ­as ââ
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    // Get prospects that are active (not closed) and haven't been updated in 3+ days
    const staleProspects = await sb(
      'prospectos?select=id,username,nombre,etapa,updated_at' +
      '&etapa=not.in.(cerrado_ganado,cerrado_perdido)' +
      '&updated_at=lt.' + threeDaysAgo +
      '&order=updated_at.asc&limit=50'
    );

    if (staleProspects && staleProspects.length > 0) {
      // Group by username
      const byUser = {};
      for (const p of staleProspects) {
        if (!byUser[p.username]) byUser[p.username] = [];
        byUser[p.username].push(p);
      }

      for (const [username, prospects] of Object.entries(byUser)) {
        const count = prospects.length;
        const firstName = prospects[0].nombre.split(' ')[0];
        const daysAgo = Math.floor((now - new Date(prospects[0].updated_at)) / (1000 * 60 * 60 * 24));

        let body;
        if (count === 1) {
          body = firstName + ' lleva ' + daysAgo + ' dias sin seguimiento. Un mensaje hoy puede hacer la diferencia.';
        } else {
          body = 'Tienes ' + count + ' prospectos sin seguimiento. ' + firstName + ' lleva ' + daysAgo + ' dias esperando.';
        }

        const r = await pushToUser(username, 'ð Seguimiento pendiente', body, '/?nav=prospectos', 'skyteam-stale-' + now.toISOString().slice(0, 10));
        results.triggers.push({ type: 'stale_prospects', user: username, count, sent: r.sent });
        results.sent += r.sent;
      }
    }

    // ââ TRIGGER 2: Reuniones/bookings prÃ³ximos (en los prÃ³ximos 30 min) ââ
    const in30min = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();
    const upcomingBookings = await sb(
      'bookings?select=id,username,nombre,whatsapp,fecha_iso' +
      '&fecha_iso=gte.' + nowISO +
      '&fecha_iso=lte.' + in30min +
      '&status=eq.activa' +
      '&limit=20'
    );

    if (upcomingBookings && upcomingBookings.length > 0) {
      for (const booking of upcomingBookings) {
        const meetTime = new Date(booking.fecha_iso);
        const minsLeft = Math.round((meetTime - now) / 60000);
        const body = 'Tu reunion con ' + booking.nombre + ' es en ' + minsLeft + ' minutos. Preparate para cerrar.';

        const r = await pushToUser(booking.username, 'ð Reunion en ' + minsLeft + ' min', body, '/?nav=agenda', 'skyteam-booking-' + booking.id);
        results.triggers.push({ type: 'upcoming_booking', user: booking.username, prospect: booking.nombre, minsLeft, sent: r.sent });
        results.sent += r.sent;
      }
    }

    // ââ TRIGGER 3: Recordatorios vencidos (fecha_recordatorio ya paso y no completados) ââ
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const pendingReminders = await sb(
      'recordatorios?select=id,username,prospecto_id,mensaje,fecha_recordatorio' +
      '&completado=eq.false' +
      '&fecha_recordatorio=gte.' + fifteenMinAgo +
      '&fecha_recordatorio=lte.' + nowISO +
      '&limit=30'
    );

    if (pendingReminders && pendingReminders.length > 0) {
      for (const reminder of pendingReminders) {
        // Get prospect name
        let prospectName = 'tu prospecto';
        try {
          const prospect = await sb('prospectos?id=eq.' + reminder.prospecto_id + '&select=nombre&limit=1');
          if (prospect && prospect[0]) prospectName = prospect[0].nombre.split(' ')[0];
        } catch (e) {}

        const body = 'Recordatorio para ' + prospectName + ': ' + (reminder.mensaje || 'Hacer seguimiento').substring(0, 100);
        const r = await pushToUser(reminder.username, 'â° Recordatorio de seguimiento', body, '/?nav=prospectos', 'skyteam-reminder-' + reminder.id);
        results.triggers.push({ type: 'reminder', user: reminder.username, prospect: prospectName, sent: r.sent });
        results.sent += r.sent;
      }
    }

    // ââ TRIGGER 4: Fecha de cierre estimada = hoy o maÃ±ana ââ
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const closingProspects = await sb(
      'prospectos?select=id,username,nombre,fecha_cierre_estimada,valor_estimado,etapa' +
      '&fecha_cierre_estimada=in.(' + today + ',' + tomorrow + ')' +
      '&etapa=not.in.(cerrado_ganado,cerrado_perdido)' +
      '&limit=20'
    );

    if (closingProspects && closingProspects.length > 0) {
      for (const p of closingProspects) {
        const isToday = p.fecha_cierre_estimada === today;
        const valor = p.valor_estimado ? ' ($' + Number(p.valor_estimado).toLocaleString() + ')' : '';
        const body = p.nombre + valor + ' tiene fecha de cierre ' + (isToday ? 'HOY' : 'MANANA') + '. Es momento de cerrar.';

        const r = await pushToUser(p.username, isToday ? 'ð¥ Cierre HOY' : 'ð Cierre maÃ±ana', body, '/?nav=prospectos', 'skyteam-closing-' + p.id);
        results.triggers.push({ type: 'closing_date', user: p.username, prospect: p.nombre, isToday, sent: r.sent });
        results.sent += r.sent;
      }
    }

    // ââ TRIGGER 5: Prospectos calientes sin acciÃ³n (temperatura >= 70, sin interacciÃ³n 2+ dÃ­as) ââ
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const hotStale = await sb(
      'prospectos?select=id,username,nombre,temperatura,updated_at' +
      '&temperatura=gte.70' +
      '&etapa=not.in.(cerrado_ganado,cerrado_perdido)' +
      '&updated_at=lt.' + twoDaysAgo +
      '&limit=20'
    );

    if (hotStale && hotStale.length > 0) {
      const byUser = {};
      for (const p of hotStale) {
        if (!byUser[p.username]) byUser[p.username] = [];
        byUser[p.username].push(p);
      }

      for (const [username, prospects] of Object.entries(byUser)) {
        const names = prospects.slice(0, 3).map(p => p.nombre.split(' ')[0]).join(', ');
        const body = (prospects.length === 1 ? names + ' esta caliente (' + prospects[0].temperatura + 'Â°)' : names + ' estan calientes') + ' pero no los has contactado. No dejes enfriar el interes.';

        const r = await pushToUser(username, 'ð¥ Prospecto caliente sin accion', body, '/?nav=prospectos', 'skyteam-hot-' + now.toISOString().slice(0, 10));
        results.triggers.push({ type: 'hot_stale', user: username, count: prospects.length, sent: r.sent });
        results.sent += r.sent;
      }
    }

    return res.status(200).json({ ok: true, ...results, checkedAt: now.toISOString() });
  } catch (error) {
    results.errors.push(error.message);
    return res.status(200).json({ ok: false, ...results, error: error.message });
  }
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function handlePush(req, res) {
  const { action, user, subscription, recipientUser, title, body, url, adminKey } = req.body;

  if (action === 'subscribe') {
    if (!user || !subscription || !subscription.endpoint) return res.status(400).json({ error: 'Missing user or subscription' });
    const existing = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=username');
    if (!existing || existing.length === 0) {
      await sb('users', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ username: user, name: user, email: null, password: null, sponsor: null, ref: user }) });
    }
    await sb('push_subscriptions', { method: 'POST', headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ username: user, endpoint: subscription.endpoint, subscription: subscription, created_at: new Date().toISOString() }) });
    return res.status(200).json({ ok: true, message: 'Subscription saved' });
  }

  if (action === 'unsubscribe') {
    if (!user || !subscription || !subscription.endpoint) return res.status(400).json({ error: 'Missing user or subscription endpoint' });
    await sb('push_subscriptions?username=eq.' + encodeURIComponent(user) + '&endpoint=eq.' + encodeURIComponent(subscription.endpoint), { method: 'DELETE' });
    return res.status(200).json({ ok: true, message: 'Subscription removed' });
  }

  if (action === 'send') {
    if (!recipientUser || !title || !body) return res.status(400).json({ error: 'Missing recipientUser, title, or body' });
    const isAdmin = adminKey === process.env.ADMIN_PUSH_KEY;
    if (!isAdmin && (!user || user !== recipientUser)) return res.status(403).json({ error: 'Not authorized' });
    const r = await pushToUser(recipientUser, title, body, url, null);
    return res.status(200).json({ ok: true, ...r });
  }

  if (action === 'broadcast') {
    const isAdmin = adminKey === process.env.ADMIN_PUSH_KEY;
    if (!isAdmin) return res.status(403).json({ error: 'Admin key required' });
    if (!title || !body) return res.status(400).json({ error: 'Missing title or body' });
    const allSubs = await sb('push_subscriptions?select=*');
    if (!allSubs || allSubs.length === 0) return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions' });
    const payload = { title, body, url: url || '/', tag: 'skyteam-broadcast-' + Date.now(), data: { url: url || '/' } };
    let sent = 0, expired = [];
    for (const sub of allSubs) { const result = await sendWebPush(sub.subscription, payload); if (result.ok) sent++; else if (result.expired) expired.push(sub.endpoint); }
    if (expired.length > 0) { for (const ep of expired) await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {}); }
    return res.status(200).json({ ok: true, sent, expired: expired.length });
  }

  if (action === 'getPublicKey') {
    if (!VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'VAPID public key not configured' });
    return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
  }

  return res.status(400).json({ error: 'Unknown push action' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Vercel Cron jobs send GET requests
  if (req.method === 'GET') {
    return handleTriggers(req, res);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body || {};

    // Smart triggers (manual invocation via POST)
    if (action === 'checkTriggers') {
      return handleTriggers(req, res);
    }

    // Push notification actions (routed from /api/push via rewrite)
    if (['subscribe', 'unsubscribe', 'send', 'broadcast', 'getPublicKey'].includes(action)) {
      return handlePush(req, res);
    }

    // ââ Email sending (original send-email logic) ââ
    const { to, from, nombre, usuario, password, sponsor, membresia, linkRef, subject, html: customHtml } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing email' });

    const senderLabels = {
      'lideres@skyteam.global': 'SKYTEAM LÃ­deres',
      'soporte@skyteam.global': 'SKYTEAM Soporte',
      'academy@skyteam.global': 'SKYTEAM Academy'
    };
    const fromEmail = from || 'lideres@skyteam.global';
    const fromLabel = senderLabels[fromEmail] || 'SKYTEAM';
    const fromField = fromLabel + ' <' + fromEmail + '>';

    const htmlBody = customHtml || `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#030c1f;color:#F0EDE6;padding:32px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#1CE8FF;font-size:28px;margin:0;">SKY<span style="color:#fff"> SYSTEM</span></h1>
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:4px;">Plataforma del Equipo SKYTEAM</p>
        </div>
        <h2 style="color:#1CE8FF;font-size:20px;">ð Â¡Bienvenido al equipo, ${nombre}!</h2>
        <p style="color:rgba(255,255,255,0.8);line-height:1.7;">Tu acceso a la plataforma ha sido <strong style="color:#1CE8FF;">activado</strong>. Ya puedes entrar con tus datos:</p>
        <div style="background:rgba(28,232,255,0.08);border:1px solid rgba(28,232,255,0.2);border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:6px 0;font-size:14px;">ð <strong>Plataforma:</strong> <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p>
          <p style="margin:6px 0;font-size:14px;">ð¤ <strong>Usuario:</strong> ${usuario}</p>
          <p style="margin:6px 0;font-size:14px;">ð <strong>ContraseÃ±a:</strong> ${password}</p>
          ${sponsor ? '<p style="margin:6px 0;font-size:14px;">ð¤ <strong>Sponsor:</strong> ' + sponsor + '</p>' : ''}
          ${membresia ? '<p style="margin:6px 0;font-size:14px;">ð <strong>MembresÃ­a:</strong> ' + membresia + '</p>' : ''}
        </div>
        ${linkRef ? '<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:16px;margin:16px 0;"><p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">Tu link de referidos</p><p style="margin:0;font-family:monospace;color:#FFD700;font-size:13px;word-break:break-all;">' + linkRef + '</p></div>' : ''}
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:24px;text-align:center;">Enviado por ${fromLabel} Â· <a href="https://skyteam.global" style="color:#1CE8FF;">skyteam.global</a></p>
      </div>
    `;

    const emailSubject = subject || ('ð Â¡Tu acceso a SKY SYSTEM estÃ¡ activo, ' + nombre + '!');

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: fromField,
        to: [to],
        subject: emailSubject,
        html: htmlBody
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
