// cliente/reportes.js - Lógica de Reportes
(function(){
  // ==============================
  // Utilidades
  // ==============================
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const fmtHora = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  function loadConfig() {
    try { const raw = localStorage.getItem('configNegocio'); return raw ? JSON.parse(raw) : null; } catch(e) { return null; }
  }

  function loadCitas() {
    const res = [];
    try {
      const raw = localStorage.getItem('citas');
      const arr = raw ? JSON.parse(raw) : [];
      for (const c of arr) {
        const start = new Date(c.start);
        let end = c.end ? new Date(c.end) : null;
        if (!end) {
          const cfg = loadConfig();
          const mapaServicios = getServiciosMap(cfg);
          const dur = mapaServicios[c.servicio]?.duracion || 30;
          end = new Date(start.getTime() + dur*60000);
        }
        res.push({ ...c, start, end });
      }
    } catch(e) {}
    return res;
  }

  function getServiciosMap(cfg) {
    const map = {};
    const lista = cfg && Array.isArray(cfg.servicios) ? cfg.servicios : [];
    for (const s of lista) map[s.nombre] = s;
    return map;
  }

  function formatMoneyDOP(v) {
    try { return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(v); } catch(e) { return `${v}`; }
  }

  function parseClienteDesdeTitulo(title) {
    if (!title) return '';
    const idx = title.lastIndexOf(' - ');
    return idx >= 0 ? title.slice(idx + 3) : title;
  }

  // ==============================
  // Estado y filtros
  // ==============================
  const state = {
    cfg: null,
    citas: [],
    filtradas: [],
    charts: { dia: null, servicio: null }
  };

  function applyFilters() {
    const fIni = document.getElementById('fInicio').value;
    const fFin = document.getElementById('fFin').value;
    const fServ = document.getElementById('fServicio').value;
    const fEst = document.getElementById('fEstado').value;

    let out = [...state.citas];

    if (fIni) {
      const ini = new Date(`${fIni}T00:00:00`);
      out = out.filter(c => c.start >= ini);
    }
    if (fFin) {
      const fin = new Date(`${fFin}T23:59:59`);
      out = out.filter(c => c.start <= fin);
    }
    if (fServ && fServ !== '__todos__') out = out.filter(c => c.servicio === fServ);
    if (fEst && fEst !== '__todos__') out = out.filter(c => (c.estado || 'pendiente') === fEst);

    state.filtradas = out;
    renderKPIs();
    renderCharts();
    renderTabla();
    renderResumenFiltro();
  }

  function renderResumenFiltro() {
    const fIni = document.getElementById('fInicio').value;
    const fFin = document.getElementById('fFin').value;
    const fServ = document.getElementById('fServicio').value;
    const fEst = document.getElementById('fEstado').value;
    const partes = [];
    if (fIni) partes.push(`desde ${fIni}`);
    if (fFin) partes.push(`hasta ${fFin}`);
    if (fServ !== '__todos__') partes.push(`servicio: ${fServ}`);
    if (fEst !== '__todos__') partes.push(`estado: ${fEst}`);
    document.getElementById('resumenFiltro').textContent = partes.length ? partes.join(' | ') : 'Sin filtros';
  }

  // ==============================
  // KPIs
  // ==============================
  function renderKPIs() {
    const total = state.filtradas.length;
    const canceladas = state.filtradas.filter(c => (c.estado || 'pendiente') === 'cancelado').length;
    const tasa = total ? Math.round((canceladas / total) * 100) : 0;

    const mapaServicios = getServiciosMap(state.cfg);
    let minutos = 0;
    let ingresos = 0;
    let algunSinPrecio = false;

    for (const c of state.filtradas) {
      minutos += Math.max(0, (c.end - c.start) / 60000);
      const svc = mapaServicios[c.servicio];
      if (svc && typeof svc.precio === 'number') ingresos += svc.precio;
      else algunSinPrecio = true;
    }

    document.getElementById('kpiCitas').textContent = total;
    document.getElementById('kpiCanceladas').textContent = canceladas;
    document.getElementById('kpiTasa').textContent = `${tasa}%`;
    document.getElementById('kpiHoras').textContent = `${(minutos/60).toFixed(1)} h`;

    const kpiIng = document.getElementById('kpiIngresos');
    const kpiNota = document.getElementById('kpiIngresosNota');
    kpiIng.textContent = ingresos > 0 ? formatMoneyDOP(ingresos) : '—';
    kpiNota.textContent = algunSinPrecio ? 'Algunos servicios no tienen precio configurado' : '';
  }

  // ==============================
  // Gráficas
  // ==============================
  function renderCharts() {
    const byDay = new Map();
    for (const c of state.filtradas) {
      const key = ymd(c.start);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    const labelsDia = Array.from(byDay.keys()).sort();
    const dataDia = labelsDia.map(k => byDay.get(k));

    const bySvc = new Map();
    for (const c of state.filtradas) bySvc.set(c.servicio, (bySvc.get(c.servicio) || 0) + 1);
    const labelsSvc = Array.from(bySvc.keys());
    const dataSvc = labelsSvc.map(k => bySvc.get(k));
    const colorSvc = labelsSvc.map(name => (getServiciosMap(state.cfg)[name]?.color) || '#93c5fd');

    const ctxDia = document.getElementById('chartCitasDia').getContext('2d');
    if (state.charts.dia) state.charts.dia.destroy();
    state.charts.dia = new Chart(ctxDia, {
      type: 'line',
      data: {
        labels: labelsDia,
        datasets: [{ label: 'Citas', data: dataDia, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.2)', tension: 0.2, fill: true }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, precision: 0 } } }
    });

    const ctxSvc = document.getElementById('chartPorServicio').getContext('2d');
    if (state.charts.servicio) state.charts.servicio.destroy();
    state.charts.servicio = new Chart(ctxSvc, {
      type: 'bar',
      data: { labels: labelsSvc, datasets: [{ label: 'Citas', data: dataSvc, backgroundColor: colorSvc, borderColor: colorSvc }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, precision: 0 } } }
    });
  }

  // ==============================
  // Tabla
  // ==============================
  function renderTabla() {
    const tb = document.getElementById('tablaCitas');
    tb.innerHTML = '';
    const rows = state.filtradas
      .slice()
      .sort((a, b) => a.start - b.start)
      .map(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="py-2">${ymd(c.start)}</td>
          <td class="py-2">${fmtHora(c.start)}</td>
          <td class="py-2">${fmtHora(c.end)}</td>
          <td class="py-2">${parseClienteDesdeTitulo(c.title)}</td>
          <td class="py-2">${c.servicio || ''}</td>
          <td class="py-2">${c.estado || 'pendiente'}</td>
        `;
        return tr;
      });
    rows.forEach(r => tb.appendChild(r));
  }

  // ==============================
  // Exportación CSV
  // ==============================
  function exportCSV() {
    const headers = ['Fecha','Inicio','Fin','Cliente','Servicio','Estado'];
    const lines = [headers.join(',')];
    for (const c of state.filtradas) {
      const row = [ ymd(c.start), fmtHora(c.start), fmtHora(c.end), escapeCSV(parseClienteDesdeTitulo(c.title)), escapeCSV(c.servicio || ''), (c.estado || 'pendiente') ];
      lines.push(row.join(','));
    }
    const blob = new Blob(["\ufeff" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `reportes_citas_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function escapeCSV(text) {
    if (text == null) return '';
    const s = String(text);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  // ==============================
  // Inicialización
  // ==============================
  function populateServiciosFiltro() {
    const sel = document.getElementById('fServicio');
    sel.innerHTML = '<option value="__todos__">Todos</option>';
    const cfg = state.cfg;
    let valores = [];
    if (cfg && Array.isArray(cfg.servicios) && cfg.servicios.length) valores = cfg.servicios.filter(s => s.activo !== false).map(s => s.nombre);
    else valores = Array.from(new Set(state.citas.map(c => c.servicio))).filter(Boolean);
    for (const v of valores) { const opt = document.createElement('option'); opt.value = v; opt.textContent = v; sel.appendChild(opt); }
  }

  function setDefaultRange() {
    const now = new Date();
    const ini = new Date(now.getFullYear(), now.getMonth(), 1);
    const fin = new Date(now.getFullYear(), now.getMonth()+1, 0);
    document.getElementById('fInicio').value = ymd(ini);
    document.getElementById('fFin').value = ymd(fin);
  }

  function init() {
    state.cfg = loadConfig();
    state.citas = loadCitas();
    populateServiciosFiltro();
    if (!document.getElementById('fInicio').value && !document.getElementById('fFin').value) setDefaultRange();
    applyFilters();

    // Eventos
    document.getElementById('btnAplicar').addEventListener('click', (e) => { e.preventDefault(); applyFilters(); });
    document.getElementById('btnLimpiar').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('fInicio').value = '';
      document.getElementById('fFin').value = '';
      document.getElementById('fServicio').value = '__todos__';
      document.getElementById('fEstado').value = '__todos__';
      applyFilters();
    });
    document.getElementById('btnExport').addEventListener('click', (e) => { e.preventDefault(); exportCSV(); });
    document.getElementById('btnPrint').addEventListener('click', (e) => { e.preventDefault(); window.print(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
