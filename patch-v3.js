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

// --- 1. Patch lbRenderPodium ---
lbRenderPodium = function(ranking) {
  var top3 = ranking.slice(0, 3);
  if (top3.length === 0) return '<p style="text-align:center;color:rgba(255,255,255,0.4);">Sin datos aun</p>';
  var colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  var sizes = ['80px', '64px', '64px'];
  var medalSizes = ['32px', '26px', '26px'];
  var order = top3.length >= 3 ? [1, 0, 2] : (top3.length === 2 ? [1, 0] : [0]);
  var html = '<div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;margin:20px 0 24px;">';
  order.forEach(function(idx) {
    if (!top3[idx]) return;
    var r = top3[idx];
    var isFirst = idx === 0;
    var isMe = r.username === CU;
    var ipBadge = '';
    if (r.ipDupes && r.ipDupes > 0) {
      ipBadge = '<div style="background:rgba(255,60,60,0.25);color:#FF6B6B;font-size:9px;padding:1px 5px;border-radius:4px;margin-top:2px;">IP x' + r.ipDupes + '</div>';
    }
    html += '<div style="text-align:center;' + (isFirst ? 'margin-bottom:16px;' : '') + '">';
    html += '<div style="margin:0 auto 4px;">' + medalCircle(idx + 1, medalSizes[idx]) + '</div>';
    html += '<div style="margin:4px auto;">' + renderAvatar(r.username, r.name, sizes[idx], 'linear-gradient(135deg,' + colors[idx] + ',rgba(255,255,255,0.2))') + '</div>';
    html += '<div style="font-weight:700;font-size:13px;margin-top:4px;">' + (r.name || r.username) + '</div>';
    if (isMe) html += '<div style="color:#1CE8FF;font-size:10px;">(Tu)</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + r.citas + ' citas / ' + r.verificadas + ' verif.</div>';
    html += ipBadge;
    html += '<div style="font-size:20px;font-weight:900;color:' + colors[idx] + ';margin-top:4px;">' + r.score + '</div>';
    html += '<div style="font-size:9px;color:rgba(255,255,255,0.3);">pts</div></div>';
  });
  html += '</div>';
  return html;
};

// --- 2. Patch lbRenderList ---
lbRenderList = function(ranking) {
  var rest = ranking.slice(3);
  if (rest.length === 0) return '<p style="text-align:center;color:rgba(255,255,255,0.4);margin:16px 0;font-size:13px;">No hay mas participantes</p>';
  var html = '';
  rest.forEach(function(r, i) {
    var pos = i + 4;
    var isMe = r.username === CU;
    var meBg = isMe ? 'background:rgba(28,232,255,0.08);border:1px solid rgba(28,232,255,0.3);' : 'border:1px solid rgba(255,255,255,0.06);';
    var ipBadge = '';
    if (r.ipDupes && r.ipDupes > 0) {
      ipBadge = '<span style="display:inline-block;background:rgba(255,60,60,0.2);color:#FF6B6B;font-size:10px;padding:2px 6px;border-radius:6px;margin-left:6px;">IP x' + r.ipDupes + '</span>';
    }
    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;margin:6px 0;' + meBg + '">';
    html += '<span style="font-weight:700;color:rgba(255,255,255,0.4);width:24px;text-align:center;">' + pos + '</span>';
    html += renderAvatar(r.username, r.name, '36px');
    html += '<div style="flex:1;"><div style="font-weight:600;font-size:14px;">' + (r.name || r.username) + (isMe ? ' <span style="color:#1CE8FF;font-size:11px;">(Tu)</span>' : '') + ipBadge + '</div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + r.citas + ' citas - ' + r.verificadas + ' verificadas</div></div>';
    html += '<div style="font-size:18px;font-weight:900;color:#FFD700;">' + r.score + '<span style="font-size:10px;color:rgba(255,255,255,0.4);"> pts</span></div>';
    html += '</div>';
  });
  return html;
};

// --- 3. Patch lbRenderDaily ---
lbRenderDaily = function(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.4);">Cargando...</div>';
  lbApi('dailyTop', {}).then(function(data) {
    if (!data.ok || !data.ranking || data.ranking.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px 0;"><p style="color:rgba(255,255,255,0.4);">Sin datos del dia</p></div>';
      return;
    }
    var html = '<h3 style="text-align:center;font-size:16px;margin:16px 0 4px;">Top 5 del Dia</h3>';
    html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 8px;">Se actualiza cada noche a las 10:00 PM</p>';
    html += '<p style="text-align:center;font-size:10px;color:rgba(255,255,255,0.2);margin:0 0 16px;">Ultimas 24 horas</p>';
    data.ranking.forEach(function(r, i) {
      var isMe = r.username === CU;
      var meBorder = isMe ? 'border:1px solid rgba(28,232,255,0.4);background:rgba(28,232,255,0.06);' : 'border:1px solid rgba(255,255,255,0.08);';
      var ipBadge = '';
      if (r.ipDupes && r.ipDupes > 0) {
        ipBadge = ' <span style="background:rgba(255,60,60,0.2);color:#FF6B6B;font-size:9px;padding:1px 5px;border-radius:4px;">IP x' + r.ipDupes + '</span>';
      }
      html += '<div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;margin:8px 0;' + meBorder + '">';
      html += medalCircle(i + 1, '36px');
      html += renderAvatar(r.username, r.name, '36px');
      html += '<div style="flex:1;"><div style="font-weight:600;font-size:14px;">' + (r.name || r.username) + (isMe ? ' <span style="color:#1CE8FF;font-size:11px;">(Tu)</span>' : '') + ipBadge + '</div>';
      html += '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + r.citas + ' citas - ' + r.verificadas + ' verificadas hoy</div></div>';
      html += '<div style="font-size:20px;font-weight:900;color:#FFD700;">' + r.score + '<span style="font-size:10px;color:rgba(255,255,255,0.3);"> pts</span></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }).catch(function(e) { container.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error: ' + e.message + '</p>'; });
};

// --- 4. Patch lbRenderAntiCheat - Resumen limpio ---
lbRenderAntiCheat = function(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.4);">Anti-Trampa IA<br><br>Analizando usuarios...</div>';
  var userKeys = Object.keys(USERS);
  var results = [];
  var completed = 0;
  userKeys.forEach(function(uKey) {
    lbApi('antiCheat', { user: uKey }).then(function(data) {
      results.push({ user: uKey, name: USERS[uKey].name, data: data });
      completed++;
      if (completed === userKeys.length) renderAntiCheatV3(container, results);
    }).catch(function() {
      results.push({ user: uKey, name: USERS[uKey].name, data: { ok: false } });
      completed++;
      if (completed === userKeys.length) renderAntiCheatV3(container, results);
    });
  });
};

function renderAntiCheatV3(container, results) {
  var order = { blocked: 0, flagged: 1, suspicious: 2, clean: 3 };
  results.sort(function(a, b) {
    var oa = a.data.ok ? (order[a.data.classification] || 3) : 3;
    var ob = b.data.ok ? (order[b.data.classification] || 3) : 3;
    return oa - ob;
  });

  var html = '<h3 style="text-align:center;font-size:16px;margin:16px 0 4px;">Anti-Trampa IA</h3>';
  html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 16px;">Analisis de integridad por usuario</p>';

  results.forEach(function(r) {
    if (!r.data.ok) return;
    var d = r.data;
    var colorMap = { clean: '#00E676', suspicious: '#FFD700', flagged: '#FF6B6B', blocked: '#FF1744' };
    var labelMap = { clean: 'Limpio', suspicious: 'Revision', flagged: 'Alerta', blocked: 'Bloqueado' };
    var bgMap = { clean: 'rgba(0,230,118,0.06)', suspicious: 'rgba(255,215,0,0.06)', flagged: 'rgba(255,107,107,0.08)', blocked: 'rgba(255,23,68,0.1)' };
    var borderMap = { clean: 'rgba(0,230,118,0.2)', suspicious: 'rgba(255,215,0,0.3)', flagged: 'rgba(255,107,107,0.3)', blocked: 'rgba(255,23,68,0.4)' };
    var cls = d.classification;
    var color = colorMap[cls] || '#00E676';
    var label = labelMap[cls] || 'Limpio';

    html += '<div style="background:' + bgMap[cls] + ';border:1px solid ' + borderMap[cls] + ';border-radius:14px;padding:16px;margin:10px 0;">';

    // Header: avatar + name + status badge
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += renderAvatar(r.user, r.name, '32px');
    html += '<strong style="font-size:14px;">' + r.name + '</strong></div>';
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;background:' + color + '22;color:' + color + ';padding:3px 10px;border-radius:8px;font-weight:600;">' + label + '</span>';
    html += '<span style="font-size:13px;font-weight:700;color:' + color + ';">' + d.suspicionScore + ' pts</span>';
    html += '</div></div>';

    // Stats grid - text only, no emojis
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0;">';
    html += '<div style="font-size:10px;background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;text-align:center;"><div style="color:rgba(255,255,255,0.4);">Hoy</div><div style="font-weight:700;font-size:14px;">' + d.stats.todayCitas + '</div></div>';
    html += '<div style="font-size:10px;background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;text-align:center;"><div style="color:rgba(255,255,255,0.4);">Semana</div><div style="font-weight:700;font-size:14px;">' + d.stats.weekCitas + '</div></div>';
    html += '<div style="font-size:10px;background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;text-align:center;"><div style="color:rgba(255,255,255,0.4);">Pruebas</div><div style="font-weight:700;font-size:14px;">' + d.stats.proofRate + '%</div></div>';
    html += '</div>';

    // Second row: IPs + 30d
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 8px;">';
    html += '<div style="font-size:10px;background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;text-align:center;"><div style="color:rgba(255,255,255,0.4);">IPs unicas</div><div style="font-weight:700;font-size:14px;">' + d.stats.uniqueIPs + '</div></div>';
    html += '<div style="font-size:10px;background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;text-align:center;"><div style="color:rgba(255,255,255,0.4);">Total 30 dias</div><div style="font-weight:700;font-size:14px;">' + d.stats.totalLast30Days + '</div></div>';
    html += '</div>';

    // Score bar
    html += '<div style="margin:8px 0 4px;"><div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px;"><span>Sospecha</span><span>' + d.suspicionScore + '/100</span></div>';
    html += '<div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;"><div style="width:' + Math.min(d.suspicionScore, 100) + '%;height:100%;background:' + color + ';border-radius:3px;"></div></div></div>';

    // IP Breakdown (if any)
    if (d.stats.ipBreakdown && Object.keys(d.stats.ipBreakdown).length > 0) {
      html += '<div style="margin:8px 0;padding:8px;background:rgba(255,255,255,0.03);border-radius:8px;">';
      html += '<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px;">Desglose por IP:</div>';
      Object.keys(d.stats.ipBreakdown).forEach(function(ip) {
        var count = d.stats.ipBreakdown[ip];
        var barW = Math.min(count * 20, 100);
        html += '<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">';
        html += '<span style="font-size:10px;color:rgba(255,255,255,0.4);width:90px;font-family:monospace;">' + ip + '</span>';
        html += '<div style="flex:1;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;"><div style="width:' + barW + '%;height:100%;background:' + (count > 2 ? '#FF6B6B' : '#1CE8FF') + ';border-radius:3px;"></div></div>';
        html += '<span style="font-size:10px;color:rgba(255,255,255,0.5);">' + count + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Flags summary (if any) - text only
    if (d.flags.length > 0) {
      html += '<div style="margin-top:8px;">';
      d.flags.forEach(function(f) {
        var fColor = f.severity === 'critical' ? '#FF1744' : f.severity === 'high' ? '#FF6B6B' : '#FFD700';
        html += '<div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border-left:3px solid ' + fColor + ';">';
        html += '<div style="flex:1;"><div style="font-size:11px;color:' + fColor + ';font-weight:600;">' + f.type.replace(/_/g, ' ') + '</div>';
        html += '<div style="font-size:10px;color:rgba(255,255,255,0.5);">' + f.msg + '</div>';
        if (f.type === 'SAME_IP' && f.details) {
          f.details.forEach(function(det) {
            html += '<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:2px;">  - ' + det.ip + ': ' + det.totalBookings + ' reservas, ' + det.uniqueNames + ' nombres</div>';
          });
        }
        if (f.type === 'INVALID_DATA' && f.details) {
          f.details.slice(0, 3).forEach(function(det) {
            html += '<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:2px;">  - "' + det.nombre + '": ' + det.issues.join(', ') + '</div>';
          });
        }
        html += '</div></div>';
      });
      html += '</div>';
    } else {
      html += '<div style="text-align:center;font-size:11px;color:rgba(0,230,118,0.6);margin-top:8px;">Sin alertas</div>';
    }

    html += '</div>';
  });

  container.innerHTML = html;
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
// === PATCH v4: Top5 title fix, Anti-Trampa privacy + compact, Admin Agenda/Antifraude ===

// --- 1. Patch lbRenderDaily: Yesterday's day name + anti-cheat deductions already applied by API ---
lbRenderDaily = function(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px 0;color:rgba(255,255,255,0.4);">Cargando...</div>';
  lbApi('dailyTop', {}).then(function(data) {
    if (!data.ok || !data.ranking || data.ranking.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px 0;"><p style="color:rgba(255,255,255,0.4);">Sin datos del dia</p></div>';
      return;
    }
    // Calculate yesterday's date for title
    var now = new Date();
    var yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    var dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var dayName = dias[yesterday.getDay()];
    var dateStr = yesterday.getDate() + ' de ' + meses[yesterday.getMonth()];

    var html = '<h3 style="text-align:center;font-size:16px;margin:16px 0 4px;">Top 5 del dia ' + dayName + '</h3>';
    html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 16px;">' + dateStr + ' — Corte 11:00 PM</p>';

    data.ranking.forEach(function(r, i) {
      var isMe = r.username === CU.username;
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
    // Non-admin: only show own card
    lbApi('antiCheat', { user: CU.username }).then(function(data) {
      if (!data.ok) { container.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error</p>'; return; }
      var html = '<h3 style="text-align:center;font-size:15px;margin:12px 0 4px;">Tu Integridad</h3>';
      html += '<p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 12px;">Analisis de tu cuenta</p>';
      html += renderAntiCheatCardCompact({user: CU.username, name: CU.name, data: data});
      container.innerHTML = html;
    }).catch(function(e) {
      container.innerHTML = '<p style="color:#FF6B6B;text-align:center;">Error: ' + e.message + '</p>';
    });
  } else {
    // Admin: show all but compact
    var userKeys = Object.keys(USERS);
    var results = [];
    var completed = 0;
    userKeys.forEach(function(uKey) {
      lbApi('antiCheat', { user: uKey }).then(function(data) {
        results.push({ user: uKey, name: USERS[uKey].name, data: data });
        completed++;
        if (completed === userKeys.length) {
          var order = { blocked: 0, flagged: 1, suspicious: 2, clean: 3 };
          results.sort(function(a, b) {
            var oa = a.data.ok ? (order[a.data.classification] || 3) : 3;
            var ob = b.data.ok ? (order[b.data.classification] || 3) : 3;
            return oa - ob;
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
  // Header row: avatar + name + badge + score
  html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += renderAvatar(r.user, r.name, '24px');
  html += '<span style="font-size:13px;font-weight:600;">' + r.name + '</span></div>';
  html += '<div style="display:flex;align-items:center;gap:6px;">';
  html += '<span style="font-size:10px;background:' + color + '22;color:' + color + ';padding:2px 8px;border-radius:6px;font-weight:600;">' + label + '</span>';
  html += '<span style="font-size:12px;font-weight:700;color:' + color + ';">' + d.suspicionScore + '</span>';
  html += '</div></div>';
  // Stats row - single line
  html += '<div style="display:flex;gap:8px;margin-top:6px;font-size:10px;">';
  html += '<span style="color:rgba(255,255,255,0.4);">Hoy <b style="color:var(--text);">' + d.stats.todayCitas + '</b></span>';
  html += '<span style="color:rgba(255,255,255,0.4);">Sem <b style="color:var(--text);">' + d.stats.weDeactivate all tabs
    var tabs = document.querySelectorAll('.admin-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    // Activate clicked tab
    var activeTab = document.getElementById('atab-' + tab);
    if (activeTab) activeTab.classList.add('active');
    // Show panel
    var panel = document.getElementById('admin-' + tab);
    if (panel) panel.style.display = 'block';
    // Render content for new tabs
    if (tab === 'agenda-admin') renderAdminAgenda();
    if (tab === 'antifraude-admin') renderAdminAntifraude();
    // Call original for existing tabs
    if (tab === 'solicitudes') { if (typeof renderSolicitudes === 'function') renderSolicitudes(); }
    if (tab === 'usuarios') { if (typeof renderAdminUsuarios === 'function') renderAdminUsuarios(); }
    if (tab === 'contenido') { if (typeof renderAdminContenido === 'function') renderAdminContenido(); }
    if (tab === 'anuncios-admin') { if (typeof renderAdminAnuncios === 'function') renderAdminAnuncios(); }
  };

  // Inject new tabs and panels into admin section
  var _origRenderAdmin = typeof renderAdminPanel === 'function' ? renderAdminPanel : null;
  renderAdminPanel = function() {
    if (_origRenderAdmin) _origRenderAdmin();
    // Add tabs if not already there
    if (!document.getElementById('atab-agenda-admin')) {
      var tabRow = document.querySelector('.admin-tab')?.parentElement;
      if (tabRow) {
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
      }
      // Add panels
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
  };
})();

// --- 5. Admin Agenda: Daily real-time + click for weekly ---
function renderAdminAgenda() {
  var el = document.getElementById('admin-agenda-admin');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);">Cargando agenda diaria...</div>';

  // Calculate yesterday label
  var now = new Date();
  var yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  var dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var dayLabel = dias[yesterday.getDay()] + ' ' + yesterday.getDate() + ' ' + meses[yesterday.getMonth()];

  lbApi('dailyTop', {}).then(function(data) {
    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
    html += '<div><h3 style="font-size:16px;margin:0;">Agenda Diaria</h3>';
    html += '<p style="font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0 0;">Top del ' + dayLabel + ' — Corte 11PM</p></div>';
    html += '<button onclick="loadAdminWeekly()" style="padding:6px 14px;border-radius:8px;background:rgba(28,232,255,0.1);border:1px solid rgba(28,232,255,0.3);color:#1CE8FF;font-size:12px;font-weight:600;cursor:pointer;">Cargar Semanal</button>';
    html += '</div>';
    html += '<div id="admin-agenda-daily">';
    if (data.ok && data.ranking && data.ranking.length > 0) {
      data.ranking.forEach(function(r, i) {
        var ipBadge = r.ipDupes > 0 ? ' <span style="color:#FF6B6B;font-size:10px;">IP x' + r.ipDupes + '</span>' : '';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;margin:4px 0;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">';
        html += medalCircle(i + 1, '28px');
        html += renderAvatar(r.username, r.name, '30px');
        html += '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + (r.name || r.username) + ipBadge + '</div>';
        html += '<div style="font-size:10px;color:rgba(255,255,255,0.4);">' + r.citas + ' citas - ' + r.verificadas + ' verif.</div></div>';
        html += '<div style="font-size:18px;font-weight:900;color:#FFD700;">' + r.score + '<span style="font-size:9px;color:rgba(255,255,255,0.3);"> pts</span></div>';
        html += '</div>';
      });
    } else {
      html += '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">Sin datos del dia</p>';
    }
    html += '</div>';
    html += '<div id="admin-agenda-weekly" style="margin-top:16px;"></div>';
    el.innerHTML = html;
  }).catch(function(e) {
    el.innerHTML = '<p style="color:#FF6B6B;">Error: ' + e.message + '</p>';
  });
}

function loadAdminWeekly() {
  var container = document.getElementById('admin-agenda-weekly');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:16px;color:rgba(255,255,255,0.4);">Cargando semanal...</div>';
  lbApi('weeklyTop', {}).then(function(data) {
    if (!data.ok || !data.ranking || data.ranking.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);">Sin datos semanales</p>';
      return;
    }
    var html = '<h4 style="font-size:14px;margin:0 0 8px;color:rgba(255,255,255,0.7);">Top 10 Semanal</h4>';
    // Podium top 3
    html += lbRenderPodium(data.ranking);
    // Rest as list
    html += lbRenderList(data.ranking);
    container.innerHTML = html;
  }).catch(function(e) {
    container.innerHTML = '<p style="color:#FF6B6B;">Error: ' + e.message + '</p>';
  });
}

// --- 6. Admin Antifraude: Top defraudadores + compact detailed cards ---
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
  var order = { blocked: 0, flagged: 1, suspicious: 2, clean: 3 };
  valid.sort(function(a, b) {
    return (b.data.suspicionScore || 0) - (a.data.suspicionScore || 0);
  });

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
  html += '<div><h3 style="font-size:16px;margin:0;">Antifraude IA</h3>';
  html += '<p style="font-size:11px;color:rgba(255,255,255,0.4);margin:2px 0 0;">Analisis completo de integridad</p></div>';
  html += '</div>';

  // Top defraudadores cards (only those with score > 0)
  var flagged = valid.filter(function(r) { return r.data.suspicionScore > 0; });
  if (flagged.length > 0) {
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;font-weight:600;">Alertas activas</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">';
    flagged.forEach(function(r) {
      html += renderAntifraudeCardMini(r);
    });
    html += '</div></div>';
  }

  // All users detailed but compact
  html += '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;font-weight:600;">Todos los usuarios</div>';
  valid.forEach(function(r) {
    html += renderAntiCheatCardCompact(r);
  });

  el.innerHTML = html;
}

// Mini card for top fraudsters (60% smaller than original)
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
  // Row 1: avatar + name + score
  html += '<div style="display:flex;align-items:center;gap:6px;">';
  html += renderAvatar(r.user, r.name, '20px');
  html += '<span style="font-size:12px;font-weight:600;flex:1;">' + r.name + '</span>';
  html += '<span style="font-size:9px;background:' + color + '22;color:' + color + ';padding:1px 6px;border-radius:4px;font-weight:700;">' + labelMap[cls] + '</span>';
  html += '<span style="font-size:11px;font-weight:800;color:' + color + ';">' + d.suspicionScore + '</span>';
  html += '</div>';
  // Row 2: key stats
  html += '<div style="display:flex;gap:6px;margin-top:4px;font-size:9px;color:rgba(255,255,255,0.4);">';
  html += '<span>IPs:' + d.stats.uniqueIPs + '</span>';
  html += '<span>Hoy:' + d.stats.todayCitas + '</span>';
  html += '<span>30d:' + d.stats.totalLast30Days + '</span>';
  if (d.flags.length > 0) html += '<span style="color:' + color + ';">' + d.flags.length + ' flags</span>';
  html += '</div>';
  // Score bar
  html += '<div style="margin-top:3px;width:100%;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;"><div style="width:' + Math.min(d.suspicionScore,100) + '%;height:100%;background:' + color + ';border-radius:2px;"></div></div>';
  html += '</div>';
  return html;
}
