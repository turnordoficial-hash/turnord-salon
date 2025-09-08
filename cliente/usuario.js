// usuario.js - Lógica del formulario público de reservas.
// - Conecta con Supabase para leer la configuración del negocio, servicios y citas.
// - Calcula y muestra los horarios disponibles en tiempo real.
// - Envía las nuevas solicitudes de reserva a la tabla 'citas' en Supabase.

(function(){
  // ========= Supabase Client Setup =========
  // TODO: Reemplaza los siguientes valores con tus credenciales de Supabase
  const SUPABASE_URL = 'URL_DE_TU_PROYECTO_SUPABASE';
  const SUPABASE_ANON_KEY = 'CLAVE_ANONIMA_PUBLICA_DE_SUPABASE';

  let _supabase;
  try {
    const { createClient } = supabase;
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Error inicializando Supabase. Asegúrate de que el script de Supabase esté cargado y las credenciales sean correctas.", e);
    alert("Error de configuración. No se puede conectar a la base de datos.");
  }

  if (!_supabase || SUPABASE_URL === 'URL_DE_TU_PROYECTO_SUPABASE') {
    console.error("Error: Credenciales de Supabase no configuradas. Edita cliente/usuario.js");
  }

  // ========= Utilidades =========
  const pad2 = (n) => String(n).padStart(2,'0');
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (t) { t.textContent = msg; t.style.display = 'block'; setTimeout(()=>{ t.style.display = 'none'; }, 2500); }
    else alert(msg);
  }

  // ========= Persistencia (Reemplazada por Supabase) =========
  // function loadConfig() { ... } // Obsoleto
  // function loadCitas() { ... } // Se reemplazará
  // function loadReservas() { ... } // Se reemplazará
  // function saveReservas(arr) { ... } // Se reemplazará

  // ========= Lógica de negocio =========
  // function getServicios(cfg) { ... } // Obsoleto
  // function getServicio(cfg, nombre) { ... } // Obsoleto

  function hhmmToMinutes(s){ const [h,m] = s.split(':').map(Number); return h*60 + m; }
  function minutesToHHMM(m){ const h = Math.floor(m/60); const mm = m%60; return `${pad2(h)}:${pad2(mm)}`; }
  function overlap(aStart, aEnd, bStart, bEnd){ return aStart < bEnd && aEnd > bStart; }

  function isHoliday(config, dateYMD){ return Array.isArray(config?.feriados) && config.feriados.includes(dateYMD); }

  function businessWindow(config, date){
    const dow = date.getDay();
    const conf = config?.horarios?.[dow] || null; // null = cerrado
    return conf ? { open: conf.apertura, close: conf.cierre } : null;
  }

  async function availableSlots(dateYMD, servicioNombre) {
    if (!_supabase) return { reason: 'Error de conexión', slots: [] };

    // 1. Fetch config, services, and appointments for the day in parallel
    const [configRes, serviciosRes, citasRes] = await Promise.all([
        _supabase.from('negocio_config').select('horarios, politicas, feriados').eq('id', 1).single(),
        _supabase.from('servicios').select('nombre, duracion_min'),
        _supabase.from('citas').select('hora, servicio').eq('fecha', dateYMD).neq('estado', 'cancelado')
    ]);

    if (configRes.error || serviciosRes.error || citasRes.error) {
        console.error("Error fetching data for slots:", configRes.error || serviciosRes.error || citasRes.error);
        return { reason: 'Error del servidor', slots: [] };
    }

    const config = configRes.data;
    const servicios = serviciosRes.data;
    const citasDelDia = citasRes.data;

    const getServicio = (nombre) => servicios.find(s => s.nombre === nombre);

    const win = businessWindow(config, new Date(dateYMD+'T00:00:00'));
    if (!win) return { reason: 'Día no laborable', slots: [] };
    if (isHoliday(config, dateYMD)) return { reason: 'Feriado', slots: [] };

    const dur = getServicio(servicioNombre)?.duracion_min || config?.politicas?.duracionDefaultMin || 30;
    const cap = config?.politicas?.capacidadSimultanea || 1;
    const step = 15; // Check every 15 minutes

    const startMin = hhmmToMinutes(win.open);
    const endMin = hhmmToMinutes(win.close);
    const lastStart = endMin - dur;

    const slots = [];
    for (let t = startMin; t <= lastStart; t += step) {
        const slotStart = t;
        const slotEnd = t + dur;

        let simult = 0;
        for (const c of citasDelDia) {
            const citaServicio = getServicio(c.servicio);
            if (!citaServicio) continue;

            const citaStartMin = hhmmToMinutes(c.hora);
            const citaEndMin = citaStartMin + citaServicio.duracion_min;

            if (overlap(slotStart, slotEnd, citaStartMin, citaEndMin)) {
                simult++;
            }
        }

        if (simult < cap) {
            slots.push(minutesToHHMM(slotStart));
        }
    }
    return { reason: slots.length ? '' : 'No hay horarios disponibles', slots };
  }

  // ========= UI helpers =========
  function el(id){ return document.getElementById(id); }
  function setMinDate(fechaInput){ if (!fechaInput) return; fechaInput.min = ymd(new Date()); }

  async function fillServicios() {
    const sel = el('servicio');
    if (!sel) return;

    sel.innerHTML = '<option value="">Cargando servicios...</option>';
    sel.disabled = true;

    if (!_supabase) return;

    const { data, error } = await _supabase
        .from('servicios')
        .select('nombre, duracion_min')
        .eq('activo', true)
        .order('nombre');

    if (error) {
        console.error("Error cargando servicios:", error);
        sel.innerHTML = '<option value="">Error al cargar</option>';
        return;
    }

    sel.innerHTML = '<option value="">Seleccione un servicio...</option>';

    if (data && data.length > 0) {
        for (const s of data) {
            const opt = document.createElement('option');
            opt.value = s.nombre;
            opt.textContent = `${s.nombre} (${s.duracion_min} min)`;
            sel.appendChild(opt);
        }
    } else {
        sel.innerHTML += '<option value="" disabled>No hay servicios disponibles</option>';
    }

    sel.disabled = false;
  }

  async function updateHoraOptions() {
    const fecha = el('fecha')?.value;
    const servicio = el('servicio')?.value;
    const horaSel = el('hora');
    const fechaInfo = el('fechaInfo');
    const horaInfo = el('horaInfo');
    if (!horaSel) return;

    horaSel.innerHTML = '<option value="">Buscando horarios...</option>';
    horaSel.disabled = true;
    if (fechaInfo) fechaInfo.textContent = '';
    if (horaInfo) horaInfo.textContent = '';
    if (!fecha || !servicio) {
      horaSel.innerHTML = '<option value="">Seleccione fecha y servicio</option>';
      return;
    }

    const av = await availableSlots(fecha, servicio);

    horaSel.innerHTML = '<option value="">Seleccione hora</option>';
    if (av.slots.length === 0) {
      if (fechaInfo) fechaInfo.textContent = av.reason || 'No hay horarios disponibles para esta fecha.';
      return;
    }
    for (const h of av.slots) {
      const opt = document.createElement('option'); opt.value = h; opt.textContent = h; horaSel.appendChild(opt);
    }
    horaSel.disabled = false;
    if (horaInfo) horaInfo.textContent = `Se muestran horarios disponibles para "${servicio}"`;
  }

  async function submitReserva(e) {
    e.preventDefault();
    const nombre = el('nombre')?.value.trim();
    const telefono = el('telefono')?.value.trim();
    const servicio = el('servicio')?.value;
    const fecha = el('fecha')?.value;
    const hora = el('hora')?.value;
    const notas = el('notas')?.value.trim() || '';

    if (!nombre || !telefono || !servicio || !fecha || !hora) {
        alert('Por favor, completa todos los campos requeridos.');
        return;
    }

    // Placeholder for business ID, as requested by user.
    const negocio_id = 'salon0001';

    const { data, error } = await _supabase.from('citas').insert([
        {
            negocio_id,
            nombre,
            telefono,
            servicio,
            fecha,
            hora,
            notas,
            estado: 'pendiente'
        }
    ]);

    if (error) {
        console.error('Error al guardar la cita:', error);
        showToast('Error al enviar la solicitud. Inténtalo de nuevo.');
        return;
    }

    el('reservaForm')?.reset();
    if (el('hora')) { el('hora').disabled = true; el('hora').innerHTML = '<option value="">Seleccione hora</option>'; }
    if (el('fechaInfo')) el('fechaInfo').textContent = '';
    if (el('horaInfo')) el('horaInfo').textContent = '';
    if (el('modal')) el('modal').classList.add('hidden');
    showToast('¡Tu solicitud ha sido enviada con éxito!');
  }

  function bindModal() {
    const open = el('openModal'); const close = el('closeModal'); const modal = el('modal');
    if (open && modal) open.addEventListener('click', ()=> { modal.classList.remove('hidden'); });
    if (close && modal) close.addEventListener('click', ()=> modal.classList.add('hidden'));
    window.addEventListener('click', (e)=>{ if (e.target === modal) modal.classList.add('hidden'); });
  }

  async function init() {
    try{ const y = el('year'); if (y) y.textContent = new Date().getFullYear(); } catch{}
    setMinDate(el('fecha'));
    await fillServicios();
    bindModal();
    el('reservaForm')?.addEventListener('submit', submitReserva);
    el('fecha')?.addEventListener('change', updateHoraOptions);
    el('servicio')?.addEventListener('change', updateHoraOptions);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
