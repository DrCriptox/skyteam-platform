// ===================================================================
// COACH IA — Floating AI Assistant for SkyTeam Platform
// Step-by-step task guidance, section-specific tools, chat & voice
// Nebula Premium Design — Glassmorphism + Gold Accents
// ===================================================================

(function() {
'use strict';

// ── State ──────────────────────────────────────────────────────
var coachState = {
  open: false,
  section: 'home',
  tasks: [],
  taskIndex: 0,
  tools: null,
  chatHistory: [],
  recording: false,
  lastAnalysis: null,
  lastAnalysisTime: 0,
  recognition: null,
  chatLoading: false
};

// ── Globals shorthand ──────────────────────────────────────────
var CU = typeof window.CU !== 'undefined' ? window.CU : null;
var SB  = typeof window.SB !== 'undefined' ? window.SB : null;

// ═══════════════════════════════════════════════════════════════
//  CSS INJECTION
// ═══════════════════════════════════════════════════════════════

function injectCoachCSS() {
  if (document.getElementById('coach-ia-css')) return;
  var css = document.createElement('style');
  css.id = 'coach-ia-css';
  css.textContent = [

    /* ── Floating Action Button ── */
    '.coach-fab{position:fixed;bottom:24px;right:24px;z-index:9990;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#E8D48B,#C9A84C);background-size:200% auto;animation:goldShimmer 4s linear infinite;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;font-size:24px;box-shadow:0 4px 20px rgba(201,168,76,0.4),0 0 40px rgba(201,168,76,0.15);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}',
    '.coach-fab:hover{transform:scale(1.1);}',
    '.coach-fab:active{transform:scale(0.95);}',

    /* ── Notification dot on FAB ── */
    '.coach-fab-dot{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#E24B4A;border:2px solid #050508;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;display:none;}',
    '.coach-fab-dot.visible{display:flex;}',

    /* ── Overlay ── */
    '.coach-overlay{position:fixed;inset:0;z-index:9991;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:coachFadeIn 0.2s ease;}',
    '@keyframes coachFadeIn{from{opacity:0}to{opacity:1}}',

    /* ── Panel (bottom sheet mobile, centered desktop) ── */
    '.coach-panel{background:rgba(10,10,18,0.97);border:1px solid rgba(255,255,255,0.06);border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:90vh;height:90vh;display:flex;flex-direction:column;backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);animation:coachSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;font-family:"Outfit","Nunito",sans-serif;}',
    '@keyframes coachSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '@media(min-width:900px){.coach-panel{border-radius:20px;max-height:80vh;height:80vh;margin-bottom:20px;}}',

    /* ── Header ── */
    '.coach-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;}',
    '.coach-header-left{display:flex;align-items:center;gap:10px;}',
    '.coach-header-title{font-size:17px;font-weight:800;color:#F0EDE6;display:flex;align-items:center;gap:8px;}',
    '.coach-header-close{width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}',
    '.coach-header-close:hover{background:rgba(255,255,255,0.10);color:#fff;}',

    /* ── Body (scrollable) ── */
    '.coach-body{flex:1;overflow-y:auto;padding:16px 20px;overscroll-behavior:contain;}',
    '.coach-body::-webkit-scrollbar{width:4px;}',
    '.coach-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}',

    /* ── Section badge ── */
    '.coach-section-badge{font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(201,168,76,0.10);border:1px solid rgba(201,168,76,0.20);color:#C9A84C;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;}',

    /* ── Task Card ── */
    '.coach-task{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden;}',
    '.coach-task::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);}',
    '.coach-task-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}',
    '.coach-task-counter{font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;text-transform:uppercase;letter-spacing:1px;}',
    '.coach-task-content{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;}',
    '.coach-task-icon{font-size:28px;flex-shrink:0;}',
    '.coach-task-title{font-size:15px;font-weight:700;color:#fff;}',
    '.coach-task-desc{font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px;line-height:1.4;}',
    '.coach-task-actions{display:flex;gap:8px;}',

    /* ── Task Buttons ── */
    '.coach-task-btn{padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:"Outfit","Nunito",sans-serif;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);}',
    '.coach-task-btn:active{transform:scale(0.95);}',
    '.coach-task-btn-primary{background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;}',
    '.coach-task-btn-primary:hover{box-shadow:0 4px 16px rgba(201,168,76,0.3);transform:translateY(-1px);}',
    '.coach-task-btn-secondary{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.6);}',
    '.coach-task-btn-secondary:hover{background:rgba(255,255,255,0.10);color:#fff;}',

    /* ── Progress Dots ── */
    '.coach-progress{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:12px;}',
    '.coach-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.1);transition:all 0.3s;}',
    '.coach-dot-active{background:#C9A84C;box-shadow:0 0 8px rgba(201,168,76,0.4);}',
    '.coach-dot-done{background:#1D9E75;}',

    /* ── Tools Grid ── */
    '.coach-tools-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;}',
    '.coach-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}',
    '.coach-tool{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);}',
    '.coach-tool:hover{border-color:rgba(201,168,76,0.25);transform:translateY(-2px);background:rgba(201,168,76,0.04);}',
    '.coach-tool:active{transform:scale(0.95);}',
    '.coach-tool-icon{font-size:24px;margin-bottom:4px;}',
    '.coach-tool-name{font-size:9px;color:rgba(255,255,255,0.5);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}',

    /* ── Tool Sub-view ── */
    '.coach-toolview{animation:coachFadeIn 0.2s ease;}',
    '.coach-toolview-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;}',
    '.coach-toolview-back{width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}',
    '.coach-toolview-back:hover{background:rgba(255,255,255,0.10);color:#fff;}',
    '.coach-toolview-title{font-size:16px;font-weight:700;color:#F0EDE6;}',
    '.coach-toolview-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:12px;}',

    /* ── Rank Progress Bar ── */
    '.coach-rank-bar-bg{width:100%;height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;margin:8px 0;}',
    '.coach-rank-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#C9A84C,#E8D48B);transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1);}',

    /* ── Stat Row ── */
    '.coach-stat-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);}',
    '.coach-stat-row:last-child{border-bottom:none;}',
    '.coach-stat-label{font-size:13px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:6px;}',
    '.coach-stat-value{font-size:14px;font-weight:700;color:#F0EDE6;}',

    /* ── Chat Area ── */
    '.coach-chat{margin-top:16px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;}',
    '.coach-chat-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;}',
    '.coach-chat-messages{max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}',
    '.coach-chat-msg{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;max-width:85%;word-wrap:break-word;}',
    '.coach-chat-msg-user{background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.20);color:#F0EDE6;align-self:flex-end;border-bottom-right-radius:4px;}',
    '.coach-chat-msg-ai{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);align-self:flex-start;border-bottom-left-radius:4px;}',
    '.coach-chat-typing{font-size:12px;color:rgba(255,255,255,0.3);padding:6px 0;font-style:italic;}',

    /* ── Input Bar ── */
    '.coach-input-bar{display:flex;gap:8px;padding:12px 20px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;background:rgba(10,10,18,0.95);}',
    '.coach-input{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#F0EDE6;font-size:14px;padding:10px 14px;outline:none;font-family:"Outfit","Nunito",sans-serif;}',
    '.coach-input::placeholder{color:rgba(255,255,255,0.25);}',
    '.coach-input:focus{border-color:rgba(201,168,76,0.30);}',
    '.coach-send-btn{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#C9A84C,#E8D48B);border:none;color:#0a0a12;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);font-weight:700;}',
    '.coach-send-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(201,168,76,0.3);}',
    '.coach-send-btn:active{transform:scale(0.95);}',
    '.coach-mic-btn{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.5);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}',
    '.coach-mic-btn:hover{background:rgba(255,255,255,0.10);color:#fff;}',
    '.coach-mic-btn.recording{background:rgba(220,38,38,0.2);border-color:rgba(220,38,38,0.4);color:#DC2626;animation:coachPulse 1.5s infinite;}',
    '@keyframes coachPulse{0%,100%{opacity:1}50%{opacity:0.5}}',

    /* ── Placeholder ── */
    '.coach-placeholder{text-align:center;padding:40px 20px;color:rgba(255,255,255,0.3);}',
    '.coach-placeholder-icon{font-size:48px;margin-bottom:12px;}',
    '.coach-placeholder-title{font-size:16px;font-weight:700;color:rgba(255,255,255,0.5);margin-bottom:4px;}',
    '.coach-placeholder-text{font-size:12px;line-height:1.5;}',

    /* ── All-clear state ── */
    '.coach-allclear{text-align:center;padding:30px;color:rgba(255,255,255,0.3);}',
    '.coach-allclear-icon{font-size:48px;margin-bottom:12px;}',
    '.coach-allclear-title{font-size:15px;font-weight:700;color:#1D9E75;}',
    '.coach-allclear-sub{font-size:12px;margin-top:6px;}',

    /* ── goldShimmer (shared keyframes, may already exist) ── */
    '@keyframes goldShimmer{0%{background-position:200% center}100%{background-position:-200% center}}'

  ].join('\n');
  document.head.appendChild(css);
}


// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function _safe(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSectionName(sec) {
  var names = {
    home: 'Inicio',
    prospectos: 'Sky Prospects',
    skysales: 'Sky Sales',
    agenda: 'Sky Day',
    'sky-tv': 'Sky TV',
    skyteam: 'Sky Team',
    comunidad: 'Comunidad',
    ranking: 'Ranking'
  };
  return names[sec] || sec;
}

function getSectionEmoji(sec) {
  var emojis = {
    home: '\uD83C\uDFE0', prospectos: '\uD83D\uDCCB', skysales: '\uD83D\uDCB0',
    agenda: '\uD83D\uDCC5', 'sky-tv': '\uD83D\uDCFA', skyteam: '\uD83D\uDC65',
    comunidad: '\uD83C\uDF10', ranking: '\uD83C\uDFC6'
  };
  return emojis[sec] || '\uD83D\uDE80';
}


// ═══════════════════════════════════════════════════════════════
//  SECTION DETECTION
// ═══════════════════════════════════════════════════════════════

function detectCurrentSection() {
  var active = document.querySelector('.section.active');
  if (!active) {
    coachState.section = 'home';
    return 'home';
  }
  var id = active.id.replace('section-', '');
  coachState.section = id;
  return id;
}


// ═══════════════════════════════════════════════════════════════
//  TASK GENERATION
// ═══════════════════════════════════════════════════════════════

function generateTasks() {
  var tasks = [];
  var sec = coachState.section;
  var prospects = window.crmProspectos || [];
  var bookings = window.agendaBookings || [];
  var now = Date.now();

  // ── Global: Hot prospects needing follow-up ──
  if (prospects && prospects.length > 0) {
    prospects.forEach(function(p) {
      if (!p) return;
      var temp = p.temperatura || 0;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;

      if (temp >= 70) {
        var lastUpdate = p.updated_at
          ? Math.ceil((now - new Date(p.updated_at).getTime()) / 86400000)
          : 999;
        if (lastUpdate >= 3) {
          tasks.push({
            priority: 1,
            type: 'prospect_followup',
            icon: '\uD83D\uDCDE',
            title: 'Contacta a ' + (p.nombre || 'Prospecto'),
            desc: 'Temperatura ' + temp + '% \u2014 lleva ' + lastUpdate + ' d\u00edas sin contacto',
            action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
            secondaryAction: { type: 'navigate', target: 'prospectos' }
          });
        }
      }
    });
  }

  // ── Global: Upcoming meetings within 24 hours ──
  if (bookings && bookings.length > 0) {
    bookings.forEach(function(b) {
      if (!b || !b.fecha_iso) return;
      var dt = new Date(b.fecha_iso);
      var hoursUntil = (dt.getTime() - now) / 3600000;
      if (hoursUntil > 0 && hoursUntil <= 24) {
        tasks.push({
          priority: 0,
          type: 'upcoming_meeting',
          icon: '\uD83D\uDCC5',
          title: 'Cierre con ' + (b.nombre || 'Prospecto'),
          desc: 'Hoy a las ' + dt.getHours() + ':' + String(dt.getMinutes()).padStart(2, '0') + ' \u2014 prepara tu script',
          action: { type: 'tool', tool: 'script', context: b }
        });
      }
    });
  }

  // ── Section: Sky Prospects ──
  if (sec === 'prospectos' && prospects.length > 0) {
    // Prospects without notes
    prospects.forEach(function(p) {
      if (!p) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      if (!p.notas || String(p.notas).trim() === '') {
        tasks.push({
          priority: 2,
          type: 'add_notes',
          icon: '\uD83D\uDCDD',
          title: 'Agrega notas a ' + (p.nombre || 'Prospecto'),
          desc: 'Esta tarjeta no tiene comentarios \u2014 documenta tu seguimiento',
          action: { type: 'navigate', target: 'prospectos' }
        });
      }
    });

    // Prospects without ratings
    prospects.forEach(function(p) {
      if (!p) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      var hasRating = p.calif_positivo || p.calif_emprendedor || p.calif_dinero || p.calif_lider;
      if (!hasRating) {
        tasks.push({
          priority: 3,
          type: 'rate_prospect',
          icon: '\u2B50',
          title: 'Califica a ' + (p.nombre || 'Prospecto'),
          desc: 'Sin calificaci\u00f3n \u2014 eval\u00faa su potencial',
          action: { type: 'navigate', target: 'prospectos' }
        });
      }
    });

    // Cold prospects (low temperature, no recent activity)
    prospects.forEach(function(p) {
      if (!p) return;
      var etapa = p.etapa || '';
      if (etapa === 'cerrado_ganado' || etapa === 'cerrado_perdido') return;
      var temp = p.temperatura || 0;
      if (temp > 0 && temp < 30) {
        var daysSince = p.updated_at
          ? Math.ceil((now - new Date(p.updated_at).getTime()) / 86400000)
          : 999;
        if (daysSince >= 7) {
          tasks.push({
            priority: 4,
            type: 'revive_cold',
            icon: '\u2744\uFE0F',
            title: 'Reactivar a ' + (p.nombre || 'Prospecto'),
            desc: 'Temperatura baja (' + temp + '%) y ' + daysSince + ' d\u00edas inactivo',
            action: { type: 'whatsapp', phone: p.telefono, name: p.nombre }
          });
        }
      }
    });

    // Prospects without follow-up reminder
    crmProspectos.forEach(function(p) {
      if (p.etapa === 'cerrado_ganado' || p.etapa === 'cerrado_perdido') return;
      var lastUpdate = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 999;
      if (lastUpdate >= 5 && (p.temperatura || 0) < 70) {
        tasks.push({
          priority: 2, type: 'cold_prospect',
          icon: '\u2744\uFE0F', title: _safe(p.nombre || 'Prospecto') + ' se est\u00e1 enfriando',
          desc: 'Lleva ' + lastUpdate + ' d\u00edas sin actividad. Temperatura: ' + (p.temperatura||0) + '%',
          action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
          prospectId: p.id
        });
      }
    });

    // Suggest new prospect sources (if less than 5 active prospects)
    var activeProspects = crmProspectos.filter(function(p) { return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; });
    if (activeProspects.length < 5) {
      tasks.push({
        priority: 3, type: 'need_prospects',
        icon: '\uD83C\uDFAF', title: 'Necesitas m\u00e1s prospectos',
        desc: 'Solo tienes ' + activeProspects.length + ' prospectos activos. Toca para ver ideas.',
        action: { type: 'tool', tool: 'prospect_ideas' }
      });
    }

    // Prospects in "nuevo" stage for more than 3 days (not contacted)
    crmProspectos.forEach(function(p) {
      if (p.etapa !== 'nuevo') return;
      var daysSinceAdd = p.created_at ? Math.ceil((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
      if (daysSinceAdd >= 3) {
        tasks.push({
          priority: 1, type: 'contact_new',
          icon: '\uD83D\uDCDE', title: 'Contacta a ' + _safe(p.nombre || 'Prospecto'),
          desc: 'Lleva ' + daysSinceAdd + ' d\u00edas como Nuevo sin contactar. \u00a1No lo dejes enfriar!',
          action: { type: 'whatsapp', phone: p.telefono, name: p.nombre },
          prospectId: p.id
        });
      }
    });
  }

  // ── Section: Agenda — empty day ──
  if (sec === 'agenda') {
    var todayBookings = (bookings || []).filter(function(b) {
      if (!b || !b.fecha_iso) return false;
      var d = new Date(b.fecha_iso);
      var today = new Date();
      return d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    });
    if (todayBookings.length === 0) {
      tasks.push({
        priority: 2,
        type: 'schedule_meetings',
        icon: '\uD83D\uDCC6',
        title: 'Agenda una cita hoy',
        desc: 'No tienes citas programadas \u2014 agenda seguimiento con tus prospectos calientes',
        action: { type: 'navigate', target: 'agenda' }
      });
    }
  }

  // ── Section: Sky Sales ──
  if (sec === 'skysales') {
    tasks.push({
      priority: 5,
      type: 'review_sales',
      icon: '\uD83D\uDCC8',
      title: 'Revisa tu embudo de ventas',
      desc: 'Verifica tus avances del d\u00eda y actualiza tu pipeline',
      action: { type: 'navigate', target: 'skysales' }
    });
  }

  // Sort by priority (lower number = more urgent)
  tasks.sort(function(a, b) { return a.priority - b.priority; });

  // Cap at 20 tasks max for performance
  if (tasks.length > 20) tasks = tasks.slice(0, 20);

  coachState.tasks = tasks;
  coachState.taskIndex = 0;
}


// ═══════════════════════════════════════════════════════════════
//  FAB (Floating Action Button)
// ═══════════════════════════════════════════════════════════════

function updateFabDot() {
  var dot = document.getElementById('coach-fab-dot');
  if (!dot) return;
  var urgentCount = coachState.tasks.filter(function(t) {
    return t.priority <= 1;
  }).length;
  if (urgentCount > 0) {
    dot.textContent = urgentCount > 9 ? '9+' : String(urgentCount);
    dot.classList.add('visible');
  } else {
    dot.classList.remove('visible');
  }
}


// ═══════════════════════════════════════════════════════════════
//  OPEN / CLOSE
// ═══════════════════════════════════════════════════════════════

function openCoach() {
  coachState.open = true;
  coachState.tools = null;
  detectCurrentSection();
  generateTasks();

  // Hide fab
  var fab = document.getElementById('coach-fab');
  if (fab) fab.style.display = 'none';

  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'coach-overlay';
  overlay.id = 'coach-overlay';
  overlay.onclick = function(e) {
    if (e.target === overlay) closeCoach();
  };

  // Create panel
  var panel = document.createElement('div');
  panel.className = 'coach-panel';
  panel.id = 'coach-panel';
  panel.onclick = function(e) { e.stopPropagation(); };

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  renderCoachPanel();
}

function closeCoach() {
  var overlay = document.getElementById('coach-overlay');
  if (overlay) {
    overlay.style.animation = 'none';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }
  coachState.open = false;
  coachState.tools = null;

  // Show fab
  var fab = document.getElementById('coach-fab');
  if (fab) fab.style.display = 'flex';
}


// ═══════════════════════════════════════════════════════════════
//  RENDER PANEL
// ═══════════════════════════════════════════════════════════════

function renderCoachPanel() {
  var panel = document.getElementById('coach-panel');
  if (!panel) return;

  // ── Header ──
  var headerHTML = '<div class="coach-header">'
    + '<div class="coach-header-left">'
    + '<div class="coach-header-title">\uD83E\uDD16 Coach IA</div>'
    + '<span class="coach-section-badge">' + getSectionEmoji(coachState.section) + ' ' + _safe(getSectionName(coachState.section)) + '</span>'
    + '</div>'
    + '<button class="coach-header-close" onclick="closeCoach()" title="Cerrar">\u2715</button>'
    + '</div>';

  // ── Body ──
  var bodyHTML = '';

  if (coachState.tools) {
    // Show tool sub-view
    bodyHTML = renderToolView(coachState.tools);
  } else {
    // Current task card
    bodyHTML += renderCurrentTask();
    // Tools grid
    bodyHTML += renderTools();
    // Chat area
    bodyHTML += renderChat();
  }

  // ── Input bar ──
  var inputHTML = '<div class="coach-input-bar">'
    + '<input class="coach-input" id="coach-input" type="text" placeholder="Escribe al Coach IA..." autocomplete="off" />'
    + '<button class="coach-mic-btn' + (coachState.recording ? ' recording' : '') + '" id="coach-mic-btn" onclick="toggleCoachVoice()" title="Voz">\uD83C\uDFA4</button>'
    + '<button class="coach-send-btn" onclick="sendCoachMsgFromInput()" title="Enviar">\u27A4</button>'
    + '</div>';

  panel.innerHTML = headerHTML
    + '<div class="coach-body" id="coach-body">' + bodyHTML + '</div>'
    + inputHTML;

  // Enter key listener on input
  var inputEl = document.getElementById('coach-input');
  if (inputEl) {
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCoachMsgFromInput();
      }
    });
    // Focus after render if no tool is active
    if (!coachState.tools) {
      setTimeout(function() { inputEl.focus(); }, 100);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
//  RENDER: CURRENT TASK
// ═══════════════════════════════════════════════════════════════

function renderCurrentTask() {
  if (coachState.tasks.length === 0) {
    return '<div class="coach-allclear">'
      + '<div class="coach-allclear-icon">\uD83C\uDF89</div>'
      + '<div class="coach-allclear-title">\u00A1Todo al d\u00eda!</div>'
      + '<div class="coach-allclear-sub">No tienes acciones pendientes ahora.</div>'
      + '</div>';
  }

  var t = coachState.tasks[coachState.taskIndex];
  if (!t) {
    coachState.taskIndex = 0;
    t = coachState.tasks[0];
  }
  var total = coachState.tasks.length;
  var current = coachState.taskIndex + 1;

  var html = '<div class="coach-task">';

  // Meta row
  html += '<div class="coach-task-meta">';
  html += '<span class="coach-task-counter">Acci\u00f3n ' + current + ' de ' + total + '</span>';
  html += '<span class="coach-section-badge">' + _safe(getSectionName(coachState.section)) + '</span>';
  html += '</div>';

  // Content row
  html += '<div class="coach-task-content">';
  html += '<div class="coach-task-icon">' + t.icon + '</div>';
  html += '<div>';
  html += '<div class="coach-task-title">' + _safe(t.title) + '</div>';
  html += '<div class="coach-task-desc">' + _safe(t.desc) + '</div>';
  html += '</div>';
  html += '</div>';

  // Action buttons
  html += '<div class="coach-task-actions">';

  // WhatsApp button
  if (t.action && t.action.type === 'whatsapp' && t.action.phone) {
    var waNum = String(t.action.phone).replace(/[^0-9]/g, '');
    html += '<button class="coach-task-btn coach-task-btn-primary" onclick="window.open(\'https://wa.me/' + _safe(waNum) + '\',\'_blank\')">\uD83D\uDCF1 WhatsApp</button>';
  }

  // Tool action
  if (t.action && t.action.type === 'tool') {
    html += '<button class="coach-task-btn coach-task-btn-primary" onclick="openCoachTool(\'' + _safe(t.action.tool) + '\')">\uD83D\uDCA1 Abrir</button>';
  }

  // Done + Skip
  html += '<button class="coach-task-btn coach-task-btn-primary" onclick="coachCompleteTask()" style="flex:1;">\u2705 Hecho</button>';
  html += '<button class="coach-task-btn coach-task-btn-secondary" onclick="coachSkipTask()">\u23ED\uFE0F</button>';
  html += '</div>';

  // Progress dots
  html += '<div class="coach-progress">';
  var maxDots = Math.min(total, 12);
  for (var i = 0; i < maxDots; i++) {
    var cls = 'coach-dot';
    if (i < coachState.taskIndex) cls += ' coach-dot-done';
    else if (i === coachState.taskIndex) cls += ' coach-dot-active';
    html += '<div class="' + cls + '"></div>';
  }
  if (total > 12) {
    html += '<span style="font-size:9px;color:rgba(255,255,255,0.3);margin-left:4px;">+' + (total - 12) + '</span>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  RENDER: TOOLS GRID
// ═══════════════════════════════════════════════════════════════

function renderTools() {
  var sec = coachState.section;
  var tools;

  if (sec === 'prospectos') {
    tools = [
      { id: 'crm_analyze', icon: '🔍', name: 'Analizar' },
      { id: 'crm_voice_note', icon: '🎤', name: 'Voz→Nota' },
      { id: 'crm_message', icon: '💬', name: 'Mensaje IA' },
      { id: 'prospect_ideas', icon: '💡', name: 'Ideas' },
      { id: 'crm_reminder', icon: '⏰', name: 'Recordar' },
      { id: 'crm_rating', icon: '⭐', name: 'Calificar' },
      { id: 'crm_agendar', icon: '📅', name: 'Agendar' },
      { id: 'crm_pipeline', icon: '📊', name: 'Pipeline' },
      { id: 'crm_mover', icon: '🔄', name: 'Mover Etapa' },
      { id: 'crm_checklist', icon: '📋', name: 'Checklist' },
      { id: 'crm_prediccion', icon: '🎯', name: 'Predicción' },
      { id: 'crm_autoseg', icon: '🔔', name: 'Auto-Seguim.' }
    ];
  } else {
    tools = [
      { id: 'simulador', icon: '\uD83C\uDFAF', name: 'Simulador' },
      { id: 'script',    icon: '\uD83D\uDCAC', name: 'Script IA' },
      { id: 'roleplay',  icon: '\uD83C\uDFAD', name: 'Roleplay' },
      { id: 'plan',      icon: '\uD83D\uDCCB', name: 'Plan Semanal' },
      { id: 'desafios',  icon: '\uD83C\uDFC6', name: 'Desaf\u00edos' },
      { id: 'voz',       icon: '\uD83C\uDFA4', name: 'Voz' },
      { id: 'seguimiento', icon: '\uD83D\uDCF1', name: 'Seguimiento' },
      { id: 'estado',    icon: '\uD83D\uDCCA', name: 'Mi Estado' }
    ];
  }

  var html = '<div style="margin-top:20px;">';
  html += '<div class="coach-tools-label">Herramientas</div>';
  html += '<div class="coach-tools">';
  tools.forEach(function(t) {
    html += '<div class="coach-tool" onclick="openCoachTool(\'' + t.id + '\')">';
    html += '<div class="coach-tool-icon">' + t.icon + '</div>';
    html += '<div class="coach-tool-name">' + t.name + '</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  RENDER: TOOL SUB-VIEWS
// ═══════════════════════════════════════════════════════════════

function renderToolView(toolId) {
  var toolNames = {
    simulador: '\uD83C\uDFAF Simulador de Rango',
    script: '\uD83D\uDCAC Script IA',
    roleplay: '\uD83C\uDFAD Roleplay',
    plan: '\uD83D\uDCCB Plan Semanal',
    desafios: '\uD83C\uDFC6 Desaf\u00edos',
    voz: '\uD83C\uDFA4 Entrenamiento de Voz',
    seguimiento: '\uD83D\uDCF1 Seguimiento',
    estado: '\uD83D\uDCCA Mi Estado',
    crm_analyze: '\uD83D\uDD0D An\u00e1lisis de CRM',
    crm_voice_note: '\uD83C\uDFA4 Nota por Voz',
    crm_message: '\uD83D\uDCAC Generar Mensaje',
    prospect_ideas: '\uD83D\uDCA1 Ideas Prospectos',
    crm_reminder: '\u23F0 Recordatorio',
    crm_rating: '\u2B50 Calificar Prospecto',
    crm_agendar: '📅 Agendar Cierre',
    crm_pipeline: '📊 Pipeline',
    crm_mover: '🔄 Mover Etapa',
    crm_checklist: '📋 Checklist de Cierre',
    crm_prediccion: '🎯 Predicción',
    crm_autoseg: '🔔 Auto-Seguimiento'
  };

  var html = '<div class="coach-toolview">';

  // Back button + title
  html += '<div class="coach-toolview-header">';
  html += '<button class="coach-toolview-back" onclick="openCoachTool(null)">\u2190</button>';
  html += '<div class="coach-toolview-title">' + (toolNames[toolId] || toolId) + '</div>';
  html += '</div>';

  // Render specific tool content
  switch (toolId) {
    case 'simulador':
      html += renderToolSimulador();
      break;
    case 'script':
      html += renderToolScript();
      break;
    case 'estado':
      html += renderToolEstado();
      break;
    case 'crm_analyze':
      html += renderToolCrmAnalyze();
      break;
    case 'crm_voice_note':
      html += renderToolCrmVoiceNote();
      break;
    case 'crm_message':
      html += renderToolCrmMessage();
      break;
    case 'prospect_ideas':
      html += renderToolProspectIdeas();
      break;
    case 'crm_reminder':
      html += renderToolCrmReminder();
      break;
    case 'crm_rating':
      html += renderToolCrmRating();
      break;
    case 'crm_agendar':
      html += renderToolCrmAgendar();
      break;
    case 'crm_pipeline':
      html += renderToolCrmPipeline();
      break;
    case 'crm_mover':
      html += renderToolCrmMover();
      break;
    case 'crm_checklist':
      html += renderToolCrmChecklist();
      break;
    case 'crm_prediccion':
      html += renderToolCrmPrediccion();
      break;
    case 'crm_autoseg':
      html += renderToolCrmAutoseg();
      break;
    default:
      html += renderToolPlaceholder(toolId);
      break;
  }

  html += '</div>';
  return html;
}


// ── Tool: Simulador de Rango ──────────────────────────────────

function renderToolSimulador() {
  var html = '';
  var user = window.currentUserProfile || window.userProfile || null;
  var rankName = 'Asociado';
  var rankLevel = 0;

  if (user) {
    rankName = user.rank || user.rango || 'Asociado';
    rankLevel = user.rank_level || 0;
  }

  var ranks = [
    { name: 'Asociado', level: 0, ventas: 0, equipo: 0 },
    { name: 'Ejecutivo', level: 1, ventas: 3, equipo: 2 },
    { name: 'Bronce', level: 2, ventas: 6, equipo: 5 },
    { name: 'Plata', level: 3, ventas: 10, equipo: 10 },
    { name: 'Oro', level: 4, ventas: 20, equipo: 20 },
    { name: 'Platino', level: 5, ventas: 40, equipo: 40 },
    { name: 'Diamante', level: 6, ventas: 80, equipo: 80 },
    { name: 'Corona', level: 7, ventas: 150, equipo: 150 }
  ];

  // Find current and next rank
  var currentRank = ranks[0];
  var nextRank = ranks[1];
  for (var i = 0; i < ranks.length; i++) {
    if (ranks[i].name.toLowerCase() === rankName.toLowerCase() || ranks[i].level === rankLevel) {
      currentRank = ranks[i];
      nextRank = ranks[i + 1] || null;
      break;
    }
  }

  // Current rank card
  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Tu rango actual</div>';
  html += '<div style="font-size:24px;font-weight:800;color:#E8D48B;">' + _safe(currentRank.name) + '</div>';
  html += '</div>';

  // Next rank progress
  if (nextRank) {
    var prospects = window.crmProspectos || [];
    var totalSales = prospects.filter(function(p) { return p && p.etapa === 'cerrado_ganado'; }).length;
    var totalTeam = 0;
    if (window.stState && window.stState.data) {
      totalTeam = (window.stState.data.frontline || []).length;
    }

    var salesPct = Math.min(100, Math.round((totalSales / Math.max(nextRank.ventas, 1)) * 100));
    var teamPct = Math.min(100, Math.round((totalTeam / Math.max(nextRank.equipo, 1)) * 100));

    html += '<div class="coach-toolview-card">';
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Siguiente: ' + _safe(nextRank.name) + '</div>';

    // Sales progress
    html += '<div class="coach-stat-row" style="border:none;padding:6px 0;">';
    html += '<span class="coach-stat-label">\uD83D\uDCB0 Ventas</span>';
    html += '<span class="coach-stat-value">' + totalSales + ' / ' + nextRank.ventas + '</span>';
    html += '</div>';
    html += '<div class="coach-rank-bar-bg"><div class="coach-rank-bar-fill" style="width:' + salesPct + '%;"></div></div>';

    // Team progress
    html += '<div class="coach-stat-row" style="border:none;padding:6px 0;margin-top:8px;">';
    html += '<span class="coach-stat-label">\uD83D\uDC65 Equipo</span>';
    html += '<span class="coach-stat-value">' + totalTeam + ' / ' + nextRank.equipo + '</span>';
    html += '</div>';
    html += '<div class="coach-rank-bar-bg"><div class="coach-rank-bar-fill" style="width:' + teamPct + '%;"></div></div>';

    // Remaining
    var salesLeft = Math.max(0, nextRank.ventas - totalSales);
    var teamLeft = Math.max(0, nextRank.equipo - totalTeam);
    html += '<div style="margin-top:12px;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;">';
    html += 'Te faltan <strong style="color:#E8D48B;">' + salesLeft + ' ventas</strong>';
    html += ' y <strong style="color:#E8D48B;">' + teamLeft + ' miembros</strong> para avanzar.';
    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="coach-toolview-card">';
    html += '<div style="text-align:center;padding:16px;color:#1D9E75;font-weight:700;">\u00A1Has alcanzado el rango m\u00e1ximo!</div>';
    html += '</div>';
  }

  return html;
}


// ── Tool: Script IA ───────────────────────────────────────────

function renderToolScript() {
  var html = '';
  var prospects = window.crmProspectos || [];
  var activeProspects = prospects.filter(function(p) {
    return p && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido';
  });

  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:10px;">Selecciona un prospecto o describe el escenario:</div>';

  // Quick-select prospects
  if (activeProspects.length > 0) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    var shown = activeProspects.slice(0, 6);
    shown.forEach(function(p) {
      var name = _safe(p.nombre || 'Sin nombre');
      html += '<button class="coach-task-btn coach-task-btn-secondary" style="font-size:11px;padding:6px 12px;" '
        + 'onclick="requestCoachScript(\'' + _safe(String(p.nombre || '').replace(/'/g, '')) + '\')">'
        + name + '</button>';
    });
    html += '</div>';
  }

  // Scenario input
  html += '<textarea id="coach-script-input" style="width:100%;min-height:80px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0EDE6;padding:10px;font-size:13px;font-family:Outfit,Nunito,sans-serif;resize:vertical;outline:none;" placeholder="Ej: Primer contacto con alguien interesado en trading..."></textarea>';
  html += '<button class="coach-task-btn coach-task-btn-primary" style="width:100%;margin-top:10px;" onclick="generateCoachScript()">\uD83D\uDCAC Generar Script</button>';
  html += '</div>';

  // Output area
  html += '<div id="coach-script-output"></div>';

  return html;
}


// ── Tool: Mi Estado ───────────────────────────────────────────

function renderToolEstado() {
  var html = '';
  var prospects = window.crmProspectos || [];
  var bookings = window.agendaBookings || [];

  // Prospect stats
  var total = prospects.length;
  var hot = prospects.filter(function(p) { return p && (p.temperatura || 0) >= 70; }).length;
  var won = prospects.filter(function(p) { return p && p.etapa === 'cerrado_ganado'; }).length;
  var lost = prospects.filter(function(p) { return p && p.etapa === 'cerrado_perdido'; }).length;
  var active = total - won - lost;

  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Sky Prospects</div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCCB Total prospectos</span><span class="coach-stat-value">' + total + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDD25 Calientes (70%+)</span><span class="coach-stat-value" style="color:#E8D48B;">' + hot + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\u2705 Cerrados ganados</span><span class="coach-stat-value" style="color:#1D9E75;">' + won + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\u274C Cerrados perdidos</span><span class="coach-stat-value" style="color:#E24B4A;">' + lost + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCCA Activos</span><span class="coach-stat-value">' + active + '</span></div>';
  html += '</div>';

  // Agenda stats
  var todayCount = 0;
  var weekCount = 0;
  var now = new Date();
  var weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  bookings.forEach(function(b) {
    if (!b || !b.fecha_iso) return;
    var d = new Date(b.fecha_iso);
    if (d.toDateString() === now.toDateString()) todayCount++;
    if (d >= now && d <= weekEnd) weekCount++;
  });

  html += '<div class="coach-toolview-card">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Sky Day</div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCC5 Citas hoy</span><span class="coach-stat-value">' + todayCount + '</span></div>';
  html += '<div class="coach-stat-row"><span class="coach-stat-label">\uD83D\uDCC6 Citas esta semana</span><span class="coach-stat-value">' + weekCount + '</span></div>';
  html += '</div>';

  // Conversion rate
  if (total > 0) {
    var convRate = Math.round((won / total) * 100);
    html += '<div class="coach-toolview-card">';
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Conversi\u00f3n</div>';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:36px;font-weight:800;color:' + (convRate >= 20 ? '#1D9E75' : convRate >= 10 ? '#E8D48B' : '#E24B4A') + ';">' + convRate + '%</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">tasa de cierre global</div>';
    html += '</div>';
    html += '<div class="coach-rank-bar-bg" style="margin-top:10px;"><div class="coach-rank-bar-fill" style="width:' + convRate + '%;background:' + (convRate >= 20 ? '#1D9E75' : convRate >= 10 ? '#E8D48B' : '#E24B4A') + ';"></div></div>';
    html += '</div>';
  }

  return html;
}


// ── Tool: Placeholder (Pr\u00f3ximamente) ──

function renderToolPlaceholder(toolId) {
  var tips = {
    roleplay: 'Practica conversaciones de venta con un prospecto simulado por IA.',
    plan: 'Genera un plan semanal personalizado basado en tus m\u00e9tricas actuales.',
    desafios: 'Desaf\u00edos diarios para mejorar tus habilidades de cierre.',
    voz: 'Graba y analiza tu pitch de venta para mejorar tu comunicaci\u00f3n.',
    seguimiento: 'Automatiza recordatorios y seguimiento de prospectos.'
  };
  var tip = tips[toolId] || 'Esta herramienta est\u00e1 en desarrollo.';

  return '<div class="coach-placeholder">'
    + '<div class="coach-placeholder-icon">\uD83D\uDE80</div>'
    + '<div class="coach-placeholder-title">Pr\u00f3ximamente</div>'
    + '<div class="coach-placeholder-text">' + _safe(tip) + '</div>'
    + '</div>';
}


// ═══════════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════════

function renderChat() {
  var html = '<div class="coach-chat">';
  html += '<div class="coach-chat-label">Chat con Coach IA</div>';
  html += '<div class="coach-chat-messages" id="coach-chat-messages">';

  if (coachState.chatHistory.length === 0) {
    html += '<div class="coach-chat-msg coach-chat-msg-ai">'
      + '\u00A1Hola! Soy tu Coach IA. '
      + 'Puedo ayudarte con scripts de venta, estrategias de seguimiento, '
      + 'y consejos para avanzar de rango. \u00BFEn qu\u00e9 puedo ayudarte?'
      + '</div>';
  } else {
    coachState.chatHistory.forEach(function(msg) {
      var cls = msg.role === 'user' ? 'coach-chat-msg-user' : 'coach-chat-msg-ai';
      html += '<div class="coach-chat-msg ' + cls + '">' + _safe(msg.text) + '</div>';
    });
  }

  if (coachState.chatLoading) {
    html += '<div class="coach-chat-typing">Coach IA est\u00e1 pensando...</div>';
  }

  html += '</div>';
  html += '</div>';
  return html;
}

function sendCoachMsgFromInput() {
  var input = document.getElementById('coach-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendCoachMessage(text);
}

function sendCoachMessage(text) {
  if (!text || coachState.chatLoading) return;

  // Add user message
  coachState.chatHistory.push({ role: 'user', text: text });
  coachState.chatLoading = true;
  renderCoachPanel();

  // Scroll chat to bottom
  scrollChatToBottom();

  // Build context-aware system prompt
  var sec = coachState.section;
  var contextInfo = 'Secci\u00f3n actual: ' + getSectionName(sec) + '. ';
  var prospects = window.crmProspectos || [];

  if (prospects.length > 0) {
    var hot = prospects.filter(function(p) { return p && (p.temperatura || 0) >= 70; }).length;
    var total = prospects.length;
    contextInfo += 'Prospectos: ' + total + ' total, ' + hot + ' calientes. ';
  }

  var systemPrompt = 'Eres Coach IA, un asistente de ventas y network marketing para la plataforma SkyTeam. '
    + 'Respondes de forma breve, directa y motivacional. '
    + 'Das consejos pr\u00e1cticos sobre ventas, seguimiento de prospectos, cierre y crecimiento de red. '
    + contextInfo
    + 'Responde en espa\u00f1ol. M\u00e1ximo 3-4 oraciones.';

  // Build messages array
  var messages = [{ role: 'system', content: systemPrompt }];
  var historySlice = coachState.chatHistory.slice(-10);
  historySlice.forEach(function(m) {
    messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
  });

  // Call API
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var reply = 'Lo siento, no pude procesar tu mensaje.';
    if (data && data.reply) {
      reply = data.reply;
    } else if (data && data.choices && data.choices[0]) {
      reply = data.choices[0].message ? data.choices[0].message.content : (data.choices[0].text || reply);
    }
    coachState.chatHistory.push({ role: 'assistant', text: reply });
    coachState.chatLoading = false;
    renderCoachPanel();
    scrollChatToBottom();
  })
  .catch(function(err) {
    console.error('[Coach IA] Chat error:', err);
    coachState.chatHistory.push({
      role: 'assistant',
      text: 'Hubo un error al conectar con el servidor. Int\u00e9ntalo de nuevo.'
    });
    coachState.chatLoading = false;
    renderCoachPanel();
    scrollChatToBottom();
  });
}

function scrollChatToBottom() {
  setTimeout(function() {
    var msgs = document.getElementById('coach-chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}


// ═══════════════════════════════════════════════════════════════
//  SCRIPT GENERATION (Script IA Tool)
// ═══════════════════════════════════════════════════════════════

function requestCoachScript(prospectName) {
  var textarea = document.getElementById('coach-script-input');
  if (textarea) {
    textarea.value = 'Script de seguimiento para ' + prospectName;
  }
  generateCoachScript();
}

function generateCoachScript() {
  var textarea = document.getElementById('coach-script-input');
  var output = document.getElementById('coach-script-output');
  if (!textarea || !output) return;

  var scenario = textarea.value.trim();
  if (!scenario) {
    output.innerHTML = '<div style="color:#E24B4A;font-size:12px;padding:8px;">Describe el escenario o selecciona un prospecto.</div>';
    return;
  }

  output.innerHTML = '<div class="coach-toolview-card"><div class="coach-chat-typing">Generando script...</div></div>';

  var systemPrompt = 'Eres un experto en ventas y network marketing. '
    + 'Genera un script de conversaci\u00f3n breve y efectivo para el siguiente escenario. '
    + 'Formato: saludo, preguntas de descubrimiento, presentaci\u00f3n del valor, y cierre. '
    + 'M\u00e1ximo 200 palabras. En espa\u00f1ol.';

  var messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: scenario }
  ];

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var reply = '';
    if (data && data.reply) {
      reply = data.reply;
    } else if (data && data.choices && data.choices[0]) {
      reply = data.choices[0].message ? data.choices[0].message.content : (data.choices[0].text || '');
    }
    if (!reply) {
      reply = 'No se pudo generar el script. Int\u00e9ntalo de nuevo.';
    }

    output.innerHTML = '<div class="coach-toolview-card">'
      + '<div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">\uD83D\uDCAC Script Generado</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.6;white-space:pre-wrap;">' + _safe(reply) + '</div>'
      + '<button class="coach-task-btn coach-task-btn-secondary" style="margin-top:12px;font-size:11px;" onclick="copyCoachScript(this)">Copiar al portapapeles</button>'
      + '</div>';
  })
  .catch(function(err) {
    console.error('[Coach IA] Script generation error:', err);
    output.innerHTML = '<div class="coach-toolview-card" style="border-color:rgba(226,75,74,0.3);">'
      + '<div style="color:#E24B4A;font-size:13px;">Error al generar el script. Verifica tu conexi\u00f3n.</div>'
      + '</div>';
  });
}

function copyCoachScript(btn) {
  var card = btn.parentElement;
  var scriptEl = card.querySelector('div[style*="white-space"]');
  if (!scriptEl) return;
  var text = scriptEl.textContent || scriptEl.innerText;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = '\u2705 Copiado';
      setTimeout(function() { btn.textContent = 'Copiar al portapapeles'; }, 2000);
    });
  } else {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); btn.textContent = '\u2705 Copiado'; } catch(e) {}
    document.body.removeChild(ta);
    setTimeout(function() { btn.textContent = 'Copiar al portapapeles'; }, 2000);
  }
}


// ═══════════════════════════════════════════════════════════════
//  SECTION-SPECIFIC ANALYSIS
// ═══════════════════════════════════════════════════════════════

function analyzeProspects() {
  var prospects = window.crmProspectos || [];
  if (prospects.length === 0) return null;

  var total = prospects.length;
  var hot = 0, warm = 0, cold = 0, won = 0, lost = 0;
  var noContact3Days = 0;

  prospects.forEach(function(p) {
    if (!p) return;
    var temp = p.temperatura || 0;
    var etapa = p.etapa || '';
    if (etapa === 'cerrado_ganado') { won++; return; }
    if (etapa === 'cerrado_perdido') { lost++; return; }
    if (temp >= 70) hot++;
    else if (temp >= 30) warm++;
    else cold++;

    var lastUpdate = p.updated_at
      ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000)
      : 999;
    if (lastUpdate >= 3) noContact3Days++;
  });

  return { total: total, hot: hot, warm: warm, cold: cold, won: won, lost: lost, noContact3Days: noContact3Days };
}

function analyzeSales() {
  var prospects = window.crmProspectos || [];
  var won = prospects.filter(function(p) { return p && p.etapa === 'cerrado_ganado'; });
  return { totalSales: won.length };
}

function analyzeAgenda() {
  var bookings = window.agendaBookings || [];
  var now = new Date();
  var today = 0, upcoming = 0, past = 0;

  bookings.forEach(function(b) {
    if (!b || !b.fecha_iso) return;
    var d = new Date(b.fecha_iso);
    if (d.toDateString() === now.toDateString()) today++;
    else if (d > now) upcoming++;
    else past++;
  });

  return { today: today, upcoming: upcoming, past: past, total: bookings.length };
}

function analyzeTeam() {
  if (!window.stState || !window.stState.data) return null;
  var data = window.stState.data;
  var frontline = data.frontline || [];
  return { members: frontline.length };
}


// ═══════════════════════════════════════════════════════════════
//  VOICE (Speech Recognition)
// ═══════════════════════════════════════════════════════════════

function toggleVoice() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }

  if (coachState.recording && coachState.recognition) {
    coachState.recognition.stop();
    coachState.recording = false;
    updateMicButton();
    return;
  }

  var recognition = new SpeechRecognition();
  recognition.lang = 'es-MX';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    coachState.recording = true;
    updateMicButton();
  };

  recognition.onresult = function(event) {
    var transcript = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim();
    if (transcript) {
      var input = document.getElementById('coach-input');
      if (input) {
        input.value = transcript;
      }
      sendCoachMessage(transcript);
    }
  };

  recognition.onerror = function(event) {
    console.warn('[Coach IA] Voice error:', event.error);
    coachState.recording = false;
    updateMicButton();
  };

  recognition.onend = function() {
    coachState.recording = false;
    updateMicButton();
  };

  coachState.recognition = recognition;

  try {
    recognition.start();
  } catch(e) {
    console.error('[Coach IA] Could not start voice:', e);
    coachState.recording = false;
  }
}

function updateMicButton() {
  var btn = document.getElementById('coach-mic-btn');
  if (!btn) return;
  if (coachState.recording) {
    btn.classList.add('recording');
    btn.title = 'Detener grabaci\u00f3n';
  } else {
    btn.classList.remove('recording');
    btn.title = 'Voz';
  }
}


// ═══════════════════════════════════════════════════════════════
//  TASK ACTIONS
// ═══════════════════════════════════════════════════════════════

function completeTask() {
  if (coachState.tasks.length === 0) return;

  // Remove completed task
  coachState.tasks.splice(coachState.taskIndex, 1);

  // Adjust index
  if (coachState.taskIndex >= coachState.tasks.length) {
    coachState.taskIndex = 0;
  }

  updateFabDot();
  renderCoachPanel();
}

function skipTask() {
  if (coachState.tasks.length === 0) return;

  coachState.taskIndex++;
  if (coachState.taskIndex >= coachState.tasks.length) {
    coachState.taskIndex = 0;
  }

  renderCoachPanel();
}


// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

function initCoachIA() {
  // Guard: require user context
  if (!window.CU) {
    setTimeout(function() { if (window.CU) initCoachIA(); }, 2000);
    return;
  }

  // Prevent double-init
  if (document.getElementById('coach-fab')) return;

  // Inject CSS
  injectCoachCSS();

  // Create floating action button
  var fab = document.createElement('button');
  fab.className = 'coach-fab';
  fab.id = 'coach-fab';
  fab.innerHTML = '\uD83E\uDD16';
  fab.setAttribute('aria-label', 'Coach IA');
  fab.onclick = function() {
    if (coachState.open) {
      closeCoach();
    } else {
      openCoach();
    }
  };

  // Notification dot
  var dot = document.createElement('span');
  dot.className = 'coach-fab-dot';
  dot.id = 'coach-fab-dot';
  fab.appendChild(dot);

  document.body.appendChild(fab);

  // Detect section + generate tasks
  detectCurrentSection();
  generateTasks();
  updateFabDot();

  // Override navigate() to track section changes
  if (typeof window.navigate === 'function') {
    var _origNav = window.navigate;
    window.navigate = function(sec) {
      _origNav(sec);
      coachState.section = sec;
      generateTasks();
      updateFabDot();
    };
  }

  // Periodically refresh tasks (every 60 seconds)
  setInterval(function() {
    if (!coachState.open) {
      detectCurrentSection();
      generateTasks();
      updateFabDot();
    }
  }, 60000);

  console.log('[Coach IA] Initialized');
}


// ═══════════════════════════════════════════════════════════════
//  CRM TOOL RENDERS
// ═══════════════════════════════════════════════════════════════

function renderToolCrmAnalyze() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos : [];
  var total = pros.length;
  var sinNotas = pros.filter(function(p) { return !p.notas || p.notas.trim() === ''; }).length;
  var sinCalif = pros.filter(function(p) { return !p.calif_positivo && !p.calif_emprendedor; }).length;
  var frios = pros.filter(function(p) { var lu = p.updated_at ? Math.ceil((Date.now()-new Date(p.updated_at).getTime())/86400000) : 999; return lu > 7 && p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }).length;
  var calientes = pros.filter(function(p) { return (p.temperatura||0) >= 70 && p.etapa !== 'cerrado_ganado'; }).length;
  var porEtapa = {};
  pros.forEach(function(p) { porEtapa[p.etapa] = (porEtapa[p.etapa]||0)+1; });

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">\uD83D\uDD0D An\u00e1lisis de tu CRM</div>';

  // Stats grid
  html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;">';
  html += '<div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#fff;">'+total+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Total</div></div>';
  html += '<div style="background:rgba(220,38,38,0.08);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#E24B4A;">'+frios+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Fr\u00edos (7d+)</div></div>';
  html += '<div style="background:rgba(201,168,76,0.08);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#C9A84C;">'+calientes+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Calientes</div></div>';
  html += '<div style="background:rgba(127,119,221,0.08);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:#7F77DD;">'+sinNotas+'</div><div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Sin notas</div></div>';
  html += '</div>';

  // Recommendations
  html += '<div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);margin-bottom:8px;">RECOMENDACIONES</div>';
  if (sinNotas > 0) html += '<div style="background:rgba(201,168,76,0.06);border-left:3px solid #C9A84C;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\uD83D\uDCDD <strong>'+sinNotas+' prospectos sin notas</strong> \u2014 Documenta cada interacci\u00f3n para no perder contexto.</div>';
  if (sinCalif > 0) html += '<div style="background:rgba(127,119,221,0.06);border-left:3px solid #7F77DD;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\u2B50 <strong>'+sinCalif+' sin calificar</strong> \u2014 Eval\u00faa el potencial de cada prospecto.</div>';
  if (frios > 0) html += '<div style="background:rgba(220,38,38,0.06);border-left:3px solid #E24B4A;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\u2744\uFE0F <strong>'+frios+' prospectos fr\u00edos</strong> \u2014 Contacta antes de que se pierdan.</div>';
  if (calientes > 0) html += '<div style="background:rgba(29,158,117,0.06);border-left:3px solid #1D9E75;padding:10px 12px;border-radius:0 8px 8px 0;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,0.7);">\uD83D\uDD25 <strong>'+calientes+' prospectos calientes</strong> \u2014 \u00a1Ci\u00e9rralos esta semana!</div>';

  html += '</div>';
  return html;
}

function renderToolCrmVoiceNote() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">\uD83C\uDFA4 Nota por Voz</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Selecciona un prospecto y dicta tu nota. Se guardar\u00e1 autom\u00e1ticamente.</div>';

  // Prospect selector
  html += '<select id="coach-voice-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) {
    html += '<option value="'+p.id+'">' + _safe(p.nombre || 'Sin nombre') + ' \u2014 ' + (p.etapa||'nuevo') + '</option>';
  });
  html += '</select>';

  // Voice button
  html += '<div style="text-align:center;margin:20px 0;">';
  html += '<button id="coach-voice-rec-btn" onclick="coachStartVoiceNote()" style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);font-size:32px;cursor:pointer;transition:all 0.3s;">\uD83C\uDFA4</button>';
  html += '<div id="coach-voice-status" style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:8px;">Toca para grabar</div>';
  html += '</div>';

  // Transcript preview
  html += '<div id="coach-voice-transcript" style="display:none;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:12px;">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:4px;">TRANSCRIPCI\u00d3N</div>';
  html += '<div id="coach-voice-text" style="font-size:13px;color:#F0EDE6;line-height:1.4;"></div>';
  html += '</div>';

  // Save button
  html += '<button id="coach-voice-save" onclick="coachSaveVoiceNote()" style="display:none;width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCBE Guardar nota en la tarjeta</button>';

  html += '</div>';
  return html;
}

function renderToolCrmMessage() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">\uD83D\uDCAC Generar Mensaje</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Selecciona un prospecto y el tipo de mensaje. La IA lo genera personalizado.</div>';

  // Prospect selector
  html += '<select id="coach-msg-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) {
    html += '<option value="'+p.id+'">' + _safe(p.nombre || 'Sin nombre') + '</option>';
  });
  html += '</select>';

  // Message type
  html += '<select id="coach-msg-type" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  html += '<option value="primer_contacto">\uD83D\uDCF2 Primer contacto</option>';
  html += '<option value="seguimiento">\uD83D\uDD04 Seguimiento</option>';
  html += '<option value="invitacion_reunion">\uD83D\uDCC5 Invitar a reuni\u00f3n</option>';
  html += '<option value="cierre">\uD83D\uDCB0 Mensaje de cierre</option>';
  html += '<option value="reactivar">\uD83D\uDD25 Reactivar contacto fr\u00edo</option>';
  html += '<option value="felicitar">\uD83C\uDF89 Felicitar/Motivar</option>';
  html += '</select>';

  html += '<button onclick="coachGenerateMessage()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">\uD83E\uDD16 Generar mensaje</button>';

  html += '<div id="coach-msg-result" style="margin-top:16px;"></div>';
  html += '</div>';
  return html;
}

function renderToolProspectIdeas() {
  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:12px;">\uD83D\uDCA1 Ideas para Nuevos Prospectos</div>';

  var ideas = [
    { icon: '\uD83D\uDC65', title: 'Lista de contactos', desc: 'Revisa tus contactos de WhatsApp. Personas emprendedoras, que buscan ingresos extra, o que ya est\u00e1n en otro negocio.' },
    { icon: '\uD83D\uDCF1', title: 'Redes sociales', desc: 'Publica historias sobre tu estilo de vida y resultados. Usa el Agente de Contenido para crear posts virales.' },
    { icon: '\uD83C\uDFCB\uFE0F', title: 'Gimnasio / Actividades', desc: 'Personas en el gym, clases de yoga, grupos deportivos \u2014 suelen ser personas con mentalidad de crecimiento.' },
    { icon: '\uD83C\uDF93', title: 'Grupos de estudio', desc: 'Compa\u00f1eros de universidad, cursos online, talleres \u2014 personas que invierten en educaci\u00f3n.' },
    { icon: '\uD83D\uDCBC', title: 'LinkedIn / Profesionales', desc: 'Conecta con profesionales que buscan ingresos adicionales o independencia financiera.' },
    { icon: '\uD83D\uDED2', title: 'Negocios locales', desc: 'Due\u00f1os de tiendas, emprendedores locales \u2014 ya tienen mentalidad de negocio.' },
    { icon: '\uD83C\uDF89', title: 'Eventos y reuniones', desc: 'Asiste a eventos de networking, ferias, conferencias \u2014 conoce personas nuevas cada semana.' },
    { icon: '\uD83D\uDCF2', title: 'Referidos de clientes', desc: 'Pide a tus prospectos cerrados que te recomienden 3 personas. La mejor fuente de prospectos.' }
  ];

  ideas.forEach(function(idea) {
    html += '<div style="display:flex;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:8px;">';
    html += '<div style="font-size:24px;flex-shrink:0;">' + idea.icon + '</div>';
    html += '<div><div style="font-size:13px;font-weight:700;color:#fff;">' + idea.title + '</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;line-height:1.4;">' + idea.desc + '</div></div>';
    html += '</div>';
  });

  html += '<button onclick="openCoachTool(\'script\')" style="width:100%;padding:12px;margin-top:12px;border-radius:10px;background:rgba(201,168,76,0.10);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCAC Genera un script para abordar</button>';
  html += '</div>';
  return html;
}

function renderToolCrmReminder() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">\u23F0 Agregar Recordatorio</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Programa un seguimiento para un prospecto.</div>';

  html += '<select id="coach-rem-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) { html += '<option value="'+p.id+'">' + _safe(p.nombre||'Sin nombre') + '</option>'; });
  html += '</select>';

  html += '<input type="date" id="coach-rem-date" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;box-sizing:border-box;">';
  html += '<input type="text" id="coach-rem-msg" placeholder="Mensaje del recordatorio..." style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;box-sizing:border-box;">';

  html += '<button onclick="coachSaveReminder()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCBE Guardar recordatorio</button>';
  html += '</div>';
  return html;
}

function renderToolCrmRating() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '';
  html += '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">\u2B50 Calificar Prospecto</div>';

  // Show prospects without rating
  var sinCalif = pros.filter(function(p) { return !p.calif_positivo && !p.calif_emprendedor; });
  if (sinCalif.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">\u2705 Todos tus prospectos est\u00e1n calificados</div>';
  } else {
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;">' + sinCalif.length + ' prospectos sin calificar</div>';
    sinCalif.slice(0, 5).forEach(function(p) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:6px;">';
      html += '<div style="font-size:13px;font-weight:600;color:#fff;">' + _safe(p.nombre||'Sin nombre') + '</div>';
      html += '<button onclick="if(typeof crmStartRatingWizard===\'function\')crmStartRatingWizard(\''+p.id+'\');closeCoach();" style="padding:6px 14px;border-radius:8px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:11px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\u2B50 Calificar</button>';
      html += '</div>';
    });
  }
  html += '</div>';
  return html;
}


// ── Tool: Agendar Cierre ─────────────────────────────────────

function renderToolCrmAgendar() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];
  var agendaLink = CU ? (window.location.origin + '?agenda=' + (CU.ref || CU.username)) : '';
  var sponsorName = CU && CU.sponsor ? CU.sponsor : null;
  var isFirstTimer = pros.filter(function(p){ return p.etapa === 'cerrado_ganado'; }).length === 0;

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">📅 Agendar Cierre</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Envía tu agenda al prospecto para que reserve.</div>';

  // First timer warning
  if (isFirstTimer && sponsorName) {
    html += '<div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.20);border-radius:12px;padding:14px;margin-bottom:16px;">';
    html += '<div style="font-size:13px;font-weight:700;color:#C9A84C;margin-bottom:4px;">💡 Es tu primer cierre</div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.4;">Apóyate con tu patrocinador <strong style="color:#fff;">' + _safe(sponsorName) + '</strong>. Invítalo a la reunión para que te guíe en tu primer cierre.</div>';
    if (typeof USERS !== 'undefined' && USERS[sponsorName.toLowerCase()]) {
      var sp = USERS[sponsorName.toLowerCase()];
      var spWa = (sp.whatsapp || sp.wa || '').replace(/[^0-9]/g, '');
      if (spWa) html += '<button onclick="window.open(\'https://wa.me/' + spWa + '?text=' + encodeURIComponent('Hola! Tengo mi primer cierre agendado. ¿Puedes apoyarme en la reunión?') + '\',\'_blank\')" style="margin-top:8px;padding:8px 16px;border-radius:8px;background:linear-gradient(135deg,#25D366,#128C7E);border:none;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">📱 Contactar a ' + _safe(sponsorName) + '</button>';
    }
    html += '</div>';
  }

  // Prospect selector
  html += '<select id="coach-agendar-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) { html += '<option value="'+p.id+'" data-phone="'+(p.telefono||'')+'" data-name="'+(p.nombre||'')+'">' + _safe(p.nombre || 'Sin nombre') + '</option>'; });
  html += '</select>';

  // Agenda link card
  html += '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:12px;">';
  html += '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Tu link de agenda</div>';
  html += '<div style="font-size:12px;color:#C9A84C;word-break:break-all;font-family:monospace;">' + agendaLink + '</div>';
  html += '</div>';

  // Generate message + send
  html += '<button onclick="coachSendAgenda()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">📱 Enviar agenda por WhatsApp</button>';

  html += '</div>';
  return html;
}


// ── Tool: Pipeline de Ventas ─────────────────────────────────

function renderToolCrmPipeline() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos : [];
  var etapas = ['nuevo','contactado','interesado','presentacion','seguimiento','cerrado_ganado','cerrado_perdido'];
  var labels = {nuevo:'Nuevo',contactado:'Contactado',interesado:'Interesado',presentacion:'Presentación',seguimiento:'Seguimiento',cerrado_ganado:'Ganado ✅',cerrado_perdido:'Perdido ❌'};
  var colors = {nuevo:'#C9A84C',contactado:'#7F77DD',interesado:'#E8D48B',presentacion:'#1D9E75',seguimiento:'#FFD700',cerrado_ganado:'#25D366',cerrado_perdido:'#E24B4A'};

  var counts = {};
  var totalValor = 0;
  etapas.forEach(function(e) { counts[e] = 0; });
  pros.forEach(function(p) { counts[p.etapa] = (counts[p.etapa]||0)+1; totalValor += (p.valor_estimado||0); });

  var maxCount = Math.max.apply(null, etapas.map(function(e){return counts[e];})) || 1;
  var ganados = counts['cerrado_ganado'] || 0;
  var total = pros.length || 1;
  var tasa = Math.round(ganados / total * 100);

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">📊 Pipeline de Ventas</div>';

  // Summary stats
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">';
  html += '<div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#fff;">'+pros.length+'</div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Total</div></div>';
  html += '<div style="background:rgba(29,158,117,0.08);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#1D9E75;">'+tasa+'%</div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Conversión</div></div>';
  html += '<div style="background:rgba(201,168,76,0.08);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:800;color:#C9A84C;">$'+totalValor.toLocaleString()+'</div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;">Pipeline</div></div>';
  html += '</div>';

  // Funnel bars
  etapas.forEach(function(e) {
    var pct = Math.max(5, counts[e] / maxCount * 100);
    html += '<div style="margin-bottom:6px;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:11px;color:rgba(255,255,255,0.6);">'+(labels[e]||e)+'</span><span style="font-size:11px;font-weight:700;color:#fff;">'+counts[e]+'</span></div>';
    html += '<div style="height:8px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden;">';
    html += '<div style="height:100%;width:'+pct+'%;background:'+(colors[e]||'#C9A84C')+';border-radius:4px;transition:width 0.5s;"></div>';
    html += '</div></div>';
  });

  html += '</div>';
  return html;
}


// ── Tool: Mover Etapa ────────────────────────────────────────

function renderToolCrmMover() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];
  var etapas = [
    {id:'nuevo',label:'📋 Nuevo'}, {id:'contactado',label:'📞 Contactado'},
    {id:'interesado',label:'🔥 Interesado'}, {id:'presentacion',label:'📊 Presentación'},
    {id:'seguimiento',label:'🔄 Seguimiento'}, {id:'cerrado_ganado',label:'✅ Ganado'},
    {id:'cerrado_perdido',label:'❌ Perdido'}
  ];

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">🔄 Mover Etapa</div>';

  html += '<select id="coach-mover-prospect" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:8px;">';
  html += '<option value="">Selecciona prospecto...</option>';
  pros.forEach(function(p) { html += '<option value="'+p.id+'" data-etapa="'+(p.etapa||'nuevo')+'">' + _safe(p.nombre||'Sin nombre') + ' — ' + (p.etapa||'nuevo') + '</option>'; });
  html += '</select>';

  html += '<select id="coach-mover-etapa" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:10px;color:#F0EDE6;font-size:13px;padding:10px 12px;outline:none;font-family:Outfit,Nunito,sans-serif;margin-bottom:12px;">';
  etapas.forEach(function(e) { html += '<option value="'+e.id+'">'+e.label+'</option>'; });
  html += '</select>';

  html += '<button onclick="coachMoverEtapa()" style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#E8D48B);color:#0a0a12;font-size:13px;font-weight:800;cursor:pointer;border:none;font-family:Outfit,Nunito,sans-serif;">🔄 Mover</button>';
  html += '</div>';
  return html;
}


// ── Tool: Checklist de Cierre ────────────────────────────────

function renderToolCrmChecklist() {
  var checks = [
    { id: 'link', text: '🔗 Tengo mi link de agenda listo', done: !!(CU && CU.ref) },
    { id: 'script', text: '📝 Preparé mi script de cierre', done: false },
    { id: 'sponsor', text: '🤝 Invité a mi patrocinador (si es mi primer cierre)', done: false },
    { id: 'zoom', text: '📹 Tengo Zoom listo y probado', done: false },
    { id: 'info', text: '📋 Revisé la info del prospecto', done: false },
    { id: 'price', text: '💰 Tengo claros los precios y planes', done: false },
    { id: 'objections', text: '🛡️ Preparé respuestas a objeciones comunes', done: false },
    { id: 'followup', text: '📅 Tengo plan de seguimiento post-reunión', done: false }
  ];

  var saved = JSON.parse(localStorage.getItem('coach_checklist') || '{}');

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">📋 Checklist de Cierre</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Prepárate antes de cada reunión de cierre.</div>';

  checks.forEach(function(c) {
    var isDone = saved[c.id] || c.done;
    html += '<div onclick="coachToggleCheck(\''+c.id+'\')" style="display:flex;align-items:center;gap:10px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;">';
    html += '<div style="width:22px;height:22px;border-radius:6px;border:2px solid '+(isDone?'#1D9E75':'rgba(255,255,255,0.15)')+';background:'+(isDone?'rgba(29,158,117,0.2)':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">'+(isDone?'✓':'')+'</div>';
    html += '<span style="font-size:13px;color:'+(isDone?'rgba(255,255,255,0.4)':'#F0EDE6')+';'+(isDone?'text-decoration:line-through;':'')+'">'+c.text+'</span>';
    html += '</div>';
  });

  html += '</div>';
  return html;
}


// ── Tool: Predicción de Cierre ───────────────────────────────

function renderToolCrmPrediccion() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){ return p.etapa !== 'cerrado_ganado' && p.etapa !== 'cerrado_perdido'; }) : [];

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;">🎯 Predicción de Cierre</div>';

  if (pros.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">No hay prospectos activos</div>';
  } else {
    // Calculate probability for each prospect
    pros.forEach(function(p) {
      var prob = 0;
      // Temperature contributes 40%
      prob += (p.temperatura || 0) * 0.4;
      // Stage contributes 30%
      var stageScore = {nuevo:10,contactado:25,interesado:50,presentacion:70,seguimiento:85};
      prob += (stageScore[p.etapa] || 0) * 0.3;
      // Rating contributes 20%
      var rating = ((p.calif_positivo||0) + (p.calif_emprendedor||0) + (p.calif_dinero||0) + (p.calif_lider||0)) / 4;
      prob += rating * 100 * 0.2;
      // Recency contributes 10%
      var daysSince = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 30;
      prob += Math.max(0, (10 - daysSince)) * 1;

      prob = Math.min(99, Math.max(1, Math.round(prob)));
      p._prob = prob;
    });

    // Sort by probability desc
    pros.sort(function(a,b) { return (b._prob||0) - (a._prob||0); });

    pros.slice(0, 8).forEach(function(p) {
      var color = p._prob >= 70 ? '#1D9E75' : p._prob >= 40 ? '#C9A84C' : '#E24B4A';
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;margin-bottom:6px;">';
      html += '<div style="width:44px;height:44px;border-radius:50%;border:3px solid '+color+';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:'+color+';flex-shrink:0;">'+p._prob+'%</div>';
      html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_safe(p.nombre||'Sin nombre')+'</div>';
      html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+(p.etapa||'nuevo')+' · temp '+(p.temperatura||0)+'%</div></div>';
      html += '</div>';
    });
  }

  html += '</div>';
  return html;
}


// ── Tool: Auto-Seguimiento ───────────────────────────────────

function renderToolCrmAutoseg() {
  var pros = typeof crmProspectos !== 'undefined' ? crmProspectos.filter(function(p){
    if (p.etapa === 'cerrado_ganado' || p.etapa === 'cerrado_perdido') return false;
    var days = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 999;
    return days >= 3;
  }) : [];

  pros.sort(function(a,b) {
    var da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    var db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return da - db; // oldest first
  });

  var html = '<div style="padding:16px;">';
  html += '<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;">🔔 Auto-Seguimiento</div>';
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Prospectos que necesitan contacto. Toca para generar mensaje.</div>';

  if (pros.length === 0) {
    html += '<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.3);"><div style="font-size:32px;margin-bottom:8px;">✅</div>Todos al día — ningún prospecto sin seguimiento.</div>';
  } else {
    pros.slice(0, 10).forEach(function(p) {
      var days = p.updated_at ? Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : '?';
      var urgency = days >= 7 ? '#E24B4A' : '#C9A84C';
      var phone = (p.telefono || '').replace(/[^0-9]/g, '');

      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.02);border-left:3px solid '+urgency+';border-radius:0 10px 10px 0;margin-bottom:6px;">';
      html += '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#fff;">'+_safe(p.nombre||'Sin nombre')+'</div>';
      html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+days+' días sin contacto · '+(p.etapa||'nuevo')+'</div></div>';
      html += '<button onclick="document.getElementById(\'coach-msg-prospect\').value=\''+p.id+'\';openCoachTool(\'crm_message\')" style="padding:6px 10px;border-radius:8px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:10px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;white-space:nowrap;">💬 Mensaje</button>';
      if (phone) html += '<button onclick="window.open(\'https://wa.me/'+phone+'\',\'_blank\')" style="padding:6px 10px;border-radius:8px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.25);color:#25D366;font-size:10px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">📱</button>';
      html += '</div>';
    });
  }

  html += '</div>';
  return html;
}


// ═══════════════════════════════════════════════════════════════
//  CRM TOOL FUNCTIONS (Voice, Message, Reminder)
// ═══════════════════════════════════════════════════════════════

var _coachVoiceRec = null;
var _coachVoiceTranscript = '';

window.coachStartVoiceNote = function() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    if(typeof showToast === 'function') showToast('Tu navegador no soporta reconocimiento de voz','error');
    return;
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (_coachVoiceRec) { _coachVoiceRec.stop(); _coachVoiceRec = null; return; }

  _coachVoiceRec = new SR();
  _coachVoiceRec.lang = 'es-MX';
  _coachVoiceRec.continuous = true;
  _coachVoiceRec.interimResults = true;

  var btn = document.getElementById('coach-voice-rec-btn');
  var status = document.getElementById('coach-voice-status');
  if(btn) { btn.style.background = 'rgba(220,38,38,0.2)'; btn.style.borderColor = 'rgba(220,38,38,0.5)'; btn.innerHTML = '\uD83D\uDD34'; }
  if(status) status.textContent = 'Escuchando...';

  _coachVoiceRec.onresult = function(e) {
    var transcript = '';
    for(var i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    _coachVoiceTranscript = transcript;
    var textEl = document.getElementById('coach-voice-text');
    var transEl = document.getElementById('coach-voice-transcript');
    var saveEl = document.getElementById('coach-voice-save');
    if(textEl) textEl.textContent = transcript;
    if(transEl) transEl.style.display = 'block';
    if(saveEl) saveEl.style.display = 'block';
  };

  _coachVoiceRec.onend = function() {
    if(btn) { btn.style.background = 'rgba(255,255,255,0.06)'; btn.style.borderColor = 'rgba(255,255,255,0.15)'; btn.innerHTML = '\uD83C\uDFA4'; }
    if(status) status.textContent = 'Toca para grabar';
    _coachVoiceRec = null;
  };

  _coachVoiceRec.start();
};

window.coachSaveVoiceNote = function() {
  var select = document.getElementById('coach-voice-prospect');
  if (!select || !select.value) { if(typeof showToast === 'function') showToast('Selecciona un prospecto primero','error'); return; }
  if (!_coachVoiceTranscript) { if(typeof showToast === 'function') showToast('Graba una nota primero','error'); return; }

  var prospectId = select.value;
  var note = _coachVoiceTranscript;
  var dateStr = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  var fullNote = '[\uD83C\uDFA4 ' + dateStr + '] ' + note;

  // Find prospect and update notes
  if (typeof crmProspectos !== 'undefined') {
    var p = crmProspectos.find(function(pr) { return pr.id == prospectId; });
    if (p) {
      var existingNotes = p.notas || '';
      var newNotes = existingNotes ? existingNotes + '\n' + fullNote : fullNote;

      // Save via CRM API
      if (typeof crmApi === 'function') {
        crmApi('update', { id: prospectId, updates: { notas: newNotes } }).then(function(r) {
          if (r && r.ok) {
            p.notas = newNotes;
            if(typeof showToast === 'function') showToast('\u2705 Nota guardada en ' + (p.nombre || 'prospecto'));
            _coachVoiceTranscript = '';
            var textEl = document.getElementById('coach-voice-text');
            var saveEl = document.getElementById('coach-voice-save');
            if(textEl) textEl.textContent = '';
            if(saveEl) saveEl.style.display = 'none';
          } else {
            if(typeof showToast === 'function') showToast('Error guardando nota','error');
          }
        });
      }
    }
  }
};

window.coachGenerateMessage = function() {
  var prospectSelect = document.getElementById('coach-msg-prospect');
  var typeSelect = document.getElementById('coach-msg-type');
  var resultDiv = document.getElementById('coach-msg-result');
  if (!prospectSelect || !prospectSelect.value || !resultDiv) return;

  var prospect = null;
  if (typeof crmProspectos !== 'undefined') {
    prospect = crmProspectos.find(function(p) { return p.id == prospectSelect.value; });
  }
  if (!prospect) return;

  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">\uD83E\uDD16 Generando mensaje...</div>';

  var msgType = typeSelect ? typeSelect.value : 'seguimiento';
  var context = 'Prospecto: ' + (prospect.nombre||'') + '. Etapa: ' + (prospect.etapa||'nuevo') + '. Temperatura: ' + (prospect.temperatura||50) + '%. Notas: ' + (prospect.notas||'Sin notas') + '. Tipo de mensaje: ' + msgType;

  var systemPrompt = 'Eres un experto en ventas y network marketing. Genera UN mensaje corto para WhatsApp (m\u00e1ximo 3 oraciones) personalizado para este prospecto. El mensaje debe ser natural, amigable, sin parecer robot. NO uses emojis excesivos (m\u00e1ximo 1-2). Responde SOLO con el mensaje, sin explicaci\u00f3n.';

  if (typeof _skyFetch === 'function') {
    _skyFetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: context }]
      })
    }).then(function(r) { return r.json(); }).then(function(d) {
      var text = d.content && d.content[0] ? d.content[0].text : 'No se pudo generar el mensaje.';
      resultDiv.innerHTML = '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;">'
        + '<div id="coach-msg-text" style="font-size:13px;color:#F0EDE6;line-height:1.5;margin-bottom:12px;">' + _safe(text) + '</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button onclick="var t=document.getElementById(\'coach-msg-text\');if(t)navigator.clipboard.writeText(t.textContent);if(typeof showToast===\'function\')showToast(\'Mensaje copiado \u2713\')" style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCCB Copiar</button>'
        + '<button onclick="window.open(\'https://wa.me/' + ((prospect.telefono||'').replace(/[^0-9]/g,'')) + '?text='+encodeURIComponent(text)+'\',\'_blank\')" style="flex:1;padding:10px;border-radius:8px;background:linear-gradient(135deg,#25D366,#128C7E);border:none;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:Outfit,Nunito,sans-serif;">\uD83D\uDCF1 Enviar WA</button>'
        + '</div></div>';
    }).catch(function() {
      resultDiv.innerHTML = '<div style="color:#E24B4A;font-size:12px;">Error generando mensaje. Intenta de nuevo.</div>';
    });
  }
};

window.coachSaveReminder = function() {
  var prospectId = document.getElementById('coach-rem-prospect');
  var date = document.getElementById('coach-rem-date');
  var msg = document.getElementById('coach-rem-msg');
  if (!prospectId || !prospectId.value || !date || !date.value) { if(typeof showToast==='function') showToast('Completa los campos','error'); return; }

  if (typeof crmApi === 'function') {
    crmApi('addReminder', { prospecto_id: prospectId.value, fecha_recordatorio: date.value, mensaje: msg ? msg.value : 'Seguimiento' }).then(function(r) {
      if (r && r.ok) {
        if(typeof showToast==='function') showToast('\u23F0 Recordatorio programado \u2713');
        openCoachTool(null); // Back to main
      } else {
        if(typeof showToast==='function') showToast('Error guardando','error');
      }
    });
  }
};


// ── Agendar: Send agenda via WhatsApp ────────────────────────

window.coachSendAgenda = function() {
  var select = document.getElementById('coach-agendar-prospect');
  if (!select || !select.value) { if(typeof showToast==='function') showToast('Selecciona un prospecto','error'); return; }
  var option = select.options[select.selectedIndex];
  var phone = (option.getAttribute('data-phone') || '').replace(/[^0-9]/g, '');
  var name = option.getAttribute('data-name') || 'amigo';
  var agendaLink = CU ? (window.location.origin + '?agenda=' + (CU.ref || CU.username)) : '';
  var msg = 'Hola ' + name + '! 👋 Te comparto mi agenda para que reserves un espacio para nuestra reunión: ' + agendaLink + ' Escoge el horario que mejor te funcione. ¡Te espero! 💪';
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
};


// ── Mover Etapa: Update prospect stage ───────────────────────

window.coachMoverEtapa = function() {
  var pSel = document.getElementById('coach-mover-prospect');
  var eSel = document.getElementById('coach-mover-etapa');
  if (!pSel || !pSel.value || !eSel) return;
  if (typeof crmApi === 'function') {
    crmApi('update', { id: pSel.value, updates: { etapa: eSel.value } }).then(function(r) {
      if (r && r.ok) {
        if(typeof showToast==='function') showToast('✅ Prospecto movido a ' + eSel.value);
        if(typeof crmLoadData==='function') crmLoadData();
      }
    });
  }
};


// ── Checklist: Toggle item ───────────────────────────────────

window.coachToggleCheck = function(id) {
  var saved = JSON.parse(localStorage.getItem('coach_checklist') || '{}');
  saved[id] = !saved[id];
  localStorage.setItem('coach_checklist', JSON.stringify(saved));
  openCoachTool('crm_checklist');
};


// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

window.initCoachIA = initCoachIA;
window.openCoach = openCoach;
window.closeCoach = closeCoach;

window.coachCompleteTask = completeTask;
window.coachSkipTask = skipTask;

window.openCoachTool = function(id) {
  coachState.tools = id;
  renderCoachPanel();
};

window.sendCoachMsg = sendCoachMessage;
window.sendCoachMsgFromInput = sendCoachMsgFromInput;
window.toggleCoachVoice = toggleVoice;
window.requestCoachScript = requestCoachScript;
window.generateCoachScript = generateCoachScript;
window.copyCoachScript = copyCoachScript;

})();
