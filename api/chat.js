// Simple in-memory rate limiter (per serverless instance)
const _rateMap = {};
const RATE_LIMIT = 12; // max requests per minute per user
const RATE_WINDOW = 60000; // 1 minute

function checkRate(user) {
  const now = Date.now();
  if (!_rateMap[user]) _rateMap[user] = [];
  _rateMap[user] = _rateMap[user].filter(t => now - t < RATE_WINDOW);
  if (_rateMap[user].length >= RATE_LIMIT) return false;
  _rateMap[user].push(now);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};

    // Rate limit by user or IP
    const userId = body.user || req.headers['x-forwarded-for'] || 'anon';
    if (!checkRate(userId)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.', reply: 'Estoy recibiendo muchas solicitudes. Por favor espera unos segundos antes de enviar otro mensaje.' });
    }

    // Validate message size (max 20KB total — higher if includes images)
    const bodySize = JSON.stringify(body).length;
    const hasImages = (body.messages || []).some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url' || c.type === 'image'));
    const maxSize = hasImages ? 2000000 : 20000; // 2MB if images, else 20KB
    if (bodySize > maxSize) {
      return res.status(400).json({ error: 'Mensaje demasiado largo', reply: 'El mensaje es demasiado largo. Por favor acortalo o reduce el tamaño de la imagen.' });
    }

    // Limit conversation history to last 10 messages (saves ~40% input tokens)
    if (body.messages && body.messages.length > 10) {
      body.messages = body.messages.slice(-10);
    }

    // ── Detect format and build messages ──
    let max_tokens, system, messages;

    if (body.agent || body.systemPrompt) {
      // Coach IA / onboarding format
      max_tokens = (body.agent === 'carousel') ? 1800 : 512;
      system = body.systemPrompt || 'Eres un asistente de SKYTEAM. Responde en español, sé breve y útil.';
      messages = (body.messages || []).map(m => ({
        role: m.role === 'bot' ? 'assistant' : m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 4000) : m.content
      }));
    } else {
      // Direct format (from coach-ia.js, sky-team.js, etc.)
      max_tokens = Math.min(body.max_tokens || 1024, 2048);
      system = body.system || '';
      messages = body.messages || [];
    }

    // Build OpenAI messages array (system as first message)
    // Support for vision: if m.content is an array with image_url, pass it directly (OpenAI format)
    const openaiMessages = [];
    if (system) openaiMessages.push({ role: 'system', content: system });
    messages.forEach(m => {
      if (Array.isArray(m.content)) {
        // Multimodal content (text + images) — pass as-is, OpenAI gpt-4o-mini supports vision
        openaiMessages.push({ role: m.role, content: m.content });
      } else {
        openaiMessages.push({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
      }
    });

    // Add timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
    if (!OPENAI_KEY) {
      clearTimeout(timeout);
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured', content: [{ text: 'Error: API key no configurada.' }] });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: max_tokens,
        messages: openaiMessages,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();

    // Extract response text — NEVER expose provider error messages to user
    let responseText;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      responseText = data.choices[0].message.content;
    } else if (data.error) {
      console.error('[CHAT] API error:', data.error.message || data.error);
      responseText = 'Sky IA no est\u00e1 disponible en este momento. Intenta de nuevo en unos minutos.';
    } else {
      responseText = 'No se pudo generar una respuesta. Intenta de nuevo.';
    }

    // ── Normalize response for Coach IA format ──
    if (body.agent || body.systemPrompt) {
      return res.status(200).json({ reply: responseText });
    }

    // Return in Anthropic-compatible format so existing frontend code works
    // (sky-team.js and coach-ia.js read data.content[0].text)
    return res.status(200).json({
      content: [{ type: 'text', text: responseText }],
      model: 'gpt-4o-mini',
      usage: data.usage || {}
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Tiempo de espera agotado', reply: 'La respuesta tardo demasiado. Intenta de nuevo.' });
    }
    return res.status(500).json({ error: 'Error al conectar con IA', reply: 'Hubo un error. Intenta de nuevo en unos segundos.' });
  }
}
