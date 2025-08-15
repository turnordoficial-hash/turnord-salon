// usuario.js - Lógica del formulario público de reservas (sin dependencias externas)
// - Lee servicios, horarios y políticas desde configNegocio (localStorage)
// - Calcula horas disponibles por fecha y servicio (sin solapamientos y respetando capacidad)
// - Envía solicitudes a reservasPendientes (localStorage), que verá el administrador en cliente/inicio.html

(function(){
  // ========= Utilidades =========
  const pad2 = (n) => String(n).padStart(2,'0');
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (t) { t.textContent = msg; t.style.display = 'block'; setTimeout(()=>{ t.style.display = 'none'; }, 2500); }
    else alert(msg);
  }

  // ========= Persistencia =========
  function loadConfig() { try { const raw = localStorage.getItem('configNegocio'); return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
  function loadCitas() { try { return JSON.parse(localStorage.getItem('citas')||'[]'); } catch(e){ return []; } }
  function loadReservas() { try { return JSON.parse(localStorage.getItem('reservasPendientes')||'[]'); } catch(e){ return []; } }
  function saveReservas(arr) { localStorage.setItem('reservasPendientes', JSON.stringify(arr)); }

  // ========= Lógica de negocio =========
  function getServicios(cfg) { return (cfg?.servicios || []).filter(s => s.activo !== false); }
  function getServicio(cfg, nombre) { return getServicios(cfg).find(s => s.nombre === nombre); }

  function hhmmToMinutes(s){ const [h,m] = s.split(':').map(Number); return h*60 + m; }
  function minutesToHHMM(m){ const h = Math.floor(m/60); const mm = m%60; return `${pad2(h)}:${pad2(mm)}`; }
  function overlap(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

  function isHoliday(cfg, dateYMD){ return Array.isArray(cfg?.feriados) && cfg.feriados.includes(dateYMD); }

  function businessWindow(cfg, date){
    const dow = date.getDay();
    const conf = cfg?.horariosNegocio?.[dow] || null; // null = cerrado
    return conf ? { open: conf.apertura, close: conf.cierre } : null;
  }

  function availableSlots(cfg, dateYMD, servicioNombre) {
    const win = businessWindow(cfg, new Date(dateYMD+'T00:00:00'));
    if (!win) return { reason: 'Día no laborable', slots: [] };
    if (isHoliday(cfg, dateYMD)) return { reason: 'Feriado', slots: [] };

    const dur = getServicio(cfg, servicioNombre)?.duracion || cfg?.politicas?.duracionDefaultMin || 30;
    const cap = cfg?.politicas?.capacidadSimultanea || 5;
    const step = 15; // minutos entre opciones

    const startMin = hhmmToMinutes(win.open);
    const endMin = hhmmToMinutes(win.close);
    const lastStart = endMin - dur; // última hora de inicio válida

    const citas = loadCitas().filter(c => typeof c.start === 'string' && c.start.startsWith(dateYMD));

    const slots = [];
    for (let t = startMin; t <= lastStart; t += step) {
      const slotStart = t; const slotEnd = t + dur;
      // contar solapadas
      let simult = 0;
      for (const c of citas) {
        const cStart = hhmmToMinutes(new Date(c.start).toTimeString().slice(0,5));
        const cEnd = hhmmToMinutes(new Date(c.end).toTimeString().slice(0,5));
        if (overlap(slotStart, slotEnd, cStart, cEnd)) simult++;
        if (simult >= cap) break;
      }
      if (simult < cap) slots.push(minutesToHHMM(slotStart));
    }
    return { reason: slots.length ? '' : 'No hay horarios disponibles', slots };
  }

  // ========= UI helpers =========
  function el(id){ return document.getElementById(id); }
  function setMinDate(fechaInput){ if (!fechaInput) return; fechaInput.min = ymd(new Date()); }

  function fillServicios() {
    const sel = el('servicio'); if (!sel) return;
    const cfg = loadConfig();
    sel.innerHTML = '<option value="">Seleccione servicio</option>';
    const arr = getServicios(cfg);
    if (!arr.length) {
      sel.innerHTML += '<option value="Corte de Cabello">Corte de Cabello</option>';
    } else {
      for (const s of arr) {
        const opt = document.createElement('option');
        opt.value = s.nombre; opt.textContent = s.nombre; sel.appendChild(opt);
      }
    }
  }

  function updateHoraOptions() {
    const cfg = loadConfig();
    const fecha = el('fecha')?.value;
    const servicio = el('servicio')?.value;
    const horaSel = el('hora');
    const fechaInfo = el('fechaInfo');
    const horaInfo = el('horaInfo');
    if (!horaSel) return;

    horaSel.innerHTML = '<option value="">Seleccione hora</option>';
    horaSel.disabled = true; if (fechaInfo) fechaInfo.textContent = ''; if (horaInfo) horaInfo.textContent = '';
    if (!fecha || !servicio) return;

    const av = availableSlots(cfg, fecha, servicio);
    if (av.slots.length === 0) {
      if (fechaInfo) fechaInfo.textContent = av.reason || 'No hay horarios disponibles para esta fecha.';
      return;
    }
    for (const h of av.slots) {
      const opt = document.createElement('option'); opt.value = h; opt.textContent = h; horaSel.appendChild(opt);
    }
    horaSel.disabled = false; if (horaInfo) horaInfo.textContent = `Se muestran horarios disponibles según la duración de "${servicio}"`;
  }

  function submitReserva(e) {
    e.preventDefault();
    const nombre = el('nombre')?.value.trim();
    const telefono = el('telefono')?.value.trim();
    const servicio = el('servicio')?.value;
    const fecha = el('fecha')?.value;
    const hora = el('hora')?.value;
    const notas = el('notas')?.value.trim() || '';

    if (!nombre || !telefono || !servicio || !fecha || !hora) { alert('Completa todos los campos.'); return; }

    const reservas = loadReservas();
    reservas.push({ id: 'resv_'+Date.now(), nombre, telefono, servicio, fecha, hora, notas, creadoEn: new Date().toISOString() });
    saveReservas(reservas);

    el('reservaForm')?.reset();
    if (el('hora')) { el('hora').disabled = true; el('hora').innerHTML = '<option value="">Seleccione hora</option>'; }
    if (el('fechaInfo')) el('fechaInfo').textContent = '';
    if (el('horaInfo')) el('horaInfo').textContent = '';
    if (el('modal')) el('modal').classList.add('hidden');
    showToast('Solicitud enviada. Te contactaremos por WhatsApp.');
  }

  function bindModal() {
    const open = el('openModal'); const close = el('closeModal'); const modal = el('modal');
    if (open && modal) open.addEventListener('click', ()=> { modal.classList.remove('hidden'); });
    if (close && modal) close.addEventListener('click', ()=> modal.classList.add('hidden'));
    window.addEventListener('click', (e)=>{ if (e.target === modal) modal.classList.add('hidden'); });
  }

  function init() {
    try{ const y = el('year'); if (y) y.textContent = new Date().getFullYear(); } catch{}
    setMinDate(el('fecha'));
    fillServicios();
    bindModal();
    el('reservaForm')?.addEventListener('submit', submitReserva);
    el('fecha')?.addEventListener('change', updateHoraOptions);
    el('servicio')?.addEventListener('change', updateHoraOptions);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
