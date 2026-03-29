// SKY PROSPECTOS â CRM API (Vercel Serverless + Supabase) 
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

async function sb(path, opts = {}) {
  const h = { ...HEADERS, ...(opts.headers || {}) };
  delete opts.headers;
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: h, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 300)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function askClaude(systemPrompt, userMsg) {
  if (!ANTHROPIC_KEY) return null;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] })
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.content && data.content[0] ? data.content[0].text : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body || {};
    const { action, user } = body;
    if (!user) return res.status(400).json({ error: 'Missing user' });

    // ââ GET ALL PROSPECTOS + STATS ââ
    if (action === 'getAll') {
      const prospectos = await sb('prospectos?username=eq.' + encodeURIComponent(user) + '&order=updated_at.desc&select=*');
      const recordatorios = await sb('recordatorios?username=eq.' + encodeURIComponent(user) + '&completado=eq.false&fecha_recordatorio=lte.' + new Date(Date.now() + 86400000 * 2).toISOString() + '&order=fecha_recordatorio.asc&select=*,prospectos(nombre)');

      // Metrics
      const all = prospectos || [];
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7);
      const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30);

      const metricas = {
        total: all.length,
        por_etapa: { nuevo: 0, contactado: 0, interesado: 0, presentacion: 0, cerrado_ganado: 0, cerrado_perdido: 0 },
        nuevos_7d: all.filter(p => new Date(p.created_at) >= hace7).length,
        cerrados_30d: all.filter(p => p.etapa === 'cerrado_ganado' && new Date(p.updated_at) >= hace30).length,
        perdidos_30d: all.filter(p => p.etapa === 'cerrado_perdido' && new Date(p.updated_at) >= hace30).length,
        tasa_conversion: 0,
        valor_pipeline: all.filter(p => !p.etapa.startsWith('cerrado')).reduce((s, p) => s + (parseFloat(p.valor_estimado) || 0), 0)
      };
      all.forEach(p => { if (metricas.por_etapa[p.etapa] !== undefined) metricas.por_etapa[p.etapa]++; });
      const totalCerrados = metricas.cerrados_30d + metricas.perdidos_30d;
      metricas.tasa_conversion = totalCerrados > 0 ? Math.round((metricas.cerrados_30d / totalCerrados) * 100) : 0;

      return res.status(200).json({ prospectos: all, recordatorios: recordatorios || [], metricas });
    }

    // ââ ADD PROSPECTO ââ
    if (action === 'add') {
      const { prospecto } = body;
      if (!prospecto || !prospecto.nombre) return res.status(400).json({ error: 'Missing nombre' });
      const data = {
        username: user,
        nombre: prospecto.nombre,
        telefono: prospecto.telefono || null,
        email: prospecto.email || null,
        etapa: prospecto.etapa || 'nuevo',
        fuente: prospecto.fuente || 'manual',
        temperatura: prospecto.temperatura || 50,
        notas: prospecto.notas || null,
        valor_estimado: prospecto.valor_estimado || 0,
        fecha_cierre_estimada: prospecto.fecha_cierre_estimada || null,
        instagram: prospecto.instagram || null,
        calif_positivo: prospecto.calif_positivo || 0,
        calif_emprendedor: prospecto.calif_emprendedor || 0,
        calif_dinero: prospecto.calif_dinero || 0,
        calif_lider: prospecto.calif_lider || 0
      };
      const result = await sb('prospectos', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(data)
      });
      return res.status(200).json({ ok: true, prospecto: result && result[0] ? result[0] : null });
    }

    // ââ UPDATE PROSPECTO ââ
    if (action === 'update') {
      /* Support both formats: { id, updates } and { prospecto: { id, ...fields } } */
      let id = body.id;
      let updates = body.updates || {};
      if (body.prospecto && body.prospecto.id) {
        id = body.prospecto.id;
        const p = body.prospecto;
        updates = {
          nombre: p.nombre, telefono: p.telefono || null, email: p.email || null,
          etapa: p.etapa || 'nuevo', fuente: p.fuente || 'manual',
          temperatura: p.temperatura || 50, notas: p.notas || null,
          valor_estimado: p.valor_estimado || 0,
          fecha_cierre_estimada: p.fecha_cierre_estimada || null,
          instagram: p.instagram || null,
          calif_positivo: p.calif_positivo || 0,
          calif_emprendedor: p.calif_emprendedor || 0,
          calif_dinero: p.calif_dinero || 0, calif_lider: p.calif_lider || 0
        };
      }
      if (!id) return res.status(400).json({ error: 'Missing id' });
      updates.updated_at = new Date().toISOString();
      await sb('prospectos?id=eq.' + encodeURIComponent(id) + '&username=eq.' + encodeURIComponent(user), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(updates)
      });
      return res.status(200).json({ ok: true });
    }

    // ââ MOVE STAGE (drag & drop) ââ
    if (action === 'moveStage') {
      const { id, etapa } = body;
      if (!id || !etapa) return res.status(400).json({ error: 'Missing id or etapa' });
      await sb('prospectos?id=eq.' + encodeURIComponent(id) + '&username=eq.' + encodeURIComponent(user), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ etapa, updated_at: new Date().toISOString() })
      });
      // Auto-log the stage change
      await sb('interacciones', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ prospecto_id: id, username: user, tipo: 'seguimiento', contenido: 'Movido a etapa: ' + etapa })
      });
      return res.status(200).json({ ok: true });
    }

    // ââ DELETE PROSPECTO ââ
    if (action === 'delete') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sb('prospectos?id=eq.' + encodeURIComponent(id) + '&username=eq.' + encodeURIComponent(user), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    // ââ ADD INTERACCION ââ
    if (action === 'addInteraccion') {
      const { prospecto_id, tipo, contenido } = body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });

      // Also get AI suggestion for next step
      let ia_sugerencia = null;
      if (ANTHROPIC_KEY) {
        const prospectoArr = await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id) + '&select=*');
        const prospecto = prospectoArr && prospectoArr[0] ? prospectoArr[0] : null;
        if (prospecto) {
          ia_sugerencia = await askClaude(
            'Eres un coach experto en network marketing y ventas directas. Analiza la interacciÃ³n con este prospecto y sugiere el SIGUIENTE PASO concreto. Responde en mÃ¡ximo 2 oraciones, directo y accionable. En espaÃ±ol.',
            'Prospecto: ' + prospecto.nombre + '\nEtapa actual: ' + prospecto.etapa + '\nTemperatura: ' + prospecto.temperatura + '/100\nTipo de interacciÃ³n: ' + (tipo || 'nota') + '\nContenido: ' + (contenido || 'Sin detalle') + '\nNotas previas: ' + (prospecto.notas || 'ninguna')
          );
        }
      }

      await sb('interacciones', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ prospecto_id, username: user, tipo: tipo || 'nota', contenido: contenido || '', ia_sugerencia })
      });
      // Update prospecto timestamp
      await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ updated_at: new Date().toISOString() })
      });
      return res.status(200).json({ ok: true, ia_sugerencia });
    }

    // ââ GET INTERACCIONES ââ
    if (action === 'getInteracciones') {
      const { prospecto_id } = body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });
      const data = await sb('interacciones?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&order=created_at.desc&limit=50');
      return res.status(200).json({ interacciones: data || [] });
    }

    // ââ ADD RECORDATORIO ââ
    if (action === 'addRecordatorio') {
      const { prospecto_id, mensaje, fecha_recordatorio } = body;
      if (!prospecto_id || !fecha_recordatorio) return res.status(400).json({ error: 'Missing fields' });
      await sb('recordatorios', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ prospecto_id, username: user, mensaje: mensaje || 'Seguimiento pendiente', fecha_recordatorio })
      });
      return res.status(200).json({ ok: true });
    }

    // ── GET RECORDATORIOS ──
    if (action === 'getRecordatorios') {
      const { prospecto_id } = body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });
      const data = await sb('recordatorios?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&completado=eq.false&order=fecha_recordatorio.asc&limit=50');
      return res.status(200).json({ recordatorios: data });
    }

    // ââ COMPLETE RECORDATORIO ââ
    if (action === 'completeRecordatorio') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sb('recordatorios?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ completado: true })
      });
      return res.status(200).json({ ok: true });
    }

    // ââ GENERATE WHATSAPP MESSAGE WITH AI ââ
    if (action === 'generarMensajeWA') {
      const { prospecto_id, contexto } = body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });

      const prospectoArr = await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id) + '&select=*');
      const prospecto = prospectoArr && prospectoArr[0] ? prospectoArr[0] : null;
      if (!prospecto) return res.status(404).json({ error: 'Prospecto not found' });

      const interacciones = await sb('interacciones?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&order=created_at.desc&limit=5');

      const historial = (interacciones || []).map(i => i.tipo + ': ' + (i.contenido || '')).join('\n');

      const mensaje = await askClaude(
        'Eres un networker profesional experto en ventas por WhatsApp. Genera UN mensaje de WhatsApp personalizado, natural y persuasivo. El mensaje debe ser corto (mÃ¡ximo 3-4 lÃ­neas), usar lenguaje informal pero profesional, incluir emojis moderados, y tener un llamado a la acciÃ³n claro. NO uses saludos genÃ©ricos. Responde SOLO con el mensaje, sin explicaciones.',
        'Prospecto: ' + prospecto.nombre + '\nEtapa: ' + prospecto.etapa + '\nTemperatura: ' + prospecto.temperatura + '/100\nNotas: ' + (prospecto.notas || 'ninguna') + '\nÃltimas interacciones:\n' + (historial || 'ninguna') + '\nContexto adicional: ' + (contexto || 'seguimiento general')
      );

      return res.status(200).json({ ok: true, mensaje: mensaje || 'No se pudo generar el mensaje.' });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('prospectos error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
