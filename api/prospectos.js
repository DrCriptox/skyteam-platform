const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

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
    if (!r.ok) { const errT = await r.text().catch(()=>''); console.error('[SB] FAIL:', r.status, path.substring(0,50), errT.substring(0,100)); return null; }
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch(e) { clearTimeout(t); console.error('[SB] ERROR:', path.substring(0,50), e.message); return null; }
}

async function askClaude(systemPrompt, userMsg) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
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
      const prospectos = await sb('prospectos?username=eq.' + encodeURIComponent(user) + '&order=created_at.desc', { headers: { Range: '0-1999', Prefer: 'count=exact' } });
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
      // Tasa de cierre: cerrados / todos los que pasaron de presentación en adelante
      const etapasAvanzadas = ['presentacion','confirmado_cierre','seguimiento','pendiente_pago','abonado','cerrado_ganado','cerrado_perdido'];
      const avanzados = all.filter(p => etapasAvanzadas.indexOf(p.etapa) !== -1).length;
      const cerradosTotal = all.filter(p => p.etapa === 'cerrado_ganado').length;
      const tasa = avanzados > 0 ? Math.round(cerradosTotal / avanzados * 100) : 0;
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
      // Note: interaction is logged by the frontend BEFORE calling moveStage
      // No auto-log here to avoid duplicate entries
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

      const insertUrl = SUPABASE_URL + '/rest/v1/interacciones';
      const insertBody = { prospecto_id, username: user, tipo: tipo || 'nota', contenido: contenido || '', ia_sugerencia };
      const insertR = await fetch(insertUrl, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify(insertBody)
      });
      if (!insertR.ok) {
        const errText = await insertR.text();
        console.error('[INTERACCION] INSERT FAILED:', insertR.status, errText.substring(0, 200));
        return res.status(500).json({ ok: false, error: 'No se pudo guardar la interaccion: ' + errText.substring(0, 100) });
      }
      console.log('[INTERACCION] Saved:', tipo, prospecto_id);
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

    // -- ADMIN: IA performance stats (positive vs negative feedbacks per socio) --
    if (action === 'iaPerformanceStats') {
      try {
        // Fetch last 2000 IA feedbacks across all users
        const fbPos = await sb('interacciones?tipo=eq.ia_feedback_positive&order=created_at.desc&select=username,created_at,contenido', { headers: { ...{ 'Content-Type':'application/json', apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY }, Range: '0-1999' } });
        const fbNeg = await sb('interacciones?tipo=eq.ia_feedback_negative&order=created_at.desc&select=username,created_at,contenido', { headers: { ...{ 'Content-Type':'application/json', apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY }, Range: '0-1999' } });
        const perUser = {};
        (fbPos || []).forEach(function(f) { if (!perUser[f.username]) perUser[f.username] = { positive: 0, negative: 0, last: null }; perUser[f.username].positive++; if (!perUser[f.username].last || f.created_at > perUser[f.username].last) perUser[f.username].last = f.created_at; });
        (fbNeg || []).forEach(function(f) { if (!perUser[f.username]) perUser[f.username] = { positive: 0, negative: 0, last: null }; perUser[f.username].negative++; if (!perUser[f.username].last || f.created_at > perUser[f.username].last) perUser[f.username].last = f.created_at; });
        const users = Object.keys(perUser).map(function(u) {
          const s = perUser[u]; const total = s.positive + s.negative;
          return { username: u, positive: s.positive, negative: s.negative, total: total, approval: total > 0 ? Math.round((s.positive / total) * 100) : 0, last: s.last };
        }).sort(function(a, b) { return b.total - a.total; });
        const totalPos = users.reduce(function(s, u) { return s + u.positive; }, 0);
        const totalNeg = users.reduce(function(s, u) { return s + u.negative; }, 0);
        return res.status(200).json({
          ok: true,
          summary: { totalGenerated: totalPos + totalNeg, totalApproved: totalPos, totalRejected: totalNeg, approvalRate: (totalPos + totalNeg) > 0 ? Math.round((totalPos / (totalPos + totalNeg)) * 100) : 0, activeSocios: users.length },
          socios: users
        });
      } catch(e) { return res.status(500).json({ error: e.message }); }
    }

    // -- FEEDBACK: save whether the socio approved/rejected a generated message --
    // tipo_feedback: 'positive' (copied/sent) | 'negative' (regenerated/closed unused)
    // Stored in `interacciones` with tipo='ia_feedback_positive' or 'ia_feedback_negative'
    // Content format: meta_json + '|||' + message_text (first 500 chars)
    // This data trains future generations to match the socio's preferred writing style.
    if (action === 'feedbackMensajeIA') {
      const { prospecto_id, mensaje, tipo_feedback, modo, toque, fase } = req.body;
      if (!prospecto_id || !mensaje || !tipo_feedback) return res.status(400).json({ error: 'Missing fields' });
      if (tipo_feedback !== 'positive' && tipo_feedback !== 'negative') return res.status(400).json({ error: 'Invalid tipo_feedback' });
      try {
        const meta = JSON.stringify({ modo: modo || '', toque: toque || 0, fase: fase || '' });
        const shortMsg = (mensaje + '').substring(0, 500);
        await sb('interacciones', {
          method: 'POST',
          body: JSON.stringify({
            prospecto_id: prospecto_id,
            username: user,
            tipo: 'ia_feedback_' + tipo_feedback,
            contenido: meta + '|||' + shortMsg
          })
        });
        return res.status(200).json({ ok: true });
      } catch(e) { return res.status(500).json({ error: e.message }); }
    }

    // -- GENERATE WHATSAPP MESSAGE WITH AI (smart multi-touch strategy) --
    // Auto-detects the appropriate mode based on: socio rank + prospect stars + notes + history
    //   DIRECTO      (1 touch)  - new socio + known low-profile prospect
    //   BALANCEADO   (2 touches) - mid-profile or stale prospect
    //   RELACIONAL   (3 touches) - high stars or cold prospect (>30d no movement)
    //   ALTO_PERFIL  (4 touches) - rank INN500+ with 4-5 stars, OR elite keywords in notes
    if (action === 'generarMensajeWA') {
      const { prospecto_id, contexto, forceToque, forceModo, ultimoMensajeEnviado, respuestaProspecto, canal, ajusteEstilo, flujoPaso, flujoHora } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });
      const canalTipo = (canal === 'instagram') ? 'Instagram DM' : 'WhatsApp';
      const hayConversacionPrevia = !!(ultimoMensajeEnviado && ultimoMensajeEnviado.length > 5);
      const dejadoEnVisto = hayConversacionPrevia && (!respuestaProspecto || respuestaProspecto.length < 2);

      // Detect intention in the prospect's response (simple heuristic, IA will refine)
      const respLower = ((respuestaProspecto || '') + '').toLowerCase();
      const aceptaciones = ['si ','sí ','si,','sí,','si.','sí.','claro','dale','por supuesto','de una','va','ok','okay','bueno','perfecto','me interesa','cuéntame','cuentame','cuando','a qué hora','a que hora','hablamos','agendemos','agenda','me gustaría','me gustaria','cuadr','coordi','escúchame','escuchame'];
      const objeciones = ['no tengo tiempo','no me interesa','estoy ocupad','luego','después','despues','otro día','otro dia','no puedo','no gracias','no por ahora'];
      const dudas = ['qué es','que es','de qué','de que','cómo así','como asi','en qué consiste','en que consiste','explícame','explicame','y eso','y esto'];
      const detectoAceptacion = respuestaProspecto && aceptaciones.some(function(k) { return respLower.indexOf(k) !== -1; });
      const detectoObjecion = respuestaProspecto && objeciones.some(function(k) { return respLower.indexOf(k) !== -1; });
      const detectoDuda = respuestaProspecto && dudas.some(function(k) { return respLower.indexOf(k) !== -1; });
      const ajustesValidos = {
        mas_corto: 'ACORTA el mensaje drásticamente. MÁXIMO 2 líneas (15 palabras). Elimina todo lo accesorio y deja solo lo esencial con gancho.',
        mas_casual: 'Hazlo MÁS CASUAL y relajado. Tono de amigo. Usa muletillas naturales ("oye", "pues", "la verdad"). Reduce formalidad. Puedes incluir un emoji sutil.',
        mas_directo: 'Hazlo MÁS DIRECTO y al grano. Sin rodeos, sin preámbulos largos. Ve directo al punto con respeto pero sin dar vueltas.',
        mas_formal: 'Hazlo MÁS FORMAL y profesional. Trato de usted o de tú profesional. Sin emojis. Lenguaje pulido, sin perder calidez.'
      };
      const instruccionAjuste = (ajusteEstilo && ajustesValidos[ajusteEstilo]) ? ajustesValidos[ajusteEstilo] : '';

      const prospectoArr = await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id) + '&select=*');
      const prospecto = prospectoArr && prospectoArr[0] ? prospectoArr[0] : null;
      if (!prospecto) return res.status(404).json({ error: 'Prospecto not found' });

      // -- 1. Socio profile (rank + BANKCODE + style) --
      let userProfile = '';
      let socioRank = 0;
      let socioName = '';
      let socioBankcode = '';
      try {
        const userData = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=bankcode,comm_style,profession,rank,name&limit=1');
        if (userData && userData[0]) {
          const u = userData[0];
          socioRank = parseInt(u.rank) || 0;
          socioName = u.name || '';
          socioBankcode = u.bankcode || '';
          if (u.bankcode) userProfile += 'BANKCODE del vendedor: ' + u.bankcode + '. ';
          if (u.comm_style) userProfile += 'Estilo: ' + u.comm_style + '. ';
          if (u.profession) userProfile += 'Profesion: ' + u.profession + '. ';
          if (userProfile) userProfile = 'ADAPTA el tono al estilo personal del vendedor: ' + userProfile;
        }
      } catch(e) {}

      // -- 1b. Fetch prior feedback from THIS socio to learn their preferred style --
      // Positive feedback = messages they copied/sent (liked)
      // Negative feedback = messages they regenerated/closed unused (disliked)
      // Used as few-shot examples in the prompt.
      let positiveSamples = [];
      let negativeSamples = [];
      try {
        const posArr = await sb('interacciones?username=eq.' + encodeURIComponent(user) + '&tipo=eq.ia_feedback_positive&order=created_at.desc&limit=8');
        positiveSamples = (posArr || []).map(function(f) {
          var parts = ((f.contenido || '') + '').split('|||');
          return (parts[1] || '').trim();
        }).filter(function(x) { return x && x.length > 20; }).slice(0, 5);
        const negArr = await sb('interacciones?username=eq.' + encodeURIComponent(user) + '&tipo=eq.ia_feedback_negative&order=created_at.desc&limit=4');
        negativeSamples = (negArr || []).map(function(f) {
          var parts = ((f.contenido || '') + '').split('|||');
          return (parts[1] || '').trim();
        }).filter(function(x) { return x && x.length > 20; }).slice(0, 3);
      } catch(e) {}

      // -- 2. Calculate prospect stars (0-5) --
      const starFields = ['calif_positivo','calif_social','calif_emprendedor','calif_dinero','calif_lider'];
      const stars = starFields.reduce((n, k) => n + ((prospecto[k] && prospecto[k] > 0) ? 1 : 0), 0);

      // -- 3. Count previous REAL interactions (not just IA-generated messages) --
      // Exclude automatic "Mensaje generado con IA" entries — those are just
      // internal tracking when the user copied/sent a preview, not an actual
      // conversation with the prospect. We want to count REAL conversation events:
      // - explicit whatsapp/instagram/llamada/reunion interaction types
      // - notes describing real responses ("respondió", "contestó", "confirmó", "dijo")
      const interacciones = await sb('interacciones?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&order=created_at.asc&limit=30');
      const mensajesPrevios = (interacciones || []).filter(function(i) {
        const c = ((i.contenido || '') + '').toLowerCase();
        const t = ((i.tipo || '') + '').toLowerCase();
        // Exclude IA-generated tracking entries (internal, not real conversation)
        if (c.indexOf('generado con ia') !== -1) return false;
        if (c.indexOf('mensaje generado') !== -1) return false;
        // Count real conversation types
        if (t === 'whatsapp' || t === 'instagram' || t === 'llamada' || t === 'reunion' || t === 'email') return true;
        // Count notes that describe a real response from the prospect
        if (c.indexOf('respondió') !== -1 || c.indexOf('respondio') !== -1) return true;
        if (c.indexOf('contestó') !== -1 || c.indexOf('contesto') !== -1) return true;
        if (c.indexOf('confirmó') !== -1 || c.indexOf('confirmo') !== -1) return true;
        if (c.indexOf('me dijo') !== -1 || c.indexOf('me escribió') !== -1 || c.indexOf('me escribio') !== -1) return true;
        return false;
      }).length;

      // -- 4. Detect "cold" prospect (>30 days since creation, no interactions) --
      let creadoHaceDias = 0;
      try {
        creadoHaceDias = Math.floor((Date.now() - new Date(prospecto.created_at).getTime()) / 86400000);
      } catch(e) {}
      const esFrio = creadoHaceDias > 30 && mensajesPrevios === 0;

      // -- 5. Analyze notes for elite profile keywords --
      const notas = ((prospecto.notas || '') + '').toLowerCase();
      const eliteKeywords = [
        'ceo','director','dueño','dueno','empresari','fundador','fundadora','propietar',
        'médico','medico','cirujano','doctor','doctora','abogado','abogada','notario',
        'ingenier','arquitect','odontólog','odontolog','psicólog','psicolog','nutricion',
        'coach ','influencer','experto','experta','mentor','conferencista','speaker',
        'gerente','presidente','vicepresidente','ejecutiv','inversionista','inversor',
        'consultor','consultora','líder','lider','socio ','master','mba ','phd','doctorado',
        'seguidores','followers','mil seguidores','reconocid','conocid','famos',
        'emprend','start-up','startup','negocio propio','empresa propia','su empresa'
      ];
      const esElite = eliteKeywords.some(function(kw) { return notas.indexOf(kw) !== -1; });

      // -- 6. Determine mode --
      let modo = 'DIRECTO';
      let totalToques = 1;
      if (forceModo && ['DIRECTO','BALANCEADO','RELACIONAL','ALTO_PERFIL'].indexOf(forceModo) !== -1) {
        modo = forceModo;
      } else if ((socioRank >= 2 && stars >= 4) || esElite) {
        modo = 'ALTO_PERFIL';
      } else if (stars >= 4 || esFrio) {
        modo = 'RELACIONAL';
      } else if (stars === 3 || (stars >= 2 && creadoHaceDias > 14)) {
        modo = 'BALANCEADO';
      } else {
        modo = 'DIRECTO';
      }
      const toquesPorModo = { DIRECTO: 1, BALANCEADO: 2, RELACIONAL: 3, ALTO_PERFIL: 4 };
      totalToques = toquesPorModo[modo];

      // -- 7. Determine which touch to generate --
      // Default: ALWAYS start at touch 1 of the plan. The user manually advances
      // through the sequence via the touch selector in the UI. This is more
      // predictable than auto-detecting from interaction history, which is noisy.
      let toqueActual = 1;
      if (forceToque && forceToque >= 1 && forceToque <= totalToques) toqueActual = forceToque;

      // -- 8. Phase per mode --
      const fasesPorModo = {
        DIRECTO: ['invitacion'],
        BALANCEADO: ['reconexion', 'invitacion'],
        RELACIONAL: ['admiracion', 'interes', 'invitacion_sutil'],
        ALTO_PERFIL: ['admiracion', 'conversacion', 'valor', 'invitacion_elite']
      };
      const fase = fasesPorModo[modo][toqueActual - 1];

      // -- 9. Phase-specific instructions --
      const instruccionesPorFase = {
        admiracion: 'OBJETIVO: ADMIRACIÓN GENUINA. Abre la puerta con un reconocimiento HONESTO y ESPECÍFICO basado en lo que el prospecto hace/logra (usa las notas). NO menciones negocio. NO vendas. NO invites aún. Solo reconocer algo puntual que demuestre que lo viste/conoces. 2-3 líneas. Tono cálido pero profesional. Termina con una frase abierta (no pregunta directa aún).',
        interes: 'OBJETIVO: INTERÉS GENUINO. Haz UNA pregunta curiosa sobre su trabajo/profesión/experiencia. NO vendas. NO invites. Solo muestra curiosidad honesta que invite a conversar. 2-3 líneas. La pregunta debe ser fácil de responder y sobre ELLOS, no sobre ti.',
        valor: 'OBJETIVO: DAR VALOR GRATIS. Comparte algo útil relacionado con su mundo (una idea, tip, reflexión, dato interesante). Principio de reciprocidad: dar antes de pedir. NO menciones negocio, NO invites todavía. Solo aportar. 3-4 líneas. Puede terminar con "Espero te sirva" o similar, sin CTA.',
        reconexion: 'OBJETIVO: RECONEXIÓN CÁLIDA. Recuperar el contacto después de tiempo. Pregunta cómo ha estado, mencionando algo real del pasado si es posible. NO vendas aún. 2-3 líneas. Termina con pregunta abierta y cálida.',
        invitacion: 'OBJETIVO: INVITACIÓN DIRECTA pero CÁLIDA. Invita a conocer una oportunidad. CTA claro (15 min llamada, link, video). 3-4 líneas. Persuasivo, no agresivo. NO uses "te va a encantar", "tengo algo increíble".',
        invitacion_sutil: 'OBJETIVO: INVITACIÓN SUTIL (después de 2 mensajes relacionales). Invita MENCIONANDO la relación previa ("Viendo lo que haces", "Después de conocerte un poco..."). Sin presión. CTA suave: "¿Tienes 15 min para conversar?". 3-4 líneas.',
        invitacion_elite: 'OBJETIVO: INVITACIÓN ÉLITE entre pares. Después de 3 mensajes de alto perfil. Trato de tú a tú profesional. Menciona la conversación previa y el valor compartido. CTA con opción de agenda ("cuando te acomode esta semana"). 4-5 líneas. No vendedor, sino colega compartiendo algo pertinente.'
      };

      // -- 10. Timing + tip per phase --
      const timingPorFase = {
        admiracion: 'Martes o jueves 10am-12pm (foco matutino). Espera 2-3 días antes del siguiente toque.',
        interes: 'Martes o jueves 10am-12pm. Espera 3-4 días antes del siguiente toque.',
        valor: 'Miércoles o viernes 4-6pm (reflexión). Espera 2-3 días antes de invitar.',
        reconexion: 'Cualquier día 10am-6pm. Espera 2 días antes de la invitación.',
        invitacion: 'Martes o jueves 10am-11am (mente fresca). Si no responde, espera 3-4 días y envía seguimiento.',
        invitacion_sutil: 'Jueves 10am-11am o viernes 4-5pm. Si no responde en 3 días, 1 seguimiento único.',
        invitacion_elite: 'Lunes o martes 10am-11am (inicio de semana profesional). Si no responde en 4 días, 1 mensaje final.'
      };
      const tipsPorFase = {
        admiracion: 'Si responde agradeciendo → genera toque 2 (interés). Si pregunta qué haces → ve a invitación sutil.',
        interes: 'Si responde con detalle → compártele valor relacionado (toque 3). Si responde corto → pregunta de seguimiento antes de avanzar.',
        valor: 'Si agradece el valor → genera la invitación élite (toque 4). Principio: ya diste, ahora puedes pedir.',
        reconexion: 'Si responde cálido → invitación. Si responde frío o no responde → deja descansar 1 semana.',
        invitacion: 'Si pregunta de qué se trata → envía video corto o audio personalizado. No expliques todo por texto.',
        invitacion_sutil: 'Si dice sí → agenda YA. Si duda → "Sin compromiso, solo para que lo conozcas. ¿Jueves 10am o viernes 5pm?"',
        invitacion_elite: 'Si responde con objeción → valida su tiempo, ofrece formato asíncrono (video grabado). No presiones.'
      };

      // -- 11. Build the prompt --
      let styleLearning = '';
      if (positiveSamples.length > 0) {
        styleLearning += '\n\n══════════════════════════════════════════\nESTILO PREFERIDO DE ESTE SOCIO (mensajes que aprobó/envió en el pasado — REPLICA este tono, estructura, longitud y forma de hablar):\n';
        positiveSamples.forEach(function(s, i) { styleLearning += '\nEJEMPLO POSITIVO ' + (i+1) + ':\n' + s + '\n'; });
      }
      if (negativeSamples.length > 0) {
        styleLearning += '\n\nESTILO QUE ESTE SOCIO RECHAZA (mensajes que descartó — NO uses este tono):\n';
        negativeSamples.forEach(function(s, i) { styleLearning += '\nEJEMPLO NEGATIVO ' + (i+1) + ':\n' + s + '\n'; });
      }

      // Fetch socio's agenda link (for auto-schedule mode) + landing link
      let agendaLink = '';
      let landingLink = 'https://skyteam.global/landing/' + user;
      try {
        const cfgArr = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
        if (cfgArr && cfgArr[0] && cfgArr[0].config) {
          const cfg = cfgArr[0].config;
          if (cfg.activa) {
            agendaLink = 'https://skyteam.global/agenda/' + user;
          }
        }
      } catch(e) {}

      // Special phase override if prospect left the last message on read OR accepted
      // OR if the socio is following a specific sales flow step (flujoPaso)
      let faseEffective = fase;
      let instruccionFase = instruccionesPorFase[fase];

      // === FLUJO GUIADO DE VENTA (5 pasos) ===
      // Sobrescribe cualquier otra fase si el socio eligió un paso específico del flujo.
      // Estos corresponden al proceso estandarizado: preparar → enviar landing → seguimiento →
      // pregunta qué le gustó → proponer reunión con agenda.
      if (flujoPaso === 'enviar_info_ahora') {
        faseEffective = 'flujo_enviar_info_ahora';
        instruccionFase = 'OBJETIVO: CONFIRMAR ENVÍO INMEDIATO DE LA INFORMACIÓN. El prospecto aceptó verla ahora. ' +
          'Genera un mensaje MUY CORTO (máx 3 líneas) que: ' +
          '(1) Confirme con entusiasmo moderado que le vas a enviar el link ahora, ' +
          '(2) Mencione que la información dura ~25 minutos para verla completa, ' +
          '(3) Diga que en 30 minutos vuelves a escribir para comentar. ' +
          'INCLUYE al final el link: ' + landingLink + '. ' +
          'Tono casual, como amigo. Ejemplo: "Perfecto [nombre], te mando el link aquí 👇\\n' + landingLink + '\\nDura unos 25 min. En media hora te escribo para saber qué te pareció."';
      } else if (flujoPaso === 'enviar_info_despues') {
        faseEffective = 'flujo_enviar_info_despues';
        var horaTxt = flujoHora ? ('a las ' + flujoHora) : 'cuando estés disponible';
        instruccionFase = 'OBJETIVO: CONFIRMAR ENVÍO AGENDADO DE LA INFORMACIÓN. El prospecto dijo que prefiere verlo más tarde ' + horaTxt + '. ' +
          'Genera un mensaje CORTO (máx 3 líneas) que: ' +
          '(1) Confirme que le enviarás el link ' + horaTxt + ', ' +
          '(2) Mencione que dura 25 min, ' +
          '(3) Diga que después hablan sobre sus impresiones. ' +
          'NO incluyas el link aún — se enviará después. Ejemplo: "Perfecto [nombre], te lo envío ' + horaTxt + '. Son 25 min bien explicados y después hablamos para que me comentes qué te pareció."';
      } else if (flujoPaso === 'seguimiento_35min') {
        faseEffective = 'flujo_seguimiento_35min';
        instruccionFase = 'OBJETIVO: SEGUIMIENTO DESPUÉS DE ENVIAR LA INFORMACIÓN. Ya pasaron unos 30-35 minutos desde que le enviaste el link de la landing. ' +
          'Genera un mensaje CORTO (máx 2 líneas) que pregunte de forma ligera si pudo ver la información. ' +
          'NO presiones. NO preguntes "qué te pareció" todavía (eso viene después si responde que sí). ' +
          'Ejemplos: "Hola [nombre], ¿ya pudiste darle una mirada?" o "Qué tal [nombre], ¿tuviste chance de verlo?"';
      } else if (flujoPaso === 'pregunta_que_gusto') {
        faseEffective = 'flujo_pregunta_que_gusto';
        instruccionFase = 'OBJETIVO: EL PROSPECTO YA VIO LA INFORMACIÓN. Ahora pregunta qué le gustó más. ' +
          'Genera un mensaje CORTO (máx 2 líneas) que pregunte específicamente QUÉ LE GUSTÓ MÁS de la información. ' +
          'Es CLAVE usar "qué te gustó más" (presupone que algo le gustó — principio de asunción positiva). ' +
          'NO preguntes "qué te pareció" (abre la puerta a respuestas tibias). ' +
          'Ejemplo: "Genial [nombre]. ¿Qué fue lo que más te gustó o te llamó la atención?"';
      } else if (flujoPaso === 'proponer_reunion') {
        faseEffective = 'flujo_proponer_reunion';
        instruccionFase = 'OBJETIVO: PROPONER LA REUNIÓN DE 20 MIN. El prospecto te contó qué le gustó. Ahora propones una llamada de 20 min para mostrar los beneficios específicos. ' +
          'Genera un mensaje (máx 4 líneas) que: ' +
          '(1) Valide/reconozca brevemente lo que dijo que le gustó (usa respuestaProspecto), ' +
          '(2) Proponga una reunión de 20 minutos para mostrarle los beneficios disponibles ESTA SEMANA específicamente, ' +
          '(3) ' + (agendaLink ? 'Incluya el link de tu agenda: ' + agendaLink + ' para que elija horario.' : 'Proponga 2-3 opciones específicas de día/hora para elegir.') + ' ' +
          'Tono colaborativo, entre iguales. Sin presión. Ejemplo: "Qué bueno que te llamó la atención eso. Te propongo una llamada corta de 20 min para mostrarte los beneficios que tenemos activos esta semana — son por tiempo limitado y vale la pena que los aproveches. ' + (agendaLink ? 'Aquí escoges cuando te acomode:\\n' + agendaLink : '¿Te sirve el jueves a las 10am o el viernes a las 4pm?') + '"';
      }

      // Fallback states (dejado en visto, aceptó, objetó, dudó) si NO hay flujoPaso específico
      if (!flujoPaso && dejadoEnVisto) {
        faseEffective = 'seguimiento_visto';
        instruccionFase = 'OBJETIVO: SEGUIMIENTO DESPUÉS DE DEJARTE EN VISTO. El prospecto leyó tu mensaje anterior pero no respondió — probablemente porque fue demasiado largo, intrusivo, o no hubo gancho claro. Genera un mensaje MUY CORTO (MÁXIMO 2 líneas, ~20 palabras total), ligero, sin presión, con gancho de curiosidad o humor sutil. NO repitas lo que dijiste antes. NO te disculpes por insistir. NO invites de nuevo directamente. Un simple "oye te mando esto rápido" o "olvida el mensaje anterior, te pregunto solo una cosa" funciona mejor que un texto elaborado. El objetivo es reactivar, NO cerrar.';
      } else if (!flujoPaso && detectoAceptacion) {
        faseEffective = 'agendar';
        instruccionFase = 'OBJETIVO: EL PROSPECTO ACEPTÓ. Genera un mensaje de AGENDAMIENTO CORTO. ' +
          (agendaLink ? 'INCLUYE este link exactamente: ' + agendaLink + ' para que elija el horario que más le convenga. ' : 'Propón 2 opciones de día/hora específicas esta semana para que elija. ') +
          'Confirma con entusiasmo pero sin efusividad. Máximo 3 líneas. ' +
          (agendaLink ? 'Ejemplo: "Genial [nombre], aquí puedes elegir el horario que mejor te funcione esta semana: [link]. Dura 20 min, sin compromiso." ' : 'Ejemplo: "Genial [nombre], tengo disponible el [día] a las [hora] o el [día] a las [hora]. ¿Cuál te acomoda mejor?" ') +
          'NO agregues párrafos extra sobre la oportunidad — ya aceptó, no hay que vender más.';
      } else if (!flujoPaso && detectoObjecion) {
        faseEffective = 'manejar_objecion';
        instruccionFase = 'OBJETIVO: MANEJAR OBJECIÓN CON EMPATÍA. El prospecto puso una objeción (tiempo, interés, ocupación, etc). Responde validando su situación SIN discutir. Ofrece alternativa menos comprometedora: un mensaje de audio, un video grabado, o simplemente dejar la puerta abierta para otro momento. Máximo 3 líneas. NO insistas. NO trates de convencer. Un "entiendo totalmente, no te preocupes" vale más que 10 argumentos.';
      } else if (!flujoPaso && detectoDuda) {
        faseEffective = 'resolver_duda';
        instruccionFase = 'OBJETIVO: EL PROSPECTO PREGUNTÓ "¿QUÉ ES?" O "¿DE QUÉ SE TRATA?". NO expliques todo por texto (eso aburre y pierde). Responde con intriga generada: "Mira es más fácil que te lo muestre en 15 min que que intente explicarlo por texto" o similar. Mueve hacia una llamada corta. Máximo 3 líneas.';
      }

      // Length rule based on channel — WhatsApp/Instagram demand brevity
      const lengthRule =
        '══════════════════════════════════════════\n' +
        'REGLA DE LONGITUD (CRÍTICA — los mensajes largos son ignorados): ' +
        (dejadoEnVisto
          ? 'MÁXIMO 2 LÍNEAS (20 palabras). El prospecto te dejó en visto: no repitas la carga. Corto y con gancho.'
          : fase === 'invitacion_elite' || fase === 'invitacion_sutil' || fase === 'valor'
            ? 'MÁXIMO 5 LÍNEAS (60 palabras total). Tu toque actual permite un poco más de contenido, pero NO pases de 5 líneas cortas separadas por saltos de línea.'
            : 'MÁXIMO 3-4 LÍNEAS (40 palabras total). En ' + canalTipo + ' los mensajes cortos responden, los largos se ignoran. Regla de oro: si no cabe en una captura de pantalla de celular sin scroll, es demasiado largo.');

      const systemPrompt =
        'Eres un networker de alto nivel entrenado en los principios de Dale Carnegie (relaciones humanas) y Robert Cialdini (persuasión ética). ' +
        'Generas mensajes de prospección para ' + canalTipo + ' basados en CONSTRUCCIÓN DE RELACIÓN, no en venta agresiva. ' +
        'Modo actual: ' + modo + ' | Toque ' + toqueActual + ' de ' + totalToques + ' | Fase: ' + faseEffective.toUpperCase() + '. ' +
        instruccionFase + ' ' +
        (instruccionAjuste ? '\n\n══════════════════════════════════════════\nAJUSTE SOLICITADO POR EL USUARIO (PRIORIDAD ALTA): ' + instruccionAjuste + '\n\n' : '') +
        'REGLAS ESTRICTAS: ' +
        '(1) NUNCA menciones SKYTEAM, Innova, Innova IA ni ningún nombre de empresa. Usa "franquicia digital", "sistema digital", "oportunidad digital" SOLO si la fase es de invitación. ' +
        '(2) NUNCA uses clichés de network: "te va a encantar", "tengo algo increíble", "quiero mostrarte un proyecto", "cambió mi vida", "no te vas a arrepentir". ' +
        '(3) Español latino natural, de persona a persona. Emojis moderados (1-2 máximo, o ninguno si es élite). ' +
        '(4) Personaliza con lo que sabes del prospecto (usa las notas, historial real y conversación previa si fue provista). ' +
        '(5) SOLO devuelve el mensaje listo para copiar. Sin encabezados, sin comillas, sin explicaciones. ' +
        '\n\n' + lengthRule +
        '\n\n══════════════════════════════════════════\n' +
        'ESTILO DE ESCRITURA HUMANA (MUY IMPORTANTE — evita sonar robot): ' +
        '(a) Los mensajes de ' + canalTipo + ' reales casi NO tienen puntuación excesiva. Una persona no escribe con puntos finales perfectos en cada oración. ' +
        '(b) Usa MÁXIMO 1 signo de exclamación y 1 signo de interrogación por mensaje. NUNCA "!!!" ni "???". ' +
        '(c) Separa ideas con saltos de línea en vez de abusar de puntos y comas. ' +
        '(d) Es aceptable (a veces) omitir tildes no críticas para sonar natural (ej: "tu" en vez de "tú" en saludo casual). PERO nunca cometas errores ortográficos reales. ' +
        '(e) Puedes usar minúscula después de punto si suena más conversacional (sin abusar). ' +
        '(f) Conecta con "y", "pero", "entonces" en vez de siempre punto-mayúscula. ' +
        '(g) Suena como una persona real escribiendo desde el celular. ' +
        '(h) Mensajes CORTOS generan respuesta. Mensajes LARGOS generan visto. ' +
        userProfile + ' ' +
        (socioBankcode ? 'El BANKCODE "' + socioBankcode + '" debe guiar el tono: aplica la cadencia y vocabulario típico de ese perfil al escribir. ' : '') +
        styleLearning;

      // Build real-history summary (exclude IA-generated tracking entries)
      var realHistoryLines = (interacciones || []).filter(function(i) {
        var c = ((i.contenido || '') + '').toLowerCase();
        if (c.indexOf('generado con ia') !== -1) return false;
        if (c.indexOf('mensaje generado') !== -1) return false;
        return !!i.contenido;
      }).slice(-5).map(function(i) {
        return '- ' + (i.tipo || 'nota') + ': ' + (i.contenido || '').substring(0, 200);
      }).join('\n');

      // Conversation previa (exact copy-paste from WhatsApp/Instagram) — highest priority
      let conversacionBlock = '';
      if (hayConversacionPrevia) {
        conversacionBlock = '\n══════════════════════════════════════════\nCONVERSACIÓN PREVIA REAL (copiada por el vendedor desde su chat — USA ESTO COMO PRINCIPAL CONTEXTO):\n\n' +
          '→ VENDEDOR ESCRIBIÓ (último mensaje enviado):\n"' + ultimoMensajeEnviado.substring(0, 600) + '"\n\n';
        if (dejadoEnVisto) {
          conversacionBlock += '→ PROSPECTO: TE DEJÓ EN VISTO (leyó pero no respondió). Esto significa que el mensaje anterior NO conectó — posiblemente fue demasiado largo, intrusivo o sin gancho. El nuevo mensaje debe ser MUY corto, romper la inercia con curiosidad o humor, sin volver a presionar.\n';
        } else {
          conversacionBlock += '→ PROSPECTO RESPONDIÓ:\n"' + respuestaProspecto.substring(0, 600) + '"\n\nBasándote en CÓMO respondió (tono, interés, objeciones, preguntas), genera la siguiente intervención adecuada.\n';
        }
        conversacionBlock += '\n';
      }

      const userPrompt =
        'PROSPECTO: ' + prospecto.nombre + '\n' +
        'ESTRELLAS: ' + stars + '/5' + (esElite ? ' (perfil élite detectado en notas)' : '') + '\n' +
        'NOTAS (lo que sabemos de el/ella): ' + (prospecto.notas || '(sin notas)') + '\n' +
        'ETAPA: ' + prospecto.etapa + '\n' +
        'TEMPERATURA: ' + (prospecto.temperatura || 50) + '/100\n' +
        'DÍAS DESDE CREACIÓN: ' + creadoHaceDias + (esFrio ? ' (contacto frío)' : '') + '\n' +
        (realHistoryLines ? 'HISTORIAL REAL (últimas interacciones y notas del socio sobre el prospecto):\n' + realHistoryLines + '\n' : 'NO HAY HISTORIAL PREVIO — este es el primer acercamiento.\n') +
        (socioName ? 'VENDEDOR (quien envía): ' + socioName + '\n' : '') +
        (contexto ? 'CONTEXTO EXTRA DEL VENDEDOR: ' + contexto + '\n' : '') +
        conversacionBlock +
        '\nINSTRUCCIÓN: Genera SOLO el mensaje para la fase ' + faseEffective.toUpperCase() + '. ' +
        (hayConversacionPrevia
          ? (dejadoEnVisto
              ? 'El prospecto te dejó en visto. NO vuelvas a presionar. Genera un mensaje de reactivación CORTO (máx 2 líneas) con gancho de curiosidad.'
              : 'Hay una conversación real en curso. Responde apropiadamente a lo que dijo el prospecto, llevando sutilmente hacia la fase del plan.')
          : (toqueActual === 1
              ? 'ESTE ES EL PRIMER MENSAJE del plan — NO asumas conversaciones previas. Si hay historial real arriba, úsalo con naturalidad, pero si no lo hay, escribe como primer contacto.'
              : 'Este es el toque ' + toqueActual + ' de ' + totalToques + ' del plan. Puedes referenciar sutilmente la secuencia construida hasta ahora.'));

      const mensaje = await askClaude(systemPrompt, userPrompt);

      // -- 12. Reason explanation --
      const razonParts = [];
      razonParts.push('Socio rank ' + socioRank + (socioRank >= 2 ? ' (INN500+)' : ' (básico)'));
      razonParts.push('Prospecto ' + stars + '⭐');
      if (esElite) razonParts.push('keywords élite en notas');
      if (esFrio) razonParts.push('contacto frío (' + creadoHaceDias + 'd)');
      if (mensajesPrevios > 0) razonParts.push(mensajesPrevios + ' mensajes previos');

      return res.status(200).json({
        ok: true,
        mensaje: mensaje || 'No se pudo generar el mensaje.',
        modo: modo,
        toque: { actual: toqueActual, total: totalToques, fase: faseEffective },
        timing: timingPorFase[fase] || '',
        tip: tipsPorFase[fase] || '',
        razon: razonParts.join(' · '),
        stars: stars,
        esElite: esElite,
        esFrio: esFrio,
        flujoPaso: flujoPaso || null,
        // Flag for frontend: auto-create a 35min reminder after user copies/sends
        requiereRecordatorio35min: flujoPaso === 'enviar_info_ahora' || flujoPaso === 'enviar_info_despues'
      });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('prospectos error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
