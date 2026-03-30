// Communications API â handles email (Resend) and push notifications (web-push)
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
    const subs = await sb('push_subscriptions?username=eq.' + encodeURIComponent(recipientUser));
    if (!subs || subs.length === 0) return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions' });
    const payload = { title, body, url: url || '/', tag: 'skyteam-' + Date.now(), data: { url: url || '/' } };
    let sent = 0, expired = [];
    for (const sub of subs) { const result = await sendWebPush(sub.subscription, payload); if (result.ok) sent++; else if (result.expired) expired.push(sub.endpoint); }
    if (expired.length > 0) { for (const ep of expired) await sb('push_subscriptions?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(() => {}); }
    return res.status(200).json({ ok: true, sent, expired: expired.length });
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body || {};

    // Push notification actions (routed from /api/push via rewrite)
    if (['subscribe', 'unsubscribe', 'send', 'broadcast', 'getPublicKey'].includes(action)) {
      return handlePush(req, res);
    }

    // ââ Email sending (original send-email logic) ââ
    const { to, from, nombre, usuario, password, sponsor, membresia, linkRef, subject, html: customHtml } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing email' });

    const senderLabels = {
      'lideres@skyteam.global': 'SKY TEAM LÃ­deres',
      'soporte@skyteam.global': 'SKY TEAM Soporte',
      'academy@skyteam.global': 'SKY TEAM Academy'
    };
    const fromEmail = from || 'lideres@skyteam.global';
    const fromLabel = senderLabels[fromEmail] || 'SKY TEAM';
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
