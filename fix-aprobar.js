// SKY TEAM - Fix aprobar solicitud
(function() {
  function patch() {
    if(typeof window.aprobarSolicitud === 'function' && !window._aprobarPatched) {
      window._aprobarPatched = true;
      window.aprobarSolicitud = function(id) {
        if(typeof showToast === 'function') showToast('⏳ Aprobando...');
        fetch('/api/aprobar', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({id: id})
        })
        .then(function(r){ return r.json(); })
        .then(function(d){
          if(d.ok) {
            if(typeof showToast === 'function') showToast('✅ ' + d.nombre + ' aprobado como @' + d.username + (d.emailSent ? ' · emails enviados 📧' : ''));
            var lp = JSON.parse(localStorage.getItem('skyteam_pending') || '[]');
            lp = lp.filter(function(s){ return s.id !== id; });
            localStorage.setItem('skyteam_pending', JSON.stringify(lp));
            setTimeout(function(){
              if(typeof renderSolicitudes === 'function') renderSolicitudes();
              if(typeof renderAdminUsuarios === 'function') renderAdminUsuarios();
            }, 500);
          } else {
            if(typeof showToast === 'function') showToast('❌ ' + (d.error || 'Error') + (d.available !== undefined ? ' (en servidor: '+d.available+')' : ''));
          }
        })
        .catch(function(e){ if(typeof showToast==='function') showToast('❌ ' + e.message); });
      };
    }
  }
  setTimeout(patch, 500);
  setTimeout(patch, 1500);
  setTimeout(patch, 3000);
})();
