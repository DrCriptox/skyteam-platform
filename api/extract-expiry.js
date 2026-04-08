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
La imagen puede venir en 2 formatos. Ambos tienen los MISMOS 4 datos obligatorios.

=== FORMATO VERTICAL (captura de celular) ===
De arriba a abajo:
- Foto circular del usuario con un BADGE de color que dice los DIAS RESTANTES (ej: "64 dias restantes")
- NOMBRE COMPLETO en texto grande (ej: "Genesis Alejandra Sierra Ayala")
- USUARIO: texto pequeno gris justo DEBAJO del nombre (ej: "angel2026"). Es UNA sola palabra sin espacios.
- Mas abajo, scroll hacia abajo: campos de email, contrasena, etc.
- Aun mas abajo: etiqueta "Clasificacion Actual:" seguida del RANGO (ej: "NOVA DIAMOND")
- Debajo: etiqueta "Patrocinado:" o "Patrocinador:" seguida del SPONSOR (ej: "LEGEND")

=== FORMATO HORIZONTAL (captura de computadora) ===
Mismos elementos pero distribuidos en pantalla ancha:
- Centro/derecha: Foto circular con BADGE de DIAS RESTANTES
- Debajo de la foto: NOMBRE COMPLETO grande, y debajo el USUARIO en texto pequeno
- Mas abajo en la pagina: "Clasificacion Actual:" con el RANGO
- Debajo: "Patrocinado:" con el SPONSOR

=== LOS 4 DATOS OBLIGATORIOS ===
1. DIAS RESTANTES: numero en el badge de color pegado a la foto circular (ej: "64 dias restantes"). Si no hay badge pero se ve "Fecha de vencimiento:", calcular los dias desde hoy hasta esa fecha.
2. USUARIO: la palabra corta SIN ESPACIOS debajo del nombre completo. NUNCA es el nombre completo (que tiene espacios). NUNCA es el Patrocinador. NUNCA es la Colocacion. Ejemplos: "angel2026", "teamgarcia", "legend".
3. CLASIFICACION: el texto despues de la etiqueta "Clasificacion Actual:". Rangos validos: Cliente, INN 200, INN 500, NOVA, NOVA 1500, NOVA 5K, NOVA 10K, NOVA DIAMOND, NOVA 50K, NOVA 100K. Si dice PIONEER, EXPLORER o Package: found=false.
4. SPONSOR: el texto despues de "Patrocinado:" o "Patrocinador:". IGNORAR siempre "Colocacion:" (es otro campo diferente, NO es el sponsor).

=== RECHAZAR (found=false) SI ===
- No es 8innova.biz/profile
- Imagen borrosa o cortada
- No se ve el badge de dias restantes NI fecha de vencimiento
- No se ve el usuario (texto pequeno debajo del nombre)
- No se ve "Clasificacion Actual:" con un rango valido
- No se ve "Patrocinado:" o "Patrocinador:"
- La imagen solo muestra parte del perfil (ej: solo la foto y nombre pero no la clasificacion ni el sponsor)

Responde SOLO JSON. Ejemplos:
Si todo esta visible: {"found":true,"days_remaining":64,"expiry_date":"2026-08-15","username":"angel2026","classification":"NOVA DIAMOND","sponsor":"LEGEND"}
Si falta algo: {"found":false,"reason":"No se ve la Clasificacion Actual en la imagen. Se necesita una captura mas completa.","visible":{"days_remaining":true,"username":"angel2026","classification":false,"sponsor":false}}`;

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
