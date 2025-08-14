document.addEventListener("DOMContentLoaded", function () {
    let citas = [
        { title: "Corte - Juan Pérez", start: "2025-08-14T10:00:00", servicio: "Corte de Cabello" },
        { title: "Tinte - Ana López", start: "2025-08-14T10:30:00", servicio: "Coloración" },
        { title: "Peinado - María Gómez", start: "2025-08-14T11:00:00", servicio: "Peinado" },
        { title: "Corte - Carlos Ruiz", start: "2025-08-15T09:00:00", servicio: "Corte de Cabello" }
    ];

    let fechaSeleccionadaGlobal = null;
    let tooltip = document.getElementById("tooltip");

    let calendarEl = document.getElementById("calendar");
    let calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "es",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        events: citas,
        dateClick: function(info) {
            mostrarPanelDia(info.dateStr);
        },
        dayCellDidMount: function(info) {
            let fechaISO = info.date.toISOString().split("T")[0];
            let citasDia = citas.filter(c => c.start.startsWith(fechaISO));
            let totalCitas = citasDia.length;

            if (totalCitas > 0) {
                let contador = document.createElement("div");
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
                    tooltip.innerHTML = citasDia.map(c => `👤 ${c.title}<br>💈 ${c.servicio}`).join("<br><br>");
                });
                info.el.addEventListener("mouseleave", () => {
                    tooltip.style.display = "none";
                });
            }
        }
    });
    calendar.render();

    function mostrarPanelDia(fecha) {
        fechaSeleccionadaGlobal = fecha;
        let panel = document.getElementById("panelDia");
        let fechaTexto = new Date(fecha).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        document.getElementById("fechaSeleccionada").innerText = fechaTexto;

        let lista = document.getElementById("listaCitas");
        lista.innerHTML = "";

        let citasDia = citas.filter(c => c.start.startsWith(fecha));

        if (citasDia.length === 0) {
            lista.innerHTML = "<p class='text-gray-500'>No hay citas para este día.</p>";
        } else {
            let horas = {};
            citasDia.forEach(c => {
                let hora = new Date(c.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                if (!horas[hora]) horas[hora] = [];
                horas[hora].push(c);
            });

            for (let hora in horas) {
                let lleno = horas[hora].length >= 5 ? "text-red-500 font-bold" : "text-pink-600";
                let bloque = document.createElement("div");
                bloque.innerHTML = `<h3 class="font-bold ${lleno}">${hora} (${horas[hora].length}/5)</h3>`;
                horas[hora].forEach(cita => {
                    bloque.innerHTML += `<p>👤 ${cita.title} <br> 💈 ${cita.servicio}</p>`;
                });
                lista.appendChild(bloque);
            }
        }

        panel.classList.add("mostrar");
    }

    document.getElementById("cerrarPanel").addEventListener("click", () => {
        document.getElementById("panelDia").classList.remove("mostrar");
    });

    document.getElementById("agregarCita").addEventListener("click", () => {
        let nombre = document.getElementById("nombreCliente").value.trim();
        let servicio = document.getElementById("servicioCliente").value.trim();
        let hora = document.getElementById("horaCita").value;

        if (!nombre || !servicio || !hora) {
            alert("Por favor complete todos los campos");
            return;
        }

        let fechaHora = `${fechaSeleccionadaGlobal}T${hora}:00`;
        let citasHora = citas.filter(c => c.start === fechaHora);

        if (citasHora.length >= 5) {
            alert("No se pueden agendar más de 5 citas en esta hora");
            return;
        }

        citas.push({ title: `${servicio} - ${nombre}`, start: fechaHora, servicio });
        calendar.addEvent({ title: `${servicio} - ${nombre}`, start: fechaHora });

        mostrarPanelDia(fechaSeleccionadaGlobal);
        calendar.refetchEvents();

        document.getElementById("nombreCliente").value = "";
        document.getElementById("servicioCliente").value = "";
        document.getElementById("horaCita").value = "";
    });
});
