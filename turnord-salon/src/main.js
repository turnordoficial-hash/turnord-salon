import { supabase } from './supabaseClient.js'

// --- DOM Elements ---
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const messageDiv = document.getElementById('message');

// --- Helper to show messages ---
function showMessage(text, isError = false) {
  messageDiv.textContent = text;
  messageDiv.style.color = isError ? 'red' : 'green';
}

// --- Signup Logic ---
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  showMessage('Creando cuenta...', false);

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    showMessage(`Error: ${error.message}`, true);
  } else {
    // Supabase sends a confirmation email by default.
    showMessage('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.', false);
  }

  signupForm.reset();
});

// --- Login Logic ---
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  showMessage('Iniciando sesión...', false);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    showMessage(`Error: ${error.message}`, true);
  } else {
    // On successful login, you would typically redirect to a protected page.
    showMessage('¡Has iniciado sesión correctamente! Redirigiendo...', false);
    // For this example, we'll just clear the form.
    // In a real app, you would do: window.location.href = '/dashboard.html';
    setTimeout(() => {
      // Clear message and forms after a delay
      showMessage('');
      loginForm.reset();
      signupForm.reset();
    }, 2000);
  }
});
