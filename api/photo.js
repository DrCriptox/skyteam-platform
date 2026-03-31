// /api/photo.js — Professional Photo Generator via OpenAI gpt-image-1
// Takes user selfie + suit style, generates professional headshot

const SUIT_PROMPTS = {
  '#1a1a2e': 'dark navy blue formal business suit with white dress shirt and dark tie',
  '#0a3d62': 'royal blue professional business suit with light blue dress shirt',
  '#2d2d2d': 'charcoal gray formal business suit with white dress shirt and silver tie',
  '#4a0e0e': 'deep burgundy/wine colored formal business suit with white dress shirt'
};

const DEFAULT_SUIT = 'dark navy blue formal business suit with white dress shirt and dark tie';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured. Add it in Vercel Environment Variables.' });
  }

  try {
    const { image_base64, suit_color } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: 'image_base64 required (data URI or raw base64)' });
    }

    // Strip data URI prefix if present
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');

    // Build suit description
    const suitDesc = SUIT_PROMPTS[suit_color] || DEFAULT_SUIT;

    const prompt = `Transform this person's photo into a professional corporate headshot. `
      + `The person should be wearing a ${suitDesc}. `
      + `Keep the person's EXACT face, features, skin tone, and hair unchanged. `
      + `Professional studio lighting, clean solid light gray background. `
      + `Upper body portrait, slight smile, confident professional look. `
      + `High quality, photorealistic, suitable for LinkedIn or corporate website.`;

    // Convert base64 to Buffer for multipart upload
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create FormData for OpenAI
    const boundary = '----FormBoundary' + Date.now().toString(16);
    const parts = [];

    // model
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1`);
    // prompt
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}`);
    // size
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1024x1024`);
    // quality
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="quality"\r\n\r\nlow`);
    // image file
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;

    // Combine all parts
    const textParts = parts.join('\r\n') + '\r\n';
    const textBuffer = Buffer.from(textParts, 'utf-8');
    const headerBuffer = Buffer.from(fileHeader, 'utf-8');
    const footerBuffer = Buffer.from(fileFooter, 'utf-8');
    const body = Buffer.concat([textBuffer, headerBuffer, imageBuffer, footerBuffer]);

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });

    const data = await response.json();

    if (data.data && data.data[0]) {
      // Return the generated image
      const img = data.data[0];
      return res.status(200).json({
        success: true,
        image_url: img.url || null,
        image_b64: img.b64_json || null
      });
    }

    // Error from OpenAI
    return res.status(response.status).json({
      success: false,
      error: data.error ? data.error.message : 'Unknown error from OpenAI',
      raw: data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error generating photo',
      details: error.message
    });
  }
}
