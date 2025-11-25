# ¿Qué NO puede hacer un usuario baneado?

## Acciones Bloqueadas

Cuando un usuario está baneado (por IP, teléfono o email), **NO PUEDE**:

### ❌ Crear nuevos turnos
- Si intenta reservar un turno, recibirá un mensaje de error específico
- El sistema detecta automáticamente si está baneado antes de crear el turno
- Se muestra un mensaje claro indicando qué está bloqueado y por qué

### Mensajes de Error

Cuando un usuario baneado intenta crear un turno, verá uno de estos mensajes:

1. **IP Bloqueada:**
   ```
   🚫 Tu IP ha sido bloqueada. No puedes crear turnos.
   Razón: [razón del baneo si existe]
   ```

2. **Teléfono Bloqueado:**
   ```
   🚫 Este teléfono ha sido bloqueado. No puedes crear turnos.
   Razón: [razón del baneo si existe]
   ```

3. **Email Bloqueado:**
   ```
   🚫 Este email ha sido bloqueado. No puedes crear turnos.
   Razón: [razón del baneo si existe]
   ```

## Acciones Permitidas

Un usuario baneado **SÍ PUEDE**:

### ✅ Ver la página
- Puede acceder a la página principal
- Puede ver los servicios disponibles
- Puede ver los horarios disponibles

### ✅ Navegar por el sitio
- Puede cambiar entre viernes y sábado
- Puede seleccionar servicios
- Puede ver los horarios disponibles

### ⚠️ Intentar crear turnos (pero será bloqueado)
- Puede intentar llenar el formulario
- Puede intentar enviar el formulario
- **PERO** recibirá un error y el turno NO se creará

## Cómo Funciona la Validación

1. **Al intentar crear un turno:**
   - El sistema captura la IP del usuario
   - Verifica si la IP está baneada
   - Verifica si el teléfono está baneado
   - Verifica si el email está baneado (si se proporciona)

2. **Si alguna verificación falla:**
   - Se lanza un error específico
   - Se muestra una notificación al usuario
   - El turno NO se crea
   - NO se guarda en la base de datos

3. **Si pasa todas las verificaciones:**
   - El turno se crea normalmente
   - Se guarda en la base de datos
   - Se envía confirmación

## Notas Importantes

- ⚠️ **IPs dinámicas**: Si un usuario tiene IP dinámica y cambia de IP, el baneo por IP puede no ser efectivo. El baneo por teléfono/email es más confiable.

- ⚠️ **VPNs/Proxies**: Los usuarios pueden usar VPNs para cambiar su IP. El baneo por teléfono/email es más efectivo en estos casos.

- ⚠️ **Múltiples dispositivos**: Si un usuario está baneado por teléfono, no podrá crear turnos desde ningún dispositivo usando ese teléfono.

- ✅ **Baneo múltiple**: Si un usuario tiene IP, teléfono Y email baneados, cualquiera de ellos bloqueará la creación de turnos.

## Ejemplo de Flujo

1. Usuario baneado intenta crear un turno
2. Llena el formulario con su teléfono baneado
3. Hace clic en "Confirmar"
4. Sistema detecta que el teléfono está baneado
5. Muestra error: "🚫 Este teléfono ha sido bloqueado..."
6. El turno NO se crea
7. El usuario no puede continuar

