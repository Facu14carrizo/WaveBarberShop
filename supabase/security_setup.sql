-- =============================================================================
-- Wave Barber Shop — Configuración de seguridad (ejecutar en Supabase SQL Editor)
-- =============================================================================
-- 1. Reemplazá 'tu-email@ejemplo.com' por el email del admin (mismo que en Auth).
-- 2. Creá el usuario en: Authentication → Users → Add user (email + contraseña).
-- 3. Ejecutá este script completo.
-- =============================================================================

-- Tabla de admins autorizados (solo estos emails pueden usar el panel)
CREATE TABLE IF NOT EXISTS admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_allowlist FORCE ROW LEVEL SECURITY;
-- Sin políticas para anon/authenticated: la lista NO es legible desde el cliente.
-- is_barber_admin() (SECURITY DEFINER) sigue pudiendo consultarla internamente.

-- ⚠️ CAMBIÁ ESTE EMAIL por el del dueño de la barbería:
INSERT INTO admin_allowlist (email)
VALUES ('Diazulises890@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- ¿Es admin el usuario autenticado?
CREATE OR REPLACE FUNCTION public.is_barber_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_allowlist
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_barber_admin() TO authenticated;

-- Normalizar teléfono (solo dígitos)
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
$$;

-- Validar texto (sin tags HTML, longitud máxima)
CREATE OR REPLACE FUNCTION public.sanitize_booking_text(p_text text, p_max_len int)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  v := trim(coalesce(p_text, ''));
  v := regexp_replace(v, '<[^>]*>', '', 'g');
  v := regexp_replace(v, '[[:cntrl:]]', '', 'g');
  IF length(v) > p_max_len THEN
    v := left(v, p_max_len);
  END IF;
  RETURN v;
END;
$$;

-- -----------------------------------------------------------------------------
-- Baneos: solo admins autenticados
-- -----------------------------------------------------------------------------
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on banned_ips" ON banned_ips;
DROP POLICY IF EXISTS "Allow all operations on banned_phones" ON banned_phones;
DROP POLICY IF EXISTS "Allow all operations on banned_emails" ON banned_emails;

CREATE POLICY "admin_manage_banned_ips" ON banned_ips
  FOR ALL TO authenticated
  USING (is_barber_admin()) WITH CHECK (is_barber_admin());

CREATE POLICY "admin_manage_banned_phones" ON banned_phones
  FOR ALL TO authenticated
  USING (is_barber_admin()) WITH CHECK (is_barber_admin());

CREATE POLICY "admin_manage_banned_emails" ON banned_emails
  FOR ALL TO authenticated
  USING (is_barber_admin()) WITH CHECK (is_barber_admin());

-- -----------------------------------------------------------------------------
-- Turnos (appointments)
-- -----------------------------------------------------------------------------
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_slots" ON appointments;
DROP POLICY IF EXISTS "admin_all_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;

-- Solo admins ven y modifican turnos directamente
CREATE POLICY "admin_all_appointments" ON appointments
  FOR ALL TO authenticated
  USING (is_barber_admin())
  WITH CHECK (is_barber_admin());

-- Slots públicos (sin PII) para disponibilidad de horarios
CREATE OR REPLACE FUNCTION public.get_public_appointment_slots()
RETURNS TABLE (
  id text,
  date text,
  "time" text,
  status text,
  created_at timestamptz,
  service_duration integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id::text,
    a.date,
    a.time,
    a.status::text,
    a.created_at,
    a.service_duration::integer
  FROM appointments a
  WHERE a.deleted_at IS NULL
    AND a.status IN ('confirmed', 'pending');
$$;

GRANT EXECUTE ON FUNCTION public.get_public_appointment_slots() TO anon, authenticated;

-- Crear reserva pública (validación + baneos en servidor)
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_customer_name text,
  p_customer_phone text,
  p_service_name text,
  p_service_price numeric,
  p_service_duration integer,
  p_service_icon text,
  p_date text,
  p_time text,
  p_notes text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_additional_names jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_phone_norm text;
  v_notes text;
  v_id text;
  v_companions text;
  v_row appointments%ROWTYPE;
BEGIN
  v_name := sanitize_booking_text(p_customer_name, 80);
  v_phone := sanitize_booking_text(p_customer_phone, 30);
  v_phone_norm := normalize_phone(v_phone);

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Nombre inválido';
  END IF;

  IF length(v_phone_norm) < 8 OR length(v_phone_norm) > 15 THEN
    RAISE EXCEPTION 'Teléfono inválido';
  END IF;

  IF p_service_price < 0 OR p_service_price > 999999 THEN
    RAISE EXCEPTION 'Precio inválido';
  END IF;

  IF p_service_duration < 15 OR p_service_duration > 480 THEN
    RAISE EXCEPTION 'Duración inválida';
  END IF;

  -- Baneos (servidor — no eludible desde el cliente)
  IF p_ip_address IS NOT NULL AND trim(p_ip_address) <> '' THEN
    IF EXISTS (SELECT 1 FROM banned_ips WHERE trim(ip_address) = trim(p_ip_address)) THEN
      RAISE EXCEPTION 'Tu IP ha sido bloqueada. No podés crear turnos.';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM banned_phones WHERE normalize_phone(phone) = v_phone_norm) THEN
    RAISE EXCEPTION 'Este teléfono ha sido bloqueado. No podés crear turnos.';
  END IF;

  v_companions := '::ACOMP::' || coalesce(p_additional_names::text, '[]');
  v_notes := CASE
    WHEN p_additional_names IS NOT NULL AND jsonb_array_length(p_additional_names) > 0
    THEN v_companions || E'\n' || coalesce(sanitize_booking_text(p_notes, 500), '')
    ELSE sanitize_booking_text(p_notes, 500)
  END;

  v_id := gen_random_uuid()::text;

  INSERT INTO appointments (
    id, customer_name, customer_phone, service_name, service_price,
    service_duration, service_icon, date, time, status, notes, ip_address,
    created_at, updated_at
  ) VALUES (
    v_id, v_name, v_phone,
    sanitize_booking_text(p_service_name, 100),
    p_service_price, p_service_duration,
    sanitize_booking_text(coalesce(p_service_icon, ''), 20),
    sanitize_booking_text(p_date, 20),
    sanitize_booking_text(p_time, 10),
    'confirmed',
    nullif(trim(v_notes), ''),
    nullif(trim(p_ip_address), ''),
    now(), now()
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'customer_name', v_row.customer_name,
    'customer_phone', v_row.customer_phone,
    'service_name', v_row.service_name,
    'service_price', v_row.service_price,
    'service_duration', v_row.service_duration,
    'service_icon', v_row.service_icon,
    'date', v_row.date,
    'time', v_row.time,
    'status', v_row.status,
    'notes', v_row.notes,
    'ip_address', v_row.ip_address,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_booking(
  text, text, text, numeric, integer, text, text, text, text, text, jsonb
) TO anon, authenticated;

-- Cancelar turno propio (cliente): requiere ID + teléfono coincidente
CREATE OR REPLACE FUNCTION public.cancel_public_booking(
  p_appointment_id text,
  p_customer_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_norm text;
BEGIN
  v_phone_norm := normalize_phone(p_customer_phone);

  UPDATE appointments
  SET
    status = 'cancelled',
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_appointment_id
    AND normalize_phone(customer_phone) = v_phone_norm
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el turno o el teléfono no coincide';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_public_booking(text, text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Servicios, horarios y disponibilidad: lectura pública, escritura solo admin
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['services', 'day_availability', 'custom_time_ranges']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "public_read_%s" ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "admin_write_%s" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "public_read_%s" ON %I FOR SELECT TO anon, authenticated USING (true)',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "admin_write_%s" ON %I FOR ALL TO authenticated USING (is_barber_admin()) WITH CHECK (is_barber_admin())',
        t, t
      );
    END IF;
  END LOOP;
END $$;
