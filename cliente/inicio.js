// cliente/inicio.js - Lógica del panel diario de actividades
(function(){
  // ============ Utilidades ============
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const fmtHora = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const parseLocalDateTime = (ymdStr, hhmm) => new Date(`${ymdStr}T${hhmm}:00`);

  function normalizePhone(t) {
    if (!t) return '';
    const digits = String(t).replace(/[^0-9]/g, '');
    return digits; // para wa.me se requieren solo dígitos en formato internacional sin '+'
  }

  // ============ Persistencia ============
  function loadConfig() {
    try { const raw = localStorage.getItem('configNegocio'); return raw ? JSON.parse(raw) : null; } catch(e) { return null; }
  }
  function getServiciosMap(cfg) {
    const map = {}; const lista = cfg && Array.isArray(cfg.servicios) ? cfg.servicios : [];
    for (const s of lista) map[s.nombre] = s; return map;
  }
  function loadCitas() { try { return JSON.parse(localStorage.getItem('citas')||'[]'); } catch(e){ return []; } }
  function saveCitas(arr) { localStorage.setItem('citas', JSON.stringify(arr)); }
  function loadClientes() { try { return JSON.parse(localStorage.getItem('clientes')||'[]'); } catch(e){ return []; } }
  function saveClientes(arr) { localStorage.setItem('clientes', JSON.stringify(arr)); }
  function loadReservas() { try { const r = JSON.parse(localStorage.getItem('reservasPendientes')||'[]'); if (Array.isArray(r)) return r; } catch(e){} return [];} 
  function saveReservas(arr) { localStorage.setItem('reservasPendientes', JSON.stringify(arr)); }

  // Semilla de ejemplo para probar flujo
  function seedReservasIfEmpty() {
    const reservas = loadReservas();
    if (reservas.length === 0) {
      const hoy = new Date(); const fecha = ymd(hoy);
      reservas.push({ id: 'resv_'+Date.now(), nombre: 'Cliente Demo', telefono: '+18095551234', servicio: 'Corte de Cabello', fecha, hora: '15:00', notas: '', creadoEn: new Date().toISOString() });
      saveReservas(reservas);
    }
  }

  // ============ Lógica de negocio ============
  function computeEnd(start, servicio, cfg) {
    const mapa = getServiciosMap(cfg);
    const dur = (mapa[servicio]?.duracion) || (cfg?.politicas?.duracionDefaultMin || 30);
    return new Date(new Date(start).getTime() + dur*60000);
  }

  function addClienteIfMissing(nombre, telefono) {
    const clientes = loadClientes();
    const exists = clientes.find(c => normalizePhone(c.telefono) === normalizePhone(telefono));
    if (!exists) {
      clientes.push({ id: 'cli_'+Date.now(), nombre, telefono, creadoEn: new Date().toISOString() });
      saveClientes(clientes);
    }
  }

  function confirmarReserva(id) {
    const cfg = loadConfig();
    const reservas = loadReservas();
    const idx = reservas.findIndex(r => r.id === id);
    if (idx < 0) return;
    const r = reservas[idx];
    const start = parseLocalDateTime(r.fecha, r.hora);
    const end = computeEnd(start, r.servicio, cfg);
    const nueva = {
      id: 'cita_'+Date.now(),
      title: `${r.servicio} - ${r.nombre}`,
      start: `${r.fecha}T${r.hora}:00`,
      end: `${ymd(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:00`,
      servicio: r.servicio,
      estado: 'confirmado',
      creadoEn: new Date().toISOString()
    };
    const citas = loadCitas(); citas.push(nueva); saveCitas(citas);
    addClienteIfMissing(r.nombre, r.telefono);
    reservas.splice(idx,1); saveReservas(reservas);
    alert('Cita confirmada y agregada al calendario.');
    renderAll();
  }

  function rechazarReserva(id) {
    const reservas = loadReservas();
    const idx = reservas.findIndex(r => r.id === id);
    if (idx < 0) return;
    if (!confirm('¿Rechazar esta solicitud?')) return;
    reservas.splice(idx,1); saveReservas(reservas);
    renderAll();
  }

  function cambiarEstadoCita(id, nuevo) {
    const citas = loadCitas();
    const c = citas.find(x => x.id === id);
    if (!c) return;
    c.estado = nuevo; c.actualizadoEn = new Date().toISOString();
    saveCitas(citas);
    renderAll();
  }

  // ============ Render ============
  function renderKPIs() {
    const citas = loadCitas();
    const hoy = new Date(); const ymdHoy = ymd(hoy);
    const hoyCitas = citas.filter(c => typeof c.start === 'string' && c.start.startsWith(ymdHoy));
    const reservas = loadReservas();
    const proximas = getRecordatorios24h();

    document.getElementById('kpiHoy').textContent = String(hoyCitas.length);
    document.getElementById('kpiPendientes').textContent = String(reservas.length);
    document.getElementById('kpiRecordatorios').textContent = String(proximas.length);

    const clave = `waMensajes_${ymdHoy}`;
    const enviados = Number(localStorage.getItem(clave)||'0');
    document.getElementById('kpiMensajes').textContent = String(enviados);
  }

  function renderSolicitudes() {
    const tb = document.getElementById('tbodySolicitudes'); tb.innerHTML = '';
    const reservas = loadReservas();
    if (reservas.length === 0) document.getElementById('vacioSolicitudes').classList.remove('hidden');
    else document.getElementById('vacioSolicitudes').classList.add('hidden');

    for (const r of reservas) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2">${escapeHTML(r.nombre)}</td>
        <td class="py-2">${escapeHTML(r.telefono)}</td>
        <td class="py-2">${escapeHTML(r.servicio)}</td>
        <td class="py-2">${escapeHTML(r.fecha)}</td>
        <td class="py-2">${escapeHTML(r.hora)}</td>
        <td class="py-2">
          <div class="flex gap-2">
            <button class="px-3 py-1 bg-pastel-pinkHover text-white rounded" data-action="confirm" data-id="${r.id}">Confirmar</button>
            <a class="px-3 py-1 bg-green-500 text-white rounded" target="_blank" href="${waUrl(r.telefono, plantillaConfirmacion(r))}">WhatsApp</a>
            <button class="px-3 py-1 bg-gray-200 rounded" data-action="reject" data-id="${r.id}">Rechazar</button>
          </div>
        </td>`;
      tb.appendChild(tr);
    }
    tb.addEventListener('click', onClickSolicitudesOnce, { once: true });
  }

  function onClickSolicitudesOnce(e){
    const btn = e.target.closest('button');
    if (!btn) { document.getElementById('tbodySolicitudes').addEventListener('click', onClickSolicitudesOnce, { once: true }); return; }
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-action');
    if (act === 'confirm') confirmarReserva(id);
    if (act === 'reject') rechazarReserva(id);
    document.getElementById('tbodySolicitudes').addEventListener('click', onClickSolicitudesOnce, { once: true });
  }

  function renderAgendaHoy() {
    const ul = document.getElementById('listaHoy'); ul.innerHTML = '';
    const hoy = ymd(new Date());
    const citas = loadCitas().filter(c => typeof c.start === 'string' && c.start.startsWith(hoy)).sort((a,b)=> a.start.localeCompare(b.start));
    if (citas.length === 0) document.getElementById('vacioHoy').classList.remove('hidden');
    else document.getElementById('vacioHoy').classList.add('hidden');

    for (const c of citas) {
      const ini = new Date(c.start); const fin = new Date(c.end);
      const li = document.createElement('li');
      li.className = 'py-2 flex items-center justify-between gap-2';
      li.innerHTML = `
        <div>
          <div class="font-medium">${escapeHTML(c.title)}</div>
          <div class="text-sm text-gray-600">${fmtHora(ini)} - ${fmtHora(fin)} • ${escapeHTML(c.servicio)} • <span class="uppercase">${escapeHTML(c.estado||'pendiente')}</span></div>
        </div>
        <div class="flex gap-2">
          <button class="px-3 py-1 rounded bg-gray-200" data-act="estado" data-id="${c.id}" data-estado="confirmado">Confirmar</button>
          <button class="px-3 py-1 rounded bg-green-500 text-white" data-act="estado" data-id="${c.id}" data-estado="completado">Completar</button>
          <button class="px-3 py-1 rounded bg-red-300 text-white" data-act="estado" data-id="${c.id}" data-estado="cancelado">Cancelar</button>
        </div>`;
      ul.appendChild(li);
    }
    ul.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-act') === 'estado') cambiarEstadoCita(b.getAttribute('data-id'), b.getAttribute('data-estado'));
    });
  }

  function getRecordatorios24h() {
    const ahora = new Date(); const limite = new Date(ahora.getTime() + 24*60*60000);
    return loadCitas().filter(c => {
      const s = new Date(c.start); return s > ahora && s <= limite && (c.estado||'pendiente') !== 'cancelado';
    }).sort((a,b)=> a.start.localeCompare(b.start));
  }

  function renderRecordatorios() {
    const ul = document.getElementById('listaRecordatorios'); ul.innerHTML = '';
    const recs = getRecordatorios24h();
    if (recs.length === 0) document.getElementById('vacioRecord').classList.remove('hidden');
    else document.getElementById('vacioRecord').classList.add('hidden');

    for (const c of recs) {
      const s = new Date(c.start);
      const contacto = getClienteFromTitle(c.title) || {};
      const a = document.createElement('li');
      a.className = 'py-2 flex items-center justify-between gap-2';
      const mensaje = plantillaRecordatorio({ nombre: contacto.nombre || parseClienteDesdeTitulo(c.title), fecha: ymd(s), hora: fmtHora(s), servicio: c.servicio });
      a.innerHTML = `
        <div>
          <div class="font-medium">${escapeHTML(c.title)}</div>
          <div class="text-sm text-gray-600">${ymd(s)} ${fmtHora(s)} • ${escapeHTML(c.servicio)}</div>
        </div>
        <div class="flex gap-2">
          <a target="_blank" class="px-3 py-1 rounded bg-pastel-pinkHover text-white" href="${waUrl(contacto.telefono, mensaje)}">Enviar WhatsApp</a>
        </div>`;
      ul.appendChild(a);
    }
  }

  function getClienteFromTitle(title) {
    const nombre = parseClienteDesdeTitulo(title);
    const clientes = loadClientes();
    return clientes.find(c => (c.nombre||'').toLowerCase() === (nombre||'').toLowerCase());
  }

  function parseClienteDesdeTitulo(title) {
    if (!title) return '';
    const idx = title.lastIndexOf(' - ');
    return idx >= 0 ? title.slice(idx + 3) : title;
  }

  // ============ WhatsApp ============
  function waUrl(telefono, mensaje) {
    const n = normalizePhone(telefono||'');
    const txt = encodeURIComponent(mensaje||'');
    return `https://wa.me/${n}?text=${txt}`;
  }

  function plantillaConfirmacion(r) {
    const cfg = loadConfig();
    const salon = cfg?.info?.nombre || 'nuestro salón';
    const dir = cfg?.info?.direccion ? ` en ${cfg.info.direccion}` : '';
    return `Hola ${r.nombre}, tu cita de ${r.servicio} está pendiente de confirmación para el ${r.fecha} a las ${r.hora}. Responde a este mensaje para confirmar. — ${salon}${dir}`;
  }

  function plantillaRecordatorio({ nombre, servicio, fecha, hora }) {
    const cfg = loadConfig();
    const salon = cfg?.info?.nombre || 'nuestro salón';
    return `Hola ${nombre}, te recordamos tu cita de ${servicio} el ${fecha} a las ${hora}. Si no puedes asistir, avísanos. — ${salon}`;
  }

  function rellenarWAMensaje() {
    const clienteId = document.getElementById('waCliente').value;
    const citaId = document.getElementById('waCita').value;
    const tpl = document.getElementById('waTemplate').value;
    const clientes = loadClientes();
    const citas = loadCitas();
    const cli = clientes.find(c => c.id === clienteId);
    let msg = '';
    if (tpl === 'personalizado') msg = '';
    else if (tpl === 'confirmacion') {
      if (cli && citaId) {
        const c = citas.find(x => x.id === citaId);
        const s = new Date(c.start);
        msg = `Hola ${cli.nombre}, tu cita de ${c.servicio} está confirmada para el ${ymd(s)} a las ${fmtHora(s)}. ¡Te esperamos!`;
      } else if (cli) {
        msg = `Hola ${cli.nombre}, tu cita está confirmada. ¡Te esperamos!`;
      } else {
        msg = `Tu cita está confirmada. ¡Te esperamos!`;
      }
    } else if (tpl === 'recordatorio') {
      if (cli && citaId) {
        const c = citas.find(x => x.id === citaId); const s = new Date(c.start);
        msg = plantillaRecordatorio({ nombre: cli.nombre, servicio: c.servicio, fecha: ymd(s), hora: fmtHora(s) });
      } else if (cli) {
        msg = `Hola ${cli.nombre}, te recordamos tu cita. Si necesitas reprogramar, avísanos.`;
      } else { msg = `Te recordamos tu cita.`; }
    }
    document.getElementById('waMensaje').value = msg;
  }

  function abrirWhatsApp() {
    const clienteId = document.getElementById('waCliente').value;
    const clientes = loadClientes();
    const cli = clientes.find(c => c.id === clienteId);
    let phone = cli?.telefono || '';
    if (!phone) { alert('Selecciona un cliente con teléfono.'); return; }
    const msg = document.getElementById('waMensaje').value || '';
    window.open(waUrl(phone, msg), '_blank');
    const hoy = new Date(); const clave = `waMensajes_${ymd(hoy)}`;
    const prev = Number(localStorage.getItem(clave)||'0') + 1; localStorage.setItem(clave, String(prev));
    renderKPIs();
  }

  // ============ Poblado de selects ============
  function populateSelects() {
    const selCli = document.getElementById('waCliente'); selCli.innerHTML = '<option value="">— Seleccionar —</option>';
    const clientes = loadClientes();
    for (const c of clientes) {
      const opt = document.createElement('option'); opt.value = c.id; opt.textContent = `${c.nombre} — ${c.telefono||''}`; selCli.appendChild(opt);
    }
    const selCita = document.getElementById('waCita'); selCita.innerHTML = '<option value="">— Opcional —</option>';
    const hoy = new Date(); const limite = new Date(hoy.getTime() + 14*24*60*60000);
    const citas = loadCitas().filter(c => new Date(c.start) >= hoy && new Date(c.start) <= limite).sort((a,b)=> a.start.localeCompare(b.start));
    for (const c of citas) {
      const s = new Date(c.start); const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = `${ymd(s)} ${fmtHora(s)} — ${c.servicio} — ${parseClienteDesdeTitulo(c.title)}`;
      selCita.appendChild(opt);
    }
  }

  function escapeHTML(s){ if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

  // ============ Render principal ============
  function renderAll() {
    renderKPIs();
    renderSolicitudes();
    renderAgendaHoy();
    renderRecordatorios();
    populateSelects();
  }

  // ============ Eventos ============
  function bindEvents() {
    const sim = document.getElementById('btnSimularReserva'); if (sim) sim.addEventListener('click', () => {
      const reservas = loadReservas();
      const hoy = new Date(); const fecha = ymd(hoy);
      reservas.push({ id: 'resv_'+Date.now(), nombre: 'Cliente '+(reservas.length+1), telefono: '+1809555123'+(reservas.length%10), servicio: 'Corte de Cabello', fecha, hora: `${pad2(Math.min(17, 9 + reservas.length))}:00`, notas: '', creadoEn: new Date().toISOString() });
      saveReservas(reservas); renderAll();
    });

    const vac = document.getElementById('btnVaciarBandeja'); if (vac) vac.addEventListener('click', () => { if (!confirm('¿Vaciar solicitudes?')) return; saveReservas([]); renderAll(); });

    const rell = document.getElementById('waRellenar'); if (rell) rell.addEventListener('click', (e)=>{ e.preventDefault(); rellenarWAMensaje(); });

    const abr = document.getElementById('waAbrir'); if (abr) abr.addEventListener('click', (e)=>{ e.preventDefault(); abrirWhatsApp(); });
  }

  function init() {
    seedReservasIfEmpty();
    renderAll();
    bindEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
