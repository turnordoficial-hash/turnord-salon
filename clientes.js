// clientes.js - Lógica de gestión de clientes (CRUD, búsqueda, orden, CSV)
(function(){
  // ==============================
  // Utilidades y persistencia
  // ==============================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayYMD = () => { const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };

  function normalizePhone(t) {
    if (!t) return '';
    // Quitar todo excepto dígitos y '+' inicial
    const trimmed = String(t).trim();
    const plus = trimmed.startsWith('+');
    const digits = trimmed.replace(/[^0-9]/g, '');
    return plus ? ('+' + digits) : digits;
  }

  function uuid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id_' + Date.now() + '_' + Math.random().toString(36).slice(2)); }

  function loadClientes() {
    try {
      const raw = localStorage.getItem('clientes');
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      }
    } catch(e) { console.warn('Error leyendo clientes:', e); }
    // Semilla básica si no hay datos
    return [
      { id: uuid(), nombre: 'Carlos Pérez', telefono: '+1 809-555-1234', email: '', notas: '', ultimaCita: todayYMD(), creadoEn: new Date().toISOString() },
      { id: uuid(), nombre: 'María López', telefono: '+1 809-555-5678', email: '', notas: '', ultimaCita: todayYMD(), creadoEn: new Date().toISOString() }
    ];
  }

  function saveClientes(list) {
    try { localStorage.setItem('clientes', JSON.stringify(list)); }
    catch(e) { console.warn('Error guardando clientes:', e); }
  }

  function debounce(fn, ms=250) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), ms); };
  }

  function toCSV(rows, headers) {
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const out = [headers.join(',')];
    for (const r of rows) out.push(headers.map(h => escape(r[h])).join(','));
    return "\ufeff" + out.join('\n');
  }

  function parseCSV(text) {
    // Parser simple que maneja comillas dobles
    const rows = [];
    let row = [], field = '', i = 0, inQuotes = false;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i+1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else { field += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
          // manejar \r\n
          if (ch === '\r' && text[i+1] === '\n') i++;
        } else { field += ch; }
      }
      i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // ==============================
  // Estado
  // ==============================
  const state = {
    clientes: loadClientes(),
    filtro: '',
    sortBy: 'nombre',
    sortDir: 'asc' // 'asc' | 'desc'
  };

  // ==============================
  // Renderizado
  // ==============================
  function render() {
    const term = state.filtro.toLowerCase();
    const filtrados = state.clientes.filter(c => {
      const tel = (c.telefono || '').toLowerCase();
      const nom = (c.nombre || '').toLowerCase();
      return !term || tel.includes(term) || nom.includes(term);
    });

    filtrados.sort((a,b) => {
      const dir = state.sortDir === 'asc' ? 1 : -1;
      let va = a[state.sortBy] ?? '';
      let vb = b[state.sortBy] ?? '';
      if (state.sortBy === 'ultimaCita' && va && vb) {
        return dir * (va.localeCompare(vb));
      }
      return dir * String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    });

    const tbody = $('#tbody');
    tbody.innerHTML = '';

    if (filtrados.length === 0) $('#vacio').classList.remove('hidden');
    else $('#vacio').classList.add('hidden');

    for (const c of filtrados) {
      const tr = document.createElement('tr');
      tr.className = 'border-t even:bg-pastel-grayBg hover:bg-pastel-pink/30 transition';
      tr.innerHTML = `
        <td class="p-3">${escapeHTML(c.nombre)}</td>
        <td class="p-3">${escapeHTML(c.telefono || '')}</td>
        <td class="p-3">${escapeHTML(c.email || '')}</td>
        <td class="p-3">${escapeHTML(c.ultimaCita || '')}</td>
        <td class="p-3">
          <div class="flex gap-2">
            <button class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" data-action="edit" data-id="${c.id}">Editar</button>
            <button class="px-3 py-1 rounded bg-red-300 hover:bg-red-400 text-white" data-action="del" data-id="${c.id}">Eliminar</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    }

    $('#totalClientes').textContent = String(state.clientes.length);
  }

  function escapeHTML(s){
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  // ==============================
  // CRUD
  // ==============================
  function abrirModal(cliente) {
    $('#modal').classList.remove('hidden');
    $('#modal').classList.add('flex');
    $('#modalTitulo').textContent = cliente ? 'Editar cliente' : 'Nuevo cliente';
    $('#clienteId').value = cliente?.id || '';
    $('#nombre').value = cliente?.nombre || '';
    $('#telefono').value = cliente?.telefono || '';
    $('#email').value = cliente?.email || '';
    $('#ultimaCita').value = cliente?.ultimaCita || '';
    $('#notas').value = cliente?.notas || '';
    $('#nombre').focus();
  }

  function cerrarModal() {
    $('#modal').classList.add('hidden');
    $('#modal').classList.remove('flex');
    $('#form').reset();
  }

  function validarCliente({ id, nombre, telefono, email, ultimaCita }) {
    if (!nombre || !telefono) {
      alert('Nombre y teléfono son obligatorios');
      return false;
    }
    // Unicidad de tel��fono
    const normalized = normalizePhone(telefono);
    const dup = state.clientes.find(c => normalizePhone(c.telefono) === normalized && c.id !== id);
    if (dup) {
      alert('El teléfono ya está registrado para: ' + dup.nombre);
      return false;
    }
    // Formato de fecha simple si hay ultimaCita
    if (ultimaCita && !/^\d{4}-\d{2}-\d{2}$/.test(ultimaCita)) {
      alert('La fecha de "Última cita" debe tener formato YYYY-MM-DD');
      return false;
    }
    // Email básico
    if (email && !/.+@.+\..+/.test(email)) {
      alert('Email no válido');
      return false;
    }
    return true;
  }

  function upsertCliente(data) {
    const idx = state.clientes.findIndex(c => c.id === data.id);
    if (idx >= 0) state.clientes[idx] = data; else state.clientes.push(data);
    saveClientes(state.clientes);
    render();
  }

  function borrarCliente(id) {
    const cli = state.clientes.find(c => c.id === id);
    if (!cli) return;
    if (!confirm('¿Eliminar cliente "' + cli.nombre + '"?')) return;
    state.clientes = state.clientes.filter(c => c.id !== id);
    saveClientes(state.clientes);
    render();
  }

  // ==============================
  // Importación / Exportación
  // ==============================
  function abrirImport() { $('#modalImport').classList.remove('hidden'); $('#modalImport').classList.add('flex'); }
  function cerrarImport() { $('#modalImport').classList.add('hidden'); $('#modalImport').classList.remove('flex'); $('#fileCSV').value = ''; }

  function descargarPlantilla() {
    const headers = ['nombre','telefono','email','notas','ultimaCita'];
    const csv = toCSV([], headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_clientes.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function importarCSVArchivo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const rows = parseCSV(text);
        if (!rows.length) { alert('CSV vacío'); return; }
        const headers = rows[0].map(h => h.trim().toLowerCase());
        const idxNombre = headers.indexOf('nombre');
        const idxTel = headers.indexOf('telefono');
        const idxEmail = headers.indexOf('email');
        const idxNotas = headers.indexOf('notas');
        const idxUlt = headers.indexOf('ultimacita');
        if (idxNombre < 0 || idxTel < 0) { alert('El CSV debe incluir al menos las columnas: nombre, telefono'); return; }

        let agregados = 0, duplicados = 0;
        const nuevos = [];
        for (let r = 1; r < rows.length; r++) {
          const cols = rows[r]; if (!cols || cols.length === 0) continue;
          const nombre = (cols[idxNombre] || '').trim();
          const telefono = (cols[idxTel] || '').trim();
          if (!nombre || !telefono) { continue; }
          const email = idxEmail >= 0 ? (cols[idxEmail] || '').trim() : '';
          const notas = idxNotas >= 0 ? (cols[idxNotas] || '').trim() : '';
          const ultimaCita = idxUlt >= 0 ? (cols[idxUlt] || '').trim() : '';

          const norm = normalizePhone(telefono);
          const existe = state.clientes.find(c => normalizePhone(c.telefono) === norm) || nuevos.find(c => normalizePhone(c.telefono) === norm);
          if (existe) { duplicados++; continue; }

          nuevos.push({ id: uuid(), nombre, telefono, email, notas, ultimaCita, creadoEn: new Date().toISOString() });
          agregados++;
        }
        if (agregados) {
          state.clientes = state.clientes.concat(nuevos);
          saveClientes(state.clientes);
          render();
        }
        alert(`Importación completada. Agregados: ${agregados}. Duplicados ignorados: ${duplicados}.`);
      } catch(e) {
        console.error(e); alert('Error procesando el CSV');
      }
    };
    reader.onerror = () => alert('No se pudo leer el archivo');
    reader.readAsText(file);
  }

  function exportarCSV() {
    const headers = ['nombre','telefono','email','notas','ultimaCita'];
    const rows = state.clientes.map(c => ({
      nombre: c.nombre || '',
      telefono: c.telefono || '',
      email: c.email || '',
      notas: c.notas || '',
      ultimaCita: c.ultimaCita || ''
    }));
    const csv = toCSV(rows, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clientes_${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ==============================
  // Eventos UI
  // ==============================
  function bindEvents(){
    $('#nuevoBtn').addEventListener('click', () => abrirModal());
    $('#cerrarModal').addEventListener('click', cerrarModal);
    $('#cancelar').addEventListener('click', cerrarModal);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#modal').classList.contains('hidden')) cerrarModal(); if (!$('#modalImport').classList.contains('hidden')) cerrarImport(); } });

    $('#form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        id: $('#clienteId').value || uuid(),
        nombre: $('#nombre').value.trim(),
        telefono: $('#telefono').value.trim(),
        email: ($('#email').value || '').trim(),
        notas: ($('#notas').value || '').trim(),
        ultimaCita: ($('#ultimaCita').value || '').trim(),
        creadoEn: $('#clienteId').value ? (state.clientes.find(c => c.id === $('#clienteId').value)?.creadoEn || new Date().toISOString()) : new Date().toISOString()
      };
      if (!validarCliente(data)) return;
      upsertCliente(data);
      cerrarModal();
    });

    $('#buscar').addEventListener('input', debounce((e) => { state.filtro = e.target.value; render(); }, 200));
    $('#limpiarBusqueda').addEventListener('click', () => { $('#buscar').value=''; state.filtro=''; render(); });

    $('#tabla').addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if (action === 'edit') {
        const cli = state.clientes.find(c => c.id === id);
        if (cli) abrirModal(cli);
      } else if (action === 'del') {
        borrarCliente(id);
      }
    });

    // Ordenamiento
    $$('#tabla thead [data-sort]').forEach(th => th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (state.sortBy === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortBy = key; state.sortDir = 'asc'; }
      render();
    }));

    // Importación
    $('#importarBtn').addEventListener('click', abrirImport);
    $('#cerrarImport').addEventListener('click', cerrarImport);
    $('#descargarPlantilla').addEventListener('click', descargarPlantilla);
    $('#importarCSV').addEventListener('click', () => importarCSVArchivo($('#fileCSV').files[0]));
  }

  function init(){
    render();
    bindEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
