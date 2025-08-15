// cliente/negocio.js - Panel de configuración del negocio
(function(){
  // ==============================
  // Estado y defaults
  // ==============================
  const dias = [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
  ];

  function defaultConfig() {
    return {
      info: {
        nombre: "",
        direccion: "",
        telefono: "",
        descripcion: ""
      },
      politicas: {
        capacidadSimultanea: 5,
        duracionDefaultMin: 30,
        bufferMinutos: 0
      },
      horariosNegocio: {
        0: null,
        1: { apertura: "09:00", cierre: "19:00" },
        2: { apertura: "09:00", cierre: "19:00" },
        3: { apertura: "09:00", cierre: "19:00" },
        4: { apertura: "09:00", cierre: "19:00" },
        5: { apertura: "09:00", cierre: "19:00" },
        6: { apertura: "09:00", cierre: "14:00" }
      },
      feriados: [],
      servicios: [
        { id: crypto.randomUUID(), nombre: "Corte de Cabello", duracion: 30, color: "#3b82f6", activo: true },
        { id: crypto.randomUUID(), nombre: "Coloración", duracion: 90, color: "#ef4444", activo: true },
        { id: crypto.randomUUID(), nombre: "Peinado", duracion: 45, color: "#10b981", activo: true }
      ]
    }
  }

  let state = {
    feriados: [],
    servicios: []
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem('configNegocio');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('No se pudo leer configNegocio', e);
    }
    const cfg = defaultConfig();
    localStorage.setItem('configNegocio', JSON.stringify(cfg));
    return cfg;
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem('configNegocio', JSON.stringify(cfg));
      alert('Configuración guardada');
    } catch (e) {
      console.warn('No se pudo guardar configNegocio', e);
      alert('No se pudo guardar la configuración');
    }
  }

  // ==============================
  // Render de horarios
  // ==============================
  function renderTablaHorarios(cfg) {
    const tbody = document.getElementById('tablaHorarios');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const row = document.createElement('tr');
      const abierto = !!cfg.horariosNegocio[i];
      const apertura = abierto ? cfg.horariosNegocio[i].apertura : '09:00';
      const cierre = abierto ? cfg.horariosNegocio[i].cierre : '18:00';

      row.innerHTML = `
        <td class="py-2">${dias[i]}</td>
        <td class="py-2">
          <input type="checkbox" id="cerrado_${i}" ${!abierto ? 'checked' : ''}>
        </td>
        <td class="py-2">
          <input type="time" id="apertura_${i}" value="${apertura}" class="border px-2 py-1 rounded ${!abierto ? 'opacity-50' : ''}" ${!abierto ? 'disabled' : ''}>
        </td>
        <td class="py-2">
          <input type="time" id="cierre_${i}" value="${cierre}" class="border px-2 py-1 rounded ${!abierto ? 'opacity-50' : ''}" ${!abierto ? 'disabled' : ''}>
        </td>
      `;
      tbody.appendChild(row);

      // Listeners por fila
      const chk = row.querySelector(`#cerrado_${i}`);
      const inpA = row.querySelector(`#apertura_${i}`);
      const inpC = row.querySelector(`#cierre_${i}`);
      chk.addEventListener('change', () => {
        const closed = chk.checked;
        inpA.disabled = closed; inpC.disabled = closed;
        inpA.classList.toggle('opacity-50', closed);
        inpC.classList.toggle('opacity-50', closed);
      });
    }
  }

  // ==============================
  // Feriados
  // ==============================
  function renderFeriadosList() {
    const ul = document.getElementById('feriadosList');
    if (!ul) return;
    ul.innerHTML = '';
    state.feriados.forEach((f, idx) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between';
      li.innerHTML = `
        <span>${f}</span>
        <button data-idx="${idx}" class="text-red-600 hover:underline">Eliminar</button>
      `;
      li.querySelector('button').addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.getAttribute('data-idx'));
        state.feriados.splice(i, 1);
        renderFeriadosList();
      });
      ul.appendChild(li);
    });
  }

  // ==============================
  // Servicios
  // ==============================
  function renderServiciosList() {
    const tbody = document.getElementById('serviciosList');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.servicios.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2">${s.nombre}</td>
        <td class="py-2">${s.duracion}</td>
        <td class="py-2"><span class="inline-flex items-center gap-2"><span class="w-4 h-4 inline-block rounded" style="background:${s.color}"></span>${s.color}</span></td>
        <td class="py-2">
          <input type="checkbox" ${s.activo ? 'checked' : ''} data-idx="${idx}" class="chk-activo">
        </td>
        <td class="py-2">
          <button data-idx="${idx}" class="text-red-600 hover:underline">Eliminar</button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.getAttribute('data-idx'));
        state.servicios.splice(i, 1);
        renderServiciosList();
      });
      tr.querySelector('.chk-activo').addEventListener('change', (e) => {
        const i = parseInt(e.currentTarget.getAttribute('data-idx'));
        state.servicios[i].activo = e.currentTarget.checked;
      });
      tbody.appendChild(tr);
    });
  }

  // ==============================
  // Poblar UI desde config
  // ==============================
  function populateUI(cfg) {
    // Info
    document.getElementById('nombreSalon').value = cfg.info?.nombre || '';
    document.getElementById('telefonoSalon').value = cfg.info?.telefono || '';
    document.getElementById('direccionSalon').value = cfg.info?.direccion || '';
    document.getElementById('descripcionSalon').value = cfg.info?.descripcion || '';

    // Políticas
    document.getElementById('capacidadSimultanea').value = cfg.politicas?.capacidadSimultanea ?? 5;
    document.getElementById('duracionDefaultMin').value = cfg.politicas?.duracionDefaultMin ?? 30;
    document.getElementById('bufferMinutos').value = cfg.politicas?.bufferMinutos ?? 0;

    // Horarios
    renderTablaHorarios(cfg);

    // Feriados
    state.feriados = Array.isArray(cfg.feriados) ? [...cfg.feriados] : [];
    renderFeriadosList();

    // Servicios
    state.servicios = Array.isArray(cfg.servicios) ? [...cfg.servicios] : [];
    renderServiciosList();
  }

  function collectConfigFromUI() {
    const info = {
      nombre: document.getElementById('nombreSalon').value.trim(),
      telefono: document.getElementById('telefonoSalon').value.trim(),
      direccion: document.getElementById('direccionSalon').value.trim(),
      descripcion: document.getElementById('descripcionSalon').value.trim()
    };

    const politicas = {
      capacidadSimultanea: Math.max(1, parseInt(document.getElementById('capacidadSimultanea').value || '5', 10)),
      duracionDefaultMin: Math.max(5, parseInt(document.getElementById('duracionDefaultMin').value || '30', 10)),
      bufferMinutos: Math.max(0, parseInt(document.getElementById('bufferMinutos').value || '0', 10))
    };

    // Horarios por día
    const horariosNegocio = {};
    for (let i = 0; i < 7; i++) {
      const cerrado = document.getElementById(`cerrado_${i}`).checked;
      if (cerrado) {
        horariosNegocio[i] = null;
      } else {
        const apertura = document.getElementById(`apertura_${i}`).value || '09:00';
        const cierre = document.getElementById(`cierre_${i}`).value || '18:00';
        horariosNegocio[i] = { apertura, cierre };
      }
    }

    const feriados = [...state.feriados];
    const servicios = state.servicios.map(s => ({ ...s }));

    return { info, politicas, horariosNegocio, feriados, servicios };
  }

  // ==============================
  // Eventos y arranque
  // ==============================
  function bindEvents() {
    const btnFeriado = document.getElementById('agregarFeriadoBtn');
    btnFeriado?.addEventListener('click', (e) => {
      e.preventDefault();
      const inp = document.getElementById('feriadoInput');
      const val = inp.value;
      if (!val) return;
      if (!state.feriados.includes(val)) state.feriados.push(val);
      inp.value = '';
      renderFeriadosList();
    });

    const btnServicio = document.getElementById('agregarServicioBtn');
    btnServicio?.addEventListener('click', (e) => {
      e.preventDefault();
      const nombre = document.getElementById('servicioNombre').value.trim();
      const duracion = parseInt(document.getElementById('servicioDuracion').value || '0', 10);
      const color = document.getElementById('servicioColor').value || '#3b82f6';
      if (!nombre) { alert('Ingresa un nombre de servicio'); return; }
      if (!Number.isFinite(duracion) || duracion <= 0) { alert('Ingresa una duración válida (>0)'); return; }
      state.servicios.push({ id: crypto.randomUUID(), nombre, duracion, color, activo: true });
      document.getElementById('servicioNombre').value = '';
      document.getElementById('servicioDuracion').value = '';
      renderServiciosList();
    });

    const btnGuardar = document.getElementById('guardarBtn');
    btnGuardar?.addEventListener('click', (e) => {
      e.preventDefault();
      const cfg = collectConfigFromUI();
      saveConfig(cfg);
    });

    const btnReset = document.getElementById('restablecerBtn');
    btnReset?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!confirm('Esto restablecerá todos los valores a sus valores por defecto. ¿Continuar?')) return;
      const cfg = defaultConfig();
      saveConfig(cfg);
      populateUI(cfg);
    });
  }

  function init() {
    const initial = loadConfig();
    populateUI(initial);
    bindEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
