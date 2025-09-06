// login.js - Manejo de acceso simple basado en hash en localStorage
(function(){
  async function sha256Hex(text){
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function setYear(){ const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); }

  function getStoredHash(){ return localStorage.getItem('adminPasswordHash') || ''; }
  async function ensureDefaultPassword(){
  // Si no hay ninguna contraseña, establece 'perosna1' como contraseña inicial
  if (!getStoredHash()) {
    const def = 'perosna1';
    const h = await sha256Hex(def);
    localStorage.setItem('adminPasswordHash', h);
  }
  }

  function setSession(persist){
    // Persistente: localStorage; caso contrario: sessionStorage
    const key = 'adminSession';
    const value = JSON.stringify({ loggedIn: true, at: Date.now() });
    if (persist) localStorage.setItem(key, value); else sessionStorage.setItem(key, value);
  }

  function hasSession(){
    const key = 'adminSession';
    try {
      const a = sessionStorage.getItem(key); if (a && JSON.parse(a)?.loggedIn) return true;
      const b = localStorage.getItem(key); if (b && JSON.parse(b)?.loggedIn) return true;
    } catch(e){}
    return false;
  }

  async function onSubmit(e){
    e.preventDefault();
    const pass = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    const stored = getStoredHash();

    if (!stored){
      // No hay contraseña configurada: permitir acceso y sugerir configurar
      setSession(remember);
      window.location.href = 'cliente/inicio.html';
      return;
    }

    const hash = await sha256Hex(pass);
    if (hash === stored){
      setSession(remember);
      window.location.href = 'cliente/inicio.html';
    } else {
      alert('Contraseña incorrecta');
    }
  }

  async function init(){
    setYear();
    await ensureDefaultPassword();
    const stored = getStoredHash();
    const hint = document.getElementById('loginHint');
    if (!stored && hint){ hint.textContent = 'Aún no hay contraseña configurada. Entra y configúrala en ⚙️ Configuración.'; }
    document.getElementById('formLogin').addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
