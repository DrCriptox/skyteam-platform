// api/eventos.js — Sky TV: Events API + Zoom SDK Signature
const SUPABASE_URL = 'https://dheosuwekrhdfayikuil.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY || 'SIVRhsyhRgqvgNfKdoT6rg';
const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET || '';
const crypto = require('crypto');

function generateZoomSignature(meetingNumber, role) {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = { sdkKey: ZOOM_SDK_KEY, mn: String(meetingNumber), role: role, iat: iat, exp: exp, tokenExp: exp };
  const sHeader = base64url(JSON.stringify(oHeader));
  const sPayload = base64url(JSON.stringify(oPayload));
  const sInput = sHeader + '.' + sPayload;
  const sig = crypto.createHmac('sha256', ZOOM_SDK_SECRET).update(sInput).digest('base64url');
  return sInput + '.' + sig;
}

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action } = req.query;
  try {
    if (action === 'list' && req.method === 'GET') {
      const { desde, hasta, categoria } = req.query;
      let url = SUPABASE_URL + '/rest/v1/eventos_equipo?select=*&order=fecha.asc,hora_inicio.asc';
      if (desde) url += '&fecha=gte.' + desde;
      if (hasta) url += '&fecha=lte.' + hasta;
      if (categoria && categoria !== 'todos') url += '&categoria=eq.' + categoria;
      const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
      return res.status(200).json({ ok: true, eventos: await r.json() });
    }
    if (action === 'get' && req.method === 'GET') {
      const { id } = req.query;
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos_equipo?id=eq.' + id, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
      const data = await r.json();
      return res.status(200).json({ ok: true, evento: data[0] || null });
    }
    if (action === 'create' && req.method === 'POST') {
      const body = req.body;
      if (!body.created_by) return res.status(400).json({ ok: false, error: 'created_by required' });
      const adminOk = await checkAdmin(body.created_by);
      if (!adminOk) return res.status(403).json({ ok: false, error: 'Solo admins r7-r8' });
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos_equipo', {
        method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ titulo: body.titulo, descripcion: body.descripcion||'', categoria: body.categoria||'capacitacion', fecha: body.fecha, hora_inicio: body.hora_inicio, hora_fin: body.hora_fin, zoom_meeting_id: body.zoom_meeting_id||'', zoom_password: body.zoom_password||'', zoom_link: body.zoom_link||'', flyer_url: body.flyer_url||'', grabacion_url: body.grabacion_url||'', recurrente: body.recurrente||false, recurrencia_tipo: body.recurrencia_tipo||'', recurrencia_dias: body.recurrencia_dias||'', host_nombre: body.host_nombre||'', host_rango: body.host_rango||'', en_vivo: false, created_by: body.created_by })
      });
      return res.status(201).json({ ok: true, evento: (await r.json())[0] });
    }
    if (action === 'update' && req.method === 'PUT') {
      const body = req.body;
      if (!body.id || !body.username) return res.status(400).json({ ok: false, error: 'id and username required' });
      const adminOk = await checkAdmin(body.username);
      if (!adminOk) return res.status(403).json({ ok: false, error: 'Solo admins' });
      const updates = {}; const fields = ['titulo','descripcion','categoria','fecha','hora_inicio','hora_fin','zoom_meeting_id','zoom_password','zoom_link','flyer_url','grabacion_url','recurrente','recurrencia_tipo','recurrencia_dias','host_nombre','host_rango','en_vivo'];
      fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; }); updates.updated_at = new Date().toISOString();
      const r = await fetch(SUPABASE_URL + '/rest/v1/eventos_equipo?id=eq.' + body.id, { method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(updates) });
      return res.status(200).json({ ok: true, evento: (await r.json())[0] });
    }
    if (action === 'delete' && req.method === 'DELETE') {
      const { id, username } = req.query;
      if (!id || !username) return res.status(400).json({ ok: false, error: 'id and username required' });
      const adminOk = await checkAdmin(username);
      if (!adminOk) return res.status(403).json({ ok: false, error: 'Solo admins' });
      await fetch(SUPABASE_URL + '/rest/v1/eventos_equipo?id=eq.' + id, { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
      return res.status(200).json({ ok: true });
    }
    if (action === 'toggle_live' && req.method === 'POST') {
      const { id, en_vivo, username } = req.body;
      const adminOk = await checkAdmin(username);
      if (!adminOk) return res.status(403).json({ ok: false, error: 'Solo admins' });
      await fetch(SUPABASE_URL + '/rest/v1/eventos_equipo?id=eq.' + id, { method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ en_vivo: !!en_vivo, updated_at: new Date().toISOString() }) });
      return res.status(200).json({ ok: true, en_vivo: !!en_vivo });
    }
    if (action === 'zoom_signature' && req.method === 'POST') {
      const { meetingNumber, role } = req.body;
      if (!meetingNumber) return res.status(400).json({ ok: false, error: 'meetingNumber required' });
      return res.status(200).json({ ok: true, signature: generateZoomSignature(meetingNumber, role||0), sdkKey: ZOOM_SDK_KEY });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
};

async function checkAdmin(username) {
  const ADMINS = ['yonfer', 'admin', 'dryonfer'];
  return ADMINS.includes((username || '').toLowerCase());
}
