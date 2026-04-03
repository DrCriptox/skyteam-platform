/**
 * SKYTEAM Content Generator v2
 * Generates viral Instagram carousels (1080x1080) and Stories (1080x1920)
 * with storytelling format, controversial hooks, and strong CTAs.
 */
(function () {
  'use strict';

  var SIZE_C = 1080; // carousel
  var SIZE_SW = 1080; // story width
  var SIZE_SH = 1920; // story height

  // ── VIRAL TOPICS (rotate, never repeat) ──
  var VIRAL_TOPICS = [
    { cat: '🔥 Polémico', topics: [
      'Por qué el 95% nunca será rico (y cómo ser del 5%)',
      'Lo que tu jefe no quiere que sepas sobre el dinero',
      'Jeff Bezos empezó en un garaje — tu excusa no vale',
      'Netflix casi quiebra — la lección que nadie te cuenta',
      'Tu título universitario ya no vale lo que crees',
      'Elon Musk trabaja 16 horas — ¿tú te quejas de 8?',
      'La mentira del ahorro: por qué ahorrar no te hará rico',
      'Apple empezó con $1,300 — ¿cuánto necesitas tú realmente?',
      'Por qué los pobres compran lujos y los ricos compran activos',
      'Robert Kiyosaki lo dijo: tu casa NO es un activo'
    ]},
    { cat: '💰 Finanzas reales', topics: [
      'Con $500 al mes puedes retirarte en 10 años — te explico',
      '3 formas de ganar dinero mientras duermes (sin ser genio)',
      'El truco de los millonarios que NADIE te enseña en la escuela',
      'Gané mi primer millón a los 28 — esto fue lo que cambié',
      'Warren Buffett invierte así — y tú puedes copiarlo',
      'Amazon paga a sus empleados por renunciar — la razón es brutal',
      'Si ganas menos de $2,000 al mes necesitas leer esto YA',
      'Lo que $100 al día pueden hacer por tu vida en 1 año'
    ]},
    { cat: '🚀 Negocios digitales', topics: [
      'Cómo ganar $1,000 al mes sin experiencia ni jefe',
      'Un negocio digital hoy factura más que un restaurante',
      'Zuckerberg creó Facebook en su cuarto — ¿qué creas tú?',
      '5 negocios digitales que puedes empezar HOY con $0',
      'La economía digital mueve $16 TRILLONES — ¿tú dónde estás?',
      'Por qué en 2026 tener un negocio digital no es opcional',
      'Tu celular puede ser tu oficina de $5,000 al mes'
    ]},
    { cat: '🧠 Mentalidad', topics: [
      'Los 5 hábitos que me sacaron de la quiebra',
      'Deja de quejarte y haz esto (funciona en 30 días)',
      'Oprah fue despedida de su primer trabajo — mira dónde está hoy',
      'Si no te da miedo tu meta, tu meta es muy pequeña',
      'El secreto de la disciplina que nadie quiere escuchar',
      'Jack Ma fue rechazado 30 veces — hoy vale $25 billones'
    ]}
  ];

  // Shuffle and pick unique topics
  function getRandomTopics(n) {
    var all = [];
    VIRAL_TOPICS.forEach(function(cat) {
      cat.topics.forEach(function(t) { all.push({ cat: cat.cat, topic: t }); });
    });
    for (var i = all.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
    }
    return all.slice(0, n);
  }

  // ── SYSTEM PROMPTS ──

  var CAROUSEL_PROMPT =
    'Eres un creador de contenido VIRAL para Instagram en Latinoamérica. ' +
    'Genera un carrusel de 5 slides que cuente UNA HISTORIA con datos reales, ejemplos de marcas famosas o personas conocidas. ' +
    'REGLAS IMPORTANTES:\n' +
    '- Lenguaje COLOQUIAL latinoamericano. Nada de "freelancing", "side hustle" ni anglicismos. Di "chambear desde casa", "generar plata", "negocio digital".\n' +
    '- Slide 1 (PORTADA): Título MEGA impactante, polémico o controversial. Que la gente TENGA que deslizar. Usa datos duros o menciona marcas/famosos. Incluye un subtítulo gancho.\n' +
    '- Slides 2-4 (HISTORIA): Cuenta una secuencia lógica. Cada slide avanza la narrativa. Usa datos reales, cifras, ejemplos de empresas o personas famosas. NO hagas listas de tips genéricos. Cuenta la historia como si fueras un amigo explicando algo en un café.\n' +
    '- Slide 5 (CTA): Cierre poderoso con llamado a acción. La frase CTA debe decir "Comenta [PALABRA] y te cuento cómo lograrlo" (elige una palabra corta y poderosa como QUIERO, LISTO, YO, META, LIBRE, etc).\n' +
    '- Cada slide tiene: titulo (corto, impactante, max 6 palabras), texto (2-3 oraciones narrativas, max 40 palabras por slide), dato (1 dato o cifra real impactante, max 15 palabras, puede ser null).\n' +
    'Formato JSON estricto:\n' +
    '{"slides":[{"tipo":"portada","titulo":"...","texto":"...","dato":"..."},{"tipo":"historia","titulo":"...","texto":"...","dato":"..."},{"tipo":"historia","titulo":"...","texto":"...","dato":"..."},{"tipo":"historia","titulo":"...","texto":"...","dato":"..."},{"tipo":"cta","titulo":"...","texto":"...","cta_palabra":"QUIERO"}]}\n' +
    'Solo JSON. Sin explicaciones. Sin markdown.';

  var STORY_PROMPT =
    'Eres un creador de contenido VIRAL para Instagram Stories en Latinoamérica. ' +
    'Genera 4 stories que cuenten UNA HISTORIA impactante con datos reales.\n' +
    'REGLAS:\n' +
    '- Lenguaje coloquial latino. Nada de anglicismos.\n' +
    '- Story 1: GANCHO brutal. Pregunta polémica o dato impactante que haga que la gente siga viendo.\n' +
    '- Story 2-3: Desarrollo de la historia con datos, cifras, ejemplos reales de marcas o personas famosas.\n' +
    '- Story 4: CTA con "Escríbeme [EMOJI] si quieres saber cómo" o "Comenta [PALABRA]".\n' +
    '- Cada story: titulo (max 5 palabras, grande), texto (1-2 oraciones cortas, max 25 palabras), emoji (1 emoji representativo).\n' +
    'JSON estricto:\n' +
    '{"stories":[{"titulo":"...","texto":"...","emoji":"🔥"},{"titulo":"...","texto":"...","emoji":"💰"},{"titulo":"...","texto":"...","emoji":"🚀"},{"titulo":"...","texto":"...","emoji":"📩","cta_palabra":"QUIERO"}]}\n' +
    'Solo JSON.';

  // ── DESIGN TEMPLATES ──

  var TEMPLATES = [
    {
      name: 'Neon Dark',
      bg: function(ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#0a0a1a'); g.addColorStop(0.4, '#0f1535'); g.addColorStop(1, '#0a0020');
        return g;
      },
      accent: '#1CE8FF', accentRgb: '28,232,255',
      accent2: '#a78bfa', accent2Rgb: '167,139,250',
      title: '#FFFFFF', body: '#c8dce8', dimmed: 'rgba(255,255,255,0.35)',
      cardBg: 'rgba(255,255,255,0.04)', cardBorder: 'rgba(28,232,255,0.15)',
      dataBg: 'rgba(28,232,255,0.08)', dataBorder: 'rgba(28,232,255,0.25)',
      ctaBg: '#1CE8FF', ctaText: '#000'
    },
    {
      name: 'Gold Fire',
      bg: function(ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#0d0805'); g.addColorStop(0.5, '#1a0f08'); g.addColorStop(1, '#0d0805');
        return g;
      },
      accent: '#FFD700', accentRgb: '255,215,0',
      accent2: '#FF6B4A', accent2Rgb: '255,107,74',
      title: '#FFFFFF', body: '#e8dcc0', dimmed: 'rgba(255,255,255,0.3)',
      cardBg: 'rgba(255,215,0,0.03)', cardBorder: 'rgba(255,215,0,0.12)',
      dataBg: 'rgba(255,215,0,0.06)', dataBorder: 'rgba(255,215,0,0.2)',
      ctaBg: '#FFD700', ctaText: '#000'
    },
    {
      name: 'Matrix Green',
      bg: function(ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#040d08'); g.addColorStop(0.5, '#081a10'); g.addColorStop(1, '#040d08');
        return g;
      },
      accent: '#39FF7E', accentRgb: '57,255,126',
      accent2: '#00d4aa', accent2Rgb: '0,212,170',
      title: '#FFFFFF', body: '#c0e8d0', dimmed: 'rgba(255,255,255,0.3)',
      cardBg: 'rgba(57,255,126,0.03)', cardBorder: 'rgba(57,255,126,0.12)',
      dataBg: 'rgba(57,255,126,0.06)', dataBorder: 'rgba(57,255,126,0.2)',
      ctaBg: '#39FF7E', ctaText: '#000'
    },
    {
      name: 'Electric Red',
      bg: function(ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#0d0505'); g.addColorStop(0.5, '#1a0808'); g.addColorStop(1, '#150505');
        return g;
      },
      accent: '#FF4D6A', accentRgb: '255,77,106',
      accent2: '#FF9F43', accent2Rgb: '255,159,67',
      title: '#FFFFFF', body: '#e8c8c8', dimmed: 'rgba(255,255,255,0.3)',
      cardBg: 'rgba(255,77,106,0.03)', cardBorder: 'rgba(255,77,106,0.12)',
      dataBg: 'rgba(255,77,106,0.06)', dataBorder: 'rgba(255,77,106,0.2)',
      ctaBg: '#FF4D6A', ctaText: '#fff'
    },
    {
      name: 'Royal Purple',
      bg: function(ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#0a0510'); g.addColorStop(0.5, '#15082a'); g.addColorStop(1, '#0a0510');
        return g;
      },
      accent: '#c084fc', accentRgb: '192,132,252',
      accent2: '#f472b6', accent2Rgb: '244,114,182',
      title: '#FFFFFF', body: '#d8c8f0', dimmed: 'rgba(255,255,255,0.3)',
      cardBg: 'rgba(192,132,252,0.03)', cardBorder: 'rgba(192,132,252,0.12)',
      dataBg: 'rgba(192,132,252,0.06)', dataBorder: 'rgba(192,132,252,0.2)',
      ctaBg: '#c084fc', ctaText: '#000'
    }
  ];

  // ── UTILITY HELPERS ──

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

  function drawTextBlock(ctx, text, x, y, maxW, lineH, font, color, align) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left';
    var lines = wrapText(ctx, text, maxW);
    for (var i = 0; i < lines.length; i++) {
      var dx = align === 'center' ? x + maxW / 2 : x;
      ctx.fillText(lines[i], dx, y);
      y += lineH;
    }
    return y;
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

  function glowCircle(ctx, x, y, r, rgb, op) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + op + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawBg(ctx, tpl, w, h) {
    ctx.fillStyle = tpl.bg(ctx, w, h);
    ctx.fillRect(0, 0, w, h);
    // Atmospheric glows
    glowCircle(ctx, w * 0.2, h * 0.15, w * 0.5, tpl.accentRgb, 0.04);
    glowCircle(ctx, w * 0.8, h * 0.8, w * 0.4, tpl.accent2Rgb, 0.03);
    // Noise texture simulation (grid of subtle dots)
    ctx.fillStyle = 'rgba(255,255,255,0.008)';
    for (var i = 0; i < 120; i++) {
      var nx = Math.random() * w, ny = Math.random() * h;
      ctx.fillRect(nx, ny, 2, 2);
    }
  }

  // Decorative corner brackets
  function drawBrackets(ctx, w, h, accent, op) {
    ctx.save(); ctx.strokeStyle = accent; ctx.globalAlpha = op; ctx.lineWidth = 3;
    var len = 50, pad = 40;
    // TL
    ctx.beginPath(); ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(w - pad - len, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + len); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(pad, h - pad - len); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + len, h - pad); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(w - pad - len, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, h - pad - len); ctx.stroke();
    ctx.restore();
  }

  // Accent stripe at top
  function drawTopStripe(ctx, w, accent) {
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, w, 5);
    ctx.globalAlpha = 1;
  }

  // Slide number badge
  function drawSlideBadge(ctx, num, total, tpl, w) {
    var bw = 80, bh = 36, bx = w - 55 - bw, by = 50;
    ctx.fillStyle = tpl.cardBg;
    roundRect(ctx, bx, by, bw, bh, 18); ctx.fill();
    ctx.strokeStyle = tpl.cardBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 18); ctx.stroke();
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'center';
    ctx.fillText(num + '/' + total, bx + bw / 2, by + 24);
  }

  // Big emoji or icon in background
  function drawBigEmoji(ctx, emoji, x, y, size, op) {
    ctx.save(); ctx.globalAlpha = op;
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, x, y);
    ctx.restore();
  }

  // Highlighted data box
  function drawDataBox(ctx, text, x, y, maxW, tpl) {
    if (!text) return y;
    ctx.font = 'bold 22px Arial, sans-serif';
    var lines = wrapText(ctx, text, maxW - 48);
    var boxH = lines.length * 30 + 28;
    ctx.fillStyle = tpl.dataBg;
    roundRect(ctx, x, y, maxW, boxH, 14); ctx.fill();
    ctx.strokeStyle = tpl.dataBorder;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, maxW, boxH, 14); ctx.stroke();
    // Icon bar left
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.6;
    roundRect(ctx, x, y, 5, boxH, 3); ctx.fill();
    ctx.globalAlpha = 1;
    // Text
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'left';
    var ty = y + 26;
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + 24, ty);
      ty += 30;
    }
    return y + boxH + 16;
  }

  // ── CAROUSEL SLIDE RENDERERS ──

  function renderCarouselPortada(canvas, slide, tpl, total) {
    var ctx = canvas.getContext('2d'), W = SIZE_C;
    drawBg(ctx, tpl, W, W);
    drawTopStripe(ctx, W, tpl.accent);
    drawBrackets(ctx, W, W, tpl.accent, 0.5);

    // Big background emoji
    drawBigEmoji(ctx, '⚡', W * 0.15, W * 0.35, 200, 0.04);
    drawBigEmoji(ctx, '💰', W * 0.85, W * 0.7, 180, 0.03);

    // Central glow
    glowCircle(ctx, W / 2, W * 0.45, 350, tpl.accentRgb, 0.06);

    // "VIRAL" badge top
    var badgeW = 140, badgeH = 36;
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.12;
    roundRect(ctx, (W - badgeW) / 2, 100, badgeW, badgeH, 18); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'center';
    ctx.fillText('🔥 IMPERDIBLE', W / 2, 124);

    // Title - BIG
    ctx.font = 'bold 68px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = tpl.title;
    ctx.textAlign = 'center';
    var titleLines = wrapText(ctx, slide.titulo.toUpperCase(), W - 140);
    var ty = W * 0.32;
    for (var i = 0; i < titleLines.length; i++) {
      // Text shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(titleLines[i], W / 2 + 3, ty + 3);
      ctx.fillStyle = tpl.title;
      ctx.fillText(titleLines[i], W / 2, ty);
      ty += 82;
    }

    // Subtitle / text
    if (slide.texto) {
      ty = Math.max(ty + 20, W * 0.58);
      ctx.font = '28px Arial, sans-serif';
      ctx.fillStyle = tpl.body;
      ctx.textAlign = 'center';
      var subLines = wrapText(ctx, slide.texto, W - 160);
      for (var j = 0; j < subLines.length; j++) {
        ctx.fillText(subLines[j], W / 2, ty);
        ty += 38;
      }
    }

    // Data highlight
    if (slide.dato) {
      ty = Math.max(ty + 20, W * 0.72);
      drawDataBox(ctx, '📊 ' + slide.dato, 100, ty, W - 200, tpl);
    }

    // Bottom: "Desliza →"
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'center';
    ctx.fillText('Desliza  →', W / 2, W - 60);

    // Thin bottom line
    ctx.fillStyle = tpl.accent; ctx.globalAlpha = 0.3;
    ctx.fillRect(100, W - 90, W - 200, 1); ctx.globalAlpha = 1;
  }

  function renderCarouselHistoria(canvas, slide, tpl, slideIdx, total) {
    var ctx = canvas.getContext('2d'), W = SIZE_C;
    drawBg(ctx, tpl, W, W);
    drawTopStripe(ctx, W, tpl.accent);
    drawBrackets(ctx, W, W, tpl.accent, 0.3);
    drawSlideBadge(ctx, slideIdx + 1, total, tpl, W);

    // Big watermark number
    ctx.font = 'bold 300px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.03;
    ctx.textAlign = 'right';
    ctx.fillText(String(slideIdx + 1), W - 30, 350);
    ctx.globalAlpha = 1;

    // Title
    ctx.font = 'bold 50px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = tpl.title;
    ctx.textAlign = 'left';
    var titleLines = wrapText(ctx, slide.titulo, W - 160);
    var ty = 160;
    for (var i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], 70, ty);
      ty += 62;
    }

    // Accent underline
    ctx.fillStyle = tpl.accent; ctx.globalAlpha = 0.7;
    ctx.fillRect(70, ty + 4, 100, 4); ctx.globalAlpha = 1;
    ty += 40;

    // Narrative text - in a card
    if (slide.texto) {
      var textPad = 30;
      ctx.font = '28px Arial, sans-serif';
      var textLines = wrapText(ctx, slide.texto, W - 200 - textPad * 2);
      var cardH = textLines.length * 38 + textPad * 2;
      // Card bg
      ctx.fillStyle = tpl.cardBg;
      roundRect(ctx, 60, ty, W - 120, cardH, 18); ctx.fill();
      ctx.strokeStyle = tpl.cardBorder; ctx.lineWidth = 1;
      roundRect(ctx, 60, ty, W - 120, cardH, 18); ctx.stroke();
      // Left accent bar
      ctx.fillStyle = tpl.accent; ctx.globalAlpha = 0.5;
      roundRect(ctx, 60, ty, 4, cardH, 2); ctx.fill(); ctx.globalAlpha = 1;
      // Text
      ctx.fillStyle = tpl.body; ctx.textAlign = 'left';
      var txY = ty + textPad + 20;
      for (var j = 0; j < textLines.length; j++) {
        ctx.fillText(textLines[j], 60 + textPad + 10, txY);
        txY += 38;
      }
      ty += cardH + 24;
    }

    // Data box
    if (slide.dato) {
      ty = Math.max(ty, W * 0.62);
      drawDataBox(ctx, '📊 ' + slide.dato, 60, ty, W - 120, tpl);
    }

    // Desliza
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = tpl.dimmed; ctx.textAlign = 'center';
    ctx.fillText('Desliza  →', W / 2, W - 55);
  }

  function renderCarouselCTA(canvas, slide, tpl, total) {
    var ctx = canvas.getContext('2d'), W = SIZE_C;
    drawBg(ctx, tpl, W, W);
    drawTopStripe(ctx, W, tpl.accent);
    drawBrackets(ctx, W, W, tpl.accent, 0.6);
    drawSlideBadge(ctx, total, total, tpl, W);

    // Central glow
    glowCircle(ctx, W / 2, W * 0.4, 400, tpl.accentRgb, 0.08);

    // Big emoji
    drawBigEmoji(ctx, '🔥', W / 2, W * 0.22, 100, 0.15);

    // Title
    ctx.font = 'bold 52px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = tpl.title; ctx.textAlign = 'center';
    var titleLines = wrapText(ctx, slide.titulo, W - 140);
    var ty = W * 0.35;
    for (var i = 0; i < titleLines.length; i++) {
      ctx.fillText(titleLines[i], W / 2, ty); ty += 66;
    }

    // Text
    if (slide.texto) {
      ty = Math.max(ty + 10, W * 0.5);
      ctx.font = '26px Arial, sans-serif';
      ctx.fillStyle = tpl.body;
      var textLines = wrapText(ctx, slide.texto, W - 160);
      for (var j = 0; j < textLines.length; j++) {
        ctx.fillText(textLines[j], W / 2, ty); ty += 36;
      }
    }

    // CTA BUTTON
    var palabra = slide.cta_palabra || 'QUIERO';
    ty = Math.max(ty + 40, W * 0.68);
    var btnW = 600, btnH = 72, btnX = (W - btnW) / 2;

    // Button shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, btnX + 4, ty + 4, btnW, btnH, 36); ctx.fill();
    // Button
    ctx.fillStyle = tpl.ctaBg;
    roundRect(ctx, btnX, ty, btnW, btnH, 36); ctx.fill();
    ctx.font = 'bold 26px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = tpl.ctaText; ctx.textAlign = 'center';
    ctx.fillText('💬 Comenta "' + palabra + '" →', W / 2, ty + 46);

    // Sub-text
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = tpl.dimmed; ctx.textAlign = 'center';
    ctx.fillText('y te cuento cómo lograrlo', W / 2, ty + btnH + 35);

    // Bottom separator
    ctx.fillStyle = tpl.accent; ctx.globalAlpha = 0.2;
    ctx.fillRect(200, W - 80, W - 400, 1); ctx.globalAlpha = 1;
  }

  // ── STORY SLIDE RENDERERS ──

  function renderStory(canvas, story, tpl, idx, total, isLast) {
    var ctx = canvas.getContext('2d'), W = SIZE_SW, H = SIZE_SH;
    drawBg(ctx, tpl, W, H);

    // Top stripe
    ctx.fillStyle = tpl.accent; ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, W, 4); ctx.globalAlpha = 1;

    // Progress bars
    var barY = 40, barH = 3, barGap = 6;
    var barW = (W - 60 - (total - 1) * barGap) / total;
    for (var i = 0; i < total; i++) {
      var bx = 30 + i * (barW + barGap);
      ctx.fillStyle = i <= idx ? tpl.accent : 'rgba(255,255,255,0.15)';
      ctx.globalAlpha = i <= idx ? 0.8 : 1;
      roundRect(ctx, bx, barY, barW, barH, 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Brackets
    drawBrackets(ctx, W, H, tpl.accent, 0.25);

    // Big atmospheric emoji
    var emojis = ['💰', '🔥', '🚀', '⚡', '📈', '🎯', '💎'];
    var bgEmoji = story.emoji || emojis[idx % emojis.length];
    drawBigEmoji(ctx, bgEmoji, W / 2, H * 0.2, 250, 0.04);

    // Central glow
    glowCircle(ctx, W / 2, H * 0.45, 500, tpl.accentRgb, 0.05);

    // Emoji icon
    ctx.font = '80px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(bgEmoji, W / 2, H * 0.32);

    // Title
    ctx.font = 'bold 62px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = tpl.title; ctx.textAlign = 'center';
    var titleLines = wrapText(ctx, story.titulo.toUpperCase(), W - 120);
    var ty = H * 0.42;
    for (var t = 0; t < titleLines.length; t++) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(titleLines[t], W / 2 + 3, ty + 3);
      ctx.fillStyle = tpl.title;
      ctx.fillText(titleLines[t], W / 2, ty);
      ty += 76;
    }

    // Accent line
    ctx.fillStyle = tpl.accent; ctx.globalAlpha = 0.6;
    ctx.fillRect(W / 2 - 50, ty + 10, 100, 4); ctx.globalAlpha = 1;
    ty += 50;

    // Text card
    if (story.texto) {
      ctx.font = '30px Arial, sans-serif';
      var textLines = wrapText(ctx, story.texto, W - 180);
      var cardH = textLines.length * 42 + 50;
      ctx.fillStyle = tpl.cardBg;
      roundRect(ctx, 60, ty, W - 120, cardH, 20); ctx.fill();
      ctx.strokeStyle = tpl.cardBorder; ctx.lineWidth = 1;
      roundRect(ctx, 60, ty, W - 120, cardH, 20); ctx.stroke();
      ctx.fillStyle = tpl.body; ctx.textAlign = 'center';
      var txY = ty + 36;
      for (var j = 0; j < textLines.length; j++) {
        ctx.fillText(textLines[j], W / 2, txY); txY += 42;
      }
      ty += cardH + 24;
    }

    // CTA button on last story
    if (isLast && story.cta_palabra) {
      ty = Math.max(ty + 30, H * 0.72);
      var btnW2 = 520, btnH2 = 68, btnX2 = (W - btnW2) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, btnX2 + 3, ty + 3, btnW2, btnH2, 34); ctx.fill();
      ctx.fillStyle = tpl.ctaBg;
      roundRect(ctx, btnX2, ty, btnW2, btnH2, 34); ctx.fill();
      ctx.font = 'bold 24px "Arial Black", Arial, sans-serif';
      ctx.fillStyle = tpl.ctaText; ctx.textAlign = 'center';
      ctx.fillText('📩 Escríbeme "' + story.cta_palabra + '"', W / 2, ty + 44);
    }

    // Bottom swipe hint (not on last)
    if (!isLast) {
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillStyle = tpl.dimmed; ctx.textAlign = 'center';
      ctx.fillText('Toca para continuar  →', W / 2, H - 80);
    }
  }

  // ── GENERATION PIPELINES ──

  function createCarouselSlides(content) {
    var tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    var slides = content.slides || [];
    var total = slides.length;
    var canvases = [];

    for (var i = 0; i < slides.length; i++) {
      var c = document.createElement('canvas');
      c.width = SIZE_C; c.height = SIZE_C;
      var s = slides[i];
      if (s.tipo === 'portada' || i === 0) {
        renderCarouselPortada(c, s, tpl, total);
        canvases.push({ canvas: c, label: 'Portada' });
      } else if (s.tipo === 'cta' || i === slides.length - 1) {
        renderCarouselCTA(c, s, tpl, total);
        canvases.push({ canvas: c, label: 'CTA' });
      } else {
        renderCarouselHistoria(c, s, tpl, i, total);
        canvases.push({ canvas: c, label: 'Slide ' + (i + 1) });
      }
    }
    return canvases;
  }

  function createStorySlides(content) {
    var tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    var stories = content.stories || [];
    var canvases = [];
    for (var i = 0; i < stories.length; i++) {
      var c = document.createElement('canvas');
      c.width = SIZE_SW; c.height = SIZE_SH;
      renderStory(c, stories[i], tpl, i, stories.length, i === stories.length - 1);
      canvases.push({ canvas: c, label: 'Historia ' + (i + 1) });
    }
    return canvases;
  }

  // ── API CALL ──

  async function fetchContent(topic, mode) {
    var usr = (typeof CU !== 'undefined' && CU) ? (CU.ref || CU.user || 'socio') : 'socio';
    var prompt = mode === 'story' ? STORY_PROMPT : CAROUSEL_PROMPT;
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'carousel',
        user: usr,
        systemPrompt: prompt,
        messages: [{ role: 'user', content: topic }]
      })
    });
    if (!res.ok) throw new Error('Error al generar contenido (' + res.status + ')');
    var data = await res.json();
    var raw = data.reply || data.content || (typeof data === 'string' ? data : JSON.stringify(data));
    if (typeof raw === 'string') {
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    }
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  // ── DOWNLOAD HELPERS ──

  function downloadCanvas(canvas, filename) {
    var link = document.createElement('a');
    link.download = filename; link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  function downloadAll(slides, topic) {
    var safe = topic.replace(/[^a-zA-Z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25);
    slides.forEach(function(s, i) {
      setTimeout(function() { downloadCanvas(s.canvas, safe + '_' + (i + 1) + '.png'); }, i * 350);
    });
  }

  // ── MODAL UI ──

  var THEME = { bg: '#030c1f', accent: '#1CE8FF', text: '#F0EDE6', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };

  function injectStyles() {
    if (document.getElementById('cg-styles-v2')) return;
    var s = document.createElement('style'); s.id = 'cg-styles-v2';
    s.textContent = [
      '.cg-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}',
      '.cg-ov.vis{opacity:1}',
      '.cg-mod{background:' + THEME.bg + ';color:' + THEME.text + ';border:1px solid ' + THEME.border + ';border-radius:22px;width:95vw;max-width:1100px;max-height:93vh;overflow-y:auto;padding:32px;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.6)}',
      '.cg-x{position:absolute;top:14px;right:18px;background:none;border:none;color:' + THEME.text + ';font-size:30px;cursor:pointer;opacity:.5;transition:opacity .2s}',
      '.cg-x:hover{opacity:1}',
      '.cg-h{font-size:26px;font-weight:800;margin:0 0 4px;background:linear-gradient(135deg,' + THEME.accent + ',#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}',
      '.cg-sub{font-size:13px;opacity:.4;margin-bottom:20px}',
      '.cg-tabs{display:flex;gap:8px;margin-bottom:22px}',
      '.cg-tab{padding:10px 22px;border-radius:24px;border:1px solid ' + THEME.border + ';background:' + THEME.card + ';color:' + THEME.text + ';cursor:pointer;font-size:14px;font-weight:700;transition:all .2s}',
      '.cg-tab:hover,.cg-tab.act{border-color:' + THEME.accent + ';background:rgba(28,232,255,.08);color:' + THEME.accent + '}',
      '.cg-lbl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.4;margin-bottom:10px}',
      '.cg-tps{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}',
      '.cg-tp{padding:9px 16px;border-radius:22px;border:1px solid ' + THEME.border + ';background:' + THEME.card + ';color:' + THEME.text + ';cursor:pointer;font-size:13px;transition:all .2s}',
      '.cg-tp:hover,.cg-tp.act{border-color:' + THEME.accent + ';background:rgba(28,232,255,.06);color:' + THEME.accent + '}',
      '.cg-tp .cat{font-size:11px;opacity:.5;display:block;margin-bottom:2px}',
      '.cg-irow{display:flex;gap:10px;margin-bottom:24px}',
      '.cg-inp{flex:1;padding:13px 16px;border-radius:14px;border:1px solid ' + THEME.border + ';background:' + THEME.card + ';color:' + THEME.text + ';font-size:14px;outline:none;transition:border-color .2s;font-family:inherit}',
      '.cg-inp:focus{border-color:' + THEME.accent + '}',
      '.cg-btn{padding:13px 26px;border-radius:14px;border:none;background:' + THEME.accent + ';color:#000;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;transition:transform .15s,box-shadow .2s}',
      '.cg-btn:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(28,232,255,.3)}',
      '.cg-btn:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}',
      '.cg-btnO{padding:9px 18px;border-radius:12px;border:1px solid ' + THEME.accent + ';background:transparent;color:' + THEME.accent + ';font-weight:600;font-size:12px;cursor:pointer;transition:background .2s}',
      '.cg-btnO:hover{background:rgba(28,232,255,.06)}',
      '.cg-ld{text-align:center;padding:50px 20px;display:none}',
      '.cg-sp{width:44px;height:44px;border:4px solid ' + THEME.border + ';border-top-color:' + THEME.accent + ';border-radius:50%;animation:cgspin .8s linear infinite;margin:0 auto 14px}',
      '@keyframes cgspin{to{transform:rotate(360deg)}}',
      '.cg-prev{display:none}',
      '.cg-ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '.cg-ps{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory}',
      '.cg-ps::-webkit-scrollbar{height:5px}',
      '.cg-ps::-webkit-scrollbar-thumb{background:rgba(28,232,255,.2);border-radius:3px}',
      '.cg-sc{flex:0 0 auto;scroll-snap-align:start;border:1px solid ' + THEME.border + ';border-radius:14px;overflow:hidden;background:' + THEME.card + '}',
      '.cg-sc.carousel{width:240px}',
      '.cg-sc.story{width:160px}',
      '.cg-sc img{width:100%;display:block;border-bottom:1px solid ' + THEME.border + '}',
      '.cg-sf{display:flex;align-items:center;justify-content:space-between;padding:8px 12px}',
      '.cg-sl{font-size:11px;font-weight:600;opacity:.5}',
      '.cg-err{color:#ff5c5c;text-align:center;padding:16px;display:none}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildModal() {
    injectStyles();

    var currentMode = 'carousel';
    var currentSlides = [];

    var ov = document.createElement('div');
    ov.className = 'cg-ov'; ov.id = 'cg-overlay';

    // Get random viral topics
    var randomTopics = getRandomTopics(8);

    var topicsHTML = '';
    for (var i = 0; i < randomTopics.length; i++) {
      topicsHTML += '<button class="cg-tp" data-topic="' + randomTopics[i].topic.replace(/"/g, '&quot;') + '">'
        + '<span class="cat">' + randomTopics[i].cat + '</span>'
        + randomTopics[i].topic + '</button>';
    }

    ov.innerHTML =
      '<div class="cg-mod">' +
        '<button class="cg-x" id="cg-x">&times;</button>' +
        '<h2 class="cg-h">Generador de Contenido</h2>' +
        '<p class="cg-sub">Crea carruseles y historias virales para Instagram con IA</p>' +
        '<div class="cg-tabs">' +
          '<button class="cg-tab act" data-mode="carousel">📸 Carrusel (1080x1080)</button>' +
          '<button class="cg-tab" data-mode="story">📱 Historias (1080x1920)</button>' +
        '</div>' +
        '<div id="cg-form">' +
          '<p class="cg-lbl">🔥 Temas virales (se renuevan cada vez)</p>' +
          '<div class="cg-tps" id="cg-tps">' + topicsHTML + '</div>' +
          '<p class="cg-lbl">O escribe tu tema</p>' +
          '<div class="cg-irow">' +
            '<input class="cg-inp" id="cg-inp" placeholder="Ej: Por qué los ricos no trabajan por dinero" />' +
            '<button class="cg-btn" id="cg-gen">Generar</button>' +
          '</div>' +
        '</div>' +
        '<div class="cg-ld" id="cg-ld">' +
          '<div class="cg-sp"></div>' +
          '<p>Generando contenido viral...</p>' +
          '<p style="font-size:12px;opacity:.35">Creando narrativa + diseño</p>' +
        '</div>' +
        '<div class="cg-err" id="cg-err"></div>' +
        '<div class="cg-prev" id="cg-prev">' +
          '<div class="cg-ph">' +
            '<p class="cg-lbl" style="margin:0">Vista previa</p>' +
            '<button class="cg-btn" id="cg-dlAll" style="padding:9px 20px;font-size:12px">⬇ Descargar Todo</button>' +
          '</div>' +
          '<div class="cg-ps" id="cg-ps"></div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ov);
    requestAnimationFrame(function() { ov.classList.add('vis'); });

    // References
    var inp = ov.querySelector('#cg-inp');
    var genBtn = ov.querySelector('#cg-gen');
    var ldEl = ov.querySelector('#cg-ld');
    var errEl = ov.querySelector('#cg-err');
    var prevEl = ov.querySelector('#cg-prev');
    var psEl = ov.querySelector('#cg-ps');
    var dlAllBtn = ov.querySelector('#cg-dlAll');

    // Close
    var close = function() { ov.classList.remove('vis'); setTimeout(function() { ov.remove(); }, 300); };
    ov.querySelector('#cg-x').onclick = close;
    ov.onclick = function(e) { if (e.target === ov) close(); };

    // Tabs
    ov.querySelectorAll('.cg-tab').forEach(function(tab) {
      tab.onclick = function() {
        ov.querySelectorAll('.cg-tab').forEach(function(t) { t.classList.remove('act'); });
        tab.classList.add('act');
        currentMode = tab.getAttribute('data-mode');
        genBtn.textContent = currentMode === 'story' ? 'Generar Historias' : 'Generar Carrusel';
      };
    });

    // Topic buttons
    ov.querySelectorAll('.cg-tp').forEach(function(btn) {
      btn.onclick = function() {
        ov.querySelectorAll('.cg-tp').forEach(function(b) { b.classList.remove('act'); });
        btn.classList.add('act');
        inp.value = btn.getAttribute('data-topic');
      };
    });

    // Generate
    genBtn.onclick = async function() {
      var topic = inp.value.trim();
      if (!topic) { inp.focus(); inp.style.borderColor = '#ff5c5c'; setTimeout(function() { inp.style.borderColor = ''; }, 1500); return; }

      genBtn.disabled = true;
      ldEl.style.display = 'block';
      errEl.style.display = 'none';
      prevEl.style.display = 'none';
      psEl.innerHTML = '';

      try {
        var content = await fetchContent(topic, currentMode);

        if (currentMode === 'story') {
          currentSlides = createStorySlides(content);
        } else {
          currentSlides = createCarouselSlides(content);
        }

        // Render preview
        currentSlides.forEach(function(s, idx) {
          var card = document.createElement('div');
          card.className = 'cg-sc ' + currentMode;

          var img = document.createElement('img');
          img.src = s.canvas.toDataURL('image/png');
          img.alt = s.label;
          card.appendChild(img);

          var ft = document.createElement('div'); ft.className = 'cg-sf';
          var lb = document.createElement('span'); lb.className = 'cg-sl'; lb.textContent = s.label;
          var dl = document.createElement('button'); dl.className = 'cg-btnO'; dl.textContent = '⬇';
          dl.onclick = (function(canvas, i) {
            return function() {
              var safe = topic.replace(/[^a-zA-Z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1 ]/g, '').replace(/\s+/g, '_').substring(0, 25);
              downloadCanvas(canvas, safe + '_' + (i + 1) + '.png');
            };
          })(s.canvas, idx);
          ft.appendChild(lb); ft.appendChild(dl);
          card.appendChild(ft);
          psEl.appendChild(card);
        });

        prevEl.style.display = 'block';
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
    return createCarouselSlides(content);
  };

  window.generateStories = async function(topic) {
    var content = await fetchContent(topic, 'story');
    return createStorySlides(content);
  };
})();
