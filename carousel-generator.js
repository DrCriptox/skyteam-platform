/**
 * SKYTEAM Content Generator v3 — Flux AI Images + Canvas Text Overlay
 * Generates viral Instagram carousels (1080x1080) and Stories (1080x1920)
 * with AI-generated background images and professional text overlays.
 */
(function () {
  'use strict';

  var SIZE_C = 1080;
  var SIZE_SW = 1080;
  var SIZE_SH = 1920;

  // ── VIRAL TOPICS ──
  var VIRAL_TOPICS = [
    { cat: '🔥 Polémico', topics: [
      'Por qué el 95% nunca será rico (y cómo ser del 5%)',
      'Lo que tu jefe no quiere que sepas sobre el dinero',
      'Jeff Bezos empezó en un garaje — tu excusa no vale',
      'Netflix casi quiebra — la lección que nadie te cuenta',
      'Tu título universitario ya no vale lo que crees',
      'La mentira del ahorro: por qué ahorrar no te hará rico',
      'Apple empezó con $1,300 — ¿cuánto necesitas tú realmente?',
      'Por qué los pobres compran lujos y los ricos compran activos',
      'Robert Kiyosaki lo dijo: tu casa NO es un activo',
      'El sistema educativo te entrena para ser empleado'
    ]},
    { cat: '💰 Finanzas reales', topics: [
      'Con $500 al mes puedes retirarte en 10 años',
      '3 formas de ganar dinero mientras duermes',
      'El truco de los millonarios que NO enseñan en la escuela',
      'Warren Buffett invierte así — y tú puedes copiarlo',
      'Si ganas menos de $2,000 al mes necesitas leer esto',
      'Lo que $100 al día pueden hacer por tu vida en 1 año',
      'El interés compuesto: la fuerza más poderosa del universo',
      'Cómo los ricos pagan menos impuestos (legal)'
    ]},
    { cat: '🚀 Negocios digitales', topics: [
      'Cómo ganar $1,000 al mes sin experiencia ni jefe',
      'Un negocio digital hoy factura más que un restaurante',
      '5 negocios digitales que puedes empezar HOY con $0',
      'La economía digital mueve $16 TRILLONES — ¿tú dónde estás?',
      'Por qué en 2026 tener un negocio digital no es opcional',
      'Tu celular puede ser tu oficina de $5,000 al mes',
      'De empleado a emprendedor digital: la guía real'
    ]},
    { cat: '🧠 Mentalidad', topics: [
      'Los 5 hábitos que me sacaron de la quiebra',
      'Oprah fue despedida de su primer trabajo — mira dónde está',
      'Si no te da miedo tu meta, tu meta es muy pequeña',
      'El secreto de la disciplina que nadie quiere escuchar',
      'Jack Ma fue rechazado 30 veces — hoy vale $25 billones',
      'Tu zona de confort te está robando millones'
    ]}
  ];

  function getRandomTopics(n) {
    var all = [];
    VIRAL_TOPICS.forEach(function(cat) { cat.topics.forEach(function(t) { all.push({ cat: cat.cat, topic: t }); }); });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = all[i]; all[i] = all[j]; all[j] = tmp; }
    return all.slice(0, n);
  }

  // ── IMAGE PROMPT STYLES (for Flux) ──
  // Each slide type gets a specific visual style prompt
  var IMG_STYLES = {
    portada: [
      'dramatic cinematic illustration, dark moody atmosphere, golden lighting, luxury aesthetic, businessman silhouette against city skyline at sunset, volumetric light rays, film grain, ultra detailed, professional photography style',
      'hyper realistic 3D render, luxury dark scene, gold and black color palette, dramatic spotlight, wealthy lifestyle concept, modern minimalist, 8k quality, photorealistic',
      'epic wide angle shot, person standing on mountain peak overlooking city lights at night, dramatic clouds, golden hour, inspirational, cinematic color grading, ultra realistic',
      'dramatic close-up of hands holding gold coins and cash, dark luxury background, volumetric golden light, rich texture, cinematic photography, ultra detailed bokeh',
      'futuristic holographic display showing financial charts going up, neon blue and gold colors, dark tech background, cyberpunk aesthetic, 3D render, ultra detailed'
    ],
    historia: [
      'clean modern infographic background, dark navy gradient, subtle geometric patterns, soft blue glow accents, professional corporate design, minimalist, 4k',
      'elegant dark background with subtle golden particles floating, luxury premium feel, soft light from top, professional photography backdrop, 8k',
      'modern dark workspace desk from above, laptop showing charts, coffee cup, gold pen, dark moody aesthetic, flat lay photography, ultra detailed',
      'abstract dark background with flowing blue and gold light trails, modern technology feel, smooth gradients, professional, minimal noise',
      'stylish 3D isometric illustration of digital business elements, phones, charts, money symbols, dark background, neon accents, modern flat design'
    ],
    cta: [
      'powerful motivational scene, person with arms raised facing bright golden sunrise, silhouette, epic clouds, dramatic rays of light, cinematic, inspirational, ultra wide',
      'luxury lifestyle flat lay, phone showing success message, champagne, gold watch, dark marble surface, premium aesthetic, professional product photography',
      'dramatic neon arrow pointing forward, dark background, vibrant blue and gold glow, motivational energy, modern graphic design, 3D render',
      'person walking towards bright light at end of dark tunnel, symbolic of success, dramatic perspective, golden warm light, cinematic composition',
      'explosive burst of gold confetti and light against black background, celebration, success achieved, luxury, dramatic lighting, high speed photography'
    ],
    story: [
      'vertical dramatic portrait composition, dark moody luxury aesthetic, golden rim lighting, person silhouette, city lights bokeh background, cinematic, 9:16 ratio',
      'vertical futuristic neon scene, dark city at night, holographic elements, blue and purple glow, cyberpunk lifestyle, vertical composition, 9:16',
      'vertical dramatic sky with golden clouds at sunset, inspirational, person looking up, epic scale, motivational, warm golden tones, 9:16 composition',
      'vertical luxury dark gradient background with floating golden particles, elegant, premium feel, soft light from above, perfect for text overlay, 9:16'
    ]
  };

  function getImgPrompt(type) {
    var arr = IMG_STYLES[type] || IMG_STYLES.historia;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── SYSTEM PROMPTS FOR TEXT CONTENT ──
  var CAROUSEL_PROMPT =
    'Eres un creador de contenido VIRAL para Instagram en Latinoamérica. ' +
    'Genera un carrusel de 5 slides que cuente UNA HISTORIA con datos reales, ejemplos de marcas famosas o personas conocidas. ' +
    'REGLAS:\n' +
    '- Lenguaje COLOQUIAL latinoamericano. Nada de "freelancing", "side hustle" ni anglicismos. Di "chambear desde casa", "generar plata", "negocio digital".\n' +
    '- Slide 1 (PORTADA): Título MEGA impactante, polémico o controversial de max 6 palabras. Subtítulo gancho de max 10 palabras.\n' +
    '- Slides 2-4 (HISTORIA): Secuencia narrativa. Cada slide avanza la historia. Datos reales, cifras, ejemplos de empresas/personas famosas. NO tips genéricos. Como un amigo explicando algo.\n' +
    '- Slide 5 (CTA): Cierre poderoso. La frase CTA: "Comenta [PALABRA] y te cuento cómo" (palabra corta: QUIERO, LISTO, YO, META, LIBRE).\n' +
    '- Cada slide: titulo (max 6 palabras), texto (2-3 oraciones narrativas max 40 palabras), dato (cifra real impactante max 15 palabras, puede ser null).\n' +
    'JSON estricto:\n' +
    '{"slides":[{"tipo":"portada","titulo":"...","subtitulo":"...","texto":"...","dato":"..."},{"tipo":"historia","titulo":"...","texto":"...","dato":"..."},{"tipo":"historia","titulo":"...","texto":"...","dato":"..."},{"tipo":"historia","titulo":"...","texto":"...","dato":"..."},{"tipo":"cta","titulo":"...","texto":"...","cta_palabra":"QUIERO"}]}\n' +
    'Solo JSON.';

  var STORY_PROMPT =
    'Eres un creador de contenido VIRAL para Instagram Stories en Latinoamérica. ' +
    'Genera 4 stories que cuenten UNA HISTORIA impactante con datos reales.\n' +
    'REGLAS:\n' +
    '- Lenguaje coloquial latino. Nada de anglicismos.\n' +
    '- Story 1: GANCHO brutal. Pregunta polémica o dato impactante.\n' +
    '- Story 2-3: Desarrollo con datos, cifras, ejemplos de marcas/personas famosas.\n' +
    '- Story 4: CTA "Escríbeme [EMOJI] si quieres saber cómo".\n' +
    '- Cada story: titulo (max 5 palabras), texto (max 25 palabras), emoji (1).\n' +
    'JSON estricto:\n' +
    '{"stories":[{"titulo":"...","texto":"...","emoji":"🔥"},{"titulo":"...","texto":"...","emoji":"💰"},{"titulo":"...","texto":"...","emoji":"🚀"},{"titulo":"...","texto":"...","emoji":"📩","cta_palabra":"QUIERO"}]}\n' +
    'Solo JSON.';

  // ── CANVAS HELPERS ──

  function wrapText(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Draw text with shadow for readability over images
  function drawShadowText(ctx, text, x, y, opts) {
    ctx.save();
    ctx.font = opts.font || 'bold 48px Arial';
    ctx.textAlign = opts.align || 'center';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(text, x + 2, y + 2);
    // Extra shadow for more contrast
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(text, x + 4, y + 4);
    // Main text
    ctx.fillStyle = opts.color || '#FFFFFF';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Draw a dark gradient overlay on image for text readability
  function drawOverlay(ctx, w, h, style) {
    if (style === 'bottom-heavy') {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0.25)');
      g.addColorStop(0.4, 'rgba(0,0,0,0.45)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.7)');
      g.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (style === 'center-dark') {
      var g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, 'rgba(0,0,0,0.6)');
      g2.addColorStop(0.3, 'rgba(0,0,0,0.55)');
      g2.addColorStop(0.7, 'rgba(0,0,0,0.55)');
      g2.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    } else if (style === 'full-dark') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Vignette style
      var g3 = ctx.createRadialGradient(w/2, h/2, w*0.2, w/2, h/2, w*0.8);
      g3.addColorStop(0, 'rgba(0,0,0,0.3)');
      g3.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h);
    }
  }

  // Draw accent line
  function drawAccentLine(ctx, x, y, w, color, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity || 0.8;
    ctx.fillStyle = color || '#FFD700';
    ctx.fillRect(x, y, w, 4);
    ctx.restore();
  }

  // Draw glassmorphic card
  function drawGlassCard(ctx, x, y, w, h, radius) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, x, y, w, h, radius || 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, radius || 20); ctx.stroke();
    ctx.restore();
  }

  // Draw data highlight box
  function drawDataBox(ctx, text, x, y, w, accentColor) {
    if (!text) return y;
    ctx.save();
    ctx.font = 'bold 22px Arial, sans-serif';
    var lines = wrapText(ctx, text, w - 50);
    var h = lines.length * 30 + 28;
    // Box
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = accentColor || '#FFD700';
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 14); ctx.stroke();
    // Left accent
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = accentColor || '#FFD700';
    roundRect(ctx, x, y + 4, 4, h - 8, 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Text
    ctx.fillStyle = accentColor || '#FFD700';
    ctx.textAlign = 'left';
    var ty = y + 24;
    for (var i = 0; i < lines.length; i++) { ctx.fillText(lines[i], x + 24, ty); ty += 30; }
    ctx.restore();
    return y + h + 16;
  }

  // ── ACCENT COLORS (random per carousel) ──
  var ACCENTS = ['#FFD700', '#1CE8FF', '#FF4D6A', '#39FF7E', '#c084fc', '#FF9F43'];

  function randomAccent() { return ACCENTS[Math.floor(Math.random() * ACCENTS.length)]; }

  // ── SLIDE RENDERERS (image + text overlay) ──

  function renderPortada(ctx, img, slide, w, h, accent) {
    // Draw Flux image as background
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'bottom-heavy');

    // Top badge
    drawGlassCard(ctx, w/2 - 80, 60, 160, 38, 19);
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText('🔥 IMPERDIBLE', w/2, 85);

    // Title - massive
    ctx.font = 'bold 72px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    var titleLines = wrapText(ctx, slide.titulo.toUpperCase(), w - 120);
    var ty = h * 0.38;
    for (var i = 0; i < titleLines.length; i++) {
      drawShadowText(ctx, titleLines[i], w/2, ty, { font: 'bold 72px "Arial Black", Arial, sans-serif', color: '#FFFFFF' });
      ty += 86;
    }

    // Accent line
    drawAccentLine(ctx, w/2 - 60, ty + 5, 120, accent, 0.9);
    ty += 30;

    // Subtitle
    if (slide.subtitulo || slide.texto) {
      var sub = slide.subtitulo || slide.texto;
      ctx.font = '30px Arial, sans-serif';
      var subLines = wrapText(ctx, sub, w - 140);
      ty = Math.max(ty, h * 0.62);
      for (var j = 0; j < subLines.length; j++) {
        drawShadowText(ctx, subLines[j], w/2, ty, { font: '30px Arial, sans-serif', color: 'rgba(255,255,255,0.9)' });
        ty += 40;
      }
    }

    // Data box
    if (slide.dato) {
      ty = Math.max(ty + 10, h * 0.76);
      drawDataBox(ctx, '📊 ' + slide.dato, 80, ty, w - 160, accent);
    }

    // Bottom: desliza
    ctx.font = 'bold 24px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText('Desliza  →', w/2, h - 50);

    // Thin accent line bottom
    drawAccentLine(ctx, 80, h - 75, w - 160, accent, 0.3);
  }

  function renderHistoria(ctx, img, slide, idx, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'center-dark');

    // Slide badge
    drawGlassCard(ctx, w - 120, 40, 80, 36, 18);
    ctx.font = 'bold 15px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText((idx+1) + '/' + total, w - 80, 64);

    // Big watermark number
    ctx.save();
    ctx.font = 'bold 280px "Arial Black", Arial'; ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.textAlign = 'right';
    ctx.fillText(String(idx+1), w - 30, 320);
    ctx.restore();

    // Title
    ctx.font = 'bold 50px "Arial Black", Arial, sans-serif';
    var titleLines = wrapText(ctx, slide.titulo, w - 140);
    var ty = 160;
    for (var i = 0; i < titleLines.length; i++) {
      drawShadowText(ctx, titleLines[i], 70, ty, { font: 'bold 50px "Arial Black", Arial, sans-serif', color: '#FFFFFF', align: 'left' });
      ty += 62;
    }

    // Accent underline
    drawAccentLine(ctx, 70, ty + 4, 100, accent, 0.8);
    ty += 40;

    // Text in glass card
    if (slide.texto) {
      ctx.font = '28px Arial, sans-serif';
      var textLines = wrapText(ctx, slide.texto, w - 200);
      var cardH = textLines.length * 38 + 40;
      drawGlassCard(ctx, 50, ty, w - 100, cardH, 18);
      // Accent left bar
      ctx.save(); ctx.fillStyle = accent; ctx.globalAlpha = 0.6;
      roundRect(ctx, 50, ty + 4, 4, cardH - 8, 2); ctx.fill(); ctx.restore();
      // Text
      var txY = ty + 30;
      for (var j = 0; j < textLines.length; j++) {
        drawShadowText(ctx, textLines[j], 80, txY, { font: '28px Arial, sans-serif', color: 'rgba(255,255,255,0.92)', align: 'left' });
        txY += 38;
      }
      ty += cardH + 20;
    }

    // Data box
    if (slide.dato) {
      ty = Math.max(ty, h * 0.64);
      drawDataBox(ctx, '📊 ' + slide.dato, 50, ty, w - 100, accent);
    }

    // Desliza
    ctx.font = 'bold 20px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'center';
    ctx.fillText('Desliza  →', w/2, h - 45);
  }

  function renderCTA(ctx, img, slide, total, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'vignette');

    // Badge
    drawGlassCard(ctx, w - 120, 40, 80, 36, 18);
    ctx.font = 'bold 15px Arial'; ctx.fillStyle = accent; ctx.textAlign = 'center';
    ctx.fillText(total + '/' + total, w - 80, 64);

    // Title
    ctx.font = 'bold 54px "Arial Black", Arial, sans-serif';
    var titleLines = wrapText(ctx, slide.titulo, w - 120);
    var ty = h * 0.3;
    for (var i = 0; i < titleLines.length; i++) {
      drawShadowText(ctx, titleLines[i], w/2, ty, { font: 'bold 54px "Arial Black", Arial, sans-serif', color: '#FFFFFF' });
      ty += 68;
    }

    // Accent line
    drawAccentLine(ctx, w/2 - 50, ty + 5, 100, accent, 0.8);
    ty += 30;

    // Text
    if (slide.texto) {
      ctx.font = '26px Arial, sans-serif';
      var textLines = wrapText(ctx, slide.texto, w - 140);
      ty = Math.max(ty, h * 0.5);
      for (var j = 0; j < textLines.length; j++) {
        drawShadowText(ctx, textLines[j], w/2, ty, { font: '26px Arial, sans-serif', color: 'rgba(255,255,255,0.9)' });
        ty += 36;
      }
    }

    // CTA Button
    var palabra = slide.cta_palabra || 'QUIERO';
    ty = Math.max(ty + 40, h * 0.68);
    var btnW = 620, btnH = 72, btnX = (w - btnW) / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, btnX + 4, ty + 4, btnW, btnH, 36); ctx.fill();
    // Button
    ctx.fillStyle = accent;
    roundRect(ctx, btnX, ty, btnW, btnH, 36); ctx.fill();
    ctx.font = 'bold 26px "Arial Black", Arial'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
    ctx.fillText('💬 Comenta "' + palabra + '"  →', w/2, ty + 46);

    // Sub CTA text
    ctx.font = '22px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center';
    ctx.fillText('y te cuento cómo lograrlo', w/2, ty + btnH + 35);

    // Bottom accent
    drawAccentLine(ctx, 150, h - 60, w - 300, accent, 0.25);
  }

  function renderStorySlide(ctx, img, story, idx, total, isLast, w, h, accent) {
    ctx.drawImage(img, 0, 0, w, h);
    drawOverlay(ctx, w, h, 'bottom-heavy');

    // Progress bars at top
    var barY = 45, barH = 3, barGap = 6;
    var barW = (w - 60 - (total - 1) * barGap) / total;
    for (var b = 0; b < total; b++) {
      var bx = 30 + b * (barW + barGap);
      ctx.fillStyle = b <= idx ? accent : 'rgba(255,255,255,0.2)';
      ctx.globalAlpha = b <= idx ? 0.9 : 1;
      roundRect(ctx, bx, barY, barW, barH, 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Emoji
    var emoji = story.emoji || '🔥';
    ctx.font = '90px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(emoji, w/2, h * 0.3);

    // Title
    ctx.font = 'bold 64px "Arial Black", Arial';
    var titleLines = wrapText(ctx, story.titulo.toUpperCase(), w - 100);
    var ty = h * 0.4;
    for (var t = 0; t < titleLines.length; t++) {
      drawShadowText(ctx, titleLines[t], w/2, ty, { font: 'bold 64px "Arial Black", Arial', color: '#FFFFFF' });
      ty += 78;
    }

    // Accent line
    drawAccentLine(ctx, w/2 - 50, ty + 8, 100, accent, 0.7);
    ty += 45;

    // Text card
    if (story.texto) {
      ctx.font = '30px Arial, sans-serif';
      var textLines = wrapText(ctx, story.texto, w - 160);
      var cardH = textLines.length * 42 + 48;
      drawGlassCard(ctx, 50, ty, w - 100, cardH, 20);
      var txY = ty + 36;
      for (var j = 0; j < textLines.length; j++) {
        drawShadowText(ctx, textLines[j], w/2, txY, { font: '30px Arial', color: 'rgba(255,255,255,0.92)' });
        txY += 42;
      }
      ty += cardH + 20;
    }

    // CTA on last slide
    if (isLast && story.cta_palabra) {
      ty = Math.max(ty + 20, h * 0.7);
      var btnW2 = 520, btnH2 = 66, btnX2 = (w - btnW2) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, btnX2 + 3, ty + 3, btnW2, btnH2, 33); ctx.fill();
      ctx.fillStyle = accent;
      roundRect(ctx, btnX2, ty, btnW2, btnH2, 33); ctx.fill();
      ctx.font = 'bold 24px "Arial Black", Arial'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
      ctx.fillText('📩 Escríbeme "' + story.cta_palabra + '"', w/2, ty + 43);
    }

    // Swipe hint (not last)
    if (!isLast) {
      ctx.font = 'bold 20px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center';
      ctx.fillText('Toca para continuar  →', w/2, h - 70);
    }
  }

  // ── IMAGE LOADING ──

  function loadImage(url) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() { resolve(img); };
      img.onerror = function() { reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }

  // ── GENERATE FLUX IMAGES ──

  async function generateImages(prompts, size) {
    // Generate all images in parallel batches
    var results = [];
    // Send individual requests for each prompt (more variety)
    var promises = prompts.map(function(prompt) {
      return fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, size: size, num_images: 1 })
      }).then(function(r) {
        if (!r.ok) throw new Error('Image gen failed: ' + r.status);
        return r.json();
      }).then(function(data) {
        return data.images && data.images[0] ? data.images[0].url : null;
      }).catch(function(e) {
        console.warn('Image generation error:', e);
        return null;
      });
    });

    results = await Promise.all(promises);
    return results;
  }

  // ── FALLBACK: Dark gradient when image fails ──

  function drawFallbackBg(ctx, w, h, accent) {
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0a0a1a'); g.addColorStop(0.5, '#0f1535'); g.addColorStop(1, '#0a0020');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Glow
    var rg = ctx.createRadialGradient(w*0.3, h*0.3, 0, w*0.3, h*0.3, w*0.5);
    rg.addColorStop(0, accent.replace(')', ',0.06)').replace('rgb', 'rgba'));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    try { ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h); } catch(e) {}
  }

  // ── MAIN GENERATION PIPELINES ──

  async function createCarouselSlides(textContent, updateStatus) {
    var slides = textContent.slides || [];
    var total = slides.length;
    var accent = randomAccent();

    // Build image prompts for each slide
    updateStatus('Generando imágenes con IA... (0/' + total + ')');
    var imgPrompts = slides.map(function(s) {
      if (s.tipo === 'portada') return getImgPrompt('portada') + ', no text, no letters, no words';
      if (s.tipo === 'cta') return getImgPrompt('cta') + ', no text, no letters, no words';
      return getImgPrompt('historia') + ', no text, no letters, no words';
    });

    // Generate all Flux images
    var imageUrls = await generateImages(imgPrompts, 'square');

    // Load images and render canvases
    var canvases = [];
    for (var i = 0; i < slides.length; i++) {
      updateStatus('Creando slide ' + (i+1) + '/' + total + '...');
      var c = document.createElement('canvas');
      c.width = SIZE_C; c.height = SIZE_C;
      var ctx = c.getContext('2d');
      var s = slides[i];

      // Try to load the AI image, fallback to gradient
      var img = null;
      if (imageUrls[i]) {
        try { img = await loadImage(imageUrls[i]); } catch(e) { img = null; }
      }

      if (img) {
        if (s.tipo === 'portada' || i === 0) {
          renderPortada(ctx, img, s, SIZE_C, SIZE_C, accent);
        } else if (s.tipo === 'cta' || i === slides.length - 1) {
          renderCTA(ctx, img, s, total, SIZE_C, SIZE_C, accent);
        } else {
          renderHistoria(ctx, img, s, i, total, SIZE_C, SIZE_C, accent);
        }
      } else {
        // Fallback: dark gradient + text
        drawFallbackBg(ctx, SIZE_C, SIZE_C, accent);
        if (s.tipo === 'portada' || i === 0) {
          renderPortada(ctx, createFallbackImg(SIZE_C, SIZE_C, accent), s, SIZE_C, SIZE_C, accent);
        } else if (s.tipo === 'cta' || i === slides.length - 1) {
          renderCTA(ctx, createFallbackImg(SIZE_C, SIZE_C, accent), s, total, SIZE_C, SIZE_C, accent);
        } else {
          renderHistoria(ctx, createFallbackImg(SIZE_C, SIZE_C, accent), s, i, total, SIZE_C, SIZE_C, accent);
        }
      }

      var label = i === 0 ? 'Portada' : (i === slides.length - 1 ? 'CTA' : 'Slide ' + (i+1));
      canvases.push({ canvas: c, label: label });
    }
    return canvases;
  }

  async function createStorySlides(textContent, updateStatus) {
    var stories = textContent.stories || [];
    var total = stories.length;
    var accent = randomAccent();

    updateStatus('Generando imágenes para historias... (0/' + total + ')');
    var imgPrompts = stories.map(function() {
      return getImgPrompt('story') + ', no text, no letters, no words, vertical portrait';
    });

    var imageUrls = await generateImages(imgPrompts, 'story');
    var canvases = [];

    for (var i = 0; i < stories.length; i++) {
      updateStatus('Creando historia ' + (i+1) + '/' + total + '...');
      var c = document.createElement('canvas');
      c.width = SIZE_SW; c.height = SIZE_SH;
      var ctx = c.getContext('2d');

      var img = null;
      if (imageUrls[i]) {
        try { img = await loadImage(imageUrls[i]); } catch(e) { img = null; }
      }
      if (!img) img = createFallbackImg(SIZE_SW, SIZE_SH, accent);

      renderStorySlide(ctx, img, stories[i], i, total, i === total - 1, SIZE_SW, SIZE_SH, accent);
      canvases.push({ canvas: c, label: 'Historia ' + (i+1) });
    }
    return canvases;
  }

  // Create a fallback canvas image (dark gradient)
  function createFallbackImg(w, h, accent) {
    var fc = document.createElement('canvas'); fc.width = w; fc.height = h;
    drawFallbackBg(fc.getContext('2d'), w, h, accent);
    return fc;
  }

  // ── FETCH TEXT CONTENT ──

  async function fetchContent(topic, mode) {
    var usr = (typeof CU !== 'undefined' && CU) ? (CU.ref || CU.user || 'socio') : 'socio';
    var prompt = mode === 'story' ? STORY_PROMPT : CAROUSEL_PROMPT;
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'carousel', user: usr, systemPrompt: prompt, messages: [{ role: 'user', content: topic }] })
    });
    if (!res.ok) throw new Error('Error al generar texto (' + res.status + ')');
    var data = await res.json();
    var raw = data.reply || data.content || (typeof data === 'string' ? data : JSON.stringify(data));
    if (typeof raw === 'string') raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  // ── DOWNLOAD HELPERS ──

  var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function downloadCanvas(canvas, filename) {
    try {
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        canvas.toBlob(function(blob) {
          if (!blob) { fallbackDownload(canvas, filename); return; }
          var file = new File([blob], filename, { type: 'image/png' });
          var sd = { files: [file], title: filename };
          if (navigator.canShare(sd)) {
            navigator.share(sd).catch(function() { fallbackDownload(canvas, filename); });
          } else { fallbackDownload(canvas, filename); }
        }, 'image/png');
        return;
      }
      fallbackDownload(canvas, filename);
    } catch (e) { fallbackDownload(canvas, filename); }
  }

  function fallbackDownload(canvas, filename) {
    if (isIOS) {
      var d = canvas.toDataURL('image/png');
      var w = window.open('', '_blank');
      if (w) {
        w.document.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + filename + '</title><style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%}.t{position:fixed;top:0;left:0;right:0;background:rgba(28,232,255,.9);color:#000;text-align:center;padding:12px;font:bold 14px Arial}</style></head><body><div class="t">Mantén presionada → Guardar imagen</div><img src="' + d + '"></body></html>');
        w.document.close();
      }
      return;
    }
    canvas.toBlob(function(blob) {
      if (!blob) { var a = document.createElement('a'); a.download = filename; a.href = canvas.toDataURL('image/png'); document.body.appendChild(a); a.click(); document.body.removeChild(a); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.download = filename; a.href = url; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    }, 'image/png');
  }

  function downloadAll(slides, topic) {
    var safe = topic.replace(/[^a-zA-Z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25);
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      var promises = slides.map(function(s, i) {
        return new Promise(function(resolve) {
          s.canvas.toBlob(function(blob) {
            resolve(blob ? new File([blob], safe + '_' + (i+1) + '.png', {type:'image/png'}) : null);
          }, 'image/png');
        });
      });
      Promise.all(promises).then(function(files) {
        files = files.filter(Boolean);
        var sd = { files: files, title: 'Contenido - ' + topic };
        if (files.length && navigator.canShare(sd)) {
          navigator.share(sd).catch(function() { seqDownload(slides, safe); });
        } else { seqDownload(slides, safe); }
      }).catch(function() { seqDownload(slides, safe); });
    } else { seqDownload(slides, safe); }
  }

  function seqDownload(slides, safe) {
    slides.forEach(function(s, i) {
      setTimeout(function() { fallbackDownload(s.canvas, safe + '_' + (i+1) + '.png'); }, i * 500);
    });
  }

  // ── MODAL UI ──

  var TH = { bg: '#030c1f', accent: '#1CE8FF', text: '#F0EDE6', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };

  function injectStyles() {
    if (document.getElementById('cg-styles-v3')) return;
    var s = document.createElement('style'); s.id = 'cg-styles-v3';
    s.textContent = [
      '.cg-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}',
      '.cg-ov.vis{opacity:1}',
      '.cg-mod{background:'+TH.bg+';color:'+TH.text+';border:1px solid '+TH.border+';border-radius:22px;width:95vw;max-width:1100px;max-height:93vh;overflow-y:auto;padding:28px;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.6)}',
      '@media(max-width:600px){.cg-mod{padding:18px;border-radius:16px}}',
      '.cg-x{position:absolute;top:12px;right:16px;background:none;border:none;color:'+TH.text+';font-size:30px;cursor:pointer;opacity:.5;z-index:1}',
      '.cg-h{font-size:24px;font-weight:800;margin:0 0 4px;background:linear-gradient(135deg,'+TH.accent+',#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}',
      '.cg-sub{font-size:13px;opacity:.4;margin-bottom:18px}',
      '.cg-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}',
      '.cg-tab{padding:9px 20px;border-radius:22px;border:1px solid '+TH.border+';background:'+TH.card+';color:'+TH.text+';cursor:pointer;font-size:13px;font-weight:700;transition:all .2s}',
      '.cg-tab:hover,.cg-tab.act{border-color:'+TH.accent+';background:rgba(28,232,255,.08);color:'+TH.accent+'}',
      '.cg-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.4;margin-bottom:8px}',
      '.cg-tps{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}',
      '.cg-tp{padding:8px 14px;border-radius:20px;border:1px solid '+TH.border+';background:'+TH.card+';color:'+TH.text+';cursor:pointer;font-size:12px;transition:all .2s;text-align:left}',
      '.cg-tp:hover,.cg-tp.act{border-color:'+TH.accent+';background:rgba(28,232,255,.06);color:'+TH.accent+'}',
      '.cg-tp .cat{font-size:10px;opacity:.5;display:block;margin-bottom:1px}',
      '.cg-irow{display:flex;gap:10px;margin-bottom:20px}',
      '@media(max-width:500px){.cg-irow{flex-direction:column}}',
      '.cg-inp{flex:1;padding:12px 14px;border-radius:12px;border:1px solid '+TH.border+';background:'+TH.card+';color:'+TH.text+';font-size:14px;outline:none;font-family:inherit}',
      '.cg-inp:focus{border-color:'+TH.accent+'}',
      '.cg-btn{padding:12px 24px;border-radius:12px;border:none;background:'+TH.accent+';color:#000;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;transition:transform .15s}',
      '.cg-btn:hover{transform:translateY(-1px)}',
      '.cg-btn:disabled{opacity:.3;cursor:not-allowed;transform:none}',
      '.cg-btnO{padding:8px 16px;border-radius:10px;border:1px solid '+TH.accent+';background:transparent;color:'+TH.accent+';font-weight:600;font-size:12px;cursor:pointer}',
      '.cg-ld{text-align:center;padding:40px 20px;display:none}',
      '.cg-sp{width:40px;height:40px;border:4px solid '+TH.border+';border-top-color:'+TH.accent+';border-radius:50%;animation:cgspin .8s linear infinite;margin:0 auto 12px}',
      '@keyframes cgspin{to{transform:rotate(360deg)}}',
      '.cg-status{font-size:13px;opacity:.6;margin-top:8px}',
      '.cg-prev{display:none}',
      '.cg-ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}',
      '.cg-ps{display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory}',
      '.cg-ps::-webkit-scrollbar{height:4px}',
      '.cg-ps::-webkit-scrollbar-thumb{background:rgba(28,232,255,.2);border-radius:2px}',
      '.cg-sc{flex:0 0 auto;scroll-snap-align:start;border:1px solid '+TH.border+';border-radius:12px;overflow:hidden;background:'+TH.card+'}',
      '.cg-sc.carousel{width:220px}',
      '.cg-sc.story{width:150px}',
      '.cg-sc img{width:100%;display:block;border-bottom:1px solid '+TH.border+'}',
      '.cg-sf{display:flex;align-items:center;justify-content:space-between;padding:7px 10px}',
      '.cg-sl{font-size:10px;font-weight:600;opacity:.5}',
      '.cg-err{color:#ff5c5c;text-align:center;padding:14px;display:none;font-size:13px}',
      '.cg-cost{font-size:11px;opacity:.3;text-align:center;margin-top:12px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    injectStyles();
    var currentMode = 'carousel';
    var currentSlides = [];
    var ov = document.createElement('div'); ov.className = 'cg-ov'; ov.id = 'cg-overlay';
    var randomTopics = getRandomTopics(8);
    var topicsHTML = '';
    for (var i = 0; i < randomTopics.length; i++) {
      topicsHTML += '<button class="cg-tp" data-topic="' + randomTopics[i].topic.replace(/"/g, '&quot;') + '"><span class="cat">' + randomTopics[i].cat + '</span>' + randomTopics[i].topic + '</button>';
    }

    ov.innerHTML =
      '<div class="cg-mod">' +
        '<button class="cg-x" id="cg-x">&times;</button>' +
        '<h2 class="cg-h">Generador de Contenido IA</h2>' +
        '<p class="cg-sub">Imágenes generadas con IA + texto viral = contenido profesional</p>' +
        '<div class="cg-tabs">' +
          '<button class="cg-tab act" data-mode="carousel">📸 Carrusel (5 slides)</button>' +
          '<button class="cg-tab" data-mode="story">📱 Historias (4 stories)</button>' +
        '</div>' +
        '<div id="cg-form">' +
          '<p class="cg-lbl">🔥 Temas virales (cambian cada vez)</p>' +
          '<div class="cg-tps" id="cg-tps">' + topicsHTML + '</div>' +
          '<p class="cg-lbl">O escribe tu tema</p>' +
          '<div class="cg-irow">' +
            '<input class="cg-inp" id="cg-inp" placeholder="Ej: Por qué los ricos no trabajan por dinero" />' +
            '<button class="cg-btn" id="cg-gen">🎨 Generar</button>' +
          '</div>' +
        '</div>' +
        '<div class="cg-ld" id="cg-ld"><div class="cg-sp"></div><p>Creando contenido profesional...</p><p class="cg-status" id="cg-status">Generando texto con IA...</p></div>' +
        '<div class="cg-err" id="cg-err"></div>' +
        '<div class="cg-prev" id="cg-prev">' +
          '<div class="cg-ph"><p class="cg-lbl" style="margin:0">Vista previa</p><button class="cg-btn" id="cg-dlAll" style="padding:8px 18px;font-size:12px">📤 Guardar Todo</button></div>' +
          '<div class="cg-ps" id="cg-ps"></div>' +
          '<p class="cg-cost">Imágenes generadas con Flux AI • Texto por Claude AI</p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.classList.add('vis'); });

    var inp = ov.querySelector('#cg-inp');
    var genBtn = ov.querySelector('#cg-gen');
    var ldEl = ov.querySelector('#cg-ld');
    var statusEl = ov.querySelector('#cg-status');
    var errEl = ov.querySelector('#cg-err');
    var prevEl = ov.querySelector('#cg-prev');
    var psEl = ov.querySelector('#cg-ps');
    var dlAllBtn = ov.querySelector('#cg-dlAll');

    var close = function() { ov.classList.remove('vis'); setTimeout(function() { ov.remove(); }, 300); };
    ov.querySelector('#cg-x').onclick = close;
    ov.onclick = function(e) { if (e.target === ov) close(); };

    ov.querySelectorAll('.cg-tab').forEach(function(tab) {
      tab.onclick = function() {
        ov.querySelectorAll('.cg-tab').forEach(function(t) { t.classList.remove('act'); });
        tab.classList.add('act');
        currentMode = tab.getAttribute('data-mode');
      };
    });

    ov.querySelectorAll('.cg-tp').forEach(function(btn) {
      btn.onclick = function() {
        ov.querySelectorAll('.cg-tp').forEach(function(b) { b.classList.remove('act'); });
        btn.classList.add('act');
        inp.value = btn.getAttribute('data-topic');
      };
    });

    genBtn.onclick = async function() {
      var topic = inp.value.trim();
      if (!topic) { inp.focus(); inp.style.borderColor = '#ff5c5c'; setTimeout(function() { inp.style.borderColor = ''; }, 1500); return; }

      genBtn.disabled = true;
      ldEl.style.display = 'block';
      errEl.style.display = 'none';
      prevEl.style.display = 'none';
      psEl.innerHTML = '';

      var updateStatus = function(msg) { statusEl.textContent = msg; };

      try {
        updateStatus('Generando texto viral con IA...');
        var content = await fetchContent(topic, currentMode);

        if (currentMode === 'story') {
          currentSlides = await createStorySlides(content, updateStatus);
        } else {
          currentSlides = await createCarouselSlides(content, updateStatus);
        }

        updateStatus('¡Listo! Preparando vista previa...');

        // Render preview cards
        currentSlides.forEach(function(s, idx) {
          var card = document.createElement('div'); card.className = 'cg-sc ' + currentMode;
          var img = document.createElement('img');
          img.src = s.canvas.toDataURL('image/png'); img.alt = s.label;
          card.appendChild(img);

          var ft = document.createElement('div'); ft.className = 'cg-sf';
          var lb = document.createElement('span'); lb.className = 'cg-sl'; lb.textContent = s.label;
          var dl = document.createElement('button'); dl.className = 'cg-btnO'; dl.textContent = '📤';
          dl.onclick = (function(canvas, i, label) {
            return function() {
              var safe = topic.replace(/[^a-zA-Z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25);
              downloadCanvas(canvas, safe + '_' + (i+1) + '.png');
            };
          })(s.canvas, idx, s.label);
          ft.appendChild(lb); ft.appendChild(dl);
          card.appendChild(ft);
          psEl.appendChild(card);
        });

        prevEl.style.display = 'block';
        if (typeof showToast === 'function') showToast('✅ Contenido generado con IA');
      } catch (err) {
        console.error('Content generation error:', err);
        errEl.textContent = 'Error: ' + (err.message || 'No se pudo generar. Intenta de nuevo.');
        errEl.style.display = 'block';
      } finally {
        ldEl.style.display = 'none';
        genBtn.disabled = false;
      }
    };

    dlAllBtn.onclick = function() {
      if (currentSlides.length) downloadAll(currentSlides, inp.value.trim() || 'contenido');
    };
  }

  // ── PUBLIC API ──

  window.openCarouselGenerator = function() {
    var ex = document.getElementById('cg-overlay');
    if (ex) ex.remove();
    buildModal();
  };

  window.generateCarousel = async function(topic) {
    var content = await fetchContent(topic, 'carousel');
    return await createCarouselSlides(content, function(){});
  };

  window.generateStories = async function(topic) {
    var content = await fetchContent(topic, 'story');
    return await createStorySlides(content, function(){});
  };
})();
