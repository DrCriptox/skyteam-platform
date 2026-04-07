const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
const OPENAI_KEY = process.env.OPENAT_API_KEY || process.env.OPENAI_API_KEY || '';

async function sb(path, opts) {
  const url = SUPABASE_URL + '/rest/v1/' + path;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(url, {
      method: (opts && opts.method) || 'GET',
      headers: { ...HEADERS, ...(opts && opts.headers ? opts.headers : {}) },
      body: opts && opts.body ? opts.body : undefined,
      signal: ac.signal
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch(e) { clearTimeout(t); return null; }
}

async function askClaude(systemPrompt, userMsg) {
  const OPENAI_KEY = process.env.OPENAT_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!OPENAI_KEY) return null;
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 500, temperature: 0.7, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }] })
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, user } = req.body || {};
    if (!action || !user) return res.status(400).json({ error: 'Missing action or user' });

    // -- GET ALL --
    if (action === 'getAll') {
      const prospectos = await sb('prospectos?username=eq.' + encodeURIComponent(user) + '&order=created_at.desc&limit=200');
      const recordatorios = await sb('recordatorios?username=eq.' + encodeURIComponent(user) + '&completado=eq.false&fecha_recordatorio=lte.' + new Date(Date.now() + 86400000 * 2).toISOString() + '&order=fecha_recordatorio.asc');

      // Compute metrics
      const all = prospectos || [];
      const por_etapa = {};
      all.forEach(p => { por_etapa[p.etapa] = (por_etapa[p.etapa] || 0) + 1; });
      const now = new Date();
      const d7 = new Date(now - 7 * 86400000).toISOString();
      const d30 = new Date(now - 30 * 86400000).toISOString();
      const nuevos_7d = all.filter(p => p.created_at >= d7).length;
      const cerrados_30d = all.filter(p => p.etapa === 'cerrado_ganado' && p.updated_at >= d30).length;
      const perdidos_30d = all.filter(p => p.etapa === 'cerrado_perdido' && p.updated_at >= d30).length;
      const tasa = cerrados_30d + perdidos_30d > 0 ? Math.round(cerrados_30d / (cerrados_30d + perdidos_30d) * 100) : 0;
      const valor = all.filter(p => !p.etapa || (!p.etapa.startsWith('cerrado'))).reduce((s, p) => s + (p.valor_estimado || 0), 0);

      return res.status(200).json({
        prospectos: all,
        recordatorios: recordatorios || [],
        metricas: { total: all.length, por_etapa, nuevos_7d, cerrados_30d, perdidos_30d, tasa_conversion: tasa, valor_pipeline: valor }
      });
    }

    // -- ADD --
    if (action === 'add') {
      const { nombre, telefono, email, etapa, fuente, temperatura, notas, valor_estimado, fecha_cierre_estimada, instagram } = req.body;
      if (!nombre) return res.status(400).json({ error: 'Missing nombre' });
      const row = {
        username: user, nombre, telefono: telefono || '', email: email || '',
        etapa: etapa || 'nuevo', fuente: fuente || 'manual', temperatura: temperatura || 50,
        notas: notas || '', valor_estimado: valor_estimado || 0,
        fecha_cierre_estimada: fecha_cierre_estimada || null, instagram: instagram || ''
      };
      const data = await sb('prospectos', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row)
      });
      return res.status(200).json({ ok: true, prospecto: data && data[0] ? data[0] : null });
    }

    // -- UPDATE --
    if (action === 'update') {
      const { id, updates } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const allowed = ['nombre', 'telefono', 'email', 'etapa', 'fuente', 'temperatura', 'notas', 'valor_estimado', 'fecha_cierre_estimada', 'instagram', 'calif_positivo', 'calif_emprendedor', 'calif_dinero', 'calif_lider', 'calif_social'];
      const clean = {};
      Object.keys(updates || {}).forEach(k => { if (allowed.includes(k)) clean[k] = updates[k]; });
      clean.updated_at = new Date().toISOString();
      await sb('prospectos?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(clean)
      });
      return res.status(200).json({ ok: true });
    }

    // -- MOVE STAGE --
    if (action === 'moveStage') {
      const { id, etapa } = req.body;
      if (!id || !etapa) return res.status(400).json({ error: 'Missing id or etapa' });
      await sb('prospectos?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ etapa, updated_at: new Date().toISOString() })
      });
      // Auto-log interaction
      await sb('interacciones', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ prospecto_id: id, username: user, tipo: 'cambio_etapa', contenido: 'Movido a ' + etapa })
      });
      return res.status(200).json({ ok: true });
    }

    // -- DELETE --
    if (action === 'delete') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sb('prospectos?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    // -- ADD INTERACCION --
    if (action === 'addInteraccion') {
      const { prospecto_id, tipo, contenido } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });

      // AI suggestion for next step (compressed prompt)
      let ia_sugerencia = null;
      if (OPENAI_KEY) {
        const prospectoArr = await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id) + '&select=*');
        const prospecto = prospectoArr && prospectoArr[0] ? prospectoArr[0] : null;
        if (prospecto) {
          ia_sugerencia = await askClaude(
            'Coach ventas directas. Sugiere SIGUIENTE PASO concreto. Max 2 oraciones. Espanol. Accionable.',
            prospecto.nombre + '|' + prospecto.etapa + '|temp:' + prospecto.temperatura + '|' + (tipo||'nota') + ':' + (contenido||'-') + '|notas:' + (prospecto.notas||'-')
          );
        }
      }

      await sb('interacciones', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ prospecto_id, username: user, tipo: tipo || 'nota', contenido: contenido || '', ia_sugerencia })
      });
      await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ updated_at: new Date().toISOString() })
      });
      return res.status(200).json({ ok: true, ia_sugerencia });
    }

    // -- GET INTERACCIONES --
    if (action === 'getInteracciones') {
      const { prospecto_id } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });
      const data = await sb('interacciones?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&order=created_at.desc&limit=50');
      return res.status(200).json({ interacciones: data || [] });
    }

    // -- ADD RECORDATORIO --
    if (action === 'addRecordatorio') {
      const { prospecto_id, mensaje, fecha_recordatorio } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });
      await sb('recordatorios', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ prospecto_id, username: user, mensaje: mensaje || 'Seguimiento pendiente', fecha_recordatorio: fecha_recordatorio || new Date().toISOString(), completado: false })
      });
      return res.status(200).json({ ok: true });
    }

    // -- GET RECORDATORIOS --
    if (action === 'getRecordatorios') {
      const { prospecto_id } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });
      // Support 'all' to fetch all reminders for this user (for scheduling native notifications)
      const query = prospecto_id === 'all'
        ? 'recordatorios?username=eq.' + encodeURIComponent(user) + '&completado=eq.false&order=fecha_recordatorio.asc&limit=50'
        : 'recordatorios?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&completado=eq.false&order=fecha_recordatorio.asc';
      const data = await sb(query);
      return res.status(200).json({ recordatorios: data || [] });
    }

    // -- COMPLETE RECORDATORIO --
    if (action === 'completeRecordatorio') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sb('recordatorios?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ completado: true })
      });
      return res.status(200).json({ ok: true });
    }

    // -- GENERATE WHATSAPP MESSAGE WITH AI (compressed prompt) --
    if (action === 'generarMensajeWA') {
      const { prospecto_id, contexto } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });

      const prospectoArr = await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id) + '&select=*');
      const prospecto = prospectoArr && prospectoArr[0] ? prospectoArr[0] : null;
      if (!prospecto) return res.status(404).json({ error: 'Prospecto not found' });

      const interacciones = await sb('interacciones?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&order=created_at.desc&limit=5');
      const historial = (interacciones || []).map(i => i.tipo + ': ' + (i.contenido || '')).join('\n');

      // Get user's BANKCODE profile for personalization
      let userProfile = '';
      try {
        const userData = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=bankcode,comm_style,profession&limit=1');
        if (userData && userData[0]) {
          const u = userData[0];
          if (u.bankcode) userProfile += 'BANKCODE del vendedor: ' + u.bankcode + '. ';
          if (u.comm_style) userProfile += 'Estilo: ' + u.comm_style + '. ';
          if (u.profession) userProfile += 'Profesion: ' + u.profession + '. ';
          if (userProfile) userProfile = 'ADAPTA el mensaje al estilo del vendedor: ' + userProfile;
        }
      } catch(e) {}

      const mensaje = await askClaude(
        'Networker profesional. Genera 1 mensaje WhatsApp: corto(3-4 lineas), natural, persuasivo, emojis moderados, CTA claro. SOLO el mensaje. NUNCA menciones SKYTEAM/Innova, solo franquicia digital o negocio digital. ' + userProfile,
        prospecto.nombre + '|' + prospecto.etapa + '|temp:' + prospecto.temperatura + '|notas:' + (prospecto.notas||'-') + '|historial:' + (historial||'-') + '|ctx:' + (contexto||'seguimiento')
      );

      return res.status(200).json({ ok: true, mensaje: mensaje || 'No se pudo generar el mensaje.' });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('prospectos error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
