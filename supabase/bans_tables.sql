-- Tablas para el sistema de baneos
-- Ejecuta este script en el SQL Editor de Supabase

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

-- Habilitar RLS (Row Level Security) si es necesario
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_emails ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Permitir lectura y escritura para usuarios autenticados
-- Ajusta estas políticas según tus necesidades de seguridad

-- Políticas para banned_ips
CREATE POLICY "Allow all operations on banned_ips" ON banned_ips
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para banned_phones
CREATE POLICY "Allow all operations on banned_phones" ON banned_phones
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para banned_emails
CREATE POLICY "Allow all operations on banned_emails" ON banned_emails
  FOR ALL USING (true) WITH CHECK (true);

