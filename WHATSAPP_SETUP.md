# 📱 Configuración de Recordatorios Automáticos por WhatsApp

Esta guía te ayudará a configurar el sistema de recordatorios automáticos de WhatsApp para Wave Barbería usando Make.com (Integromat) y WhatsApp Business API.

---

## 🎯 ¿Qué hace este sistema?

Cuando un cliente agenda un turno, automáticamente se envían 3 mensajes:

1. **✅ Confirmación Inmediata** - Al momento de reservar
2. **⏰ Recordatorio 24h antes** - 1 día antes del turno al mediodía (12:00)
3. **🔔 Recordatorio 2h antes** - 2 horas antes del turno

---

## 📋 Requisitos Previos

### 1. Cuenta de WhatsApp Business API

Tienes **3 opciones**:

#### **Opción A: Twilio (Recomendada - Más Fácil)** 💰 $
- ✅ Configuración rápida (15 minutos)
- ✅ API oficial de WhatsApp
- ✅ 1,000 mensajes gratis por mes
- 💵 Precio: ~$0.005 por mensaje después del límite gratuito
- 🔗 [Registrarse en Twilio](https://www.twilio.com/try-twilio)

#### **Opción B: 360dialog** 💰 $$
- ✅ Especializado en WhatsApp Business
- ✅ Soporte en español
- 💵 Precio: desde €49/mes
- 🔗 [Registrarse en 360dialog](https://www.360dialog.com)

#### **Opción C: Meta Business Suite (Gratis pero complejo)** 💰 Gratis
- ❌ Configuración compleja
- ❌ Requiere verificación de negocio
- ✅ Completamente gratuito
- 🔗 [Meta Business](https://business.facebook.com)

---

## 🚀 Configuración Paso a Paso

### Paso 1: Configurar WhatsApp Business API con Twilio

1. **Crear cuenta en Twilio**
   - Ve a [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
   - Regístrate con tu email
   - Verifica tu número de teléfono

2. **Obtener WhatsApp Sandbox**
   - En el dashboard de Twilio, ve a **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Sigue las instrucciones para conectar tu número de WhatsApp
   - Guarda tu **Account SID** y **Auth Token**

3. **Obtener credenciales**
   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: tu_auth_token_aqui
   WhatsApp Number: +14155238886 (número de Twilio)
   ```

---

### Paso 2: Configurar Make.com (Integromat)

1. **Crear cuenta en Make.com**
   - Ve a [https://www.make.com](https://www.make.com)
   - Regístrate gratis (10,000 operaciones/mes gratis)

2. **Crear un nuevo Escenario**
   - Click en "Create a new scenario"
   - Nombra: "Wave Barbería - Recordatorios WhatsApp"

3. **Configurar Webhook**
   - Agrega el módulo **Webhooks** → **Custom webhook**
   - Click en "Create a webhook"
   - Nombra: "Wave Appointments"
   - **Copia la URL del webhook** (algo como: `https://hook.eu1.make.com/xxxxxxxxxxxxx`)
   - Esta URL la necesitarás para el código

4. **Agregar módulo Iterator**
   - Agrega **Flow Control** → **Iterator**
   - Conecta después del webhook
   - Selecciona: `reminders[]` (itera sobre cada recordatorio)

5. **Agregar módulo Sleep (Delay)**
   - Agrega **Tools** → **Sleep**
   - Conecta después del Iterator
   - Configura:
     ```
     Date: {{scheduledFor}}
     ```
   - Esto hará que espere hasta la fecha/hora programada

6. **Agregar módulo de Twilio**
   - Agrega **Twilio** → **Make an API Call**
   - Conecta tu cuenta de Twilio (usa Account SID y Auth Token)
   - Configura:
     ```
     URL: /2010-04-01/Accounts/{{TU_ACCOUNT_SID}}/Messages.json
     Method: POST
     Body:
       From: whatsapp:+14155238886
       To: whatsapp:+54{{customerPhone}}
       Body: {{message}}
     ```

7. **Activar el escenario**
   - Click en el switch para activar
   - Guarda el escenario

---

### Paso 3: Configurar la App

1. **Actualizar el webhook en el código**
   
   Abre `src/utils/whatsappReminders.ts` y reemplaza:
   
   ```typescript
   const MAKE_WEBHOOK_URL = 'TU_URL_DE_MAKE_AQUI';
   ```
   
   Por tu URL real:
   
   ```typescript
   const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/xxxxxxxxxxxxx';
   ```

2. **Rebuild la aplicación**
   ```bash
   npm run build
   ```

---

## 🧪 Probar el Sistema

### 1. Test desde la consola del navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Importar la función de test
import { sendTestReminder } from './utils/whatsappReminders';

// Enviar mensaje de prueba a tu número
sendTestReminder('+5491112345678', 'Juan Prueba');
```

### 2. Test completo

1. Agenda un turno de prueba en la app
2. Verifica que llegue el mensaje de confirmación
3. Revisa en Make.com que se hayan programado los recordatorios

---

## 📱 Formato de los Mensajes

### Confirmación Inmediata
```
¡Hola Juan! 👋

✅ Tu turno en *WAVE Barber* ha sido confirmado

💈 *Servicio:* Corte + Barba
📅 *Fecha:* 25/10/2024
🕐 *Hora:* 15:00
💵 *Precio:* $8.000

📍 Te espero perri

_Si necesitas reprogramar, avisame cuanto antes_ 🙏
```

### Recordatorio 24h antes
```
¡Hola Juan! 👋

⏰ *Recordatorio:* Mañana tienes tu turno en *WAVE Barber*

💈 *Servicio:* Corte + Barba
📅 *Fecha:* 25/10/2024
🕐 *Hora:* 15:00

¡Te espero! 💈✨

_Si no podes asistir, avísame con tiempo_ 🙏
```

### Recordatorio 2h antes
```
¡Hola Juan! 👋

🔔 *¡Tu turno en Wave Barber es en 2 horas!*

💈 *Servicio:* Corte + Barba
🕐 *Hora:* 15:00

📍 Ya estoy preparando todo para atenderte

¡Nos vemos pronto! 💈✨
```

---

## 💰 Costos Estimados

### Con Twilio:
- **Gratis:** Primeros 1,000 mensajes/mes
- **Después:** $0.005 por mensaje
- **Ejemplo:** Si envías 3 mensajes por turno y tienes 50 turnos/mes = 150 mensajes = **GRATIS**

### Con Make.com:
- **Gratis:** 10,000 operaciones/mes
- **Operaciones por turno:** 3 (un webhook + 3 mensajes) = 4 operaciones
- **Turnos gratis/mes:** 2,500 turnos = **GRATIS**

**Total mensual con 50 turnos: $0 (GRATIS)** 🎉

---

## 🔧 Solución de Problemas

### Los mensajes no llegan

1. **Verifica que el webhook esté activo en Make.com**
   - El switch debe estar en verde
   
2. **Revisa los logs en Make.com**
   - Ve a "History" en tu escenario
   - Busca errores en rojo

3. **Verifica el formato del teléfono**
   - Debe incluir código de país: +54911...
   - Sin espacios ni guiones

### Los mensajes llegan tarde

1. **Verifica la zona horaria en Make.com**
   - Asegúrate de que esté en tu zona horaria correcta

2. **Revisa la fecha de scheduledFor**
   - Abre la consola y verifica que se calculen bien las fechas

---

## 🎨 Personalizar Mensajes

Para cambiar los mensajes, edita el archivo `src/utils/whatsappReminders.ts`:

```typescript
export const generateWhatsAppMessage = (data: ReminderData): string => {
  const { customerName, serviceName, date, time, reminderType } = data;
  
  switch (reminderType) {
    case 'confirmation':
      return `Tu mensaje personalizado aquí`;
    // ... resto de casos
  }
};
```

---

## 📊 Monitoreo y Analytics

### En Make.com:
- Ve a "History" para ver todos los mensajes enviados
- Exporta reports mensualmente

### En Twilio:
- Dashboard → Messaging → Logs
- Ve estadísticas de entrega

---

## 🆘 Soporte

Si tienes problemas:

1. **Revisa los logs:** Console del navegador (F12)
2. **Verifica Make.com:** History de ejecuciones
3. **Contacta soporte:**
   - Twilio: [support.twilio.com](https://support.twilio.com)
   - Make.com: [make.com/support](https://www.make.com/en/help/support)

---

## 🚀 Próximas Mejoras

- [ ] Confirmación de lectura de mensajes
- [ ] Cancelación de turno por WhatsApp
- [ ] Reprogramación automática
- [ ] Encuestas de satisfacción post-servicio
- [ ] Promociones y ofertas automáticas

---

¡Listo! Tu sistema de recordatorios automáticos está configurado 🎉

