// cierre.js - limpia la sesión y redirige al login
(function(){
  function clearSession(){
    try { sessionStorage.removeItem('adminSession'); } catch(e){}
    try { localStorage.removeItem('adminSession'); } catch(e){}
  }
  function init(){
    clearSession();
    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
