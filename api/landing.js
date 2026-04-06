// Landing integration API — reads/writes asesores.json + stats.json from innova-ia-landing repo
const REPO = process.env.GITHUB_REPO || 'DrCriptox/innova-ia-landing';
const BRANCH = 'main';
const TOKEN = () => process.env.GITHUB_TOKEN || '';

function ghHeaders() {
  return { Authorization: 'token ' + TOKEN(), Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'SkyTeam-Platform' };
}

function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

async function readGHFile(file) {
  const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + file + '?ref=' + BRANCH, { headers: ghHeaders() });
  if (!r.ok) return { data: {}, sha: null };
  const d = await r.json();
  const text = Buffer.from(d.content, 'base64').toString('utf-8');
  return { data: JSON.parse(text), sha: d.sha };
}

async function writeGHFile(file, data, sha, message) {
  const body = { message, content: toBase64(JSON.stringify(data, null, 2)), branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + file, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, user, ref } = req.body || {};
    if (!action) return res.status(400).json({ error: 'Missing action' });

    // ── GET PROFILE: read asesor data from asesores.json ──
    if (action === 'getProfile') {
      if (!ref) return res.status(400).json({ error: 'Missing ref' });
      const { data } = await readGHFile('asesores.json');
      const asesor = data[ref.toLowerCase()] || null;
      return res.status(200).json({ ok: true, asesor, exists: !!asesor });
    }

    // ── SAVE PROFILE: create or update asesor in asesores.json ──
    if (action === 'saveProfile') {
      if (!ref) return res.status(400).json({ error: 'Missing ref' });
      const { nombre, rol, whatsapp, mensaje, foto } = req.body;
      if (!TOKEN()) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, sha } = await readGHFile('asesores.json');
        const slug = ref.toLowerCase().replace(/[^a-z0-9]/g, '');
        const existing = data[slug] || {};
        data[slug] = {
          nombre: (nombre || existing.nombre || 'Socio').trim(),
          rol: (rol || existing.rol || 'Asesor InnovaIA').trim(),
          whatsapp: (whatsapp || existing.whatsapp || '').trim(),
          foto: foto !== undefined ? foto : (existing.foto || ''),
          verificado: true,
          mensaje: (mensaje || existing.mensaje || '¡Hola! Soy tu asesor InnovaIA 🚀').trim()
        };
        const ok = await writeGHFile('asesores.json', data, sha, 'skyteam: update ' + slug);
        if (ok) return res.status(200).json({ ok: true, slug, link: 'https://innovaia.app?ref=' + slug });
        if (attempt === 2) return res.status(500).json({ error: 'Write conflict after 3 attempts' });
      }
    }

    // ── GET STATS: read visit/conversion stats ──
    if (action === 'getStats') {
      const { data } = await readGHFile('stats.json');
      // data format: { "ref1": 15, "ref2": 8, ... } (visit counts)
      return res.status(200).json({ ok: true, stats: data });
    }

    // ── GET RANKING: compute ranking from stats ──
    if (action === 'getRanking') {
      const { data: stats } = await readGHFile('stats.json');
      const { data: asesores } = await readGHFile('asesores.json');

      const ranking = Object.keys(stats)
        .filter(function(ref) { return ref !== 'default' && stats[ref] > 0; })
        .map(function(ref) {
          const asesor = asesores[ref] || {};
          return {
            ref: ref,
            nombre: asesor.nombre || ref,
            visitas: stats[ref] || 0,
            whatsapp: asesor.whatsapp || '',
            foto: asesor.foto || ''
          };
        })
        .sort(function(a, b) { return b.visitas - a.visitas; })
        .slice(0, 20);

      return res.status(200).json({ ok: true, ranking, totalVisits: Object.values(stats).reduce(function(s,v){ return s+v; }, 0) });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('landing API error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
