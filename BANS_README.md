# Sistema de Baneos - WAVE Barbería

## Descripción

Sistema implementado para prevenir turnos con datos falsos/random. Permite banear IPs, teléfonos y emails de usuarios que crean turnos troll.

## Características

- ✅ Captura automática de IP al crear turnos
- ✅ Validación antes de crear turnos (verifica si están baneados)
- ✅ Baneo desde el panel de administración
- ✅ Gestión completa de baneos (ver, banear, desbanear)
- ✅ Fallback a localStorage si Supabase no está configurado

## Configuración

### 1. Crear las tablas en Supabase

Ejecuta el script SQL en el SQL Editor de Supabase:

```sql
-- Ver archivo: supabase/bans_tables.sql
```

O ejecuta directamente desde el archivo `supabase/bans_tables.sql`.

### 2. Verificar permisos

Asegúrate de que las políticas RLS (Row Level Security) permitan las operaciones necesarias. El script SQL incluye políticas básicas, pero puedes ajustarlas según tus necesidades.

## Uso

### Banear desde un turno

1. Ve al panel de administración
2. Encuentra el turno con datos falsos
3. Haz clic en el botón **"Banear"** (naranja)
4. Se banearán automáticamente:
   - La IP del usuario (si está disponible)
   - El teléfono
   - El email (si existe)

### Gestionar baneos

1. Ve al panel de administración
2. Haz clic en la pestaña **"Baneos"** (escudo naranja)
3. Verás tres columnas:
   - **IPs Baneadas**: Lista de IPs bloqueadas
   - **Teléfonos Baneados**: Lista de teléfonos bloqueados
   - **Emails Baneados**: Lista de emails bloqueados
4. Para desbanear, haz clic en el botón **"Desbanear"** verde

## Funcionamiento Técnico

### Captura de IP

El sistema intenta obtener la IP del usuario usando servicios externos:
- Primero intenta con `api.ipify.org`
- Si falla, usa `ipapi.co` como fallback
- La IP se guarda en la base de datos junto con el turno

### Validación de Baneos

Antes de crear un turno, el sistema verifica:
1. Si la IP está baneada
2. Si el teléfono está baneado
3. Si el email está baneado (si se proporciona)

Si alguno está baneado, se muestra un error y no se crea el turno.

### Almacenamiento

- **Supabase**: Si las tablas existen, se guardan allí
- **localStorage**: Como fallback si Supabase no está disponible o hay errores

## Notas Importantes

⚠️ **IPs dinámicas**: Si un usuario tiene IP dinámica, el baneo por IP puede no ser efectivo. En ese caso, el baneo por teléfono/email es más confiable.

⚠️ **VPNs/Proxies**: Los usuarios pueden usar VPNs para cambiar su IP. El baneo por teléfono/email es más efectivo en estos casos.

⚠️ **localStorage**: Los baneos en localStorage solo funcionan en el mismo navegador. Si cambias de navegador o dispositivo, no se aplicarán.

## Solución de Problemas

### Los baneos no se guardan

1. Verifica que las tablas existan en Supabase
2. Revisa las políticas RLS
3. Verifica la consola del navegador para errores

### No se captura la IP

- Verifica la conexión a internet
- Los servicios de IP pueden tener límites de rate
- En desarrollo local, la IP puede ser `127.0.0.1` o similar

### Los baneos no funcionan

- Verifica que la validación se ejecute antes de crear turnos
- Revisa que los datos se estén guardando correctamente
- Comprueba que el hook `useBans` esté cargando los datos

