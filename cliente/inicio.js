document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Resumen
    let resumen = await fetch("/api/citas/resumen").then(r => r.json());
    document.getElementById("citasHoy").textContent = resumen.citasHoy;
    document.getElementById("citasMes").textContent = resumen.citasMes;
    document.getElementById("ingresosMes").textContent = `$${resumen.ingresosMes}`;
    document.getElementById("clientesTotales").textContent = resumen.clientesTotales;

    // Notificaciones
    let notificaciones = await fetch("/api/notificaciones").then(r => r.json());
    let listaNotificaciones = document.getElementById("listaNotificaciones");
    listaNotificaciones.innerHTML = "";
    notificaciones.forEach(n => {
      let li = document.createElement("li");
      li.textContent = `📢 ${n.mensaje}`;
      listaNotificaciones.appendChild(li);
    });

    // Gráfico de citas
    let citasData = await fetch("/api/estadisticas/citas-semana").then(r => r.json());
    new Chart(document.getElementById("graficoCitas"), {
      type: "line",
      data: {
        labels: citasData.labels,
        datasets: [{
          label: "Citas",
          data: citasData.valores,
          borderColor: "#f4a6b5",
          backgroundColor: "#f7c6d4",
          tension: 0.3,
          fill: true
        }]
      }
    });

    // Gráfico de servicios
    let serviciosData = await fetch("/api/estadisticas/servicios-populares").then(r => r.json());
    new Chart(document.getElementById("graficoServicios"), {
      type: "bar",
      data: {
        labels: serviciosData.labels,
        datasets: [{
          label: "Servicios",
          data: serviciosData.valores,
          backgroundColor: "#f7c6d4"
        }]
      }
    });

  } catch (error) {
    console.error("Error cargando datos:", error);
  }
});
