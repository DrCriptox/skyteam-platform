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

  // Fix asset URLs: relative paths → absolute GitHub raw URLs
  const baseUrl = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';

  // Replace relative image/asset references
  html = html.replace(/src="(?!http|data:|\/\/|#)([^"]+)"/g, 'src="' + baseUrl + '$1"');
  html = html.replace(/href="(?!http|data:|\/\/|#|javascript:|mailto:)([^"]+\.css[^"]*)"/g, 'href="' + baseUrl + '$1"');

  // Replace API endpoints that point to innovaia.app with skyteam.global
  html = html.replace(/https?:\/\/(www\.)?innovaia\.app/g, 'https://skyteam.global/landing');

  // Fix the asesores.json and stats.json fetch URLs to use raw GitHub
  html = html.replace(/"asesores-skyteam\.json"/g, '"' + baseUrl + 'asesores-skyteam.json"');
  html = html.replace(/"asesores\.json"/g, '"' + baseUrl + 'asesores.json"');
  html = html.replace(/"stats\.json"/g, '"' + baseUrl + 'stats.json"');

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
