-- Script para crear la tabla de deudas/fiados en Supabase
-- Ejecutar este script en el SQL Editor de Supabase (https://app.supabase.com)

CREATE TABLE IF NOT EXISTS public.debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    amount NUMERIC NOT NULL,
    notes TEXT,
    date TEXT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Política para permitir acceso completo (lectura, inserción, actualización, borrado) solo a administradores autenticados
CREATE POLICY "admin_manage_debts" 
ON public.debts 
FOR ALL TO authenticated
USING (is_barber_admin()) 
WITH CHECK (is_barber_admin());

-- Habilitar réplica en tiempo real (opcional pero recomendado)
ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
