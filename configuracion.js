// configuracion.js - Lógica de Configuración (cuenta y copia de seguridad)
(function(){
  // ===== Utilidades =====
  async function sha256Hex(text){
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function $(id){ return document.getElementById(id); }
  function setSession(persist){
    const key = 'adminSession';
    const value = JSON.stringify({ loggedIn: true, at: Date.now() });
    if (persist) localStorage.setItem(key, value); else sessionStorage.setItem(key, value);
  }

  // ===== Cambio de contraseña =====
  async function onUpdatePassword(e){
    e.preventDefault();
    const current = $('currentPass').value;
    const next = $('newPass').value;
    const confirm = $('confirmPass').value;

    if (!next || next.length < 6){
      alert('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (next !== confirm){
      alert('La confirmación no coincide');
      return;
    }

    const storedHash = localStorage.getItem('adminPasswordHash');
    if (storedHash){
      const currentHash = await sha256Hex(current);
      if (currentHash !== storedHash){
        alert('La contraseña actual no es correcta');
        return;
      }
    } else {
      // Si no hay contraseña previa, permitimos establecerla sin validar current
      if (current && current.length){
        // opcional: advertir que no era necesaria
      }
    }

    const newHash = await sha256Hex(next);
    localStorage.setItem('adminPasswordHash', newHash);
    // Inicia sesión y redirige al inicio
    setSession(true);
    alert('Contraseña actualizada. Redirigiendo al inicio...');
    window.location.href = 'cliente/inicio.html';
  }

  function bindPasswordToggles(){
    const binds = [
      { chk: 'showCurrent', inp: 'currentPass' },
      { chk: 'showNew', inp: 'newPass' },
      { chk: 'showConfirm', inp: 'confirmPass' },
    ];
    binds.forEach(({chk, inp}) => {
      const c = $(chk), i = $(inp);
      if (c && i){ c.addEventListener('change', () => { i.type = c.checked ? 'text' : 'password'; }); }
    });
  }

  // ===== Copia de seguridad =====
  function exportBackup(){
    const keys = ['configNegocio','citas','clientes','reservasPendientes'];
    const backup = {};
    keys.forEach(k => {
      try { const v = localStorage.getItem(k); backup[k] = v ? JSON.parse(v) : null; } catch(e){ backup[k] = null; }
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `turnord_backup_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackupFile(file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data && typeof data === 'object'){
          if ('configNegocio' in data) localStorage.setItem('configNegocio', JSON.stringify(data.configNegocio));
          if ('citas' in data) localStorage.setItem('citas', JSON.stringify(data.citas));
          if ('clientes' in data) localStorage.setItem('clientes', JSON.stringify(data.clientes));
          if ('reservasPendientes' in data) localStorage.setItem('reservasPendientes', JSON.stringify(data.reservasPendientes));
          alert('Copia restaurada. Recarga la página para ver los cambios.');
        } else {
          alert('Archivo inválido');
        }
      } catch(e){
        alert('No se pudo importar el archivo');
      }
    };
    reader.onerror = () => alert('No se pudo leer el archivo');
    reader.readAsText(file);
  }

  function bindBackup(){
    const exp = $('btnExportBackup'); if (exp) exp.addEventListener('click', exportBackup);
    const imp = $('btnImportBackup'); if (imp) imp.addEventListener('click', () => importBackupFile($('inputBackup').files[0]));
  }

  function init(){
    const form = $('formPass'); if (form) form.addEventListener('submit', onUpdatePassword);
    bindPasswordToggles();
    bindBackup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
