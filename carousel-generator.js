/**
 * SKYTEAM Carousel Generator
 * Generates educational Instagram carousels (1080x1080) using HTML Canvas.
 * Self-contained IIFE — no external dependencies.
 */
(function () {
  'use strict';

  // ── Design tokens ──────────────────────────────────────────────────
  const THEME = {
    bg: '#030c1f',
    accent: '#1CE8FF',
    text: '#F0EDE6',
    card: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
  };

  const CANVAS_SIZE = 1080;

  const TEMPLATES = [
    {
      name: 'Neon Pulse',
      gradient: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        g.addColorStop(0, '#0b0e2a');
        g.addColorStop(0.5, '#141852');
        g.addColorStop(1, '#1a0a3e');
        return g;
      },
      accent: '#1CE8FF',
      accentRgb: '28,232,255',
      title: '#FFFFFF',
      body: '#d0e8f0',
    },
    {
      name: 'Gold Premium',
      gradient: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        g.addColorStop(0, '#0d0d0d');
        g.addColorStop(0.5, '#1a1510');
        g.addColorStop(1, '#0d0d0d');
        return g;
      },
      accent: '#FFD700',
      accentRgb: '255,215,0',
      title: '#FFFFFF',
      body: '#e8e0c8',
    },
    {
      name: 'Growth Green',
      gradient: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        g.addColorStop(0, '#061a0e');
        g.addColorStop(0.5, '#0a2e18');
        g.addColorStop(1, '#04120a');
        return g;
      },
      accent: '#39FF7E',
      accentRgb: '57,255,126',
      title: '#FFFFFF',
      body: '#c8f0d8',
    },
    {
      name: 'Coral Energy',
      gradient: (ctx) => {
        const g = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        g.addColorStop(0, '#1a0a0a');
        g.addColorStop(0.5, '#2e1410');
        g.addColorStop(1, '#1a0808');
        return g;
      },
      accent: '#FF6B4A',
      accentRgb: '255,107,74',
      title: '#FFFFFF',
      body: '#f0d8d0',
    },
  ];

  const PRESET_TOPICS = [
    'Libertad Financiera',
    'Mentalidad de Éxito',
    'Ingresos Digitales',
    'Emprendimiento Digital',
    'Hábitos de Millonarios',
    'Finanzas Personales',
  ];

  const SYSTEM_PROMPT =
    'Genera contenido para un carrusel educativo de Instagram (5 slides) sobre el tema dado. Formato JSON estricto:\n' +
    '{"cover":{"titulo":"TITULO IMPACTANTE (max 5 palabras)","subtitulo":"frase gancho (max 8 palabras)"},"slides":[{"numero":1,"titulo":"Título corto","puntos":["Punto 1 (max 12 palabras)","Punto 2","Punto 3"]},{"numero":2,"titulo":"Título corto","puntos":["Punto 1","Punto 2","Punto 3"]},{"numero":3,"titulo":"Título corto","puntos":["Punto 1","Punto 2","Punto 3"]}],"cta":{"titulo":"Frase motivacional corta","subtitulo":"Sígueme para más contenido"}}\n' +
    'Solo responde el JSON, sin explicaciones.';

  // ── Utility helpers ────────────────────────────────────────────────

  /** Wrap text into lines that fit maxWidth. Returns array of strings. */
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  /** Draw multi-line text centered horizontally starting at y. Returns final y. */
  function drawCenteredText(ctx, text, y, maxWidth, lineHeight, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const lines = wrapText(ctx, text, maxWidth);
    for (const line of lines) {
      ctx.fillText(line, CANVAS_SIZE / 2, y);
      y += lineHeight;
    }
    return y;
  }

  /** Draw left-aligned multi-line text. Returns final y. */
  function drawLeftText(ctx, text, x, y, maxWidth, lineHeight, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, text, maxWidth);
    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  /** Draw rounded rectangle path. */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Decorative elements ────────────────────────────────────────────

  function drawCornerAccents(ctx, accent, opacity) {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 3;
    const len = 60;
    const pad = 50;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(pad, pad + len);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + len, pad);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - pad - len, pad);
    ctx.lineTo(CANVAS_SIZE - pad, pad);
    ctx.lineTo(CANVAS_SIZE - pad, pad + len);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(pad, CANVAS_SIZE - pad - len);
    ctx.lineTo(pad, CANVAS_SIZE - pad);
    ctx.lineTo(pad + len, CANVAS_SIZE - pad);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - pad - len, CANVAS_SIZE - pad);
    ctx.lineTo(CANVAS_SIZE - pad, CANVAS_SIZE - pad);
    ctx.lineTo(CANVAS_SIZE - pad, CANVAS_SIZE - pad - len);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  function drawDotPattern(ctx, accent, opacity) {
    ctx.fillStyle = accent;
    ctx.globalAlpha = opacity;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        ctx.arc(820 + i * 18, 820 + j * 18, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawThinLine(ctx, accent, opacity) {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, CANVAS_SIZE - 120);
    ctx.lineTo(CANVAS_SIZE - 100, CANVAS_SIZE - 120);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGlowCircle(ctx, x, y, r, rgb, opacity) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${rgb},${opacity})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ── Slide renderers ────────────────────────────────────────────────

  function fillBackground(ctx, tpl) {
    ctx.fillStyle = tpl.gradient(ctx);
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Subtle radial glow
    drawGlowCircle(ctx, CANVAS_SIZE * 0.3, CANVAS_SIZE * 0.25, 500, tpl.accentRgb, 0.06);
    drawGlowCircle(ctx, CANVAS_SIZE * 0.8, CANVAS_SIZE * 0.75, 400, tpl.accentRgb, 0.04);
  }

  function renderCover(canvas, data, tpl) {
    const ctx = canvas.getContext('2d');
    fillBackground(ctx, tpl);
    drawCornerAccents(ctx, tpl.accent, 0.6);
    drawDotPattern(ctx, tpl.accent, 0.15);

    // Accent bar at top
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.9;
    roundRect(ctx, CANVAS_SIZE / 2 - 40, 160, 80, 5, 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Title
    const titleFont = 'bold 72px "Arial Black", "Helvetica Neue", sans-serif';
    let y = drawCenteredText(ctx, data.titulo.toUpperCase(), 380, 860, 88, titleFont, tpl.title);

    // Subtitle
    y = Math.max(y, 500);
    const subFont = '32px "Helvetica Neue", Arial, sans-serif';
    drawCenteredText(ctx, data.subtitulo, y + 30, 800, 44, subFont, tpl.body);

    // Desliza indicator
    ctx.font = 'bold 26px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'center';
    ctx.fillText('Desliza  \u2192', CANVAS_SIZE / 2, CANVAS_SIZE - 80);

    drawThinLine(ctx, tpl.accent, 0.2);
  }

  function renderContent(canvas, slide, tpl, slideIndex) {
    const ctx = canvas.getContext('2d');
    fillBackground(ctx, tpl);
    drawCornerAccents(ctx, tpl.accent, 0.4);

    // Big watermark number
    ctx.font = 'bold 260px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.05;
    ctx.textAlign = 'right';
    ctx.fillText(String(slide.numero), CANVAS_SIZE - 60, 300);
    ctx.globalAlpha = 1;

    // Slide number pill
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.15;
    roundRect(ctx, 80, 80, 56, 56, 28);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 28px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'center';
    ctx.fillText(String(slide.numero), 108, 118);

    // Title
    const titleFont = 'bold 48px "Arial Black", "Helvetica Neue", sans-serif';
    let y = drawLeftText(ctx, slide.titulo, 80, 220, 900, 58, titleFont, tpl.title);

    // Accent underline
    ctx.fillStyle = tpl.accent;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(80, y + 10, 120, 4);
    ctx.globalAlpha = 1;

    y += 60;

    // Bullet points
    const emojis = ['💡', '🔥', '✅', '⭐', '🚀'];
    const bulletFont = '30px "Helvetica Neue", Arial, sans-serif';
    const bulletPad = 80;
    const bulletMaxW = 860;

    for (let i = 0; i < slide.puntos.length; i++) {
      // Card background for each point
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      roundRect(ctx, 70, y - 10, CANVAS_SIZE - 140, 120, 16);
      ctx.fill();
      ctx.strokeStyle = `rgba(${tpl.accentRgb},0.1)`;
      ctx.lineWidth = 1;
      roundRect(ctx, 70, y - 10, CANVAS_SIZE - 140, 120, 16);
      ctx.stroke();

      // Emoji
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(emojis[i % emojis.length], bulletPad + 10, y + 35);

      // Text
      const textY = drawLeftText(
        ctx,
        slide.puntos[i],
        bulletPad + 56,
        y + 35,
        bulletMaxW - 56,
        38,
        bulletFont,
        tpl.body
      );
      y = Math.max(textY, y + 120) + 24;
    }

    drawDotPattern(ctx, tpl.accent, 0.1);
  }

  function renderCTA(canvas, data, tpl) {
    const ctx = canvas.getContext('2d');
    fillBackground(ctx, tpl);
    drawCornerAccents(ctx, tpl.accent, 0.6);

    // Big decorative glow
    drawGlowCircle(ctx, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 450, tpl.accentRgb, 0.08);

    // Title
    const titleFont = 'bold 52px "Arial Black", "Helvetica Neue", sans-serif';
    let y = drawCenteredText(ctx, data.titulo, 380, 860, 66, titleFont, tpl.title);

    y = Math.max(y, 480);

    // Subtitle
    const subFont = '30px "Helvetica Neue", Arial, sans-serif';
    y = drawCenteredText(ctx, data.subtitulo, y + 20, 800, 40, subFont, tpl.body);

    y = Math.max(y, 600);

    // CTA button
    const btnW = 440;
    const btnH = 70;
    const btnX = (CANVAS_SIZE - btnW) / 2;
    const btnY = y + 40;

    ctx.fillStyle = tpl.accent;
    roundRect(ctx, btnX, btnY, btnW, btnH, 35);
    ctx.fill();

    ctx.font = 'bold 28px "Arial Black", "Helvetica Neue", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('SEGUIR \u2192', CANVAS_SIZE / 2, btnY + 46);

    // Question prompt above
    ctx.font = '36px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = tpl.accent;
    ctx.textAlign = 'center';
    ctx.fillText('¿Quieres saber más?', CANVAS_SIZE / 2, 260);

    drawDotPattern(ctx, tpl.accent, 0.12);
    drawThinLine(ctx, tpl.accent, 0.2);

    // Branding
    ctx.font = '18px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = tpl.body;
    ctx.globalAlpha = 0.35;
    ctx.textAlign = 'center';
    ctx.fillText('SKYTEAM', CANVAS_SIZE / 2, CANVAS_SIZE - 50);
    ctx.globalAlpha = 1;
  }

  // ── Slide generation pipeline ──────────────────────────────────────

  function createSlideCanvases(content) {
    const tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const canvases = [];

    // Cover
    const coverCanvas = document.createElement('canvas');
    coverCanvas.width = CANVAS_SIZE;
    coverCanvas.height = CANVAS_SIZE;
    renderCover(coverCanvas, content.cover, tpl);
    canvases.push({ canvas: coverCanvas, label: 'Portada' });

    // Content slides
    for (const slide of content.slides) {
      const c = document.createElement('canvas');
      c.width = CANVAS_SIZE;
      c.height = CANVAS_SIZE;
      renderContent(c, slide, tpl, slide.numero);
      canvases.push({ canvas: c, label: `Slide ${slide.numero}` });
    }

    // CTA
    const ctaCanvas = document.createElement('canvas');
    ctaCanvas.width = CANVAS_SIZE;
    ctaCanvas.height = CANVAS_SIZE;
    renderCTA(ctaCanvas, content.cta, tpl);
    canvases.push({ canvas: ctaCanvas, label: 'CTA' });

    return canvases;
  }

  // ── API call ───────────────────────────────────────────────────────

  async function fetchCarouselContent(topic) {
    var usr = (typeof CU !== 'undefined' && CU) ? (CU.ref || CU.user || 'socio') : 'socio';
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'carousel',
        user: usr,
        systemPrompt: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: topic },
        ],
      }),
    });
    if (!res.ok) throw new Error('Error al generar contenido (' + res.status + ')');

    const data = await res.json();
    let raw = data.reply || data.content || (typeof data === 'string' ? data : JSON.stringify(data));

    // Strip markdown code fences if present
    if (typeof raw === 'string') {
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    }

    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  // ── Download helpers ───────────────────────────────────────────────

  function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadAll(slides, topic) {
    const safeName = topic.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_').substring(0, 30);
    slides.forEach((s, i) => {
      setTimeout(() => downloadCanvas(s.canvas, `${safeName}_slide_${i + 1}.png`), i * 300);
    });
  }

  // ── Modal UI ───────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('carousel-gen-styles')) return;
    const style = document.createElement('style');
    style.id = 'carousel-gen-styles';
    style.textContent = `
      .cg-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .3s ease;
      }
      .cg-overlay.cg-visible { opacity: 1; }
      .cg-modal {
        background: ${THEME.bg}; color: ${THEME.text};
        border: 1px solid ${THEME.border}; border-radius: 20px;
        width: 94vw; max-width: 1100px; max-height: 92vh;
        overflow-y: auto; padding: 36px; position: relative;
        box-shadow: 0 30px 80px rgba(0,0,0,0.6);
      }
      .cg-close {
        position: absolute; top: 16px; right: 20px;
        background: none; border: none; color: ${THEME.text};
        font-size: 28px; cursor: pointer; opacity: 0.6; transition: opacity .2s;
      }
      .cg-close:hover { opacity: 1; }
      .cg-title {
        font-size: 28px; font-weight: 800; margin: 0 0 6px;
        background: linear-gradient(135deg, ${THEME.accent}, #a78bfa);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .cg-subtitle { font-size: 14px; opacity: 0.5; margin-bottom: 28px; }
      .cg-section-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.45; margin-bottom: 10px; }
      .cg-topics {
        display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;
      }
      .cg-topic-btn {
        padding: 10px 18px; border-radius: 24px; border: 1px solid ${THEME.border};
        background: ${THEME.card}; color: ${THEME.text}; cursor: pointer;
        font-size: 14px; transition: all .2s;
      }
      .cg-topic-btn:hover, .cg-topic-btn.cg-active {
        border-color: ${THEME.accent}; background: rgba(28,232,255,0.08); color: ${THEME.accent};
      }
      .cg-input-row { display: flex; gap: 12px; margin-bottom: 28px; }
      .cg-input {
        flex: 1; padding: 14px 18px; border-radius: 14px;
        border: 1px solid ${THEME.border}; background: ${THEME.card};
        color: ${THEME.text}; font-size: 15px; outline: none;
        transition: border-color .2s;
      }
      .cg-input:focus { border-color: ${THEME.accent}; }
      .cg-btn {
        padding: 14px 28px; border-radius: 14px; border: none;
        background: ${THEME.accent}; color: #000; font-weight: 700;
        font-size: 15px; cursor: pointer; white-space: nowrap;
        transition: transform .15s, box-shadow .2s;
      }
      .cg-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(28,232,255,0.3); }
      .cg-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
      .cg-btn-outline {
        padding: 10px 20px; border-radius: 12px;
        border: 1px solid ${THEME.accent}; background: transparent;
        color: ${THEME.accent}; font-weight: 600; font-size: 13px;
        cursor: pointer; transition: background .2s;
      }
      .cg-btn-outline:hover { background: rgba(28,232,255,0.08); }
      .cg-loading {
        text-align: center; padding: 60px 20px; display: none;
      }
      .cg-spinner {
        width: 48px; height: 48px; border: 4px solid ${THEME.border};
        border-top-color: ${THEME.accent}; border-radius: 50%;
        animation: cg-spin 0.8s linear infinite; margin: 0 auto 16px;
      }
      @keyframes cg-spin { to { transform: rotate(360deg); } }
      .cg-preview-area { display: none; }
      .cg-preview-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 16px;
      }
      .cg-preview-scroll {
        display: flex; gap: 16px; overflow-x: auto; padding-bottom: 12px;
        scroll-snap-type: x mandatory;
      }
      .cg-preview-scroll::-webkit-scrollbar { height: 6px; }
      .cg-preview-scroll::-webkit-scrollbar-thumb { background: ${THEME.accent}33; border-radius: 3px; }
      .cg-slide-card {
        flex: 0 0 auto; width: 260px; scroll-snap-align: start;
        border: 1px solid ${THEME.border}; border-radius: 14px;
        overflow: hidden; background: ${THEME.card};
      }
      .cg-slide-card img {
        width: 100%; display: block; border-bottom: 1px solid ${THEME.border};
      }
      .cg-slide-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
      }
      .cg-slide-label { font-size: 12px; font-weight: 600; opacity: 0.6; }
      .cg-error { color: #ff5c5c; text-align: center; padding: 20px; display: none; }
    `;
    document.head.appendChild(style);
  }

  function buildModal() {
    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'cg-overlay';
    overlay.id = 'cg-overlay';

    overlay.innerHTML = `
      <div class="cg-modal">
        <button class="cg-close" id="cg-close">&times;</button>
        <h2 class="cg-title">Generador de Carrusel</h2>
        <p class="cg-subtitle">Crea carruseles educativos para Instagram con IA</p>

        <div id="cg-form-area">
          <p class="cg-section-label">Temas populares</p>
          <div class="cg-topics" id="cg-topics"></div>

          <p class="cg-section-label">O escribe tu tema</p>
          <div class="cg-input-row">
            <input class="cg-input" id="cg-topic-input" placeholder="Ej: Cómo ahorrar tu primer millón" />
            <button class="cg-btn" id="cg-generate-btn">Generar Carrusel</button>
          </div>
        </div>

        <div class="cg-loading" id="cg-loading">
          <div class="cg-spinner"></div>
          <p>Generando tu carrusel...</p>
          <p style="font-size:13px;opacity:0.4">Esto puede tomar unos segundos</p>
        </div>

        <div class="cg-error" id="cg-error"></div>

        <div class="cg-preview-area" id="cg-preview-area">
          <div class="cg-preview-header">
            <p class="cg-section-label" style="margin:0">Vista previa</p>
            <button class="cg-btn" id="cg-download-all" style="padding:10px 22px;font-size:13px">Descargar Todo</button>
          </div>
          <div class="cg-preview-scroll" id="cg-preview-scroll"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('cg-visible'));

    // Wire up topics
    const topicsEl = overlay.querySelector('#cg-topics');
    const input = overlay.querySelector('#cg-topic-input');

    PRESET_TOPICS.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'cg-topic-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.cg-topic-btn').forEach((b) => b.classList.remove('cg-active'));
        btn.classList.add('cg-active');
        input.value = t;
      });
      topicsEl.appendChild(btn);
    });

    // Close
    const close = () => {
      overlay.classList.remove('cg-visible');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('#cg-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Generate
    const genBtn = overlay.querySelector('#cg-generate-btn');
    const loadingEl = overlay.querySelector('#cg-loading');
    const errorEl = overlay.querySelector('#cg-error');
    const previewArea = overlay.querySelector('#cg-preview-area');
    const previewScroll = overlay.querySelector('#cg-preview-scroll');
    const downloadAllBtn = overlay.querySelector('#cg-download-all');

    let currentSlides = [];

    genBtn.addEventListener('click', async () => {
      const topic = input.value.trim();
      if (!topic) {
        input.focus();
        input.style.borderColor = '#ff5c5c';
        setTimeout(() => (input.style.borderColor = ''), 1500);
        return;
      }

      genBtn.disabled = true;
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
      previewArea.style.display = 'none';
      previewScroll.innerHTML = '';

      try {
        const content = await fetchCarouselContent(topic);
        currentSlides = createSlideCanvases(content);

        // Render preview
        currentSlides.forEach((s, i) => {
          const card = document.createElement('div');
          card.className = 'cg-slide-card';

          const img = document.createElement('img');
          img.src = s.canvas.toDataURL('image/png');
          img.alt = s.label;
          card.appendChild(img);

          const footer = document.createElement('div');
          footer.className = 'cg-slide-footer';

          const label = document.createElement('span');
          label.className = 'cg-slide-label';
          label.textContent = s.label;

          const dlBtn = document.createElement('button');
          dlBtn.className = 'cg-btn-outline';
          dlBtn.textContent = 'Descargar';
          dlBtn.addEventListener('click', () => {
            const safeName = topic.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_').substring(0, 30);
            downloadCanvas(s.canvas, `${safeName}_slide_${i + 1}.png`);
          });

          footer.appendChild(label);
          footer.appendChild(dlBtn);
          card.appendChild(footer);
          previewScroll.appendChild(card);
        });

        previewArea.style.display = 'block';
      } catch (err) {
        console.error('Carousel generation error:', err);
        errorEl.textContent = 'Error: ' + (err.message || 'No se pudo generar el carrusel. Intenta de nuevo.');
        errorEl.style.display = 'block';
      } finally {
        loadingEl.style.display = 'none';
        genBtn.disabled = false;
      }
    });

    downloadAllBtn.addEventListener('click', () => {
      if (currentSlides.length) downloadAll(currentSlides, input.value.trim() || 'carrusel');
    });
  }

  // ── Public API ─────────────────────────────────────────────────────

  /** Opens the carousel generator modal. */
  window.openCarouselGenerator = function () {
    // Remove any existing instance
    const existing = document.getElementById('cg-overlay');
    if (existing) existing.remove();
    buildModal();
  };

  /**
   * Programmatically generates a carousel for a topic and returns the slide canvases.
   * @param {string} topic
   * @returns {Promise<Array<{canvas: HTMLCanvasElement, label: string}>>}
   */
  window.generateCarousel = async function (topic) {
    const content = await fetchCarouselContent(topic);
    return createSlideCanvases(content);
  };
})();
