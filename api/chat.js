export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};

    // ── Detect format: Coach IA vs direct Anthropic ──
    let model, max_tokens, system, messages;

    if (body.agent || body.systemPrompt) {
      // Coach IA / onboarding format
      model = 'claude-sonnet-4-20250514';
      max_tokens = 512;
      system = body.systemPrompt || 'Eres un asistente de Sky Team. Responde en español, sé breve y útil.';
      messages = (body.messages || []).map(m => ({
        role: m.role === 'bot' ? 'assistant' : m.role,
        content: m.content
      }));
    } else {
      // Direct Anthropic format (legacy)
      model = body.model || 'claude-sonnet-4-20250514';
      max_tokens = body.max_tokens || 1024;
      system = body.system || '';
      messages = body.messages || [];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system, messages })
    });

    const data = await response.json();

    // ── Normalize response for Coach IA ──
    if (body.agent || body.systemPrompt) {
      const reply = data.content && data.content[0] ? data.content[0].text : (data.error ? data.error.message : 'Error');
      return res.status(200).json({ reply });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Error connecting to Claude API', details: error.message });
  }
}
