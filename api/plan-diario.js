// Plan Diario API â personal schedule blocks for partners
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Prefer: 'return=representation' };

async function sb(path, opts = {}) {
  const h = { ...HEADERS, ...(opts.headers || {}) };
  delete opts.headers;
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: h, ...opts });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.substring(0, 300)); }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.method === 'POST' || req.method === 'DELETE' ? req.body : {};
    const user = body.user || req.query?.user || '';
    if (!user) return res.status(400).json({ error: 'Missing user' });

    // GET â fetch all personal blocks for a user (optionally filter by week)
    if (req.method === 'GET') {
      const weekStart = req.query?.weekStart || '';
      const weekEnd = req.query?.weekEnd || '';
      let path = 'plan_diario?username=eq.' + encodeURIComponent(user) + '&order=fecha.asc,hora_inicio.asc';
      if (weekStart && weekEnd) {
        path += '&fecha=gte.' + encodeURIComponent(weekStart) + '&fecha=lte.' + encodeURIComponent(weekEnd);
      }
      const blocks = await sb(path);
      return res.status(200).json({ blocks: blocks || [] });
    }

    // POST â add or update a personal block
    if (req.method === 'POST') {
      const { action } = body;

      if (action === 'add') {
        const { blocks } = body; // array of {fecha, hora_inicio, hora_fin, titulo, categoria, recurrente, dias_recurrencia}
        if (!blocks || !blocks.length) return res.status(400).json({ error: 'No blocks provided' });

        const rows = blocks.map(b => ({
          id: b.id || crypto.randomUUID(),
          username: user,
          fecha: b.fecha,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          titulo: b.titulo || 'Personal',
          categoria: b.categoria || 'personal',
          recurrente: b.recurrente || false,
          dias_recurrencia: b.dias_recurrencia || null,
          created_at: new Date().toISOString()
        }));

        const inserted = await sb('plan_diario', {
          method: 'POST',
          body: JSON.stringify(rows)
        });

        // Now block these time slots in the agenda de cierres
        // We update the agenda_configs schedule to mark these slots as unavailable
        await syncAgendaBlocks(user);

        return res.status(200).json({ ok: true, blocks: inserted });
      }

      if (action === 'update') {
        const { id, updates } = body;
        if (!id) return res.status(400).json({ error: 'Missing block id' });
        await sb('plan_diario?id=eq.' + encodeURIComponent(id), {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
        await syncAgendaBlocks(user);
        return res.status(200).json({ ok: true });
      }

      if (action === 'delete') {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'Missing block id' });
        await sb('plan_diario?id=eq.' + encodeURIComponent(id), {
          method: 'DELETE'
        });
        await syncAgendaBlocks(user);
        return res.status(200).json({ ok: true });
      }

      if (action === 'deleteAll') {
        // Delete all blocks for a specific date
        const { fecha } = body;
        if (!fecha) return res.status(400).json({ error: 'Missing fecha' });
        await sb('plan_diario?username=eq.' + encodeURIComponent(user) + '&fecha=eq.' + encodeURIComponent(fecha), {
          method: 'DELETE'
        });
        await syncAgendaBlocks(user);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('plan-diario error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Sync personal blocks into agenda_configs.bloqueos_personales
// This allows the agenda de cierres slot generator to exclude these times
async function syncAgendaBlocks(user) {
  try {
    // Get all personal blocks for next 30 days
    const hoy = new Date();
    const en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
    const desde = hoy.toISOString().split('T')[0];
    const hasta = en30.toISOString().split('T')[0];

    const blocks = await sb(
      'plan_diario?username=eq.' + encodeURIComponent(user) +
      '&fecha=gte.' + desde + '&fecha=lte.' + hasta +
      '&order=fecha.asc'
    );

    // Build bloqueos_personales map: { "2026-03-28": [{ini:"07:00",fin:"08:00",titulo:"Gym"}], ... }
    const bloqueos = {};
    (blocks || []).forEach(b => {
      if (!bloqueos[b.fecha]) bloqueos[b.fecha] = [];
      bloqueos[b.fecha].push({ ini: b.hora_inicio, fin: b.hora_fin, titulo: b.titulo });
    });

    // Read current agenda config
    const configs = await sb('agenda_configs?username=eq.' + encodeURIComponent(user) + '&select=config');
    if (configs && configs[0]) {
      const config = configs[0].config || {};
      config.bloqueos_personales = bloqueos;
      // Update
      await sb('agenda_configs?username=eq.' + encodeURIComponent(user), {
        method: 'PATCH',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ config, updated_at: new Date().toISOString() })
      });
    }
  } catch (e) {
    console.error('syncAgendaBlocks error:', e.message);
    // Non-fatal â personal blocks are saved even if sync fails
  }
}
