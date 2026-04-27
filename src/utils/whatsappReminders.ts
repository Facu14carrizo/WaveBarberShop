// WhatsApp Reminders System for Wave Barbería
// Integrates with Make.com webhook and Twilio WhatsApp API
import { parseAppointmentDateTime } from './timeSlots';

export interface ReminderData {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  reminderType: 'confirmation' | '24h_reminder' | '2h_reminder';
  scheduledFor?: string; // ISO string for scheduled reminders
}

// Webhook URL de Make.com
const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/cnc77ml1ija6o1nxx6y1vcsbciwbcwbk';

// Las credenciales de Twilio se configuran directamente en Make.com

/**
 * Genera el mensaje de WhatsApp según el tipo de recordatorio
 */
export const generateWhatsAppMessage = (data: ReminderData): string => {
  const { customerName, serviceName, date, time, price, reminderType } = data;
  
  switch (reminderType) {
    case 'confirmation':
      return `¡Hola ${customerName}! 👋

✅ Tu turno en *WAVE Barber* ha sido confirmado

💈 *Servicio:* ${serviceName}
📅 *Fecha:* ${date}
🕐 *Hora:* ${time}
💵 *Precio:* $${price.toLocaleString()}

📍 Te espero perri

_Si necesitas reprogramar, avisame cuanto antes_ 🙏`;

    case '24h_reminder':
      return `¡Hola ${customerName}! 👋

⏰ *Recordatorio:* Mañana tienes tu turno en *WAVE Barber*

💈 *Servicio:* ${serviceName}
📅 *Fecha:* ${date}
🕐 *Hora:* ${time}

¡Te espero! 💈✨

_Si no podes asistir, avísame con tiempo_ 🙏`;

    case '2h_reminder':
      return `¡Hola ${customerName}! 👋

🔔 *¡Tu turno en Wave Barber es en 2 horas!*

💈 *Servicio:* ${serviceName}
🕐 *Hora:* ${time}

📍 Ya estoy preparando todo para atenderte

¡Nos vemos pronto! 💈✨`;

    default:
      return `¡Hola ${customerName}! Tu turno en WAVE Barber está confirmado.`;
  }
};

/**
 * Calcula la fecha/hora para el recordatorio 24h antes
 */
export const calculate24hReminderTime = (appointmentDate: string, appointmentTime: string, createdAt: Date): string => {
  const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime, createdAt);
  
  if (!appointmentDateTime) return new Date().toISOString();
  
  // Restar 24 horas (restar 1 día)
  const reminderTime = new Date(appointmentDateTime.getTime() - (24 * 60 * 60 * 1000));
  
  // Ajustar a mediodía (12:00)
  reminderTime.setHours(12, 0, 0, 0);
  
  return reminderTime.toISOString();
};

/**
 * Calcula la fecha/hora para el recordatorio 2h antes
 */
export const calculate2hReminderTime = (appointmentDate: string, appointmentTime: string, createdAt: Date): string => {
  const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime, createdAt);
  
  if (!appointmentDateTime) return new Date().toISOString();
  
  // Restar 2 horas
  const reminderTime = new Date(appointmentDateTime.getTime() - (2 * 60 * 60 * 1000));
  
  return reminderTime.toISOString();
};

/**
 * Envía recordatorios programados a Make.com
 */
export const sendScheduledReminders = async (appointment: {
  customerName: string;
  customerPhone: string;
  service: { name: string; price: number };
  date: string;
  time: string;
  createdAt: Date;
}): Promise<void> => {
  try {
    const reminders = [
      // Confirmación inmediata
      {
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        serviceName: appointment.service.name,
        date: appointment.date,
        time: appointment.time,
        price: appointment.service.price,
        reminderType: 'confirmation' as const,
        scheduledFor: new Date().toISOString() // Inmediato
      },
      // Recordatorio 24h antes
      {
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        serviceName: appointment.service.name,
        date: appointment.date,
        time: appointment.time,
        price: appointment.service.price,
        reminderType: '24h_reminder' as const,
        scheduledFor: calculate24hReminderTime(appointment.date, appointment.time, appointment.createdAt)
      },
      // Recordatorio 2h antes
      {
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        serviceName: appointment.service.name,
        date: appointment.date,
        time: appointment.time,
        price: appointment.service.price,
        reminderType: '2h_reminder' as const,
        scheduledFor: calculate2hReminderTime(appointment.date, appointment.time, appointment.createdAt)
      }
    ];

    // Enviar a Make.com
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminders: reminders
      })
    });

    if (!response.ok) {
      throw new Error(`Error enviando recordatorios: ${response.status}`);
    }

    console.log('✅ Recordatorios programados exitosamente');
    
  } catch (error) {
    console.error('❌ Error enviando recordatorios:', error);
    // No lanzar error para no interrumpir el flujo de reserva
  }
};

/**
 * Función de prueba para enviar un recordatorio inmediato
 */
export const sendTestReminder = async (phone: string, customerName: string): Promise<void> => {
  const testData: ReminderData = {
    customerName,
    customerPhone: phone,
    serviceName: 'Corte + Barba',
    date: '25 de octubre',
    time: '15:00',
    price: 8000,
    reminderType: 'confirmation',
    scheduledFor: new Date().toISOString()
  };

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminders: [testData]
      })
    });

    if (response.ok) {
      console.log('✅ Mensaje de prueba enviado exitosamente');
    } else {
      console.error('❌ Error enviando mensaje de prueba:', response.status);
    }
  } catch (error) {
    console.error('❌ Error enviando mensaje de prueba:', error);
  }
};

/**
 * Normaliza el número de teléfono para WhatsApp
 */
export const normalizePhoneForWhatsApp = (phone: string): string => {
  // Remover espacios, guiones y paréntesis
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Si no tiene código de país, agregar +54 (Argentina)
  if (!cleanPhone.startsWith('+')) {
    if (cleanPhone.startsWith('54')) {
      cleanPhone = '+' + cleanPhone;
    } else if (cleanPhone.startsWith('9')) {
      cleanPhone = '+54' + cleanPhone;
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = '+54' + cleanPhone.substring(1);
    } else {
      cleanPhone = '+549' + cleanPhone;
    }
  }
  
  return cleanPhone;
};