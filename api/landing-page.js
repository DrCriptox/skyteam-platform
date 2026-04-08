// Serve the full innovaia.app landing page from skyteam.global
// Reads the template from GitHub and serves it with query params intact

const REPO = 'DrCriptox/innova-ia-landing';
const BRANCH = 'main';
const TEMPLATE_CACHE = { html: null, ts: 0 };
const CACHE_TTL = 300000; // 5 min cache

async function getTemplate() {
  const now = Date.now();
  if (TEMPLATE_CACHE.html && (now - TEMPLATE_CACHE.ts) < CACHE_TTL) {
    return TEMPLATE_CACHE.html;
  }
  try {
    const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/index.html');
    if (!r.ok) return TEMPLATE_CACHE.html || null;
    const html = await r.text();
    TEMPLATE_CACHE.html = html;
    TEMPLATE_CACHE.ts = now;
    return html;
  } catch(e) {
    return TEMPLATE_CACHE.html || null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let html = await getTemplate();
  if (!html) {
    return res.status(500).send('Error cargando la landing. Intenta de nuevo.');
  }

  const baseUrl = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';

  // Fix relative asset URLs (images, css) → GitHub raw
  html = html.replace(/src="(?!http|data:|\/\/|#)([^"]+)"/g, 'src="' + baseUrl + '$1"');
  html = html.replace(/href="(?!http|data:|\/\/|#|javascript:|mailto:)([^"]+\.css[^"]*)"/g, 'href="' + baseUrl + '$1"');

  // CRITICAL: Replace /api/asesores with direct GitHub JSON fetch
  // The landing JS does: fetch('/api/asesores') which returns the asesores JSON
  // We inject a script that overrides this fetch to load from GitHub raw
  const injectScript = `<script>
(function(){
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string') {
      if (url === '/api/asesores' || url.indexOf('/api/asesores') === 0) {
        return _origFetch('${baseUrl}asesores-skyteam.json', opts).then(function(r) {
          if (!r.ok) return _origFetch('${baseUrl}asesores.json', opts);
          return r;
        });
      }
      if (url === '/api/track' || url.indexOf('/api/track') === 0) {
        return Promise.resolve(new Response('{"ok":true}', {status:200}));
      }
      if (url === '/api/capi' || url.indexOf('/api/capi') === 0) {
        return Promise.resolve(new Response('{"ok":true}', {status:200}));
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

  // Update OG meta tags
  const ref = req.query?.ref || '';
  if (ref) {
    html = html.replace(/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="https://skyteam.global/landing?ref=' + ref + '">');
    html = html.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="https://skyteam.global/landing?ref=' + ref + '">');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min CDN cache
  return res.status(200).send(html);
}
