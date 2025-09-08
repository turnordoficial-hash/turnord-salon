document.addEventListener("DOMContentLoaded", function () {
    // ==============================
    // Configuración y modelos
    // ==============================
    const politicas = {
        capacidadSimultanea: 5, // Máximo de citas simultáneas en el salón (sin distinguir staff por ahora)
        duracionDefaultMin: 30, // Minutos
        bufferMinutos: 0 // Minutos de colchón entre citas (global). Útil cuando se maneje por staff.
    };

    const horariosNegocio = {
        // 0=Domingo, 1=Lunes, ... 6=Sábado
        0: null, // Cerrado
        1: { apertura: "09:00", cierre: "19:00", pausas: [] },
        2: { apertura: "09:00", cierre: "19:00", pausas: [] },
        3: { apertura: "09:00", cierre: "19:00", pausas: [] },
        4: { apertura: "09:00", cierre: "19:00", pausas: [] },
        5: { apertura: "09:00", cierre: "19:00", pausas: [] },
        6: { apertura: "09:00", cierre: "14:00", pausas: [] }
    };

    const feriados = [
        // Ejemplo: "2025-12-25"
    ];

    // Duración por servicio (puedes ajustar los valores a tu negocio)
    const servicios = {
        "Corte de Cabello": { duracion: 30, color: "#3b82f6" },
        "Coloración": { duracion: 90, color: "#ef4444" },
        "Peinado": { duracion: 45, color: "#10b981" }
    };

    function popularDropdownServicios() {
        const selectEl = document.getElementById("servicioCliente");
        if (!selectEl) return;

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Seleccione un servicio...";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        selectEl.appendChild(defaultOption);

        for (const nombreServicio in servicios) {
            const option = document.createElement('option');
            option.value = nombreServicio;
            option.textContent = `${nombreServicio} (${servicios[nombreServicio].duracion} min)`;
            selectEl.appendChild(option);
        }
    }

    // ==============================
    // Utilidades de fecha/tiempo
    // ==============================
    const pad2 = (n) => String(n).padStart(2, "0");

    function ymdFromDate(date) {
        // Fecha local en formato YYYY-MM-DD sin afectar por zona horaria
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    }

    function parseLocalDateTime(ymd, hhmm) {
        // ymd: YYYY-MM-DD, hhmm: HH:MM
        return new Date(`${ymd}T${hhmm}:00`);
    }

    function addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60000);
    }

    function hhmmToMinutes(hhmm) {
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
    }

    function getMinutesOfDay(date) {
        return date.getHours() * 60 + date.getMinutes();
    }

    function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
        // Se consideran solapadas si hay intersección abierta: start < otherEnd y end > otherStart
        return aStart < bEnd && aEnd > bStart;
    }

    function isHoliday(ymd) {
        return feriados.includes(ymd);
    }

    function isWithinBusinessHours(start, end) {
        const ymd = ymdFromDate(start);
        if (isHoliday(ymd)) return { ok: false, motivo: "Día feriado" };

        const dow = start.getDay();
        const config = horariosNegocio[dow];
        if (!config) return { ok: false, motivo: "Fuera de día hábil" };

        const aperturaMin = hhmmToMinutes(config.apertura);
        const cierreMin = hhmmToMinutes(config.cierre);
        const startMin = getMinutesOfDay(start);
        const endMin = getMinutesOfDay(end);

        if (startMin < aperturaMin || endMin > cierreMin) {
            return { ok: false, motivo: "Fuera del horario de atención" };
        }

        // Validar pausas (si existen)
        if (Array.isArray(config.pausas)) {
            for (const pausa of config.pausas) {
                const pIni = hhmmToMinutes(pausa.inicio);
                const pFin = hhmmToMinutes(pausa.fin);
                // Si el intervalo de la cita toca la pausa, no es válido
                if (startMin < pFin && endMin > pIni) {
                    return { ok: false, motivo: "Cruza una pausa del negocio" };
                }
            }
        }

        return { ok: true };
    }

    function getDuracionServicioMin(servicioNombre) {
        return (servicios[servicioNombre]?.duracion) || politicas.duracionDefaultMin;
    }

    function canSchedule(citasExistentes, start, end, capacidad) {
        // Cuenta cuántas citas existentes se solapan con el nuevo intervalo
        let simultaneas = 0;
        for (const c of citasExistentes) {
            const cStart = new Date(c.start);
            const cEnd = c.end ? new Date(c.end) : addMinutes(new Date(c.start), getDuracionServicioMin(c.servicio));
            if (intervalsOverlap(start, end, cStart, cEnd)) {
                simultaneas++;
                if (simultaneas >= capacidad) return { ok: false, motivo: `Capacidad máxima (${capacidad}) alcanzada en ese horario` };
            }
        }
        return { ok: true };
    }

    function buildEventFromCita(cita) {
        const color = servicios[cita.servicio]?.color;
        return {
            title: cita.title,
            start: cita.start,
            end: cita.end,
            backgroundColor: color,
            borderColor: color,
            extendedProps: {
                servicio: cita.servicio,
                estado: cita.estado
            }
        };
    }

    // ==============================
    // Persistencia (localStorage)
    // ==============================
    function loadCitas() {
        try {
            const raw = localStorage.getItem("citas");
            if (raw) {
                const parsed = JSON.parse(raw);
                // Backfill de fin si no existe
                for (const c of parsed) {
                    if (!c.end) {
                        const end = addMinutes(new Date(c.start), getDuracionServicioMin(c.servicio));
                        c.end = `${ymdFromDate(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:00`;
                    }
                    if (!c.estado) c.estado = "pendiente";
                }
                return parsed;
            }
        } catch (e) {
            console.warn("No se pudo leer citas de localStorage", e);
        }
        // Datos de ejemplo iniciales
        const seed = [
            { title: "Corte - Juan Pérez", start: "2025-08-14T10:00:00", servicio: "Corte de Cabello" },
            { title: "Tinte - Ana López", start: "2025-08-14T10:30:00", servicio: "Coloración" },
            { title: "Peinado - María Gómez", start: "2025-08-14T11:00:00", servicio: "Peinado" },
            { title: "Corte - Carlos Ruiz", start: "2025-08-15T09:00:00", servicio: "Corte de Cabello" }
        ].map(c => {
            const d = new Date(c.start);
            const end = addMinutes(d, getDuracionServicioMin(c.servicio));
            return {
                id: `seed_${c.title}_${c.start}`,
                title: c.title,
                start: c.start,
                end: `${ymdFromDate(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:00`,
                servicio: c.servicio,
                estado: "pendiente",
                creadoEn: new Date().toISOString()
            };
        });
        saveCitas(seed);
        return seed;
    }

    function saveCitas(data) {
        try {
            localStorage.setItem("citas", JSON.stringify(data));
        } catch (e) {
            console.warn("No se pudo guardar citas en localStorage", e);
        }
    }

    // ==============================
    // Estado
    // ==============================
    let citas = loadCitas();
    let fechaSeleccionadaGlobal = null;
    const tooltip = document.getElementById("tooltip");

    // ==============================
    // Calendario
    // ==============================
    const calendarEl = document.getElementById("calendar");
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "es",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        events: citas.map(buildEventFromCita),
        dateClick: function (info) {
            // info.date es fecha local (00:00). Evitamos toISOString para no cambiar de día por TZ
            const ymd = `${info.date.getFullYear()}-${pad2(info.date.getMonth() + 1)}-${pad2(info.date.getDate())}`;
            mostrarPanelDia(ymd);
        },
        dayCellDidMount: function (info) {
            const ymd = `${info.date.getFullYear()}-${pad2(info.date.getMonth() + 1)}-${pad2(info.date.getDate())}`;
            const citasDia = citas.filter(c => c.start.startsWith(ymd));
            const totalCitas = citasDia.length;

            if (totalCitas > 0) {
                const contador = document.createElement("div");
                contador.classList.add("contador-citas");

                if (totalCitas <= 2) {
                    contador.style.backgroundColor = "#22c55e";
                    info.el.style.backgroundColor = "#dcfce7";
                } else if (totalCitas <= 4) {
                    contador.style.backgroundColor = "#eab308";
                    info.el.style.backgroundColor = "#fef9c3";
                } else {
                    contador.style.backgroundColor = "#ef4444";
                    info.el.style.backgroundColor = "#fee2e2";
                }

                contador.textContent = totalCitas;
                info.el.style.position = "relative";
                info.el.appendChild(contador);

                // Tooltip
                info.el.addEventListener("mouseenter", (e) => {
                    tooltip.style.display = "block";
                    tooltip.style.top = (e.pageY + 10) + "px";
                    tooltip.style.left = (e.pageX + 10) + "px";
                    tooltip.innerHTML = citasDia
                        .map(c => {
                            const ini = new Date(c.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                            const fin = new Date(c.end).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                            return `👤 ${c.title}<br>🕘 ${ini} - ${fin}<br>💈 ${c.servicio}`;
                        })
                        .join("<br><br>");
                });
                info.el.addEventListener("mouseleave", () => {
                    tooltip.style.display = "none";
                });
            }
        }
    });
    calendar.render();
    popularDropdownServicios();

    // ==============================
    // UI: Panel del día
    // ==============================
    function mostrarPanelDia(fechaYMD) {
        fechaSeleccionadaGlobal = fechaYMD;
        const panel = document.getElementById("panelDia");
        const [y, m, d] = fechaYMD.split("-").map(Number);
        const fechaTexto = new Date(y, m - 1, d).toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
        document.getElementById("fechaSeleccionada").innerText = fechaTexto;

        const lista = document.getElementById("listaCitas");
        lista.innerHTML = "";

        const citasDia = citas.filter(c => c.start.startsWith(fechaYMD));

        if (citasDia.length === 0) {
            lista.innerHTML = "<p class='text-gray-500'>No hay citas para este día.</p>";
        } else {
            const horas = {};
            for (const c of citasDia) {
                const ini = new Date(c.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                if (!horas[ini]) horas[ini] = [];
                horas[ini].push(c);
            }

            for (const hora in horas) {
                const lleno = horas[hora].length >= politicas.capacidadSimultanea ? "text-red-500 font-bold" : "text-pink-600";
                const bloque = document.createElement("div");
                bloque.innerHTML = `<h3 class="font-bold ${lleno}">${hora} (${horas[hora].length}/${politicas.capacidadSimultanea})</h3>`;
                horas[hora].forEach(cita => {
                    const fin = new Date(cita.end).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                    bloque.innerHTML += `<p>👤 ${cita.title} <br> 🕘 fin: ${fin} <br> 💈 ${cita.servicio}</p>`;
                });
                lista.appendChild(bloque);
            }
        }

        panel.classList.add("mostrar");
    }

    document.getElementById("cerrarPanel").addEventListener("click", () => {
        document.getElementById("panelDia").classList.remove("mostrar");
    });

    // ==============================
    // Crear cita
    // ==============================
    const btnAgregar = document.getElementById("agregarCita");
    btnAgregar?.addEventListener("click", () => {
        const nombre = document.getElementById("nombreCliente").value.trim();
        const servicio = document.getElementById("servicioCliente").value.trim();
        const hora = document.getElementById("horaCita").value;

        if (!fechaSeleccionadaGlobal) {
            alert("Selecciona un día en el calendario");
            return;
        }
        if (!nombre || !servicio || !hora) {
            alert("Por favor complete todos los campos");
            return;
        }

        const duracion = getDuracionServicioMin(servicio);
        const startDate = parseLocalDateTime(fechaSeleccionadaGlobal, hora);
        let start = startDate;
        let end = addMinutes(startDate, duracion);

        // Si se usa buffer global (por ahora en 0), se puede aplicar así:
        if (politicas.bufferMinutos > 0) {
            start = addMinutes(start, -politicas.bufferMinutos);
            end = addMinutes(end, politicas.bufferMinutos);
        }

        // Validaciones de negocio
        const horarioVal = isWithinBusinessHours(startDate, end);
        if (!horarioVal.ok) {
            alert(`No se puede agendar: ${horarioVal.motivo}`);
            return;
        }

        const capacidadVal = canSchedule(citas, startDate, end, politicas.capacidadSimultanea);
        if (!capacidadVal.ok) {
            alert(`No se puede agendar: ${capacidadVal.motivo}`);
            return;
        }

        // Crear cita
        const nueva = {
            id: `cita_${Date.now()}`,
            title: `${servicio} - ${nombre}`,
            start: `${fechaSeleccionadaGlobal}T${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}:00`,
            end: `${ymdFromDate(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:00`,
            servicio,
            estado: "pendiente",
            creadoEn: new Date().toISOString()
        };

        citas.push(nueva);
        saveCitas(citas);

        // Sincronizar calendario visual
        calendar.addEvent(buildEventFromCita(nueva));

        // Refrescar panel del día y contadores
        mostrarPanelDia(fechaSeleccionadaGlobal);
        calendar.refetchEvents();

        // Limpiar formulario
        document.getElementById("nombreCliente").value = "";
        document.getElementById("servicioCliente").value = "";
        document.getElementById("horaCita").value = "";
    });
});
