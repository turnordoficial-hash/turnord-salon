
// Conexión a Supabase
const supabaseUrl = 'https://nmodhiafyllcudnbkjly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb2RoaWFmeWxsY3VkbmJramx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODk3NzUsImV4cCI6MjA3MDY2NTc3NX0.BAs8YndYaa9S9bd4Y4tKLK-UFQvAxvv1GdjqQuVTyYI';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  const openModal = document.getElementById('openModal');
  const closeModal = document.getElementById('closeModal');
  const modal = document.getElementById('modal');
  const fechaInput = document.getElementById('fecha');
  const horaSelect = document.getElementById('hora');
  const reservaForm = document.getElementById('reservaForm');
  const servicioSelect = document.getElementById('servicio');

  // Cargar lista de servicios
  function cargarServicios() {
    const servicios = ["Peinado", "Barbería", "Corte", "Manicura"];
    servicioSelect.innerHTML = '<option value="">Seleccione servicio</option>';
    servicios.forEach(s => {
      const option = document.createElement('option');
      option.value = s;
      option.textContent = s;
      servicioSelect.appendChild(option);
    });
  }

  // Abrir modal
  openModal.addEventListener('click', () => {
    modal.classList.remove('hidden');
    const today = new Date().toISOString().split('T')[0];
    fechaInput.setAttribute('min', today);
    cargarServicios();
    cargarHorasDisponibles();
  });

  // Cerrar modal
  closeModal.addEventListener('click', () => modal.classList.add('hidden'));

  // Cargar horas disponibles
  async function cargarHorasDisponibles() {
    const selectedDate = fechaInput.value || new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('turnos')
      .select('hora')
      .eq('fecha', selectedDate);

    const horasOcupadas = data ? data.map(t => t.hora.slice(0, 5)) : [];
    const todasHoras = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

    horaSelect.innerHTML = '<option value="">Seleccione hora</option>';
    todasHoras.forEach(h => {
      if (!horasOcupadas.includes(h)) {
        const option = document.createElement('option');
        option.value = h;
        option.textContent = h;
        horaSelect.appendChild(option);
      }
    });
  }

  fechaInput.addEventListener('change', cargarHorasDisponibles);

  // Enviar formulario
  reservaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fecha = fechaInput.value;
    const hora = horaSelect.value;
    const servicio = servicioSelect.value;

    if (!nombre || !telefono || !fecha || !hora || !servicio) {
      alert('Por favor complete todos los campos.');
      return;
    }

    // Verificar que la hora no esté reservada
    const { data: existing } = await supabaseClient
      .from('turnos')
      .select()
      .eq('fecha', fecha)
      .eq('hora', hora);

    if (existing.length > 0) {
      alert("Esta hora ya está reservada, elige otra.");
      return;
    }

    // Insertar cita
    const { error } = await supabaseClient.from('turnos').insert([
      { nombre, telefono, fecha, hora, servicio }
    ]);

    if (error) {
      alert('Error al reservar: ' + error.message);
    } else {
      alert('¡Cita reservada con éxito!');
      reservaForm.reset();
      modal.classList.add('hidden');
    }
  });
});
