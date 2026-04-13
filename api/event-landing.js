// api/event-landing.js — Serve AI-generated event landing pages
// URL: /evento/:slug?ref=username
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_H = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

// Simple cache: slug → { html, ts, status }
var PAGE_CACHE = {};
var CACHE_TTL = 60000; // 1 min (reduced to avoid stale draft cache)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Extract slug from query (vercel rewrite sends it)
    var slug = req.query.slug || req.query.path || '';
    slug = slug.replace(/^\/+/, '').replace(/\/+$/, '').split('?')[0];
    if (!slug) return res.status(400).send(errorPage('Evento no encontrado'));

    // Check cache (only use if no ref param — ref-personalized pages are never cached)
    var hasRef = req.query.ref || '';
    var now = Date.now();
    if (!hasRef && PAGE_CACHE[slug] && PAGE_CACHE[slug].status === 'published' && (now - PAGE_CACHE[slug].ts) < CACHE_TTL) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).send(PAGE_CACHE[slug].html);
    }

    // Fetch event from Supabase
    var r = await fetch(SUPABASE_URL + '/rest/v1/event_pages?slug=eq.' + encodeURIComponent(slug) + '&select=*&limit=1', { headers: SB_H });
    if (!r.ok) return res.status(500).send(errorPage('Error cargando evento'));
    var rows = await r.json();

    if (!Array.isArray(rows) || !rows.length) {
      console.log('[EVENT-LANDING] Not found slug:', slug, 'query:', JSON.stringify(req.query));
      return res.status(404).send(errorPage('Evento no encontrado'));
    }
    var ev = rows[0];

    // Only serve published events (or draft with ?preview=1)
    var isPreview = req.query.preview === '1';
    if (!isPreview && (ev.status !== 'published' || !ev.is_public)) {
      console.log('[EVENT-LANDING] Blocked:', slug, 'status:', ev.status, 'is_public:', ev.is_public);
      return res.status(404).send(errorPage('Este evento aun no esta disponible'));
    }

    // If AI HTML exists, personalize and serve it
    if (ev.ai_html) {
      var html = ev.ai_html;

      // Personalize for referrer: inject photo + name + rank
      var ref = req.query.ref || '';
      if (ref) {
        try {
          var refR = await fetch(SUPABASE_URL + '/rest/v1/users?username=eq.' + encodeURIComponent(ref) + '&select=name,photo,rank,whatsapp&limit=1', { headers: SB_H });
          var refRows = await refR.json();
          if (Array.isArray(refRows) && refRows.length) {
            var ru = refRows[0];
            var rPhoto = (ru.photo && ru.photo.length > 500) ? ru.photo : '';
            var rName = ru.name || ref;
            var rRank = _rn(parseInt(ru.rank) || 0);
            var badge = '<div class="ev-ref-card">'
              + (rPhoto ? '<img class="ev-ref-photo" src="' + esc(rPhoto) + '" alt="">' : '<div class="ev-ref-photo" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#d4af37;background:#1a1a2e">👤</div>')
              + '<div class="ev-ref-info">Te invita<br><span class="ev-ref-name">' + esc(rName) + '</span><br>' + esc(rRank) + '</div></div>';
            html = html.replace('<!--REF_BADGE-->', badge);
          }
        } catch(e) { /* ignore — badge just won't show */ }
      }
      // Remove unused placeholder
      html = html.replace('<!--REF_BADGE-->', '');

      // Add preview banner if draft
      if (isPreview && ev.status !== 'published') {
        var previewBar = '<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff6b00;color:#fff;text-align:center;padding:8px;font-family:sans-serif;font-size:13px;font-weight:600">⚠️ MODO PREVIEW — Esta landing aun no esta publicada</div>';
        html = html.replace('<body>', '<body>' + previewBar);
      }

      // Cache base HTML (only published, never drafts)
      if (ev.status === 'published') PAGE_CACHE[slug] = { html: ev.ai_html, ts: now, status: 'published' };
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).send(html);
    }

    // Fallback: minimal landing if no AI HTML generated yet
    var fallbackHtml = buildFallback(ev);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).send(fallbackHtml);

  } catch(err) {
    console.error('[EVENT-LANDING] Error:', err.message);
    return res.status(500).send(errorPage('Error interno'));
  }
};

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _rn(n) { var m = { 0:'Cliente',1:'INN 200',2:'INN 500',3:'NOVA 1500',4:'NOVA 5K',5:'NOVA 10K',6:'NOVA DIAMOND',7:'NOVA 50K',8:'NOVA 100K' }; return m[n] || 'Emprendedor'; }

function errorPage(msg) {
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>SkyTeam Event</title>'
    + '<style>body{font-family:sans-serif;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}'
    + 'h1{color:#d4af37;margin-bottom:12px}a{color:#d4af37}</style></head>'
    + '<body><div><h1>SkyTeam Events</h1><p>' + esc(msg) + '</p><br><a href="https://skyteam.global">Ir a SkyTeam</a></div></body></html>';
}

function buildFallback(ev) {
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(ev.titulo) + ' — SkyTeam</title>'
    + '<style>body{font-family:sans-serif;background:#0a0a1a;color:#e0e0e0;text-align:center;padding:60px 20px}'
    + 'h1{color:#d4af37;font-size:2rem;margin-bottom:12px}p{color:rgba(255,255,255,0.6);margin-bottom:8px}'
    + '.btn{display:inline-block;margin-top:24px;padding:14px 36px;border-radius:12px;background:linear-gradient(135deg,#d4af37,#b8860b);color:#0a0a1a;font-weight:700;text-decoration:none}</style></head>'
    + '<body><h1>' + esc(ev.titulo) + '</h1>'
    + '<p>' + esc(ev.fecha || '') + (ev.hora ? ' • ' + esc(ev.hora) : '') + '</p>'
    + (ev.ciudad ? '<p>📍 ' + esc(ev.ciudad) + '</p>' : '')
    + '<p>' + esc(ev.descripcion || '') + '</p>'
    + '<a class="btn" href="https://skyteam.global">Mas informacion</a>'
    + '</body></html>';
}
