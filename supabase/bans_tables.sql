-- Tablas para el sistema de baneos (esquema inicial)
-- ⚠️ Para políticas de seguridad, ejecutá también: supabase/security_setup.sql

-- Tabla de IPs baneadas
CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  banned_by TEXT
);

-- Tabla de teléfonos baneados
CREATE TABLE IF NOT EXISTS banned_phones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  banned_by TEXT
);

-- Tabla de emails baneados
CREATE TABLE IF NOT EXISTS banned_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  banned_by TEXT
);

-- Agregar columna ip_address a la tabla appointments si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE appointments ADD COLUMN ip_address TEXT;
  END IF;
END $$;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_phones_phone ON banned_phones(phone);
CREATE INDEX IF NOT EXISTS idx_banned_emails_email ON banned_emails(email);
CREATE INDEX IF NOT EXISTS idx_appointments_ip ON appointments(ip_address);

-- RLS: configurar con supabase/security_setup.sql (no usar políticas abiertas)

