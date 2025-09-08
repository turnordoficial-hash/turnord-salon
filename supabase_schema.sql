-- =================================================================
--                   TABLA DE CITAS (TURNOS)
-- =================================================================
-- Tabla para Citas (Turnos) con el diseño que proporcionaste
CREATE TABLE public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    servicio TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    mensaje_confirmacion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.citas IS 'Almacena las citas (turnos) del salón.';

-- =================================================================
--       FUNCIÓN Y TRIGGER PARA ACTUALIZAR 'updated_at'
-- =================================================================
-- Esta función actualiza el campo 'updated_at' con la hora actual
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Este trigger llama a la función cada vez que una fila en 'citas' se actualiza
CREATE TRIGGER on_citas_update
  BEFORE UPDATE ON public.citas
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();


-- =================================================================
--                TABLA DE CONFIGURACIÓN DEL NEGOCIO
-- =================================================================
-- Tabla para la configuración de un único negocio
CREATE TABLE public.negocio_config (
  -- Usaremos un ID fijo de 1, ya que solo habrá una fila
  id INT PRIMARY KEY CHECK (id = 1),

  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,

  -- Aquí se pueden guardar los horarios de atención en formato JSON
  horarios JSONB,

  -- Aquí se pueden guardar otras políticas (duración de citas, etc.)
  politicas JSONB
);

-- Insertamos la fila inicial que luego podrás actualizar
INSERT INTO public.negocio_config (id, nombre) VALUES (1, 'Nombre de tu Salón');
