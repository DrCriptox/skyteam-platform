// ═══════════════════════════════════════════════════════════════
// SKY TEAM V2 — ONBOARDING SYSTEM (Frontend)
// Ruta de 7 Días, Logros, Coach IA, Dashboard, Script Bank
// ═══════════════════════════════════════════════════════════════

(function() {
'use strict';

var OB_API = '/api/onboarding';
var CHAT_API = '/api/chat';

// ── Colores del sistema ──
var C = {
  bg: '#030c1f', bgCard: 'rgba(255,255,255,0.04)', bgCardHover: 'rgba(255,255,255,0.08)',
  accent: '#1CE8FF', gold: '#FFD700', green: '#00E676', red: '#FF5252',
  orange: '#FF9800', textMain: '#FFFFFF', textSub: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)', glow: 'rgba(28,232,255,0.25)'
};

// ── Estado local ──
var obState = {
  progress: null,
  achievements: [],
  achievementDefs: {},
  dashboard: null,
  coachContext: null,
  coachOpen: false,
  coachMessages: [],
  scripts: [],
  currentView: null // 'onboarding', 'dashboard', 'achievements', 'scripts'
};

// ── API Helper ──
function obApi(action, data) {
  var body = Object.assign({ action: action, username: (typeof CU !== 'undefined' && CU) ? CU.username : '' }, data || {});
  return fetch(OB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  }).then(function(r) { return r.json(); });
}

// ══════════════════════════════════════════════════════════
// 1. RUTA DE 7 DÍAS — Wizard paso a paso
// ══════════════════════════════════════════════════════════

var DAY_CONFIG = {
  1: {
    name: 'Prepara tu imagen',
    icon: '📸',
    desc: 'Tu imagen profesional es tu primera impresión. Hoy la creamos.',
    tasks: [
      { id: 'day1_photo', label: 'Sube tu foto y genera tu imagen profesional', action: 'openPhotoEditor' },
      { id: 'day1_profile', label: 'Acepta la foto como tu perfil', action: 'autoCheck' },
      { id: 'day1_landing', label: 'Personaliza tu landing page', action: 'openLanding' }
    ]
  },
  2: {
    name: 'Conoce tus herramientas',
    icon: '🛠️',
    desc: 'Domina la plataforma en 10 minutos. Tour guiado por todo.',
    tasks: [
      { id: 'day2_tour', label: 'Completa el tour guiado de la plataforma', action: 'startTour' },
      { id: 'day2_pwa', label: 'Instala la app en tu celular (PWA)', action: 'installPWA' },
      { id: 'day2_push', label: 'Activa las notificaciones push', action: 'activatePush' }
    ]
  },
  3: {
    name: 'Tu lista de contactos',
    icon: '📋',
    desc: 'Tu negocio empieza con quién conoces. Vamos a llenar tu CRM.',
    tasks: [
      { id: 'day3_prospects', label: 'Agrega 10 prospectos al CRM', action: 'openCRM' },
      { id: 'day3_qualify', label: 'Califica la temperatura de cada uno', action: 'openCRM' }
    ]
  },
  4: {
    name: 'Tu primer mensaje',
    icon: '💬',
    desc: 'Usa la IA para crear mensajes perfectos y contacta a tus primeros 3.',
    tasks: [
      { id: 'day4_scripts', label: 'Genera 3 scripts con el Agente Anti-Objeciones', action: 'openAgent' },
      { id: 'day4_message', label: 'Envía mensaje a tus primeros 3 prospectos', action: 'autoCheck' },
      { id: 'day4_interaction', label: 'Registra la interacción en el CRM', action: 'openCRM' }
    ]
  },
  5: {
    name: '¡DÍA DE LANZAMIENTO!',
    icon: '🚀',
    desc: 'HOY es el día. Tu negocio se lanza oficialmente al mundo.',
    tasks: [
      { id: 'day5_flyer', label: 'Genera tu flyer de lanzamiento con tu foto pro', action: 'openFlyerGen' },
      { id: 'day5_date', label: 'Publica en todas tus redes sociales', action: 'autoCheck' },
      { id: 'day5_stories', label: 'Envía mensaje de lanzamiento a tus contactos', action: 'autoCheck' }
    ]
  },
  6: {
    name: 'Seguimiento post-lanzamiento',
    icon: '🔥',
    desc: 'Responde a todos los que reaccionaron. El seguimiento cierra ventas.',
    tasks: [
      { id: 'day6_publish', label: 'Responde mensajes con ayuda de la IA', action: 'openAgent' },
      { id: 'day6_stories', label: 'Publica 3 stories de seguimiento', action: 'autoCheck' },
      { id: 'day6_contacts', label: 'Actualiza el estado de cada prospecto en CRM', action: 'openCRM' }
    ]
  },
  7: {
    name: 'Agenda tu primer Zoom',
    icon: '📅',
    desc: 'Es hora de cerrar. Agenda reuniones con los interesados.',
    tasks: [
      { id: 'day7_respond', label: 'Identifica prospectos calientes (temp ≥70)', action: 'openCRM' },
      { id: 'day7_meeting', label: 'Agenda tu primera reunión/Zoom', action: 'openAgenda' },
      { id: 'day7_prepare', label: 'Prepárate con el Agente de Cierre', action: 'openAgent' }
    ]
  }
};

function renderOnboarding(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:' + C.textSub + '">Cargando tu ruta...</div>';

  obApi('getProgress').then(function(data) {
    obState.progress = data.progress;
    var p = data.progress || {};
    var tasks = p.tasks || {};
    var currentDay = p.current_day || 1;

    // Check for new achievement from first login
    if (data.newAchievement) {
      showCelebration(data.newAchievement);
    }

    var html = '';

    // Header
    html += '<div style="text-align:center;margin-bottom:24px;">';
    html += '<h2 style="font-size:22px;font-weight:800;margin:0 0 4px;">🗺️ Tu Ruta de 7 Días</h2>';
    html += '<p style="color:' + C.textSub + ';font-size:13px;margin:0;">Sigue cada paso y lanza tu negocio como un profesional</p>';
    html += '</div>';

    // Progress bar
    var completedDays = 0;
    for (var d = 1; d <= 7; d++) {
      var dayTasks = DAY_CONFIG[d].tasks;
      var allDone = dayTasks.every(function(t) { return tasks[t.id]; });
      if (allDone) completedDays = d;
    }
    var pct = Math.round((completedDays / 7) * 100);

    html += '<div style="margin-bottom:24px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<span style="font-size:12px;color:' + C.textSub + '">Progreso general</span>';
    html += '<span style="font-size:14px;font-weight:700;color:' + C.accent + '">' + pct + '%</span>';
    html += '</div>';
    html += '<div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,' + C.accent + ',' + C.green + ');border-radius:4px;transition:width 0.5s ease;"></div>';
    html += '</div>';

    // Day dots
    html += '<div style="display:flex;justify-content:space-between;margin-top:10px;">';
    for (var dd = 1; dd <= 7; dd++) {
      var dayDone = dd <= completedDays;
      var isCurrent = dd === currentDay && !dayDone;
      var dotColor = dayDone ? C.green : (isCurrent ? C.accent : 'rgba(255,255,255,0.15)');
      var dotBorder = isCurrent ? '2px solid ' + C.accent : 'none';
      var dotShadow = isCurrent ? '0 0 8px ' + C.glow : 'none';
      html += '<div style="width:30px;height:30px;border-radius:50%;background:' + dotColor + ';border:' + dotBorder + ';box-shadow:' + dotShadow + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:' + (dayDone ? '#000' : '#fff') + ';">' + (dayDone ? '✓' : dd) + '</div>';
    }
    html += '</div></div>';

    // Day cards
    for (var day = 1; day <= 7; day++) {
      var cfg = DAY_CONFIG[day];
      var dayTaskList = cfg.tasks;
      var doneCount = dayTaskList.filter(function(t) { return tasks[t.id]; }).length;
      var dayComplete = doneCount === dayTaskList.length;
      var isActive = day === currentDay;
      var isLocked = day > currentDay && !dayComplete;
      var isPast = day < currentDay;

      var cardBg = isActive ? 'rgba(28,232,255,0.06)' : C.bgCard;
      var cardBorder = isActive ? '1px solid rgba(28,232,255,0.3)' : dayComplete ? '1px solid rgba(0,230,118,0.3)' : '1px solid ' + C.border;
      var opacity = isLocked ? '0.45' : '1';

      html += '<div style="background:' + cardBg + ';border:' + cardBorder + ';border-radius:16px;padding:20px;margin-bottom:12px;opacity:' + opacity + ';transition:all 0.3s;">';

      // Day header
      html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">';
      html += '<div style="font-size:28px;">' + cfg.icon + '</div>';
      html += '<div style="flex:1;">';
      html += '<div style="display:flex;align-items:center;gap:8px;">';
      html += '<span style="font-size:11px;font-weight:700;text-transform:uppercase;color:' + (dayComplete ? C.green : isActive ? C.accent : C.textSub) + ';letter-spacing:1px;">Día ' + day + '</span>';
      if (dayComplete) html += '<span style="font-size:10px;background:rgba(0,230,118,0.15);color:' + C.green + ';padding:2px 8px;border-radius:10px;">✓ Completado</span>';
      if (isActive) html += '<span style="font-size:10px;background:rgba(28,232,255,0.15);color:' + C.accent + ';padding:2px 8px;border-radius:10px;animation:obPulse 2s infinite;">← Estás aquí</span>';
      html += '</div>';
      html += '<h3 style="font-size:16px;font-weight:700;margin:2px 0 0;">' + cfg.name + '</h3>';
      html += '</div>';
      html += '<div style="font-size:13px;font-weight:700;color:' + (dayComplete ? C.green : C.textSub) + '">' + doneCount + '/' + dayTaskList.length + '</div>';
      html += '</div>';

      html += '<p style="font-size:13px;color:' + C.textSub + ';margin:0 0 12px;">' + cfg.desc + '</p>';

      // Tasks
      if (isActive || isPast || dayComplete) {
        dayTaskList.forEach(function(task) {
          var done = tasks[task.id];
          html += '<div data-task="' + task.id + '" data-action="' + (task.action || '') + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:' + (done ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)') + ';border:1px solid ' + (done ? 'rgba(0,230,118,0.2)' : C.border) + ';border-radius:10px;margin-bottom:6px;cursor:' + (done || isLocked ? 'default' : 'pointer') + ';">';
          html += '<div style="width:22px;height:22px;border-radius:50%;border:2px solid ' + (done ? C.green : 'rgba(255,255,255,0.2)') + ';background:' + (done ? C.green : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:#000;">' + (done ? '✓' : '') + '</div>';
          html += '<span style="font-size:13px;color:' + (done ? 'rgba(255,255,255,0.6)' : '#fff') + ';' + (done ? 'text-decoration:line-through;' : '') + '">' + task.label + '</span>';
          html += '</div>';
        });
      }

      html += '</div>';
    }

    // Completed banner
    if (completedDays >= 7) {
      html += '<div style="text-align:center;padding:30px;background:linear-gradient(135deg,rgba(28,232,255,0.1),rgba(255,215,0,0.1));border:1px solid rgba(255,215,0,0.3);border-radius:16px;margin-top:16px;">';
      html += '<div style="font-size:48px;margin-bottom:8px;">🏆</div>';
      html += '<h3 style="font-size:18px;color:' + C.gold + ';margin:0 0 4px;">¡RUTA COMPLETADA!</h3>';
      html += '<p style="color:' + C.textSub + ';font-size:13px;margin:0;">Has completado los 7 días. Tu negocio está en marcha. ¡Ahora a crecer!</p>';
      html += '</div>';
    }

    container.innerHTML = html;

    // Attach click handlers for tasks
    container.querySelectorAll('[data-task]').forEach(function(el) {
      el.addEventListener('click', function() {
        var taskId = el.getAttribute('data-task');
        var action = el.getAttribute('data-action');
        if (tasks[taskId]) return; // already done
        handleTaskAction(taskId, action, container);
      });
    });
  }).catch(function(e) {
    container.innerHTML = '<p style="color:' + C.red + ';text-align:center;">Error cargando progreso: ' + e.message + '</p>';
  });
}

function handleTaskAction(taskId, action, container) {
  // Actions that navigate to other sections
  if (action === 'openCRM') {
    if (typeof navigate === 'function') navigate('crm');
    return;
  }
  if (action === 'openAgent') {
    if (typeof navigate === 'function') navigate('agentes');
    return;
  }
  if (action === 'openAgenda') {
    if (typeof navigate === 'function') navigate('agenda');
    return;
  }
  if (action === 'openLanding') {
    showToast('Próximamente: Personalización de landing', 'info');
    return;
  }
  if (action === 'startTour') {
    showToast('Próximamente: Tour guiado interactivo', 'info');
    return;
  }
  if (action === 'installPWA') {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
    } else {
      showToast('Abre esta página desde Chrome en tu celular y selecciona "Agregar a pantalla de inicio"', 'info');
    }
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'activatePush') {
    if (typeof window.subscribeToPush === 'function') {
      window.subscribeToPush();
    } else if ('Notification' in window) {
      Notification.requestPermission().then(function(p) {
        if (p === 'granted') showToast('¡Notificaciones activadas!', 'success');
      });
    }
    markTaskComplete(taskId, container);
    return;
  }
  if (action === 'openPhotoEditor') {
    openPhotoEditorModal();
    return;
  }
  if (action === 'openFlyerGen') {
    openFlyerGenerator();
    return;
  }
  // autoCheck tasks — mark directly
  if (action === 'autoCheck') {
    markTaskComplete(taskId, container);
  }
}

function markTaskComplete(taskId, container) {
  obApi('completeTask', { taskId: taskId }).then(function(result) {
    // Check for auto achievements
    obApi('checkAchievements').then(function(achResult) {
      if (achResult.newAchievements && achResult.newAchievements.length > 0) {
        achResult.newAchievements.forEach(function(a) {
          showCelebration(a);
        });
      }
    });
    // Re-render
    renderOnboarding(container);
    showToast('¡Tarea completada! 🎉', 'success');
  });
}


// ══════════════════════════════════════════════════════════
// 2. SISTEMA DE LOGROS Y CELEBRACIONES
// ══════════════════════════════════════════════════════════

function renderAchievements(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:' + C.textSub + '">Cargando logros...</div>';

  obApi('getAchievements').then(function(data) {
    obState.achievements = data.achievements || [];
    obState.achievementDefs = data.definitions || {};
    var unlocked = {};
    obState.achievements.forEach(function(a) { unlocked[a.achievement_id] = a.unlocked_at; });

    var html = '';
    html += '<div style="text-align:center;margin-bottom:24px;">';
    html += '<h2 style="font-size:22px;font-weight:800;margin:0 0 4px;">🏆 Mis Logros</h2>';
    html += '<p style="color:' + C.textSub + ';font-size:13px;margin:0;">Cada acción te acerca a tu primera venta</p>';
    html += '<div style="margin-top:12px;font-size:32px;font-weight:900;color:' + C.gold + '">' + obState.achievements.length + '<span style="font-size:16px;color:' + C.textSub + '">/' + Object.keys(obState.achievementDefs).length + '</span></div>';
    html += '</div>';

    // Achievement grid
    var defKeys = Object.keys(obState.achievementDefs);
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    defKeys.forEach(function(key) {
      var def = obState.achievementDefs[key];
      var isUnlocked = !!unlocked[key];
      var opacity = isUnlocked ? '1' : '0.35';
      var bg = isUnlocked ? 'linear-gradient(135deg,rgba(255,215,0,0.08),rgba(28,232,255,0.05))' : C.bgCard;
      var border = isUnlocked ? '1px solid rgba(255,215,0,0.25)' : '1px solid ' + C.border;

      html += '<div style="background:' + bg + ';border:' + border + ';border-radius:14px;padding:16px;text-align:center;opacity:' + opacity + ';transition:all 0.3s;">';
      html += '<div style="font-size:32px;margin-bottom:6px;' + (isUnlocked ? 'filter:none;' : 'filter:grayscale(1);') + '">' + def.icon + '</div>';
      html += '<div style="font-size:13px;font-weight:700;margin-bottom:2px;">' + def.name + '</div>';
      if (isUnlocked) {
        var date = new Date(unlocked[key]);
        html += '<div style="font-size:10px;color:' + C.green + '">✓ ' + date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + '</div>';
      } else {
        html += '<div style="font-size:10px;color:' + C.textSub + '">🔒 Bloqueado</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  });
}

// Celebration animation
function showCelebration(achievement) {
  var overlay = document.createElement('div');
  overlay.id = 'ob-celebration';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);animation:obFadeIn 0.3s ease;';

  overlay.innerHTML = '<div style="text-align:center;animation:obBounceIn 0.6s ease;">' +
    '<div id="ob-confetti-zone" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;"></div>' +
    '<div style="font-size:72px;margin-bottom:12px;filter:drop-shadow(0 0 20px rgba(255,215,0,0.5));animation:obPulse 1s infinite;">' + achievement.icon + '</div>' +
    '<h2 style="font-size:24px;font-weight:900;color:' + C.gold + ';margin:0 0 6px;text-shadow:0 0 20px rgba(255,215,0,0.3);">¡LOGRO DESBLOQUEADO!</h2>' +
    '<h3 style="font-size:18px;font-weight:700;color:#fff;margin:0 0 10px;">' + achievement.name + '</h3>' +
    '<p style="font-size:14px;color:' + C.textSub + ';margin:0 20px 24px;max-width:300px;">' + achievement.msg + '</p>' +
    '<button onclick="this.closest(\'#ob-celebration\').remove()" style="padding:10px 32px;border:none;border-radius:10px;background:linear-gradient(135deg,' + C.accent + ',' + C.green + ');color:#000;font-weight:700;font-size:14px;cursor:pointer;">¡Genial!</button>' +
    '</div>';

  document.body.appendChild(overlay);
  launchConfetti();

  // Auto close after 6s
  setTimeout(function() {
    var el = document.getElementById('ob-celebration');
    if (el) el.remove();
  }, 6000);
}

function launchConfetti() {
  var zone = document.getElementById('ob-confetti-zone');
  if (!zone) return;
  var colors = [C.gold, C.accent, C.green, '#FF6B6B', '#E040FB', '#FF9800'];
  for (var i = 0; i < 60; i++) {
    var p = document.createElement('div');
    var size = Math.random() * 8 + 4;
    var left = Math.random() * 100;
    var delay = Math.random() * 0.5;
    var dur = Math.random() * 2 + 1.5;
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = 'position:absolute;top:-10px;left:' + left + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';animation:obConfettiFall ' + dur + 's ease ' + delay + 's forwards;opacity:0;';
    zone.appendChild(p);
  }
}


// ══════════════════════════════════════════════════════════
// 3. DASHBOARD SIMPLIFICADO — "MI PROGRESO"
// ══════════════════════════════════════════════════════════

function renderDashboard(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:' + C.textSub + '">Cargando dashboard...</div>';

  obApi('getDashboard').then(function(data) {
    obState.dashboard = data;
    var html = '';

    html += '<div style="text-align:center;margin-bottom:20px;">';
    html += '<h2 style="font-size:22px;font-weight:800;margin:0 0 4px;">📊 Mi Progreso</h2>';
    html += '<p style="color:' + C.textSub + ';font-size:13px;margin:0;">Tu resumen diario en un vistazo</p>';
    html += '</div>';

    // 3 big metric cards
    var metrics = [
      {
        label: 'Contactos hoy',
        value: data.contactsToday || 0,
        icon: '💬',
        color: data.contactsToday >= 3 ? C.green : data.contactsToday >= 1 ? C.orange : C.red,
        target: 3,
        hint: data.contactsToday >= 3 ? '¡Excelente ritmo!' : 'Meta: 3 contactos diarios'
      },
      {
        label: 'Reuniones semana',
        value: data.meetingsThisWeek || 0,
        icon: '📅',
        color: data.meetingsThisWeek >= 2 ? C.green : data.meetingsThisWeek >= 1 ? C.orange : C.red,
        target: 2,
        hint: data.meetingsThisWeek >= 2 ? '¡Gran semana!' : 'Meta: 2 reuniones semanales'
      },
      {
        label: 'Cierres del mes',
        value: data.closesThisMonth || 0,
        icon: '💰',
        color: data.closesThisMonth >= 1 ? C.green : C.red,
        target: 3,
        hint: data.closesThisMonth >= 1 ? '¡Ya empezaste a cerrar!' : 'Meta: 3 cierres mensuales'
      }
    ];

    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">';
    metrics.forEach(function(m) {
      html += '<div style="background:' + C.bgCard + ';border:1px solid ' + C.border + ';border-radius:14px;padding:16px;text-align:center;">';
      html += '<div style="font-size:28px;margin-bottom:4px;">' + m.icon + '</div>';
      html += '<div style="font-size:36px;font-weight:900;color:' + m.color + ';">' + m.value + '</div>';
      html += '<div style="font-size:11px;color:' + C.textSub + ';margin-top:2px;">' + m.label + '</div>';
      // Traffic light dot
      html += '<div style="width:8px;height:8px;border-radius:50%;background:' + m.color + ';margin:6px auto 0;box-shadow:0 0 6px ' + m.color + ';"></div>';
      html += '<div style="font-size:9px;color:' + C.textSub + ';margin-top:4px;">' + m.hint + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Onboarding progress (if not completed)
    if (data.onboarding && !data.onboarding.completed_at) {
      var ob = data.onboarding;
      var dayPct = Math.round(((ob.current_day - 1) / 7) * 100);
      html += '<div style="background:rgba(28,232,255,0.04);border:1px solid rgba(28,232,255,0.15);border-radius:14px;padding:16px;margin-bottom:14px;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
      html += '<span style="font-size:13px;font-weight:700;">🗺️ Ruta de 7 Días</span>';
      html += '<span style="font-size:12px;color:' + C.accent + ';font-weight:700;">Día ' + ob.current_day + '/7</span>';
      html += '</div>';
      html += '<div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">';
      html += '<div style="height:100%;width:' + dayPct + '%;background:' + C.accent + ';border-radius:3px;"></div>';
      html += '</div>';
      html += '<div style="text-align:center;margin-top:10px;">';
      html += '<button onclick="obNavigate(\'onboarding\')" style="padding:8px 20px;border:none;border-radius:8px;background:' + C.accent + ';color:#000;font-weight:700;font-size:12px;cursor:pointer;">Continuar mi ruta →</button>';
      html += '</div></div>';
    }

    // Achievement progress
    html += '<div style="background:' + C.bgCard + ';border:1px solid ' + C.border + ';border-radius:14px;padding:16px;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
    html += '<span style="font-size:13px;font-weight:700;">🏆 Logros</span>';
    html += '<span style="font-size:12px;color:' + C.gold + ';font-weight:700;">' + (data.achievementCount || 0) + '/' + (data.totalAchievements || 12) + '</span>';
    html += '</div>';
    var achPct = Math.round(((data.achievementCount || 0) / (data.totalAchievements || 12)) * 100);
    html += '<div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + achPct + '%;background:' + C.gold + ';border-radius:3px;"></div>';
    html += '</div>';
    html += '<div style="text-align:center;margin-top:10px;">';
    html += '<button onclick="obNavigate(\'achievements\')" style="padding:8px 20px;border:none;border-radius:8px;background:rgba(255,215,0,0.15);color:' + C.gold + ';font-weight:700;font-size:12px;cursor:pointer;border:1px solid rgba(255,215,0,0.2);">Ver mis logros</button>';
    html += '</div></div>';

    container.innerHTML = html;
  });
}


// ══════════════════════════════════════════════════════════
// 4. COACH IA FLOTANTE
// ══════════════════════════════════════════════════════════

function initCoachButton() {
  if (document.getElementById('ob-coach-btn')) return;

  var btn = document.createElement('div');
  btn.id = 'ob-coach-btn';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,' + C.accent + ',#0a8f9e);box-shadow:0 4px 20px rgba(28,232,255,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9990;transition:transform 0.2s;';
  btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  btn.title = 'Coach IA';

  btn.addEventListener('mouseenter', function() { btn.style.transform = 'scale(1.1)'; });
  btn.addEventListener('mouseleave', function() { btn.style.transform = 'scale(1)'; });
  btn.addEventListener('click', function() { toggleCoachPanel(); });

  document.body.appendChild(btn);
}

function toggleCoachPanel() {
  var panel = document.getElementById('ob-coach-panel');
  if (panel) {
    panel.remove();
    obState.coachOpen = false;
    return;
  }
  obState.coachOpen = true;
  createCoachPanel();
}

function createCoachPanel() {
  var panel = document.createElement('div');
  panel.id = 'ob-coach-panel';
  panel.style.cssText = 'position:fixed;bottom:86px;right:20px;width:340px;max-height:460px;background:' + C.bg + ';border:1px solid rgba(28,232,255,0.2);border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,0.6);z-index:9991;display:flex;flex-direction:column;overflow:hidden;animation:obSlideUp 0.3s ease;';

  // Header
  var header = '<div style="padding:14px 16px;background:rgba(28,232,255,0.06);border-bottom:1px solid ' + C.border + ';display:flex;align-items:center;gap:10px;">';
  header += '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,' + C.accent + ',#0a8f9e);display:flex;align-items:center;justify-content:center;font-size:18px;">🤖</div>';
  header += '<div style="flex:1;"><div style="font-size:14px;font-weight:700;">Coach IA Sky Team</div>';
  header += '<div style="font-size:10px;color:' + C.green + ';">● En línea</div></div>';
  header += '<div onclick="toggleCoachPanel()" style="cursor:pointer;color:' + C.textSub + ';font-size:20px;">✕</div>';
  header += '</div>';

  // Messages area
  var messages = '<div id="ob-coach-messages" style="flex:1;overflow-y:auto;padding:14px;min-height:200px;">';
  messages += '<div style="text-align:center;padding:10px;"><div style="display:inline-block;background:rgba(28,232,255,0.06);border-radius:12px;padding:10px 14px;font-size:13px;color:' + C.textSub + ';">Cargando contexto...</div></div>';
  messages += '</div>';

  // Input
  var input = '<div style="padding:10px 14px;border-top:1px solid ' + C.border + ';display:flex;gap:8px;">';
  input += '<input id="ob-coach-input" type="text" placeholder="Escribe tu pregunta..." style="flex:1;padding:10px 14px;border:1px solid ' + C.border + ';border-radius:10px;background:rgba(255,255,255,0.04);color:#fff;font-size:13px;outline:none;font-family:Nunito,sans-serif;" />';
  input += '<button id="ob-coach-send" style="padding:10px 14px;border:none;border-radius:10px;background:' + C.accent + ';color:#000;font-weight:700;font-size:13px;cursor:pointer;">→</button>';
  input += '</div>';

  panel.innerHTML = header + messages + input;
  document.body.appendChild(panel);

  // Load coach context and initial message
  loadCoachContext();

  // Event listeners
  document.getElementById('ob-coach-send').addEventListener('click', sendCoachMessage);
  document.getElementById('ob-coach-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendCoachMessage();
  });
}

function loadCoachContext() {
  obApi('getCoachContext').then(function(ctx) {
    obState.coachContext = ctx;
    var msgArea = document.getElementById('ob-coach-messages');
    if (!msgArea) return;

    // Generate contextual greeting
    var greeting = '';
    if (ctx.isNewUser) {
      greeting = '¡Hola! 👋 Soy tu Coach IA. Estoy aquí para guiarte en cada paso de tu negocio. ¿Empezamos con tu Ruta de 7 Días?';
    } else if (ctx.onboardingDay <= 7) {
      greeting = '¡Hola! Estás en el Día ' + ctx.onboardingDay + ' de tu ruta. ';
      if (ctx.staleProspects.length > 0) {
        greeting += 'Veo que ' + ctx.staleProspects[0] + ' lleva días sin seguimiento. ¿Quieres que te ayude a escribirle?';
      } else {
        greeting += '¿En qué te puedo ayudar hoy?';
      }
    } else {
      if (ctx.staleProspects.length > 0) {
        greeting = 'Tienes ' + ctx.staleProspects.length + ' prospectos esperando respuesta. ¿Empezamos con ' + ctx.staleProspects[0] + '?';
      } else if (ctx.hotProspects > 0) {
        greeting = '¡' + ctx.hotProspects + ' prospectos calientes! Es momento de agendar reuniones. ¿Te ayudo?';
      } else {
        greeting = '¿En qué te puedo ayudar hoy? Puedo ayudarte con mensajes, seguimiento, o preparar tu próxima reunión.';
      }
    }

    msgArea.innerHTML = renderCoachBubble(greeting, 'bot');
    obState.coachMessages = [{ role: 'assistant', content: greeting }];
  });
}

function renderCoachBubble(text, role) {
  var isBot = role === 'bot' || role === 'assistant';
  var align = isBot ? 'flex-start' : 'flex-end';
  var bg = isBot ? 'rgba(28,232,255,0.08)' : 'rgba(255,255,255,0.08)';
  var border = isBot ? 'rgba(28,232,255,0.15)' : C.border;
  return '<div style="display:flex;justify-content:' + align + ';margin-bottom:8px;">' +
    '<div style="max-width:85%;padding:10px 14px;background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;font-size:13px;line-height:1.5;">' + text + '</div></div>';
}

function sendCoachMessage() {
  var input = document.getElementById('ob-coach-input');
  var msgArea = document.getElementById('ob-coach-messages');
  if (!input || !msgArea) return;

  var text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Show user message
  msgArea.innerHTML += renderCoachBubble(text, 'user');
  obState.coachMessages.push({ role: 'user', content: text });

  // Show typing indicator
  msgArea.innerHTML += '<div id="ob-coach-typing" style="display:flex;justify-content:flex-start;margin-bottom:8px;"><div style="padding:10px 14px;background:rgba(28,232,255,0.08);border:1px solid rgba(28,232,255,0.15);border-radius:12px;font-size:13px;color:' + C.textSub + ';">Pensando...</div></div>';
  msgArea.scrollTop = msgArea.scrollHeight;

  // Build coach system prompt with context
  var ctx = obState.coachContext || {};
  var sysPrompt = 'Eres el Coach IA de Sky Team. Tu rol es guiar socios nuevos para lograr sus primeras ventas. ' +
    'Sé motivador, conciso y práctico. Siempre da pasos concretos. ' +
    'Contexto del usuario: Día de onboarding: ' + (ctx.onboardingDay || '?') +
    ', Prospectos: ' + (ctx.prospectCount || 0) +
    ', Prospectos calientes: ' + (ctx.hotProspects || 0) +
    ', Sin seguimiento: ' + (ctx.staleProspects ? ctx.staleProspects.join(', ') : 'ninguno') +
    ', Logros: ' + (ctx.achievementsUnlocked ? ctx.achievementsUnlocked.length : 0) + '/12.' +
    ' Responde en español, máximo 3 oraciones. Si el usuario necesita un script de mensaje, escríbelo listo para copiar.';

  var messages = obState.coachMessages.map(function(m) {
    return { role: m.role, content: m.content };
  });

  // Call chat API
  fetch(CHAT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages,
      systemPrompt: sysPrompt,
      agent: 'coach'
    }),
    cache: 'no-store'
  }).then(function(r) { return r.json(); }).then(function(data) {
    var typing = document.getElementById('ob-coach-typing');
    if (typing) typing.remove();

    var reply = data.reply || data.content || data.message || 'No pude procesar tu pregunta. Intenta de nuevo.';
    obState.coachMessages.push({ role: 'assistant', content: reply });
    if (msgArea) {
      msgArea.innerHTML += renderCoachBubble(reply, 'bot');
      msgArea.scrollTop = msgArea.scrollHeight;
    }
  }).catch(function(e) {
    var typing = document.getElementById('ob-coach-typing');
    if (typing) typing.remove();
    if (msgArea) {
      msgArea.innerHTML += renderCoachBubble('Error de conexión. Intenta de nuevo.', 'bot');
    }
  });
}


// ══════════════════════════════════════════════════════════
// 5. SCRIPT BANK — Mensajes Listos
// ══════════════════════════════════════════════════════════

// Hardcoded scripts (also loaded from API if available)
var DEFAULT_SCRIPTS = [
  { category: 'primer_contacto', title: 'Primer contacto — Curiosidad', message: 'Hola [NOMBRE], ¿cómo estás? Oye, empecé un proyecto digital que está creciendo mucho y pensé en ti. ¿Te puedo compartir una info rápida? Sin compromiso 😊' },
  { category: 'primer_contacto', title: 'Primer contacto — Directo', message: 'Hey [NOMBRE]! Estoy trabajando en algo interesante y creo que te puede beneficiar. ¿Tienes 2 minutos para que te cuente?' },
  { category: 'primer_contacto', title: 'Primer contacto — Social', message: '[NOMBRE]! Vi tu historia y me acordé de ti. Oye, arranqué un proyecto nuevo y me encantaría tu opinión. ¿Te puedo enviar un video corto?' },
  { category: 'de_que_se_trata', title: 'Respuesta: ¿De qué se trata?', message: 'Es una franquicia digital de turismo y bienestar. Básicamente ayudas a personas a ahorrar en viajes y generas ingresos por eso. Lo padre es que todo es desde tu celular. ¿Te mando un video de 3 minutos que lo explica mejor?' },
  { category: 'de_que_se_trata', title: 'Respuesta: ¿Es de ventas?', message: 'No es vender puerta a puerta ni nada así. Es más como recomendar una plataforma de turismo. Como cuando recomiendas un restaurante pero aquí te pagan por eso. ¿Te interesa saber más?' },
  { category: 'de_que_se_trata', title: 'Respuesta: ¿Es pirámide?', message: 'Excelente pregunta, es bueno ser precavido. No, es una franquicia real con productos de turismo. Tú ganas por ventas reales de paquetes, no por meter gente. Te puedo enseñar exactamente cómo funciona si quieres.' },
  { category: 'seguimiento_2', title: 'Seguimiento — Día 2', message: 'Hola [NOMBRE], ¿pudiste ver la info que te compartí? Me encantaría saber qué opinas 😊' },
  { category: 'seguimiento_2', title: 'Seguimiento — Visto sin respuesta', message: 'Hey [NOMBRE]! Sé que estás ocupado(a). Solo quería saber si tienes alguna duda sobre lo que te compartí. Estoy aquí para cualquier pregunta 🙌' },
  { category: 'seguimiento_5', title: 'Seguimiento — Día 5', message: 'Hola [NOMBRE], pasando a saludar. Tengo novedades del proyecto que creo te van a interesar. ¿Cuándo tienes 5 minutos para platicar?' },
  { category: 'seguimiento_5', title: 'Seguimiento — Reactivación', message: '[NOMBRE], ¿recuerdas el proyecto que te comenté? Acaba de salir algo nuevo que está dando muy buenos resultados. ¿Te cuento rápido?' },
  { category: 'invitar_zoom', title: 'Invitación a Zoom — Casual', message: '¿Qué te parece si nos conectamos 15 minutos por Zoom? Te muestro todo con pantalla compartida y así resuelvo todas tus dudas. ¿Te va bien mañana a las [HORA]?' },
  { category: 'invitar_zoom', title: 'Invitación a Zoom — Urgencia', message: '[NOMBRE], esta semana estamos con una promo especial. Si quieres aprovecharla, ¿nos conectamos hoy o mañana 15 min por Zoom? Te explico todo.' },
  { category: 'invitar_zoom', title: 'Invitación a Zoom — Profesional', message: 'Te agendo una reunión corta de 15 min donde te muestro el plan completo con números reales. ¿Prefieres por la mañana o por la tarde?' },
  { category: 'post_zoom', title: 'Post-Zoom — Cierre suave', message: '¡Gracias por tu tiempo [NOMBRE]! Como viste, el plan es claro y los resultados son reales. ¿Qué es lo que más te llamó la atención?' },
  { category: 'post_zoom', title: 'Post-Zoom — Cierre directo', message: '[NOMBRE], ya viste toda la info y los resultados del equipo. La pregunta es: ¿estás listo(a) para empezar? Te acompaño paso a paso desde el día uno.' },
  { category: 'reactivacion', title: 'Reactivación — Prospecto frío', message: 'Hola [NOMBRE], ¿cómo has estado? Han pasado unas semanas desde que platicamos. El equipo ha crecido mucho desde entonces. ¿Te gustaría saber qué hay de nuevo?' },
  { category: 'reactivacion', title: 'Reactivación — Testimonio', message: '[NOMBRE]! Quería compartirte algo: [TESTIMONIO] acaba de hacer su primera venta esta semana. Empezó igual que tú, sin experiencia. ¿Te animas a retomarlo?' }
];

var CATEGORY_LABELS = {
  primer_contacto: { label: 'Primer contacto', icon: '👋', color: C.accent },
  de_que_se_trata: { label: '¿De qué se trata?', icon: '❓', color: '#E040FB' },
  seguimiento_2: { label: 'Seguimiento — Día 2', icon: '📩', color: C.orange },
  seguimiento_5: { label: 'Seguimiento — Día 5+', icon: '🔄', color: '#FF6B6B' },
  invitar_zoom: { label: 'Invitación a Zoom', icon: '📹', color: C.green },
  post_zoom: { label: 'Post-Zoom cierre', icon: '🎯', color: C.gold },
  reactivacion: { label: 'Reactivación', icon: '🧊', color: '#90CAF9' }
};

function renderScriptBank(container) {
  var scripts = DEFAULT_SCRIPTS; // Can merge with API scripts later

  var html = '';
  html += '<div style="text-align:center;margin-bottom:20px;">';
  html += '<h2 style="font-size:22px;font-weight:800;margin:0 0 4px;">📝 Banco de Scripts</h2>';
  html += '<p style="color:' + C.textSub + ';font-size:13px;margin:0;">Mensajes listos para copiar y personalizar</p>';
  html += '</div>';

  // Prospect name input
  html += '<div style="margin-bottom:16px;padding:12px;background:rgba(28,232,255,0.04);border:1px solid rgba(28,232,255,0.15);border-radius:12px;">';
  html += '<label style="font-size:11px;color:' + C.textSub + ';display:block;margin-bottom:4px;">Nombre del prospecto (se reemplaza en los scripts)</label>';
  html += '<input id="ob-script-name" type="text" placeholder="Ej: Carlos" style="width:100%;padding:8px 12px;border:1px solid ' + C.border + ';border-radius:8px;background:rgba(255,255,255,0.04);color:#fff;font-size:14px;outline:none;font-family:Nunito,sans-serif;box-sizing:border-box;" />';
  html += '</div>';

  // Group by category
  var categories = {};
  scripts.forEach(function(s) {
    if (!categories[s.category]) categories[s.category] = [];
    categories[s.category].push(s);
  });

  Object.keys(categories).forEach(function(cat) {
    var catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: '📄', color: C.accent };
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
    html += '<span style="font-size:18px;">' + catInfo.icon + '</span>';
    html += '<span style="font-size:14px;font-weight:700;color:' + catInfo.color + '">' + catInfo.label + '</span>';
    html += '<span style="font-size:11px;color:' + C.textSub + '">(' + categories[cat].length + ')</span>';
    html += '</div>';

    categories[cat].forEach(function(script, idx) {
      html += '<div style="background:' + C.bgCard + ';border:1px solid ' + C.border + ';border-radius:12px;padding:14px;margin-bottom:6px;">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
      html += '<span style="font-size:12px;font-weight:700;">' + script.title + '</span>';
      html += '<button data-script-idx="' + cat + '-' + idx + '" class="ob-copy-btn" style="padding:4px 12px;border:1px solid rgba(28,232,255,0.2);border-radius:6px;background:rgba(28,232,255,0.06);color:' + C.accent + ';font-size:11px;font-weight:600;cursor:pointer;">Copiar</button>';
      html += '</div>';
      html += '<div class="ob-script-text" data-raw="' + encodeURIComponent(script.message) + '" style="font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5;">' + script.message.replace(/\[NOMBRE\]/g, '<span style="color:' + C.accent + ';font-weight:600;">[NOMBRE]</span>') + '</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;

  // Copy handlers
  container.querySelectorAll('.ob-copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var scriptEl = btn.closest('div').parentElement.querySelector('.ob-script-text');
      var raw = decodeURIComponent(scriptEl.getAttribute('data-raw'));
      var nameInput = document.getElementById('ob-script-name');
      var name = nameInput ? nameInput.value.trim() : '';
      var text = name ? raw.replace(/\[NOMBRE\]/g, name) : raw.replace(/\[NOMBRE\]/g, '');
      text = text.replace(/\[HORA\]/g, '').replace(/\[TESTIMONIO\]/g, '');

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          btn.textContent = '✓ Copiado';
          btn.style.color = C.green;
          btn.style.borderColor = C.green;
          setTimeout(function() { btn.textContent = 'Copiar'; btn.style.color = C.accent; btn.style.borderColor = 'rgba(28,232,255,0.2)'; }, 2000);
        });
      }
    });
  });

  // Name input listener to update previews
  var nameInput = document.getElementById('ob-script-name');
  if (nameInput) {
    nameInput.addEventListener('input', function() {
      var name = nameInput.value.trim() || '[NOMBRE]';
      container.querySelectorAll('.ob-script-text').forEach(function(el) {
        var raw = decodeURIComponent(el.getAttribute('data-raw'));
        el.innerHTML = raw.replace(/\[NOMBRE\]/g, '<span style="color:' + C.accent + ';font-weight:600;">' + name + '</span>');
      });
    });
  }
}


// ══════════════════════════════════════════════════════════
// 6. PHOTO EDITOR MODAL — Upload & AI Professional Photo
// ══════════════════════════════════════════════════════════

function openPhotoEditorModal() {
  var modal = document.createElement('div');
  modal.id = 'ob-photo-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:obFadeIn 0.3s;';

  var content = '<div style="background:' + C.bg + ';border:1px solid ' + C.border + ';border-radius:20px;padding:24px;max-width:420px;width:90%;max-height:85vh;overflow-y:auto;">';

  // Header
  content += '<div style="text-align:center;margin-bottom:20px;">';
  content += '<div style="font-size:48px;margin-bottom:8px;">📸</div>';
  content += '<h2 style="font-size:20px;font-weight:800;margin:0 0 4px;">Tu Imagen Profesional</h2>';
  content += '<p style="color:' + C.textSub + ';font-size:12px;margin:0;">Sube tu foto y la IA te la transforma en una imagen ejecutiva de alto nivel</p>';
  content += '</div>';

  // Example section
  content += '<div style="background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.15);border-radius:12px;padding:14px;margin-bottom:16px;text-align:center;">';
  content += '<p style="font-size:12px;color:' + C.gold + ';font-weight:700;margin:0 0 8px;">Así quedará tu foto:</p>';
  content += '<div style="display:flex;justify-content:center;gap:12px;">';
  content += '<div style="width:80px;height:100px;border-radius:8px;background:linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%);border:2px solid ' + C.gold + ';display:flex;align-items:center;justify-content:center;flex-direction:column;">';
  content += '<div style="width:35px;height:35px;border-radius:50%;background:rgba(255,255,255,0.15);margin-bottom:4px;">👤</div>';
  content += '<div style="font-size:8px;color:' + C.textSub + ';">Traje negro</div></div>';
  content += '<div style="width:80px;height:100px;border-radius:8px;background:linear-gradient(180deg,#1a1a2e 0%,#0f0f23 100%);border:2px solid ' + C.accent + ';display:flex;align-items:center;justify-content:center;flex-direction:column;">';
  content += '<div style="width:35px;height:35px;border-radius:50%;background:rgba(255,255,255,0.15);margin-bottom:4px;">👤</div>';
  content += '<div style="font-size:8px;color:' + C.textSub + ';">Azul oscuro</div></div>';
  content += '</div></div>';

  // Upload area
  content += '<div id="ob-photo-upload-area" style="border:2px dashed rgba(28,232,255,0.3);border-radius:14px;padding:30px;text-align:center;cursor:pointer;transition:all 0.3s;margin-bottom:16px;">';
  content += '<div style="font-size:36px;margin-bottom:8px;">📤</div>';
  content += '<p style="font-size:14px;font-weight:600;margin:0 0 4px;">Toca para subir tu foto</p>';
  content += '<p style="font-size:11px;color:' + C.textSub + ';margin:0;">JPG o PNG, de preferencia que se vea tu cara clara</p>';
  content += '<input type="file" id="ob-photo-input" accept="image/*" style="display:none;" />';
  content += '</div>';

  // Preview area (hidden initially)
  content += '<div id="ob-photo-preview" style="display:none;text-align:center;margin-bottom:16px;">';
  content += '<img id="ob-photo-img" style="max-width:200px;max-height:200px;border-radius:12px;border:2px solid ' + C.accent + ';" />';
  content += '<p style="font-size:11px;color:' + C.green + ';margin:8px 0 0;">✓ Foto cargada</p>';
  content += '</div>';

  // Options
  content += '<div id="ob-photo-options" style="display:none;margin-bottom:16px;">';

  // Suit color
  content += '<div style="margin-bottom:12px;">';
  content += '<label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;">Color del traje:</label>';
  content += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  var suitColors = [
    { id: 'black', label: 'Negro', color: '#1a1a1a' },
    { id: 'dark_blue', label: 'Azul oscuro', color: '#0a1628' },
    { id: 'navy', label: 'Azul marino', color: '#001f3f' },
    { id: 'charcoal', label: 'Gris oscuro', color: '#333' }
  ];
  suitColors.forEach(function(sc, i) {
    var sel = i === 0 ? 'border:2px solid ' + C.accent + ';' : 'border:2px solid transparent;';
    content += '<div class="ob-suit-color" data-suit="' + sc.id + '" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(255,255,255,0.04);border-radius:8px;cursor:pointer;' + sel + '">';
    content += '<div style="width:20px;height:20px;border-radius:4px;background:' + sc.color + ';border:1px solid rgba(255,255,255,0.2);"></div>';
    content += '<span style="font-size:12px;">' + sc.label + '</span></div>';
  });
  content += '</div></div>';

  // Shirt color
  content += '<div style="margin-bottom:12px;">';
  content += '<label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;">Camisa:</label>';
  content += '<div style="display:flex;gap:8px;">';
  var shirtColors = [
    { id: 'white', label: 'Blanca', color: '#f5f5f5' },
    { id: 'light_blue', label: 'Celeste', color: '#b3d4fc' },
    { id: 'light_gray', label: 'Gris claro', color: '#ddd' }
  ];
  shirtColors.forEach(function(sc, i) {
    var sel = i === 0 ? 'border:2px solid ' + C.accent + ';' : 'border:2px solid transparent;';
    content += '<div class="ob-shirt-color" data-shirt="' + sc.id + '" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(255,255,255,0.04);border-radius:8px;cursor:pointer;' + sel + '">';
    content += '<div style="width:20px;height:20px;border-radius:4px;background:' + sc.color + ';border:1px solid rgba(255,255,255,0.2);"></div>';
    content += '<span style="font-size:12px;">' + sc.label + '</span></div>';
  });
  content += '</div></div>';

  // Tie
  content += '<div style="margin-bottom:16px;">';
  content += '<label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;">¿Con corbata?</label>';
  content += '<div style="display:flex;gap:8px;">';
  content += '<div class="ob-tie-opt" data-tie="yes" style="padding:8px 16px;background:rgba(255,255,255,0.04);border:2px solid ' + C.accent + ';border-radius:8px;cursor:pointer;font-size:12px;">👔 Sí</div>';
  content += '<div class="ob-tie-opt" data-tie="no" style="padding:8px 16px;background:rgba(255,255,255,0.04);border:2px solid transparent;border-radius:8px;cursor:pointer;font-size:12px;">🎽 No</div>';
  content += '</div></div>';

  // Gender
  content += '<div style="margin-bottom:16px;">';
  content += '<label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;">Estilo:</label>';
  content += '<div style="display:flex;gap:8px;">';
  content += '<div class="ob-gender-opt" data-gender="male" style="padding:8px 16px;background:rgba(255,255,255,0.04);border:2px solid ' + C.accent + ';border-radius:8px;cursor:pointer;font-size:12px;">👨 Masculino</div>';
  content += '<div class="ob-gender-opt" data-gender="female" style="padding:8px 16px;background:rgba(255,255,255,0.04);border:2px solid transparent;border-radius:8px;cursor:pointer;font-size:12px;">👩 Femenino</div>';
  content += '</div></div>';

  content += '</div>'; // end options

  // Generate button
  content += '<button id="ob-photo-generate" style="display:none;width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,' + C.accent + ',' + C.green + ');color:#000;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:10px;">🎨 Generar Mi Foto Profesional</button>';

  // Result area
  content += '<div id="ob-photo-result" style="display:none;text-align:center;"></div>';

  // Close button
  content += '<button onclick="document.getElementById(\'ob-photo-modal\').remove()" style="width:100%;padding:10px;border:1px solid ' + C.border + ';border-radius:10px;background:transparent;color:' + C.textSub + ';font-size:13px;cursor:pointer;">Cerrar</button>';

  content += '</div>';
  modal.innerHTML = content;
  document.body.appendChild(modal);

  // Event listeners
  var uploadArea = document.getElementById('ob-photo-upload-area');
  var fileInput = document.getElementById('ob-photo-input');
  var selectedOptions = { suit: 'black', shirt: 'white', tie: 'yes', gender: 'male' };

  uploadArea.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('ob-photo-img').src = e.target.result;
        document.getElementById('ob-photo-preview').style.display = 'block';
        document.getElementById('ob-photo-options').style.display = 'block';
        document.getElementById('ob-photo-generate').style.display = 'block';
        uploadArea.style.display = 'none';
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  });

  // Option selectors
  function setupOptionGroup(className, dataAttr, stateKey) {
    setTimeout(function() {
      document.querySelectorAll('.' + className).forEach(function(el) {
        el.addEventListener('click', function() {
          document.querySelectorAll('.' + className).forEach(function(x) { x.style.borderColor = 'transparent'; });
          el.style.borderColor = C.accent;
          selectedOptions[stateKey] = el.getAttribute(dataAttr);
        });
      });
    }, 100);
  }
  setupOptionGroup('ob-suit-color', 'data-suit', 'suit');
  setupOptionGroup('ob-shirt-color', 'data-shirt', 'shirt');
  setupOptionGroup('ob-tie-opt', 'data-tie', 'tie');
  setupOptionGroup('ob-gender-opt', 'data-gender', 'gender');

  // Generate handler
  setTimeout(function() {
    var genBtn = document.getElementById('ob-photo-generate');
    if (genBtn) {
      genBtn.addEventListener('click', function() {
        genBtn.disabled = true;
        genBtn.textContent = '⏳ Generando tu foto profesional...';
        genBtn.style.opacity = '0.6';

        // For now, show placeholder — actual API integration will be via api/onboarding.js
        var result = document.getElementById('ob-photo-result');
        setTimeout(function() {
          result.style.display = 'block';
          result.innerHTML = '<div style="padding:20px;background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.2);border-radius:14px;">' +
            '<p style="font-size:14px;color:' + C.gold + ';font-weight:700;margin:0 0 8px;">🎨 Generación de foto profesional</p>' +
            '<p style="font-size:12px;color:' + C.textSub + ';margin:0 0 12px;">Opciones seleccionadas: Traje ' + selectedOptions.suit + ', Camisa ' + selectedOptions.shirt + ', ' + (selectedOptions.tie === 'yes' ? 'Con corbata' : 'Sin corbata') + ', Estilo ' + selectedOptions.gender + '</p>' +
            '<p style="font-size:12px;color:' + C.accent + ';margin:0;">Esta función se activará cuando conectemos la API de OpenAI. Costo estimado: ~$0.04 por generación.</p>' +
            '</div>';
          genBtn.textContent = '🔄 Regenerar con otros colores';
          genBtn.style.opacity = '1';
          genBtn.disabled = false;
        }, 1500);
      });
    }
  }, 100);
}


// ══════════════════════════════════════════════════════════
// 7. FLYER GENERATOR
// ══════════════════════════════════════════════════════════

function openFlyerGenerator() {
  showToast('Próximamente: Generador de flyer de lanzamiento con tu foto profesional', 'info');
  // Will integrate Canvas API to generate flyer with:
  // - Professional photo
  // - User name
  // - Launch date
  // - Sky Team branding
}


// ══════════════════════════════════════════════════════════
// 8. NAVIGATION & INTEGRATION
// ══════════════════════════════════════════════════════════

// Global navigation function
window.obNavigate = function(view) {
  obState.currentView = view;
  var container = document.getElementById('ob-main-container');
  if (!container) {
    // Create container in the main content area
    var main = document.querySelector('.main-content') || document.querySelector('#app') || document.body;
    container = document.createElement('div');
    container.id = 'ob-main-container';
    container.style.cssText = 'padding:16px;max-width:500px;margin:0 auto;';
    main.innerHTML = '';
    main.appendChild(container);
  }

  if (view === 'onboarding') renderOnboarding(container);
  else if (view === 'dashboard') renderDashboard(container);
  else if (view === 'achievements') renderAchievements(container);
  else if (view === 'scripts') renderScriptBank(container);
};

// Toast notification
function showToast(msg, type) {
  var existing = document.getElementById('ob-toast');
  if (existing) existing.remove();

  var bgColor = type === 'success' ? C.green : type === 'error' ? C.red : C.accent;
  var toast = document.createElement('div');
  toast.id = 'ob-toast';
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;background:' + bgColor + ';color:#000;font-weight:700;font-size:13px;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:obSlideDown 0.3s ease;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}


// ══════════════════════════════════════════════════════════
// 9. SIDEBAR INTEGRATION — Add menu items
// ══════════════════════════════════════════════════════════

function injectSidebarItems() {
  // Look for sidebar container
  var sidebar = document.querySelector('.sidebar-menu') || document.querySelector('nav') || document.querySelector('[class*="sidebar"]');
  if (!sidebar) return;

  var items = [
    { id: 'mi-ruta', label: '🗺️ Mi Ruta', view: 'onboarding', color: C.accent },
    { id: 'mi-progreso', label: '📊 Mi Progreso', view: 'dashboard', color: C.green },
    { id: 'mis-logros', label: '🏆 Mis Logros', view: 'achievements', color: C.gold },
    { id: 'scripts', label: '📝 Scripts', view: 'scripts', color: '#E040FB' }
  ];

  items.forEach(function(item) {
    if (document.getElementById('ob-nav-' + item.id)) return; // Already injected

    var el = document.createElement('div');
    el.id = 'ob-nav-' + item.id;
    el.style.cssText = 'padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:10px;margin:2px 8px;transition:background 0.2s;';
    el.innerHTML = '<span style="font-size:14px;">' + item.label + '</span>';

    el.addEventListener('mouseenter', function() { el.style.background = 'rgba(255,255,255,0.06)'; });
    el.addEventListener('mouseleave', function() { el.style.background = 'transparent'; });
    el.addEventListener('click', function() {
      // Use existing navigate function if available, else use our own
      if (typeof window.navigate === 'function') {
        // Check if the SPA has a matching section
      }
      obNavigate(item.view);
    });

    sidebar.appendChild(el);
  });
}


// ══════════════════════════════════════════════════════════
// 10. CSS ANIMATIONS
// ══════════════════════════════════════════════════════════

function injectStyles() {
  if (document.getElementById('ob-styles')) return;
  var style = document.createElement('style');
  style.id = 'ob-styles';
  style.textContent = [
    '@keyframes obFadeIn { from { opacity:0 } to { opacity:1 } }',
    '@keyframes obSlideUp { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }',
    '@keyframes obSlideDown { from { opacity:0;transform:translateX(-50%) translateY(-20px) } to { opacity:1;transform:translateX(-50%) translateY(0) } }',
    '@keyframes obBounceIn { 0% { opacity:0;transform:scale(0.3) } 50% { opacity:1;transform:scale(1.05) } 70% { transform:scale(0.95) } 100% { transform:scale(1) } }',
    '@keyframes obPulse { 0%,100% { opacity:1 } 50% { opacity:0.6 } }',
    '@keyframes obConfettiFall { 0% { opacity:1;transform:translateY(0) rotate(0deg) } 100% { opacity:0;transform:translateY(100vh) rotate(720deg) } }',
    '#ob-coach-panel ::-webkit-scrollbar { width:4px }',
    '#ob-coach-panel ::-webkit-scrollbar-track { background:transparent }',
    '#ob-coach-panel ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:2px }',
    '.ob-copy-btn:hover { background:rgba(28,232,255,0.15)!important }',
    '@media (max-width:480px) { #ob-coach-panel { width:calc(100% - 32px)!important;right:16px!important;bottom:80px!important } }'
  ].join('\n');
  document.head.appendChild(style);
}


// ══════════════════════════════════════════════════════════
// 11. INIT — Auto-check if user needs onboarding
// ══════════════════════════════════════════════════════════

function obInit() {
  injectStyles();
  initCoachButton();

  // Check if user is logged in and if they need onboarding
  if (typeof CU === 'undefined' || !CU || !CU.username) {
    // Wait for login
    var checkLogin = setInterval(function() {
      if (typeof CU !== 'undefined' && CU && CU.username) {
        clearInterval(checkLogin);
        obPostLogin();
      }
    }, 2000);
    return;
  }

  obPostLogin();
}

function obPostLogin() {
  // Inject sidebar items
  setTimeout(injectSidebarItems, 1000);

  // Check onboarding status
  obApi('getProgress').then(function(data) {
    if (!data.progress || !data.progress.completed_at) {
      // User hasn't completed onboarding — show prompt after 3 seconds
      setTimeout(function() {
        showOnboardingPrompt();
      }, 3000);
    }
    // Auto-check achievements in background
    obApi('checkAchievements').catch(function() {});
  }).catch(function() {});
}

function showOnboardingPrompt() {
  // Show a subtle banner at top suggesting onboarding
  var existing = document.getElementById('ob-prompt-banner');
  if (existing) return;

  var banner = document.createElement('div');
  banner.id = 'ob-prompt-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;padding:12px 16px;background:linear-gradient(90deg,rgba(28,232,255,0.1),rgba(0,230,118,0.1));border-bottom:1px solid rgba(28,232,255,0.2);z-index:9980;display:flex;align-items:center;justify-content:center;gap:12px;animation:obSlideDown 0.5s ease;';
  banner.innerHTML = '<span style="font-size:14px;">🗺️</span>' +
    '<span style="font-size:13px;font-weight:600;">¡Completa tu Ruta de 7 Días y lanza tu negocio!</span>' +
    '<button onclick="obNavigate(\'onboarding\');document.getElementById(\'ob-prompt-banner\').remove();" style="padding:6px 14px;border:none;border-radius:8px;background:' + C.accent + ';color:#000;font-weight:700;font-size:12px;cursor:pointer;">Empezar →</button>' +
    '<span onclick="document.getElementById(\'ob-prompt-banner\').remove();" style="cursor:pointer;color:' + C.textSub + ';font-size:16px;margin-left:8px;">✕</span>';
  document.body.appendChild(banner);
}


// ── Launch ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', obInit);
} else {
  obInit();
}

})();
