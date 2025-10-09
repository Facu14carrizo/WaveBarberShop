// Utilidad para enviar datos a Zapier webhooks
// Esto permitirá que Zapier detecte cuando se crean/modifican turnos

export interface AppointmentWebhookData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  service: {
    name: string;
    price: number;
    duration: number;
    icon: string;
  };
  date: string;
  time: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

// URLs de webhooks de Zapier (las configurarás en Zapier)
const ZAPIER_WEBHOOKS = {
  // Webhook para confirmación inmediata
  CONFIRMATION: 'TU_WEBHOOK_AQUI_CONFIRMACION',
  // Webhook para recordatorio 24h antes
  REMINDER_24H: 'TU_WEBHOOK_AQUI_RECORDATORIO_24H',
  // Webhook para recordatorio el día del turno
  REMINDER_DAY: 'TU_WEBHOOK_AQUI_RECORDATORIO_DIA'
};

export const sendToZapier = async (
  webhookType: 'CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_DAY',
  appointmentData: AppointmentWebhookData
): Promise<boolean> => {
  const webhookUrl = ZAPIER_WEBHOOKS[webhookType];
  
  if (!webhookUrl || webhookUrl === 'TU_WEBHOOK_AQUI_CONFIRMACION') {
    console.log('Webhook no configurado:', webhookType);
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    if (response.ok) {
      console.log('Datos enviados a Zapier exitosamente:', webhookType);
      return true;
    } else {
      console.error('Error al enviar a Zapier:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error de red al enviar a Zapier:', error);
    return false;
  }
};

// Función para programar recordatorios
export const scheduleReminders = (appointment: AppointmentWebhookData) => {
  const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
  const now = new Date();
  
  // Recordatorio 24 horas antes
  const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
  
  // Recordatorio el día del turno (2 horas antes)
  const reminderDay = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
  
  // Programar recordatorio 24h antes
  if (reminder24h > now) {
    const timeUntilReminder24h = reminder24h.getTime() - now.getTime();
    setTimeout(() => {
      sendToZapier('REMINDER_24H', appointment);
    }, timeUntilReminder24h);
  }
  
  // Programar recordatorio el día
  if (reminderDay > now) {
    const timeUntilReminderDay = reminderDay.getTime() - now.getTime();
    setTimeout(() => {
      sendToZapier('REMINDER_DAY', appointment);
    }, timeUntilReminderDay);
  }
};
