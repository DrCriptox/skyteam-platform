// Flux image generation endpoint for carousel/story content
// Uses FAL.ai Flux Schnell (fast + cheap: ~$0.003/image)
const FAL_KEY = process.env.FAL_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!FAL_KEY) return res.status(500).json({ error: 'FAL_KEY not configured' });

  try {
    const { prompt, size, num_images } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Validate size
    const validSizes = {
      'square': { width: 1024, height: 1024 },
      'portrait': { width: 864, height: 1080 },       // 4:5 carousel (closest ratio)
      'story': { width: 768, height: 1344 },           // 9:16 story
      'landscape': { width: 1344, height: 768 }
    };
    const dims = validSizes[size] || validSizes['square'];
    const count = Math.min(num_images || 1, 4); // max 4 per request

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
    // data.images = [{url, content_type, width, height}, ...]
    const images = (data.images || []).map(function(img) {
      return { url: img.url, width: img.width, height: img.height };
    });

    return res.status(200).json({ ok: true, images: images });

  } catch (error) {
    console.error('generate-image error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
