import { createClient } from '@supabase/supabase-js'

// TODO: Reemplaza los siguientes valores con tus propias credenciales de Supabase.
// Puedes encontrarlas en tu panel de Supabase en "Settings" > "API".
// ¡IMPORTANTE! Asegúrate de usar la clave anónima (anon key), NO la clave de servicio (service_role key).
const supabaseUrl = 'URL_DE_TU_PROYECTO_SUPABASE'
const supabaseAnonKey = 'CLAVE_ANONIMA_PUBLICA_DE_SUPABASE'

// Mensaje de advertencia si las credenciales no se han cambiado.
if (supabaseUrl === 'URL_DE_TU_PROYECTO_SUPABASE' || supabaseAnonKey === 'CLAVE_ANONIMA_PUBLICA_DE_SUPABASE') {
  console.warn(
    "ADVERTENCIA: Las credenciales de Supabase no están configuradas. " +
    "Por favor, edita `src/supabaseClient.js` con tus datos para que la aplicación funcione correctamente."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
