// OCR Vision API — extract expiry date from backoffice screenshot
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 requerido' });

    const OPENAI_KEY = process.env.OPENAT_API_KEY || process.env.OPENAI_API_KEY || '';
    if (!OPENAI_KEY) return res.status(500).json({ error: 'API key no configurada' });

    const prompt = `Analiza esta captura de pantalla del perfil de 8innova.biz/profile.

=== ESTRUCTURA DE LA PAGINA (de arriba a abajo) ===
ZONA IZQUIERDA (tarjeta del socio):
  1. Foto circular del usuario
  2. Badge con DIAS RESTANTES (numero en un circulo/badge)
  3. NOMBRE COMPLETO en letras grandes
  4. USUARIO: palabra corta SIN ESPACIOS justo debajo del nombre, arriba de "KYC"
  5. Estado KYC

ZONA CENTRAL/DERECHA (datos del perfil):
  - "Patrocinador:" seguido de un username → esto es el SPONSOR
  - "Colocacion:" seguido de un username → IGNORAR completamente
  - "Clasificacion Actual:" seguido del rango → esto es la CLASSIFICATION
  - "Fecha de vencimiento:" → fecha de expiry

=== REGLAS CRITICAS ===
1. USUARIO: es la palabra corta debajo del nombre grande. UNA sola palabra, sin espacios. NUNCA es el nombre completo. NUNCA es el Patrocinador. NUNCA es la Colocacion.
2. SPONSOR: SOLO lo que dice en "Patrocinador:". La "Colocacion:" es OTRO campo, IGNORARLO siempre.
3. CLASIFICACION: SOLO lo que dice en "Clasificacion Actual:". PIONEER/EXPLORER Package NO son rangos.
4. Rangos validos: Cliente, INN 200, INN 500, NOVA, NOVA 1500, NOVA 5K, NOVA 10K, NOVA DIAMOND, NOVA 50K, NOVA 100K.

=== RECHAZAR (found=false) SI ===
- No es una captura de 8innova.biz/profile
- Imagen borrosa o no se leen los textos
- NO se ve "Clasificacion Actual:" con un rango valido
- NO se ve "Patrocinador:"
- NO se ve el badge de dias restantes
- Solo se ve parte del perfil (debe verse la tarjeta izquierda Y los datos centrales)

Responde SOLO JSON: { "found": true, "days_remaining": 120, "expiry_date": "2026-08-15", "username": "juandavid", "classification": "NOVA", "sponsor": "ANGEL2026" }
Si algun dato NO es visible en la imagen: found=false, reason="No se ve X en la imagen"`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'data:' + (mimeType || 'image/jpeg') + ';base64,' + imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error('OpenAI API error: ' + r.status + ' ' + errText.substring(0, 200));
    }

    const gptData = await r.json();
    const rawText = (gptData.choices?.[0]?.message?.content || '').trim();

    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      extracted = { found: false };
    }

    // Validate 4 required fields
    if (extracted.found) {
      var missing = [];
      if (!extracted.days_remaining && extracted.days_remaining !== 0 && !extracted.expiry_date) missing.push('Dias restantes');
      if (!extracted.classification) missing.push('Clasificacion/Rango');
      if (!extracted.username) missing.push('Usuario de Innova');
      if (!extracted.sponsor) missing.push('Patrocinador/Sponsor');
      if (missing.length > 0) {
        return res.status(200).json({ found: false, reason: 'Datos incompletos', missing: missing, missingList: 'Faltan: ' + missing.join(', '), partial: extracted });
      }
    }

    // Calculate timestamps
    if (extracted.found) {
      if (extracted.expiry_date) {
        const d = new Date(extracted.expiry_date + 'T12:00:00Z');
        if (!isNaN(d.getTime())) {
          extracted.expiry_ts = d.getTime();
          const parts = extracted.expiry_date.split('-');
          extracted.expiry_label = parts[2] + '/' + parts[1] + '/' + parts[0];
          if (typeof extracted.days_remaining !== 'number') {
            extracted.days_remaining = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
          }
        }
      }
      if (!extracted.expiry_ts && typeof extracted.days_remaining === 'number') {
        const ms = Date.now() + extracted.days_remaining * 86400000;
        extracted.expiry_ts = ms;
        const d2 = new Date(ms);
        extracted.expiry_label = d2.getUTCDate().toString().padStart(2,'0') + '/' + (d2.getUTCMonth()+1).toString().padStart(2,'0') + '/' + d2.getUTCFullYear();
      }
      if (!extracted.expiry_ts) extracted.found = false;
    }

    return res.status(200).json(extracted);
  } catch (error) {
    console.error('extract-expiry error:', error.message);
    return res.status(500).json({ error: 'Error procesando imagen' });
  }
}
