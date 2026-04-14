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

    // -- GENERATE WHATSAPP MESSAGE WITH AI (smart multi-touch strategy) --
    // Auto-detects the appropriate mode based on: socio rank + prospect stars + notes + history
    //   DIRECTO      (1 touch)  - new socio + known low-profile prospect
    //   BALANCEADO   (2 touches) - mid-profile or stale prospect
    //   RELACIONAL   (3 touches) - high stars or cold prospect (>30d no movement)
    //   ALTO_PERFIL  (4 touches) - rank INN500+ with 4-5 stars, OR elite keywords in notes
    if (action === 'generarMensajeWA') {
      const { prospecto_id, contexto, forceToque, forceModo } = req.body;
      if (!prospecto_id) return res.status(400).json({ error: 'Missing prospecto_id' });

      const prospectoArr = await sb('prospectos?id=eq.' + encodeURIComponent(prospecto_id) + '&select=*');
      const prospecto = prospectoArr && prospectoArr[0] ? prospectoArr[0] : null;
      if (!prospecto) return res.status(404).json({ error: 'Prospecto not found' });

      // -- 1. Socio profile (rank + BANKCODE + style) --
      let userProfile = '';
      let socioRank = 0;
      let socioName = '';
      try {
        const userData = await sb('users?username=eq.' + encodeURIComponent(user) + '&select=bankcode,comm_style,profession,rank,name&limit=1');
        if (userData && userData[0]) {
          const u = userData[0];
          socioRank = parseInt(u.rank) || 0;
          socioName = u.name || '';
          if (u.bankcode) userProfile += 'BANKCODE del vendedor: ' + u.bankcode + '. ';
          if (u.comm_style) userProfile += 'Estilo: ' + u.comm_style + '. ';
          if (u.profession) userProfile += 'Profesion: ' + u.profession + '. ';
          if (userProfile) userProfile = 'ADAPTA el tono al estilo del vendedor: ' + userProfile;
        }
      } catch(e) {}

      // -- 2. Calculate prospect stars (0-5) --
      const starFields = ['calif_positivo','calif_social','calif_emprendedor','calif_dinero','calif_lider'];
      const stars = starFields.reduce((n, k) => n + ((prospecto[k] && prospecto[k] > 0) ? 1 : 0), 0);

      // -- 3. Count previous messages sent --
      const interacciones = await sb('interacciones?prospecto_id=eq.' + encodeURIComponent(prospecto_id) + '&order=created_at.asc&limit=30');
      const mensajesPrevios = (interacciones || []).filter(function(i) {
        const c = ((i.contenido || '') + '').toLowerCase();
        const t = ((i.tipo || '') + '').toLowerCase();
        return t === 'whatsapp' || t === 'instagram' || c.indexOf('mensaje') !== -1;
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
      let toqueActual = Math.min(mensajesPrevios + 1, totalToques);
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
      const systemPrompt =
        'Eres un networker de alto nivel entrenado en los principios de Dale Carnegie (relaciones humanas) y Robert Cialdini (persuasión ética). ' +
        'Generas mensajes de prospección basados en CONSTRUCCIÓN DE RELACIÓN, no en venta agresiva. ' +
        'Modo actual: ' + modo + ' | Toque ' + toqueActual + ' de ' + totalToques + ' | Fase: ' + fase.toUpperCase() + '. ' +
        instruccionesPorFase[fase] + ' ' +
        'REGLAS ESTRICTAS: ' +
        '(1) NUNCA menciones SKYTEAM, Innova, Innova IA ni ningún nombre de empresa. Usa "franquicia digital", "sistema digital", "oportunidad digital" SOLO si la fase es de invitación. ' +
        '(2) NUNCA uses clichés de network: "te va a encantar", "tengo algo increíble", "quiero mostrarte un proyecto", "cambió mi vida", "no te vas a arrepentir". ' +
        '(3) Español latino natural, de persona a persona. Emojis moderados (1-2 máximo, o ninguno si es élite). ' +
        '(4) Personaliza con lo que sabes del prospecto (usa las notas). ' +
        '(5) SOLO devuelve el mensaje listo para copiar. Sin encabezados, sin comillas, sin explicaciones. ' +
        userProfile;

      const userPrompt =
        'PROSPECTO: ' + prospecto.nombre + '\n' +
        'ESTRELLAS: ' + stars + '/5' + (esElite ? ' (perfil élite detectado en notas)' : '') + '\n' +
        'NOTAS (lo que sabemos de el/ella): ' + (prospecto.notas || '(sin notas)') + '\n' +
        'ETAPA: ' + prospecto.etapa + '\n' +
        'TEMPERATURA: ' + (prospecto.temperatura || 50) + '/100\n' +
        'DÍAS DESDE CREACIÓN: ' + creadoHaceDias + (esFrio ? ' (contacto frío)' : '') + '\n' +
        'MENSAJES PREVIOS: ' + mensajesPrevios + '\n' +
        (socioName ? 'VENDEDOR (quien envía): ' + socioName + '\n' : '') +
        (contexto ? 'CONTEXTO EXTRA DEL VENDEDOR: ' + contexto + '\n' : '') +
        '\nGenera SOLO el mensaje para la fase ' + fase.toUpperCase() + '.';

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
        toque: { actual: toqueActual, total: totalToques, fase: fase },
        timing: timingPorFase[fase] || '',
        tip: tipsPorFase[fase] || '',
        razon: razonParts.join(' · '),
        stars: stars,
        esElite: esElite,
        esFrio: esFrio
      });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('prospectos error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
