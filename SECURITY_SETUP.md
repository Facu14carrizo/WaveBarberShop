# Seguridad — Wave Barber Shop

## Resumen de cambios

| Área | Antes | Ahora |
|------|--------|--------|
| Panel admin | PIN `7294` en el código | Supabase Auth (email + contraseña) + lista de admins |
| Base de datos | RLS abierto (`USING true`) | RLS estricto + funciones RPC en servidor |
| Reservas públicas | Insert directo + baneos en JS | `create_public_booking` (baneos en servidor) |
| Horarios públicos | `SELECT *` con datos de clientes | `get_public_appointment_slots` (sin PII) |
| Webhook Make | URL en el código | `VITE_MAKE_WEBHOOK_URL` en `.env` |
| Formularios | Solo `required` HTML | Validación + sanitización (longitud, caracteres) |

## Pasos obligatorios (una sola vez)

### 1. Variables de entorno

Copiá `.env.example` a `.env` y completá:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MAKE_WEBHOOK_URL=https://hook.us1.make.com/tu-webhook
```

La **anon key** es pública en el frontend; la protección real es **RLS** en Supabase.  
**Nunca** uses la `service_role` key en el cliente.

### 2. Usuario admin en Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Authentication** → **Users**
2. **Add user** → email + contraseña segura (mín. 8 caracteres)

### 3. Script SQL de seguridad

1. Abrí **SQL Editor**
2. Editá `supabase/security_setup.sql`: reemplazá `tu-email@ejemplo.com` por el email del paso 2
3. Ejecutá el script **completo**

Esto crea políticas RLS, funciones RPC y la tabla `admin_allowlist`.

**Avisos del SQL Editor de Supabase (normal):**

- *Destructive operations*: el script hace `DROP POLICY IF EXISTS` para reemplazar políticas viejas abiertas (`USING true`). No borra turnos ni clientes.
- *RLS en admin_allowlist*: el script ya activa RLS sin políticas públicas; la lista de emails no es visible desde la app, solo la usa la función `is_barber_admin()` en el servidor.

Podés confirmar y ejecutar igual.

### 4. Rotar secretos expuestos (recomendado)

Si el webhook de Make o el PIN antiguo estuvieron en el repositorio:

- Generá un **nuevo webhook** en Make.com y actualizá `VITE_MAKE_WEBHOOK_URL`
- Cambiá la contraseña del usuario admin en Supabase Auth

## Comportamiento

- **Clientes**: solo ven horarios ocupados (sin nombres ni teléfonos de otros). Crean turnos vía RPC.
- **Cancelar turno propio**: requiere ID guardado en el dispositivo + teléfono coincidente (`cancel_public_booking`).
- **Admin**: inicia sesión; solo emails en `admin_allowlist` acceden al panel. Bloqueo tras 5 intentos fallidos (15 min).

## Archivos clave

- `supabase/security_setup.sql` — políticas y RPC
- `src/contexts/AdminAuthContext.tsx` — sesión admin
- `src/utils/validation.ts` — validación de formularios
- `src/components/AdminLoginModal.tsx` — login (reemplaza PIN)
