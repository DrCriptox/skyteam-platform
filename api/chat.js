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

    // Validate message size (max 20KB total)
    const bodySize = JSON.stringify(body).length;
    if (bodySize > 20000) {
      return res.status(400).json({ error: 'Mensaje demasiado largo', reply: 'El mensaje es demasiado largo. Por favor acortalo.' });
    }

    // Limit conversation history to last 20 messages
    if (body.messages && body.messages.length > 20) {
      body.messages = body.messages.slice(-20);
    }

    // ── Detect format: Coach IA vs direct Anthropic ──
    let model, max_tokens, system, messages;

    if (body.agent || body.systemPrompt) {
      // Coach IA / onboarding format
      model = 'claude-sonnet-4-20250514';
      max_tokens = 512;
      system = body.systemPrompt || 'Eres un asistente de SKYTEAM. Responde en español, sé breve y útil.';
      messages = (body.messages || []).map(m => ({
        role: m.role === 'bot' ? 'assistant' : m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 4000) : m.content
      }));
    } else {
      // Direct Anthropic format (legacy)
      model = body.model || 'claude-sonnet-4-20250514';
      max_tokens = Math.min(body.max_tokens || 1024, 2048); // Cap at 2048
      system = body.system || '';
      messages = body.messages || [];
    }

    // Add timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();

    // ── Normalize response for Coach IA ──
    if (body.agent || body.systemPrompt) {
      const reply = data.content && data.content[0] ? data.content[0].text : (data.error ? data.error.message : 'Error al procesar tu solicitud.');
      return res.status(200).json({ reply });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Tiempo de espera agotado', reply: 'La respuesta tardo demasiado. Intenta de nuevo.' });
    }
    return res.status(500).json({ error: 'Error al conectar con IA', reply: 'Hubo un error. Intenta de nuevo en unos segundos.' });
  }
}
