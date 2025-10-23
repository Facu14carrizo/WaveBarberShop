// Sistema de recordatorios automáticos de WhatsApp
// Utiliza Make.com (Integromat) para enviar mensajes programados

export interface ReminderData {
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  servicePrice: number;
  date: string;
  time: string;
  reminderType: '24h' | '2h' | 'confirmation';
}

// URL del webhook de Make.com para recordatorios
// IMPORTANTE: Configura esta variable en tu archivo .env
// VITE_MAKE_WEBHOOK_URL=https://hook.eu1.make.com/tu_webhook_id
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/TU_WEBHOOK_ID_AQUI';

/**
 * Calcula las fechas de recordatorio
 */
export const calculateReminderTimes = (appointmentDate: string, appointmentTime: string) => {
  // Convertir fecha y hora a objeto Date
  const [day, month, year] = appointmentDate.split('/').map(Number);
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  
  const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
  
  // Recordatorio 1 día antes al mediodía (12:00)
  const reminder24h = new Date(appointmentDateTime);
  reminder24h.setDate(reminder24h.getDate() - 1);
  reminder24h.setHours(12, 0, 0, 0);
  
  // Recordatorio 2 horas antes
  const reminder2h = new Date(appointmentDateTime);
  reminder2h.setHours(reminder2h.getHours() - 2);
  
  return {
    appointment: appointmentDateTime,
    reminder24h,
    reminder2h,
  };
};

/**
 * Genera el mensaje de WhatsApp según el tipo de recordatorio
 */
export const generateWhatsAppMessage = (data: ReminderData): string => {
  const { customerName, serviceName, date, time, reminderType, servicePrice } = data;
  
  const firstName = customerName.split(' ')[0];
  
  switch (reminderType) {
    case 'confirmation':
      return `¡Hola ${firstName}! 👋\n\n✅ Tu turno en *WAVE Barber* ha sido confirmado\n\n💈 *Servicio:* ${serviceName}\n📅 *Fecha:* ${date}\n🕐 *Hora:* ${time}\n💵 *Precio:* $${servicePrice.toLocaleString()}\n\n📍 Te espero perri\n\n_Si necesitas reprogramar, avisame cuanto antes_ 🙏`;
    
    case '24h':
      return `¡Hola ${firstName}! 👋\n\n⏰ *Recordatorio:* Mañana tienes tu turno en *WAVE Barber*\n\n💈 *Servicio:* ${serviceName}\n📅 *Fecha:* ${date}\n🕐 *Hora:* ${time}\n\n¡Te esperamos! 💈✨\n\n_Si no podes asistir, avísame con tiempo_ 🙏`;
    
    case '2h':
      return `¡Hola ${firstName}! 👋\n\n🔔 *¡Tu turno es en 2 horas!*\n\n💈 *Servicio:* ${serviceName}\n🕐 *Hora:* ${time}\n\n📍 Ya estoy preparando todo para atenderte\n\n¡Nos vemos pronto! 💈✨`;
    
    default:
      return '';
  }
};

/**
 * Envía los datos a Make.com para programar recordatorios
 */
export const scheduleWhatsAppReminders = async (
  appointmentId: string,
  customerName: string,
  customerPhone: string,
  serviceName: string,
  servicePrice: number,
  date: string,
  time: string
): Promise<boolean> => {
  
  // Calcular las fechas de recordatorio
  const times = calculateReminderTimes(date, time);
  const now = new Date();
  
  // Solo enviar si el turno es en el futuro
  if (times.appointment <= now) {
    console.log('El turno ya pasó, no se enviarán recordatorios');
    return false;
  }
  
  // Preparar los datos para todos los recordatorios
  const reminders = [];
  
  // Confirmación inmediata
  reminders.push({
    appointmentId,
    customerName,
    customerPhone,
    serviceName,
    servicePrice,
    date,
    time,
    reminderType: 'confirmation',
    message: generateWhatsAppMessage({
      appointmentId,
      customerName,
      customerPhone,
      serviceName,
      servicePrice,
      date,
      time,
      reminderType: 'confirmation'
    }),
    scheduledFor: new Date().toISOString(), // Enviar inmediatamente
  });
  
  // Recordatorio 24h antes (solo si falta más de 24h)
  if (times.reminder24h > now) {
    reminders.push({
      appointmentId,
      customerName,
      customerPhone,
      serviceName,
      servicePrice,
      date,
      time,
      reminderType: '24h',
      message: generateWhatsAppMessage({
        appointmentId,
        customerName,
        customerPhone,
        serviceName,
        servicePrice,
        date,
        time,
        reminderType: '24h'
      }),
      scheduledFor: times.reminder24h.toISOString(),
    });
  }
  
  // Recordatorio 2h antes (solo si falta más de 2h)
  if (times.reminder2h > now) {
    reminders.push({
      appointmentId,
      customerName,
      customerPhone,
      serviceName,
      servicePrice,
      date,
      time,
      reminderType: '2h',
      message: generateWhatsAppMessage({
        appointmentId,
        customerName,
        customerPhone,
        serviceName,
        servicePrice,
        date,
        time,
        reminderType: '2h'
      }),
      scheduledFor: times.reminder2h.toISOString(),
    });
  }
  
  try {
    // Enviar a Make.com
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminders,
        metadata: {
          source: 'wave-barbershop',
          timestamp: new Date().toISOString(),
        }
      }),
    });
    
    if (response.ok) {
      console.log('✅ Recordatorios programados exitosamente');
      return true;
    } else {
      console.error('❌ Error al programar recordatorios:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error de red al programar recordatorios:', error);
    return false;
  }
};

/**
 * Función auxiliar para testing - envía un mensaje de prueba
 */
export const sendTestReminder = async (phone: string, name: string) => {
  const testData: ReminderData = {
    appointmentId: 'test-123',
    customerName: name,
    customerPhone: phone,
    serviceName: 'Corte + Barba',
    servicePrice: 8000,
    date: '25/10/2024',
    time: '15:00',
    reminderType: 'confirmation',
  };
  
  return scheduleWhatsAppReminders(
    testData.appointmentId,
    testData.customerName,
    testData.customerPhone,
    testData.serviceName,
    testData.servicePrice,
    testData.date,
    testData.time
  );
};

