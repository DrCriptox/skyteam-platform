// === PATCH v3: Fix emojis, add photos, clean Anti-Trampa ===
// Replaces broken surrogate pair emojis with CSS circles + numbers
// Adds profile photos from localStorage

// Helper: get user photo from localStorage or return null
function getUserPhoto(username) {
  try {
    var key = 'skyteam_photo_' + username;
    var data = localStorage.getItem(key);
    if (data && data.indexOf('data:image') === 0) return data;
  } catch(e) {}
  return null;
}

// Helper: render avatar (photo or initial circle)
function renderAvatar(username, name, size, gradient) {
  var photo = getUserPhoto(username);
  var s = size || '36px';
  var g = gradient || 'linear-gradient(135deg,#667eea,#764ba2)';
  if (photo) {
    return '<img src="' + photo + '" style="width:' + s + ';height:' + s + ';border-radius:50%;object-fit:cover;">';
  }
  var initial = (name || '?')[0].toUpperCase();
  return '<div style="width:' + s + ';height:' + s + ';border-radius:50%;background:' + g + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:' + (parseInt(s)*0.4) + 'px;">' + initial + '</div>';
}

// Helper: medal circle CSS (1=gold, 2=silver, 3=bronze)
function medalCircle(pos, size) {
  var colors = {1:'#FFD700', 2:'#C0C0C0', 3:'#CD7F32'};
  var bg = colors[pos] || 'rgba(255,255,255,0.15)';
  var sz = size || '28px';
  var fs = (parseInt(sz) * 0.5) + 'px';
  var textColor = pos <= 3 ? '#000' : 'rgba(255,255,255,0.7)';
  return '<div style="width:' + sz + ';height:' + sz + ';border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-weight:900;font-size:' + fs + ';color:' + textColor + ';flex-shrink:0;">' + pos + '</div>';
}

// --- 5. Fix cambiarRango: persist rank everywhere ---
cambiarRango = function(username, newRank) {
  var r = +newRank;
  // 1. Update USERS dict (source of truth for login)
  if (typeof USERS !== 'undefined' && USERS[username]) {
    USERS[username].rank = r;
  }
  // 2. Update ADMIN_USERS array
  if (typeof ADMIN_USERS !== 'undefined') {
    var au = ADMIN_USERS.find(function(x){ return x.user === username; });
    if (au) au.rank = r;
  }
  // 3. Update CU if current user
  if (typeof CU !== 'undefined' && CU && CU.username === username) {
    CU.rank = r;
    try { localStorage.setItem('skyteam_u', JSON.stringify(CU)); } catch(e) {}
  }
  // 4. Update RANKING_DATA
  if (typeof RANKING_DATA !== 'undefined') {
    var rd = RANKING_DATA.find(function(x){ return x.name && USERS[username] && x.name === USERS[username].name; });
    if (rd) rd.rank = r;
  }
  // 5. Re-render all affected sections
  var rk = (typeof RANKS !== 'undefined' ? RANKS[r] : null) || {icon:'', name:'Rango ' + r};
  if (typeof renderRanking === 'function') try { renderRanking(); } catch(e) {}
  if (typeof renderSidebarUser === 'function') try { renderSidebarUser(); } catch(e) {}
  if (typeof renderHome === 'function') try { renderHome(); } catch(e) {}
  if (typeof renderPerfil === 'function') try { renderPerfil(); } catch(e) {}
  if (typeof renderAdminUsuarios === 'function') try { renderAdminUsuarios(); } catch(e) {}
  if (typeof showToast === 'function') showToast('Rango actualizado \u2192 ' + rk.icon + ' ' + rk.name);
};






// === PATCH v5: Admin fixes, Agenda real-time, RankingâMi Agenda, sort antifraude ===

// --- 1. Patch lbRenderDaily: Yesterday's day name ---
lbRenderDaily = function(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.4);">Cargando...</div>';
  lbApi('dailyTop', {}).then(function(data) {
    if (!data.ok || !data.ranking || data.ranking.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px 0;"><p style="color:rgba(255,255,255,0.4);">Sin datos del dia</p></div>';
      return;
    }
    var now = new Date();
    var yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    var dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var dayName = dias[yesterday.getDay()];
    var dateStr = yesterday.getDate() + ' de ' + meses[yesterday.getMonth()];

    var html = '<h3 style="text-align:center;font-size:16px;margin:16px 0 4px;">Top 5 del dia ' + dayName + '</h3>';
    html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 16px;">' + dateStr + ' \u2014 Corte 11:00 PM</p>';

    data.ranking.forEach(function(r, i) {
      var isMe = r.username === (CU && CU.username);
      var meBorder = isMe ? 'border:1px solid rgba(28,232,255,0.4);background:rgba(28,232,255,0.06);' : 'border:1px solid rgba(255,255,255,0.08);';
      var ipBadge = '';
      if (r.ipDupes && r.ipDupes > 0) {
        ipBadge = ' <span style="background:rgba(255,60,60,0.2);color:#FF6B6B;font-size:9px;padding:1px 5px;border-radius:4px;">IP x' + r.ipDupes + '</span>';
      }
      html += '<div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;margin:8px 0;' + meBorder + '">';
      html += medalCircle(i + 1, '36px');
      html += renderAvatar(r.username, r.name, '36px');
      html += '<div style="flex:1;"><div style="font-weight:600;font-size:14px;">' + (r.name || r.username) + (isMe ? ' <span style="color:#1CE8FF;font-size:11px;">(Tu)</span>' : '') + ipBadge + '</div>';
      html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + r.citas + ' citas - ' + r.verificadas + ' verificadas</div></div>';
      html += '<div style="font-size:20px;font-weight:900;color:#FFD700;">' + r.score + '<span style="font-size:10px;color:rgba(255,255,255,0.3);"> pts</span></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }).catch(function(e) {
    container.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error: ' + e.message + '</p>';
  });
};

// --- 2. Patch lbRenderAntiCheat: Non-admin only sees own card, compact cards ---
lbRenderAntiCheat = function(container) {
  var isAdmin = CU && (CU.isAdmin === true || CU.rank === 8);
  container.innerHTML = '<div style="text-align:center;padding:20px 0;color:rgba(255,255,255,0.4);">Analizando...</div>';

  if (!isAdmin) {
    lbApi('antiCheat', { user: CU.username }).then(function(data) {
      if (!data.ok) { container.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error</p>'; return; }
      var html = '<h3 style="text-align:center;font-size:15px;margin:12px 0 4px;">Tu Integridad</h3>';
      html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 12px;">Analisis de tu cuenta</p>';
      html += renderAntiCheatCardCompact({user: (CU && CU.username), name: CU.name, data: data});
      container.innerHTML = html;
    }).catch(function(e) {
      container.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error: ' + e.message + '</p>';
    });
  } else {
    var userKeys = Object.keys(USERS);
    var results = [];
    var completed = 0;
    userKeys.forEach(function(uKey) {
      lbApi('antiCheat', { user: uKey }).then(function(data) {
        results.push({ user: uKey, name: USERS[uKey].name, data: data });
        completed++;
        if (completed === userKeys.length) {
          results.sort(function(a, b) {
            var sa = a.data.ok ? (a.data.suspicionScore || 0) : -1;
            var sb = b.data.ok ? (b.data.suspicionScore || 0) : -1;
            return sb - sa;
          });
          var html = '<h3 style="text-align:center;font-size:15px;margin:12px 0 4px;">Anti-Trampa IA</h3>';
          html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 10px;">Integridad por usuario</p>';
          results.forEach(function(r) {
            if (r.data.ok) html += renderAntiCheatCardCompact(r);
          });
          container.innerHTML = html;
        }
      }).catch(function() {
        results.push({ user: uKey, name: USERS[uKey].name, data: { ok: false } });
        completed++;
        if (completed === userKeys.length) {
          container.innerHTML = '<p style="color:#FF6B6B;">Error cargando datos</p>';
        }
      });
    });
  }
};

// --- 3. Compact anti-cheat card renderer (40% smaller) ---
function renderAntiCheatCardCompact(r) {
  if (!r.data.ok) return '';
  var d = r.data;
  var colorMap = { clean: '#00E676', suspicious: '#FFD700', flagged: '#FF6B6B', blocked: '#FF1744' };
  var labelMap = { clean: 'Limpio', suspicious: 'Revision', flagged: 'Alerta', blocked: 'Bloqueado' };
  var bgMap = { clean: 'rgba(0,230,118,0.04)', suspicious: 'rgba(255,215,0,0.04)', flagged: 'rgba(255,107,107,0.05)', blocked: 'rgba(255,23,68,0.06)' };
  var borderMap = { clean: 'rgba(0,230,118,0.15)', suspicious: 'rgba(255,215,0,0.2)', flagged: 'rgba(255,107,107,0.25)', blocked: 'rgba(255,23,68,0.3)' };
  var cls = d.classification;
  var color = colorMap[cls] || '#00E676';
  var label = labelMap[cls] || 'Limpio';
  var html = '<div style="background:' + bgMap[cls] + ';border:1px solid ' + borderMap[cls] + ';border-radius:10px;padding:10px 12px;margin:6px 0;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += renderAvatar(r.user, r.name, '24px');
  html += '<span style="font-size:13px;font-weight:600;">' + r.name + '</span></div>';
  html += '<div style="display:flex;align-items:center;gap:6px;">';
  html += '<span style="font-size:10px;background:' + color + '22;color:' + color + ';padding:2px 8px;border-radius:6px;font-weight:600;">' + label + '</span>';
  html += '<span style="font-size:12px;font-weight:700;color:' + color + ';">' + d.suspicionScore + '</span>';
  html += '</div></div>';
  html += '<div style="display:flex;gap:8px;margin-top:6px;font-size:10px;">';
  html += '<span style="color:rgba(255,255,255,0.4);">Hoy <b style="color:var(--text);">' + d.stats.todayCitas + '</b></span>';
  html += '<span style="color:rgba(255,255,255,0.4);">Sem <b style="color:var(--text);">' + d.stats.weekCitas + '</b></span>';
  html += '<span style="color:rgba(255,255,255,0.4);">IPs <b style="color:var(--text);">' + d.stats.uniqueIPs + '</b></span>';
  html += '<span style="color:rgba(255,255,255,0.4);">Pruebas <b style="color:var(--text);">' + d.stats.proofRate + '%</b></span>';
  html += '<span style="color:rgba(255,255,255,0.4);">30d <b style="color:var(--text);">' + d.stats.totalLast30Days + '</b></span>';
  html += '</div>';
  html += '<div style="margin-top:5px;"><div style="width:100%;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;"><div style="width:' + Math.min(d.suspicionScore, 100) + '%;height:100%;background:' + color + ';border-radius:2px;"></div></div></div>';
  if (d.flags.length > 0) {
    html += '<div style="margin-top:5px;">';
    d.flags.forEach(function(f) {
      var fColor = f.severity === 'critical' ? '#FF1744' : f.severity === 'high' ? '#FF6B6B' : '#FFD700';
      html += '<div style="font-size:9px;color:' + fColor + ';padding:2px 0;"><b>' + f.type.replace(/_/g,' ') + '</b>: ' + f.msg + '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// --- 4. Admin Panel: Inject Agenda + Antifraude tabs (FIXED: immediate injection) ---
(function() {
  var _origSwitchAdmin = typeof switchAdminTab === 'function' ? switchAdminTab : null;

  switchAdminTab = function(tab) {
    var panels = ['solicitudes','usuarios','contenido','anuncios-admin','agenda-admin','antifraude-admin'];
    panels.forEach(function(p) {
      var el = document.getElementById('admin-' + p);
      if (el) el.style.display = 'none';
    });
    var tabs = document.querySelectorAll('.admin-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    var activeTab = document.getElementById('atab-' + tab);
    if (activeTab) activeTab.classList.add('active');
    var panel = document.getElementById('admin-' + tab);
    if (panel) panel.style.display = 'block';
    if (tab === 'agenda-admin') renderAdminAgenda();
    if (tab === 'antifraude-admin') renderAdminAntifraude();
    if (tab === 'solicitudes') { if (typeof renderSolicitudes === 'function') renderSolicitudes(); }
    if (tab === 'usuarios') { if (typeof renderAdminUsuarios === 'function') renderAdminUsuarios(); }
    if (tab === 'contenido') { if (typeof renderAdminContenido === 'function') renderAdminContenido(); }
    if (tab === 'anuncios-admin') { if (typeof renderAdminAnuncios === 'function') renderAdminAnuncios(); }
  };

  function injectAdminTabs() {
    if (document.getElementById('atab-agenda-admin')) return;
    var tabRow = document.querySelector('.admin-tab');
    if (!tabRow) return;
    tabRow = tabRow.parentElement;
    if (!tabRow) return;

    var agendaBtn = document.createElement('button');
    agendaBtn.className = 'admin-tab';
    agendaBtn.id = 'atab-agenda-admin';
    agendaBtn.onclick = function() { switchAdminTab('agenda-admin'); };
    agendaBtn.textContent = 'Agenda';
    tabRow.appendChild(agendaBtn);

    var fraudBtn = document.createElement('button');
    fraudBtn.className = 'admin-tab';
    fraudBtn.id = 'atab-antifraude-admin';
    fraudBtn.onclick = function() { switchAdminTab('antifraude-admin'); };
    fraudBtn.textContent = 'Antifraude';
    tabRow.appendChild(fraudBtn);

    var adminSection = document.getElementById('admin-anuncios-admin');
    if (adminSection && adminSection.parentElement) {
      var agendaPanel = document.createElement('div');
      agendaPanel.id = 'admin-agenda-admin';
      agendaPanel.style.display = 'none';
      adminSection.parentElement.appendChild(agendaPanel);

      var fraudPanel = document.createElement('div');
      fraudPanel.id = 'admin-antifraude-admin';
      fraudPanel.style.display = 'none';
      adminSection.parentElement.appendChild(fraudPanel);
    }
  }

  // Override renderAdminPanel to inject tabs after render
  var _origRenderAdmin = typeof renderAdminPanel === 'function' ? renderAdminPanel : null;
  renderAdminPanel = function() {
    if (_origRenderAdmin) _origRenderAdmin();
    injectAdminTabs();
  };

  // ALSO: Try to inject immediately and retry with interval until admin DOM exists
  function tryInject() {
    if (document.getElementById('atab-agenda-admin')) return true;
    if (document.querySelector('.admin-tab')) {
      injectAdminTabs();
      return true;
    }
    return false;
  }
  if (!tryInject()) {
    var _injectInterval = setInterval(function() {
      if (tryInject()) clearInterval(_injectInterval);
    }, 500);
    // Stop trying after 30 seconds
    setTimeout(function() { clearInterval(_injectInterval); }, 30000);
  }
})();

// --- 5. Admin Agenda: Real-time dashboard with scoring ---
var _adminAgendaView = 'diaria';

function renderAdminAgenda() {
  var el = document.getElementById('admin-agenda-admin');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Cargando agenda...</div>';

  var now = new Date();
  var dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var todayLabel = dias[now.getDay()] + ' ' + now.getDate() + ' ' + meses[now.getMonth()];
  var hours = now.getHours();
  var mins = now.getMinutes();
  var timeStr = (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins;

  if (_adminAgendaView === 'semanal') {
    renderAdminAgendaSemanal(el, todayLabel, timeStr);
  } else {
    renderAdminAgendaDiaria(el, todayLabel, timeStr);
  }
}

function renderAdminAgendaDiaria(el, todayLabel, timeStr) {
  lbApi('dailyTop', {}).then(function(data) {
    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
    html += '<div><h3 style="font-size:16px;margin:0;">Agenda en Tiempo Real</h3>';
    html += '<p style="font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0 0;">' + todayLabel + ' \u2014 Actualizado ' + timeStr + '</p></div>';
    html += '<div style="display:flex;gap:6px;">';
    html += '<button onclick="_adminAgendaView=\'diaria\';renderAdminAgenda();" style="padding:6px 14px;border-radius:8px;background:rgba(28,232,255,0.15);border:1px solid rgba(28,232,255,0.4);color:#1CE8FF;font-size:12px;font-weight:700;cursor:pointer;">Diaria</button>';
    html += '<button onclick="_adminAgendaView=\'semanal\';renderAdminAgenda();" style="padding:6px 14px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;">Semanal</button>';
    html += '</div></div>';

    // Scoring legend
    html += '<div style="display:flex;gap:12px;margin-bottom:12px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:10px;color:rgba(255,255,255,0.5);">';
    html += '<span style="color:#00E676;">+3 pts agenda</span>';
    html += '<span style="color:#FF6B6B;">-5 pts fraude</span>';
    html += '<span style="color:#1CE8FF;">+3 pts prueba</span>';
    html += '<span style="color:rgba(255,255,255,0.3);">Auto-update :00 y :30</span>';
    html += '</div>';

    if (data.ok && data.ranking && data.ranking.length > 0) {
      data.ranking.forEach(function(r, i) {
        var hasFraud = r.ipDupes && r.ipDupes > 0;
        var borderColor = hasFraud ? 'rgba(255,60,60,0.3)' : 'rgba(255,255,255,0.06)';
        var bgColor = hasFraud ? 'rgba(255,60,60,0.04)' : 'rgba(255,255,255,0.02)';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin:4px 0;border:1px solid ' + borderColor + ';background:' + bgColor + ';">';
        html += medalCircle(i + 1, '28px');
        html += renderAvatar(r.username, r.name, '30px');
        html += '<div style="flex:1;">';
        html += '<div style="font-size:13px;font-weight:600;">' + (r.name || r.username);
        if (hasFraud) html += ' <span style="background:rgba(255,60,60,0.2);color:#FF6B6B;font-size:9px;padding:1px 5px;border-radius:4px;">IP x' + r.ipDupes + '</span>';
        html += '</div>';
        html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);display:flex;gap:8px;margin-top:2px;">';
        html += '<span>' + r.citas + ' agendas</span>';
        html += '<span>' + r.verificadas + ' verificadas</span>';
        if (hasFraud) html += '<span style="color:#FF6B6B;">-' + (r.ipDupes * 5) + ' fraude</span>';
        html += '</div></div>';
        html += '<div style="text-align:right;">';
        html += '<div style="font-size:18px;font-weight:900;color:#FFD700;">' + r.score + '</div>';
        html += '<div style="font-size:9px;color:rgba(255,255,255,0.3);">pts</div>';
        html += '</div></div>';
      });
    } else {
      html += '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.3);">';
      html += '<div style="font-size:32px;margin-bottom:8px;">&#128203;</div>';
      html += '<p>Sin agendas confirmadas hoy</p>';
      html += '<p style="font-size:11px;">Los puntos se acumulan cuando los socios confirman citas</p>';
      html += '</div>';
    }
    el.innerHTML = html;
  }).catch(function(e) {
    el.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error: ' + e.message + '</p>';
  });
}

function renderAdminAgendaSemanal(el, todayLabel, timeStr) {
  lbApi('weeklyTop', {}).then(function(data) {
    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
    html += '<div><h3 style="font-size:16px;margin:0;">Agenda Semanal</h3>';
    html += '<p style="font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0 0;">Semana actual \u2014 Actualizado ' + timeStr + '</p></div>';
    html += '<div style="display:flex;gap:6px;">';
    html += '<button onclick="_adminAgendaView=\'diaria\';renderAdminAgenda();" style="padding:6px 14px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;">Diaria</button>';
    html += '<button onclick="_adminAgendaView=\'semanal\';renderAdminAgenda();" style="padding:6px 14px;border-radius:8px;background:rgba(28,232,255,0.15);border:1px solid rgba(28,232,255,0.4);color:#1CE8FF;font-size:12px;font-weight:700;cursor:pointer;">Semanal</button>';
    html += '</div></div>';

    html += '<div style="display:flex;gap:12px;margin-bottom:12px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:10px;color:rgba(255,255,255,0.5);">';
    html += '<span style="color:#00E676;">+3 pts agenda</span>';
    html += '<span style="color:#FF6B6B;">-5 pts fraude</span>';
    html += '<span style="color:#1CE8FF;">+3 pts prueba</span>';
    html += '</div>';

    if (data.ok && data.ranking && data.ranking.length > 0) {
      // Podium for top 3
      html += lbRenderPodium(data.ranking);
      // List for rest
      data.ranking.slice(3).forEach(function(r, i) {
        var pos = i + 4;
        var hasFraud = r.ipDupes && r.ipDupes > 0;
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin:4px 0;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">';
        html += '<span style="font-weight:700;color:rgba(255,255,255,0.4);width:24px;text-align:center;">' + pos + '</span>';
        html += renderAvatar(r.username, r.name, '30px');
        html += '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + (r.name || r.username);
        if (hasFraud) html += ' <span style="color:#FF6B6B;font-size:9px;">IP x' + r.ipDupes + '</span>';
        html += '</div>';
        html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">' + r.citas + ' agendas - ' + r.verificadas + ' verif.</div></div>';
        html += '<div style="font-size:18px;font-weight:900;color:#FFD700;">' + r.score + '<span style="font-size:9px;color:rgba(255,255,255,0.3);"> pts</span></div>';
        html += '</div>';
      });
    } else {
      html += '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">Sin datos semanales</p>';
    }
    el.innerHTML = html;
  }).catch(function(e) {
    el.innerHTML = '<p style="color:#FF6B6B;">Error: ' + e.message + '</p>';
  });
}

// --- 6. Admin Antifraude: Sorted by highest suspicion score first ---
function renderAdminAntifraude() {
  var el = document.getElementById('admin-antifraude-admin');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Escaneando usuarios...</div>';

  var userKeys = Object.keys(USERS).filter(function(k) { return !USERS[k].isAdmin; });
  var results = [];
  var completed = 0;

  if (userKeys.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);">No hay usuarios para analizar</p>';
    return;
  }

  userKeys.forEach(function(uKey) {
    lbApi('antiCheat', { user: uKey }).then(function(data) {
      results.push({ user: uKey, name: USERS[uKey].name, data: data });
      completed++;
      if (completed === userKeys.length) buildAntifraude(el, results);
    }).catch(function() {
      results.push({ user: uKey, name: USERS[uKey].name, data: { ok: false } });
      completed++;
      if (completed === userKeys.length) buildAntifraude(el, results);
    });
  });
}

function buildAntifraude(el, results) {
  var valid = results.filter(function(r) { return r.data.ok; });
  // Sort by highest suspicion score first (most fraudulent at top)
  valid.sort(function(a, b) {
    return (b.data.suspicionScore || 0) - (a.data.suspicionScore || 0);
  });

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
  html += '<div><h3 style="font-size:16px;margin:0;">Antifraude IA</h3>';
  html += '<p style="font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0 0;">Mayor fraude primero</p></div>';
  html += '</div>';

  var flagged = valid.filter(function(r) { return r.data.suspicionScore > 0; });
  if (flagged.length > 0) {
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;font-weight:600;">Alertas activas (' + flagged.length + ')</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">';
    flagged.forEach(function(r) {
      html += renderAntifraudeCardMini(r);
    });
    html += '</div></div>';
  }

  html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;font-weight:600;">Todos los usuarios (' + valid.length + ')</div>';
  valid.forEach(function(r) {
    html += renderAntiCheatCardCompact(r);
  });

  el.innerHTML = html;
}

function renderAntifraudeCardMini(r) {
  if (!r.data.ok) return '';
  var d = r.data;
  var colorMap = { clean: '#00E676', suspicious: '#FFD700', flagged: '#FF6B6B', blocked: '#FF1744' };
  var bgMap = { clean: 'rgba(0,230,118,0.04)', suspicious: 'rgba(255,215,0,0.06)', flagged: 'rgba(255,107,107,0.07)', blocked: 'rgba(255,23,68,0.08)' };
  var borderMap = { clean: 'rgba(0,230,118,0.15)', suspicious: 'rgba(255,215,0,0.25)', flagged: 'rgba(255,107,107,0.3)', blocked: 'rgba(255,23,68,0.35)' };
  var labelMap = { clean: 'OK', suspicious: 'Rev', flagged: 'Alerta', blocked: 'Block' };
  var cls = d.classification;
  var color = colorMap[cls] || '#00E676';
  var html = '<div style="background:' + bgMap[cls] + ';border:1px solid ' + borderMap[cls] + ';border-radius:8px;padding:8px 10px;">';
  html += '<div style="display:flex;align-items:center;gap:6px;">';
  html += renderAvatar(r.user, r.name, '20px');
  html += '<span style="font-size:12px;font-weight:600;flex:1;">' + r.name + '</span>';
  html += '<span style="font-size:9px;background:' + color + '22;color:' + color + ';padding:1px 6px;border-radius:4px;font-weight:700;">' + labelMap[cls] + '</span>';
  html += '<span style="font-size:11px;font-weight:800;color:' + color + ';">' + d.suspicionScore + '</span>';
  html += '</div>';
  html += '<div style="display:flex;gap:6px;margin-top:4px;font-size:9px;color:rgba(255,255,255,0.4);">';
  html += '<span>IPs:' + d.stats.uniqueIPs + '</span>';
  html += '<span>Hoy:' + d.stats.todayCitas + '</span>';
  html += '<span>30d:' + d.stats.totalLast30Days + '</span>';
  if (d.flags.length > 0) html += '<span style="color:' + color + ';">' + d.flags.length + ' flags</span>';
  html += '</div>';
  html += '<div style="margin-top:3px;width:100%;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;"><div style="width:' + Math.min(d.suspicionScore,100) + '%;height:100%;background:' + color + ';border-radius:2px;"></div></div>';
  html += '</div>';
  return html;
}

// --- 7. Add Ranking tab to Mi Agenda (MINIMAL â calls original, then injects tab) ---
(function() {
  var _origRenderAgenda = renderAgendaUI;
  var _origSwitchAgenda = switchAgendaTab;

  function injectRankingTabBtn(el) {
    if (!el || el.querySelector('#agenda-ranking-btn')) return;
    // Find the tab buttons - look for buttons that call switchAgendaTab
    var btns = el.querySelectorAll('button');
    var lastTab = null;
    for (var i = 0; i < btns.length; i++) {
      var oc = btns[i].getAttribute('onclick') || '';
      if (oc.indexOf('switchAgendaTab') >= 0) lastTab = btns[i];
    }
    if (!lastTab) return;
    var rankBtn = lastTab.cloneNode(false);
    rankBtn.id = 'agenda-ranking-btn';
    rankBtn.innerHTML = '\uD83C\uDFC6 Ranking';
    rankBtn.style.background = 'rgba(255,255,255,0.04)';
    rankBtn.style.border = '1px solid rgba(255,255,255,0.1)';
    rankBtn.style.color = 'rgba(255,255,255,0.5)';
    rankBtn.style.fontWeight = '500';
    rankBtn.removeAttribute('onclick');
    rankBtn.onclick = function() { switchAgendaTab('ranking'); };
    lastTab.parentNode.insertBefore(rankBtn, lastTab.nextSibling);
  }

  function renderRankingInAgenda(el) {
    // Build tab bar matching original style
    var agTabs = [
      {id: 'config', label: 'Configurar', icon: '\u2699\uFE0F'},
      {id: 'citas', label: 'Citas', icon: '\uD83D\uDCCB'},
      {id: 'plandiario', label: 'Mi Plan Diario', icon: '\uD83D\uDCC5'},
      {id: 'ranking', label: 'Ranking', icon: '\uD83C\uDFC6'}
    ];
    var html = '<div style="display:flex;gap:0;margin-bottom:16px;flex-wrap:wrap;">';
    agTabs.forEach(function(t) {
      var isActive = t.id === 'ranking';
      var sty = isActive
        ? 'background:rgba(28,232,255,0.12);border:1px solid rgba(28,232,255,0.4);color:#1CE8FF;font-weight:700;'
        : 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-weight:500;';
      html += '<button onclick="switchAgendaTab(\'' + t.id + '\')" style="padding:8px 14px;border-radius:10px;font-size:12px;cursor:pointer;margin:2px 4px;font-family:Nunito,sans-serif;' + sty + '">' + t.icon + ' ' + t.label + '</button>';
    });
    html += '</div>';
    // Leaderboard sub-tabs
    var subTabs = [
      {id: 'weekly', label: 'Top 10 Semanal', icon: '\uD83C\uDFC6'},
      {id: 'daily', label: 'Top 5 Diario', icon: '\uD83D\uDCCA'},
      {id: 'tests', label: 'Mis Pruebas', icon: '\uD83D\uDCF8'},
      {id: 'anticheat', label: 'Anti-Trampa', icon: '\uD83D\uDEE1\uFE0F'}
    ];
    html += '<div style="display:flex;gap:0;margin-bottom:12px;flex-wrap:wrap;">';
    subTabs.forEach(function(t, i) {
      var isA = i === 0;
      var sty2 = isA
        ? 'background:rgba(28,232,255,0.12);border:1px solid rgba(28,232,255,0.4);color:#1CE8FF;font-weight:700;'
        : 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-weight:500;';
      html += '<button onclick="switchRankingSubTab(\'' + t.id + '\')" id="rsub-' + t.id + '" style="padding:6px 12px;border-radius:8px;font-size:11px;cursor:pointer;margin:2px 3px;font-family:Nunito,sans-serif;' + sty2 + '">' + t.icon + ' ' + t.label + '</button>';
    });
    html += '</div>';
    html += '<div id="agenda-ranking-subtab-content"></div>';
    el.innerHTML = html;
    // Define sub-tab switcher
    window.switchRankingSubTab = function(tab) {
      var sBtns = el.querySelectorAll('[id^="rsub-"]');
      for (var j = 0; j < sBtns.length; j++) {
        var isA2 = sBtns[j].id === 'rsub-' + tab;
        sBtns[j].style.background = isA2 ? 'rgba(28,232,255,0.12)' : 'rgba(255,255,255,0.04)';
        sBtns[j].style.border = isA2 ? '1px solid rgba(28,232,255,0.4)' : '1px solid rgba(255,255,255,0.1)';
        sBtns[j].style.color = isA2 ? '#1CE8FF' : 'rgba(255,255,255,0.5)';
        sBtns[j].style.fontWeight = isA2 ? '700' : '500';
      }
      var ct = document.getElementById('agenda-ranking-subtab-content');
      if (!ct) return;
      if (tab === 'weekly' && typeof lbRenderWeekly === 'function') lbRenderWeekly(ct);
      else if (tab === 'daily' && typeof lbRenderDaily === 'function') lbRenderDaily(ct);
      else if (tab === 'anticheat' && typeof lbRenderAntiCheat === 'function') lbRenderAntiCheat(ct);
      else if (tab === 'tests') {
        ct.innerHTML = '<div style="text-align:center;padding:30px 20px;"><div style="font-size:32px;margin-bottom:8px;">\uD83D\uDCF8</div><p style="color:rgba(255,255,255,0.4);font-size:13px;">Sube capturas de tus citas en Zoom como prueba</p></div>';
      }
    };
    // Load first sub-tab
    var ct = document.getElementById('agenda-ranking-subtab-content');
    if (ct && typeof lbRenderWeekly === 'function') lbRenderWeekly(ct);
  }

  renderAgendaUI = function(el) {
    if (!el) return;
    if (agendaTab === 'ranking') {
      renderRankingInAgenda(el);
    } else {
      _origRenderAgenda(el);
      injectRankingTabBtn(el);
    }
  };

  switchAgendaTab = function(t) {
    if (t === 'ranking') {
      agendaTab = 'ranking';
      renderAgendaUI(document.getElementById('agenda-content'));
    } else {
      agendaTab = t;
      _origRenderAgenda(document.getElementById('agenda-content'));
      injectRankingTabBtn(document.getElementById('agenda-content'));
      if (t === 'plandiario' && typeof loadPlanDiario === 'function') loadPlanDiario();
    }
  };
})();

// --- 8. Empty the Ranking sidebar section (block ALL rendering) ---
(function() {
  var _redirectHTML = '<div style="text-align:center;padding:60px 20px;">' +
    '<div style="font-size:40px;margin-bottom:12px;">\uD83C\uDFC6</div>' +
    '<h3 style="font-size:16px;color:rgba(255,255,255,0.6);margin:0 0 8px;">Ranking del Equipo</h3>' +
    '<p style="font-size:13px;color:rgba(255,255,255,0.35);max-width:300px;margin:0 auto;">El ranking ahora está disponible en la sección <b style="color:#1CE8FF;">Mi Agenda</b>.</p>' +
    '<button onclick="navigate(\'agenda\');setTimeout(function(){switchAgendaTab(\'ranking\');},200);" style="margin-top:16px;padding:10px 24px;border-radius:10px;background:linear-gradient(135deg,#1CE8FF,#0077FF);border:none;color:#030c1f;font-size:13px;font-weight:800;cursor:pointer;font-family:Nunito,sans-serif;">Ir a Ranking</button>' +
    '</div>';

  function showRedirect() {
    var el = document.getElementById('ranking-content');
    if (!el) return;
    el.innerHTML = _redirectHTML;
  }

  renderRanking = showRedirect;

  // Also block lbInjectRankingUI so it doesn't render tabs into ranking-content
  if (typeof lbInjectRankingUI === 'function') {
    lbInjectRankingUI = function() { showRedirect(); };
  }
})();


// --- 9. Fix navigate() for skysales and agente sections (height:0 bug) ---
(function() {
  var _origNavigate = typeof navigate === "function" ? navigate : null;
  if (!_origNavigate) return;
  navigate = function(section) {
    document.querySelectorAll(".section").forEach(function(s){s.style.display="";s.style.height="";});
    _origNavigate(section);
    if (section === "skysales" || section === "agente") {
      var el = document.getElementById("section-" + section);
      if (el) { el.style.display = "block"; el.style.height = "auto"; }
    }
  };

// --- 10. Push Notifications: VAPID subscribe + UI toggle ---
(function() {
  var _pushSubActive = false;
  var _vapidPubKey = null;

  function fetchVapidKey() {
    return fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getPublicKey' })
    })
    .then(function(r) { return r.ok ? r.json() : Promise.reject('no key'); })
    .then(function(d) { _vapidPubKey = d.publicKey; return d.publicKey; })
    .catch(function(e) { console.log('[Push] VAPID fetch error:', e); return null; });
  }

  function b64ToUint8(base64) {
    var pad = '='.repeat((4 - base64.length % 4) % 4);
    var b = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function tryPushSubscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve(null);
    if (typeof CU === 'undefined' || !CU || !CU.user) return Promise.resolve(null);

    return navigator.serviceWorker.ready.then(function(reg) {
      return reg.pushManager.getSubscription().then(function(existing) {
        if (existing) { _pushSubActive = true; return existing; }
        return fetchVapidKey().then(function(pk) {
          var opts = { userVisibleOnly: true };
          if (pk) { try { opts.applicationServerKey = b64ToUint8(pk); } catch(e) {} }
          return reg.pushManager.subscribe(opts);
        });
      });
    }).then(function(sub) {
      if (!sub) return null;
      _pushSubActive = true;
      var userKey = CU.ref || CU.user || '';
      return fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', user: userKey, subscription: sub.toJSON() })
      }).then(function(r) {
        if (r.ok) console.log('[Push] Subscription saved');
        return sub;
      }).catch(function() { return sub; });
    }).catch(function(e) { console.log('[Push] Subscribe error:', e); return null; });
  }

  function unsubPush() {
    if (typeof CU === 'undefined' || !CU || !CU.user) return Promise.resolve(null);
    return navigator.serviceWorker.ready
      .then(function(reg) { return reg.pushManager.getSubscription(); })
      .then(function(sub) {
        if (!sub) return null;
        var userKey = CU.ref || CU.user || '';
        sub.unsubscribe().catch(function() {});
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unsubscribe', user: userKey, subscription: sub.toJSON() })
        }).catch(function() {});
        _pushSubActive = false;
        return true;
      }).catch(function() { return null; });
  }

  // Override requestNotifPermission to also subscribe to push
  var _origReqNotif = typeof requestNotifPermission === 'function' ? requestNotifPermission : null;
  window.requestNotifPermission = function(silent) {
    if (typeof _nativeNotifEnabled !== 'undefined' && !_nativeNotifEnabled) {
      if (!silent && typeof showToast === 'function') showToast('Tu navegador no soporta notificaciones');
      return;
    }
    if (typeof _nativeNotifPermission !== 'undefined' && _nativeNotifPermission === 'granted') {
      if (!silent && typeof showToast === 'function') showToast('Notificaciones ya activadas');
      tryPushSubscribe();
      return;
    }
    if (typeof _nativeNotifPermission !== 'undefined' && _nativeNotifPermission === 'denied') {
      if (!silent && typeof showToast === 'function') showToast('Notificaciones bloqueadas. Activalas en ajustes.');
      return;
    }
    Notification.requestPermission().then(function(p) {
      if (typeof _nativeNotifPermission !== 'undefined') _nativeNotifPermission = p;
      if (p === 'granted') {
        localStorage.setItem('skyteam_notif_granted', 'true');
        if (typeof showToast === 'function') showToast('Notificaciones activadas!');
        if (typeof hideNotifBanner === 'function') hideNotifBanner();
        tryPushSubscribe();
      }
    });
  };

  // Auto-subscribe on load if permission already granted
  setTimeout(function() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      tryPushSubscribe();
    }
  }, 3000);

  // Expose for admin/settings use
  window._pushToggle = function() {
    if (_pushSubActive) {
      unsubPush().then(function() { if (typeof showToast === 'function') showToast('Push desactivado'); });
    } else {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        window.requestNotifPermission();
      } else {
        tryPushSubscribe().then(function() { if (typeof showToast === 'function') showToast('Push activado!'); });
      }
    }
  };

  console.log('[Patch v3 Sec 10] Push notifications integration loaded');
})();
})();
