# 🗄️ Configuración de Supabase para Base de Datos Compartida

## 🚀 ¿Por qué Supabase?

- ✅ **Sincronización automática** entre todos los dispositivos
- ✅ **Base de datos real** (PostgreSQL)
- ✅ **Tiempo real** - cambios instantáneos
- ✅ **Gratis** hasta 500MB
- ✅ **Fácil de configurar**

## 📋 Paso a Paso

### **1. Crear cuenta en Supabase**

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Conecta con GitHub (recomendado)
4. Crea un nuevo proyecto

### **2. Crear la tabla de turnos**

En el dashboard de Supabase, ve a **SQL Editor** y ejecuta:

```sql
-- Crear tabla de turnos
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_name TEXT NOT NULL,
  service_price INTEGER NOT NULL,
  service_duration INTEGER NOT NULL,
  service_icon TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (para simplificar)
CREATE POLICY "Allow all operations on appointments" ON appointments
FOR ALL USING (true) WITH CHECK (true);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### **3. Obtener credenciales**

En el dashboard de Supabase:

1. Ve a **Settings** → **API**
2. Copia estos valores:
   - **Project URL**: `https://tuproyecto.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **4. Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **5. Configurar en Netlify**

En tu proyecto de Netlify:

1. Ve a **Site settings** → **Environment variables**
2. Agrega estas variables:
   - `VITE_SUPABASE_URL` = `https://tuproyecto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `tu_clave_aqui`

## 🎯 Resultado

Una vez configurado:

- 📱 **Móvil**: Ve los mismos turnos que la computadora
- 💻 **Computadora**: Ve los mismos turnos que el móvil
- 🔄 **Sincronización automática**: Cambios instantáneos
- 🌐 **Funciona en Netlify**: Base de datos en la nube

## 🧪 Probar la sincronización

1. Abre la app en la computadora
2. Haz una reserva de prueba
3. Abre la app en el móvil
4. ¡El turno debería aparecer automáticamente!

## 🆘 Si algo no funciona

1. **Verifica las variables de entorno** en Netlify
2. **Revisa la consola** del navegador para errores
3. **Confirma que la tabla** se creó correctamente en Supabase
4. **Verifica las políticas RLS** en Supabase

¡Listo! Ahora todos tus dispositivos compartirán la misma base de datos. 🎉
