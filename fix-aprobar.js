// SKY TEAM - Fix aprobar solicitud
(function() {
  var orig = window.onload;
  function patch() {
    if(typeof window.aprobarSolicitud === 'function' && !window._aprobarPatched) {
      window._aprobarPatched = true;
      window.aprobarSolicitud = function(id) {
        if(typeof showToast === 'function') showToast('Aprobando...');
        fetch('/api/aprobar', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({id: id})
        })
        .then(function(r){ return r.json(); })
        .then(function(d){
          if(d.ok) {
            if(typeof showToast === 'function') showToast('Aprobado: ' + d.nombre + ' @' + d.username);
            if(typeof renderSolicitudes === 'function') renderSolicitudes();
          } else {
            if(typeof showToast === 'function') showToast('Error: ' + (d.error||'desconocido'));
          }
        })
        .catch(function(e){ if(typeof showToast==='function') showToast('Error: '+e.message); });
      };
    }
  }
  // Patch immediately and also after a delay
  setTimeout(patch, 500);
  setTimeout(patch, 1500);
  setTimeout(patch, 3000);
})();
