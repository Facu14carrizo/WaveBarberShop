# 📱 Configuración de Zapier para WhatsApp Automático

## 🚀 Paso a Paso para Configurar las 3 Automatizaciones

### **1. Crear cuenta en Zapier**
1. Ve a [zapier.com](https://zapier.com)
2. Crea una cuenta gratuita
3. Verifica tu email

### **2. Configurar ZAP #1: Confirmación Inmediata**

#### Trigger (Activador):
- **App**: "Webhooks by Zapier"
- **Event**: "Catch Hook"
- **Configuración**: 
  - Copia la URL del webhook (algo como: `https://hooks.zapier.com/hooks/catch/123456/abc123/`)
  - Reemplaza `TU_WEBHOOK_AQUI_CONFIRMACION` en el archivo `src/utils/webhooks.ts`

#### Action (Acción):
- **App**: "WhatsApp Business API" o "Twilio"
- **Event**: "Send Message"
- **Configuración**:
  - Número de teléfono: `{{phone}}` (viene del webhook)
  - Mensaje: 
  ```
  🎉 ¡Hola {{customerName}}! 

  Tu turno en 💈WAVE💈 ha sido confirmado:

  📅 Fecha: {{date}}
  ⏰ Hora: {{time}}
  ✂️ Servicio: {{service.name}}
  💰 Precio: ${{service.price}}

  ¡Te esperamos!
  ```

### **3. Configurar ZAP #2: Recordatorio 24h Antes**

#### Trigger:
- **App**: "Webhooks by Zapier" 
- **Event**: "Catch Hook"
- **URL diferente** para este webhook

#### Action:
- **App**: "WhatsApp Business API"
- **Event**: "Send Message"
- **Mensaje**:
  ```
  📞 ¡Hola {{customerName}}!

  Te recordamos que mañana tienes tu turno en 💈WAVE💈:

  📅 Fecha: {{date}}
  ⏰ Hora: {{time}}
  ✂️ Servicio: {{service.name}}

  ¡Nos vemos pronto! 💈
  ```

### **4. Configurar ZAP #3: Recordatorio el Día**

#### Trigger:
- **App**: "Webhooks by Zapier"
- **Event**: "Catch Hook" 
- **URL diferente** para este webhook

#### Action:
- **App**: "WhatsApp Business API"
- **Event**: "Send Message"
- **Mensaje**:
  ```
  ⏰ ¡Hola {{customerName}}!

  Tu turno en 💈WAVE💈 es HOY:

  📅 Fecha: {{date}}
  ⏰ Hora: {{time}}
  ✂️ Servicio: {{service.name}}

  ¡Te esperamos en 2 horas! 💈
  ```

## 🔧 Configuración Técnica

### **Archivo a Modificar**: `src/utils/webhooks.ts`

```typescript
const ZAPIER_WEBHOOKS = {
  // Reemplaza estas URLs con las de tus webhooks de Zapier
  CONFIRMATION: 'https://hooks.zapier.com/hooks/catch/TU_WEBHOOK_CONFIRMACION',
  REMINDER_24H: 'https://hooks.zapier.com/hooks/catch/TU_WEBHOOK_24H',
  REMINDER_DAY: 'https://hooks.zapier.com/hooks/catch/TU_WEBHOOK_DIA'
};
```

## 📋 Datos que Envía la App

Cada webhook recibe estos datos:
```json
{
  "id": "abc123",
  "customerName": "Juan Pérez",
  "customerPhone": "+5491112345678",
  "customerEmail": "juan@email.com",
  "service": {
    "name": "Corte Premium",
    "price": 2500,
    "duration": 45,
    "icon": "✂️"
  },
  "date": "viernes 15 de enero",
  "time": "18:30",
  "status": "confirmed",
  "createdAt": "2024-01-10T10:30:00Z",
  "updatedAt": "2024-01-10T10:30:00Z",
  "notes": "Cliente preferencia: pelo corto"
}
```

## 🎯 Resultado Final

Una vez configurado, cuando un cliente reserve:
1. ✅ **Inmediatamente** recibe WhatsApp de confirmación
2. ✅ **24h antes** recibe recordatorio automático  
3. ✅ **El día** recibe recordatorio final

¡Todo automático! 🚀
