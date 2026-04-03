// Image generation endpoint — supports FAL.ai Flux and OpenAI gpt-image-1
// Provider selection: body.provider = 'openai' | 'flux' (default: auto-detect by available key)
const FAL_KEY = process.env.FAL_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.SKY_OAI_KEY || process.env.OAI_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt, size, num_images, provider } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Determine provider: explicit choice > auto-detect
    const useOpenAI = provider === 'openai' ? true
      : provider === 'flux' ? false
      : !!OPENAI_API_KEY; // Auto: prefer OpenAI if key exists

    if (useOpenAI && !OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }
    if (!useOpenAI && !FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    const count = Math.min(num_images || 1, 4);

    if (useOpenAI) {
      // ── OpenAI gpt-image-1 ──
      const openaiSizes = {
        'square': '1024x1024',
        'portrait': '1024x1536',    // Closest to 4:5
        'story': '1024x1536',       // Vertical (will be cropped by canvas)
        'landscape': '1536x1024',
        'auto': 'auto'
      };
      const oaiSize = openaiSizes[size] || '1024x1024';

      // gpt-image-1 returns b64_json by default
      const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: prompt,
          n: count,
          size: oaiSize,
          quality: 'high'
        })
      });

      if (!oaiRes.ok) {
        const errText = await oaiRes.text();
        console.error('OpenAI image error:', oaiRes.status, errText);
        return res.status(502).json({ error: 'OpenAI image generation failed', detail: errText.substring(0, 300) });
      }

      const oaiData = await oaiRes.json();
      const images = (oaiData.data || []).map(function(img) {
        // gpt-image-1 returns b64_json
        if (img.b64_json) {
          return { url: 'data:image/png;base64,' + img.b64_json, width: 1024, height: 1536 };
        }
        return { url: img.url, width: 1024, height: 1536 };
      });

      return res.status(200).json({ ok: true, images: images, provider: 'openai' });

    } else {
      // ── FAL.ai Flux Schnell ──
      const validSizes = {
        'square': { width: 1024, height: 1024 },
        'portrait': { width: 864, height: 1080 },
        'story': { width: 768, height: 1344 },
        'landscape': { width: 1344, height: 768 }
      };
      const dims = validSizes[size] || validSizes['square'];

      const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': 'Key ' + FAL_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: { width: dims.width, height: dims.height },
          num_images: count,
          num_inference_steps: 4,
          enable_safety_checker: false
        })
      });

      if (!falRes.ok) {
        const errText = await falRes.text();
        console.error('FAL error:', falRes.status, errText);
        return res.status(502).json({ error: 'Image generation failed', detail: errText.substring(0, 200) });
      }

      const data = await falRes.json();
      const images = (data.images || []).map(function(img) {
        return { url: img.url, width: img.width, height: img.height };
      });

      return res.status(200).json({ ok: true, images: images, provider: 'flux' });
    }

  } catch (error) {
    console.error('generate-image error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
