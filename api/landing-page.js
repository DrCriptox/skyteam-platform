// Serve the full innovaia.app landing page from skyteam.global
// Reads the template from GitHub and serves it with query params intact
//
// SCALABILITY NOTES (500+ partners):
// - HTML template: cached 5 min, shared across all ?ref= URLs (single cache entry)
// - Asesor data: cached 2 min server-side; client fetches only its own ref via /api/landing
// - Base64 photos are NOT inlined — client loads them on-demand
// - Cache stampede protection: in-flight dedup prevents parallel GitHub fetches

const REPO = 'DrCriptox/innova-ia-landing';
const BRANCH = 'main';

// ── HTML template cache (single entry, shared by all refs) ──
const TEMPLATE_CACHE = { html: null, ts: 0, inflight: null };
const CACHE_TTL = 300000; // 5 min — HTML rarely changes

// ── Merged asesores cache (lightweight, no base64 photos) ──
const ASESORES_CACHE = { data: null, ts: 0, inflight: null };
const ASESORES_TTL = 120000; // 2 min — profiles update occasionally

async function getTemplate() {
  const now = Date.now();
  if (TEMPLATE_CACHE.html && (now - TEMPLATE_CACHE.ts) < CACHE_TTL) {
    return TEMPLATE_CACHE.html;
  }
  // Stampede protection: reuse in-flight fetch if one is already running
  if (TEMPLATE_CACHE.inflight) return TEMPLATE_CACHE.inflight;
  TEMPLATE_CACHE.inflight = (async () => {
    try {
      const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/index.html');
      if (!r.ok) return TEMPLATE_CACHE.html || null;
      const html = await r.text();
      TEMPLATE_CACHE.html = html;
      TEMPLATE_CACHE.ts = Date.now();
      return html;
    } catch(e) {
      return TEMPLATE_CACHE.html || null;
    } finally {
      TEMPLATE_CACHE.inflight = null;
    }
  })();
  return TEMPLATE_CACHE.inflight;
}

// Fetch merged asesor data (Supabase overlay on GitHub) — strips base64 photos
async function getMergedAsesores() {
  const now = Date.now();
  if (ASESORES_CACHE.data && (now - ASESORES_CACHE.ts) < ASESORES_TTL) {
    return ASESORES_CACHE.data;
  }
  if (ASESORES_CACHE.inflight) return ASESORES_CACHE.inflight;
  ASESORES_CACHE.inflight = (async () => {
    try {
      const baseUrl = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
      const SB_URL = process.env.SUPABASE_URL;
      const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

      // Fetch GitHub data and Supabase data in parallel
      const ghPromise = fetch(baseUrl + 'asesores-skyteam.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
      let sbPromise = Promise.resolve([]);
      if (SB_URL && SB_KEY) {
        sbPromise = fetch(SB_URL + '/rest/v1/landing_profiles?select=*', {
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        }).then(r => r.json()).catch(() => []);
      }

      const [ghData, sbRows] = await Promise.all([ghPromise, sbPromise]);

      // Overlay Supabase profiles
      if (Array.isArray(sbRows)) {
        sbRows.forEach(function(row) {
          if (row.ref) {
            var existing = ghData[row.ref] || {};
            ghData[row.ref] = Object.assign(existing, {
              nombre: row.nombre || existing.nombre, rol: row.rol || existing.rol,
              whatsapp: row.whatsapp || existing.whatsapp, mensaje: row.mensaje || existing.mensaje,
              foto: row.foto || existing.foto || '', verificado: true
            });
          }
        });
      }

      // Strip base64 photos to keep payload small (~500 bytes/entry vs ~25KB/entry)
      const lightweight = {};
      Object.keys(ghData).forEach(function(key) {
        const entry = ghData[key];
        lightweight[key] = {
          nombre: entry.nombre || '',
          rol: entry.rol || '',
          whatsapp: entry.whatsapp || '',
          mensaje: entry.mensaje || '',
          verificado: !!entry.verificado,
          foto: entry.foto || ''
        };
      });

      ASESORES_CACHE.data = lightweight;
      ASESORES_CACHE.ts = Date.now();
      return lightweight;
    } catch(e) {
      return ASESORES_CACHE.data || {};
    } finally {
      ASESORES_CACHE.inflight = null;
    }
  })();
  return ASESORES_CACHE.inflight;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Fetch template and asesores in parallel
  const [html_raw, mergedAsesores] = await Promise.all([getTemplate(), getMergedAsesores()]);

  if (!html_raw) {
    return res.status(500).send('Error cargando la landing. Intenta de nuevo.');
  }

  let html = html_raw;
  const baseUrl = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';

  // Fix relative asset URLs (images, css) -> GitHub raw
  html = html.replace(/src="(?!http|data:|\/\/|#)([^"]+)"/g, 'src="' + baseUrl + '$1"');
  html = html.replace(/href="(?!http|data:|\/\/|#|javascript:|mailto:)([^"]+\.css[^"]*)"/g, 'href="' + baseUrl + '$1"');

  // Build lightweight data: only include the photo for the current ?ref= asesor
  // This keeps payload small (~500 bytes/entry) while showing the viewed asesor's photo
  const currentRef = (req.query?.ref || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lightPayload = {};
  for (const key of Object.keys(mergedAsesores)) {
    const e = mergedAsesores[key];
    lightPayload[key] = {
      nombre: e.nombre || '', rol: e.rol || '', whatsapp: e.whatsapp || '',
      mensaje: e.mensaje || '', verificado: !!e.verificado,
      foto: (key === currentRef && e.foto) ? e.foto : ((e.foto && !e.foto.startsWith('data:')) ? e.foto : '')
    };
  }
  const mergedJson = JSON.stringify(lightPayload);

  const injectScript = `<script>
(function(){
  window._mergedData = ${mergedJson};
  var _mergedData = window._mergedData;
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string') {
      if (url === '/api/asesores' || url.indexOf('/api/asesores') === 0) {
        return Promise.resolve(new Response(JSON.stringify(_mergedData), {status:200, headers:{'Content-Type':'application/json'}}));
      }
      if (url === '/api/track' || url.indexOf('/api/track') === 0) {
        return _origFetch('/api/landing', {method:'POST',headers:{'Content-Type':'application/json'},body:opts&&opts.body?opts.body:JSON.stringify({action:'track'})});
      }
      if (url === '/api/capi' || url.indexOf('/api/capi') === 0) {
        return _origFetch('/api/landing', {method:'POST',headers:{'Content-Type':'application/json'},body:opts&&opts.body?opts.body:JSON.stringify({action:'capi'})});
      }
    }
    return _origFetch.apply(this, arguments);
  };
})();
</script>`;

  // Inject the fetch override right after <head>
  html = html.replace('<head>', '<head>' + injectScript);

  // Fix innovaia.app references
  html = html.replace(/https?:\/\/(www\.)?innovaia\.app/g, 'https://skyteam.global/landing');

  // Inject WhatsApp CTA buttons + override original template buttons
  const ref = req.query?.ref || '';
  const waButtons = `
<style>
/* Hide original template's floating button and sticky bar (we inject our own) */
.float-cta,.float-btn,.float-bubble{display:none!important;}
#stickyCTABar{display:none!important;}
/* Our sticky bottom bar */
.sky-wa-bar{position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:8px 12px;background:rgba(6,8,16,0.95);backdrop-filter:blur(12px);border-top:1px solid rgba(37,211,102,0.2);display:flex;gap:6px;justify-content:center;}
.sky-wa-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;font-family:'Syne','DM Sans',sans-serif;transition:transform 0.2s;flex:1;max-width:220px;justify-content:center;}
.sky-wa-btn:hover{transform:translateY(-2px);}
.sky-wa-btn-green{background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;box-shadow:0 4px 20px rgba(37,211,102,0.3);}
.sky-wa-btn-gold{background:linear-gradient(135deg,#D4A853,#F0C97A);color:#000;box-shadow:0 4px 20px rgba(212,168,83,0.3);}
/* Our single floating WhatsApp button */
.sky-wa-float{position:fixed;bottom:80px;right:16px;z-index:9998;width:60px;height:60px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(37,211,102,0.4);cursor:pointer;animation:skyWaBounce 2s infinite;text-decoration:none;}
@keyframes skyWaBounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
@media(min-width:768px){.sky-wa-bar{padding:12px 24px;}.sky-wa-btn{max-width:300px;}}
</style>
<div class="sky-wa-bar" id="sky-wa-bar">
<a class="sky-wa-btn sky-wa-btn-green" id="sky-wa-cta1" href="#" target="_blank">
<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-8.7 14.9L2 22l5.2-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.2 1.2-1.7 1.3-.5 0-.9.2-3.1-.7-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c0 .1-.1.4-.2.5-.1.2-.2.3-.4.5-.2.2-.4.4-.2.7.2.4.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.7-.1s.8-1 1-1.3c.2-.3.4-.3.7-.2.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.1.1.7-.1 1.3z"/></svg>
Quiero saber m\u00e1s</a>
<a class="sky-wa-btn sky-wa-btn-gold" id="sky-wa-cta2" href="#" target="_blank">\uD83D\uDE80 Activar franquicia</a>
</div>
<a class="sky-wa-float" id="sky-wa-float" href="#" target="_blank">
<svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-8.7 14.9L2 22l5.2-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.2 1.2-1.7 1.3-.5 0-.9.2-3.1-.7-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c0 .1-.1.4-.2.5-.1.2-.2.3-.4.5-.2.2-.4.4-.2.7.2.4.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.7-.1s.8-1 1-1.3c.2-.3.4-.3.7-.2.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.1.1.7-.1 1.3z"/></svg>
</a>
<script>
(function(){
  var _ref = new URLSearchParams(window.location.search).get('ref')||'';
  if(!_ref) return;
  var slug = _ref.toLowerCase().replace(/[^a-z0-9]/g,'');

  // Device fingerprint (screen+tz+lang+platform → short hash, no cookies needed)
  var _fp = (function(){
    var s = screen.width+'x'+screen.height+'|'+screen.colorDepth+'|'+(Intl.DateTimeFormat().resolvedOptions().timeZone||'')+'|'+navigator.language+'|'+navigator.platform+'|'+navigator.hardwareConcurrency;
    var h=0; for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return 'fp_'+Math.abs(h).toString(36);
  })();
  // Track page visit ALWAYS (even if asesor has no WA data)
  fetch('/api/landing', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'track', ref: slug, type: 'visit', fp: _fp }), keepalive: true
  }).catch(function(){});

  var a = (window._mergedData && (window._mergedData[slug] || window._mergedData[_ref])) || null;
  if(!a) return;
  var wa = (a.whatsapp||'').replace(/[^0-9]/g,'');
  if(!wa) return;
  var nombre = a.nombre || '';

  // Pre-built WhatsApp links
  var msgSaber = encodeURIComponent('Hola ' + nombre + ', vi tu pagina y me interesa saber mas sobre la franquicia digital. Me puedes dar informacion?');
  var msgActivar = encodeURIComponent('Hola ' + nombre + ', quiero activar mi franquicia digital!');
  var linkSaber = 'https://wa.me/' + wa + '?text=' + msgSaber;
  var linkActivar = 'https://wa.me/' + wa + '?text=' + msgActivar;

  // Set our injected buttons
  document.getElementById('sky-wa-cta1').href = linkSaber;
  document.getElementById('sky-wa-cta2').href = linkActivar;
  document.getElementById('sky-wa-float').href = linkSaber;

  // ── Override ALL original template CTA buttons to go direct to WhatsApp ──
  // These originally scrolled to the form (#form) — now they open WhatsApp directly
  function _hijackBtn(el, link) {
    if (!el) return;
    el.href = link;
    el.target = '_blank';
    el.onclick = function(e) {
      e.preventDefault(); e.stopPropagation();
      _trackConv();
      _fireFBEvent('CTA_Override');
      window.open(link, '_blank');
    };
  }

  // Wait for DOM to be ready (template loads async)
  setTimeout(function() {
    // Header CTA: "Quiero activar ->"
    var ctaTop = document.querySelector('.cta-top');
    _hijackBtn(ctaTop, linkActivar);

    // Sticky bar CTA: "Activar ahora ->"
    var stickyBtn = document.querySelector('.sticky-btn');
    _hijackBtn(stickyBtn, linkActivar);

    // End-of-video CTA: "Hablar con el equipo ahora"
    var endCta = document.querySelector('.end-cta');
    _hijackBtn(endCta, linkSaber);

    // ALL "Quiero activar mi franquicia" inline CTAs (post-VSL + mid-page)
    // These are <a> tags with onclick that scroll to #form
    document.querySelectorAll('a[href="javascript:void(0)"]').forEach(function(el) {
      var txt = (el.textContent || '').toLowerCase();
      if (txt.indexOf('activar') > -1 || txt.indexOf('franquicia') > -1) {
        _hijackBtn(el, linkActivar);
      } else if (txt.indexOf('hablar') > -1 || txt.indexOf('equipo') > -1) {
        _hijackBtn(el, linkSaber);
      }
    });

    // Override the form's enviarWhatsApp() to use this asesor's number
    if (typeof window.getWhatsApp === 'function') {
      window.getWhatsApp = function() { return wa; };
    }
    // Also set _advisorData.whatsapp so enviarWhatsApp() uses it
    if (window._advisorData) window._advisorData.whatsapp = wa;
    else window._advisorData = { whatsapp: wa, nombre: nombre };
  }, 500);

  // ── Conversion tracking (max 1 per IP on server) ──
  function _trackConv() {
    if (window._convTracked) return;
    window._convTracked = true;
    fetch('/api/landing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'track', ref: slug, type: 'conversion', fp: _fp }), keepalive: true
    }).catch(function(){});
  }
  function _fireFBEvent(name) {
    var eid = 'skywa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    // WhatsApp clicks fire InitiateCheckout (campaign optimizes for this)
    if (typeof fbq === 'function') fbq('track', 'InitiateCheckout', { content_name: name, currency: 'USD', value: 550 }, { eventID: eid });
    if (typeof window.sendCAPIEvent === 'function') window.sendCAPIEvent('InitiateCheckout', eid, { currency: 'USD', value: 550 });
  }

  // Track clicks on our injected buttons
  document.getElementById('sky-wa-cta1').addEventListener('click', function() { _trackConv(); _fireFBEvent('WA_QuieroSaber'); });
  document.getElementById('sky-wa-cta2').addEventListener('click', function() { _trackConv(); _fireFBEvent('WA_ActivarFranquicia'); });
  document.getElementById('sky-wa-float').addEventListener('click', function(e) {
    e.preventDefault();
    _trackConv(); _fireFBEvent('WA_FloatingBtn');
    window.open(linkSaber, '_blank');
  });

  // Track form submit too
  var origSubmit = document.querySelector('.submit-btn');
  if (origSubmit) origSubmit.addEventListener('click', function() { _trackConv(); _fireFBEvent('WA_FormSubmit'); });

  // (visit tracking moved to top — fires regardless of WA data)
})();
</script>`;

  html = html.replace('</body>', waButtons + '</body>');

  // Update OG meta tags (ref already declared above)
  if (ref) {
    html = html.replace(/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="https://skyteam.global/landing?ref=' + ref + '">');
    html = html.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://skyteam.global/landing?ref=' + ref + '">');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Allow CDN edge caching for 60s — HTML is identical for all refs (ref-specific data is inlined)
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).send(html);
}
