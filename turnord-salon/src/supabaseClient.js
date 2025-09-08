import { createClient } from '@supabase/supabase-js'

// TODO: Reemplaza los siguientes valores con tus propias credenciales de Supabase.
// Puedes encontrarlas en tu panel de Supabase en "Settings" > "API".
// ¡IMPORTANTE! Asegúrate de usar la clave anónima (anon key), NO la clave de servicio (service_role key).
const supabaseUrl = 'https://nmodhiafyllcudnbkjly.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb2RoaWFmeWxsY3VkbmJramx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODk3NzUsImV4cCI6MjA3MDY2NTc3NX0.BAs8YndYaa9S9bd4Y4tKLK-UFQvAxvv1GdjqQuVTyYI'

// Mensaje de advertencia si las credenciales no se han cambiado.
if (supabaseUrl === 'https://nmodhiafyllcudnbkjly.supabase.co' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb2RoaWFmeWxsY3VkbmJramx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODk3NzUsImV4cCI6MjA3MDY2NTc3NX0.BAs8YndYaa9S9bd4Y4tKLK-UFQvAxvv1GdjqQuVTyYI') {
  console.warn(
    "ADVERTENCIA: Las credenciales de Supabase no están configuradas. " +
    "Por favor, edita `src/supabaseClient.js` con tus datos para que la aplicación funcione correctamente."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
