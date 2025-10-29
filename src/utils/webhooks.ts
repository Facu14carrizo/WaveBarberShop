// Utilidad para enviar datos a Make.com webhooks
// Esto permitirá que Make.com detecte cuando se crean/modifican turnos

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

// URL del webhook de Make.com
const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/cnc77ml1ija6o1nxx6y1vcsbciwbcwbk';

// Función para enviar datos a Make.com
export const sendToMake = async (
  appointmentData: AppointmentWebhookData
): Promise<boolean> => {
  try {
    // Importar las funciones de recordatorios
    const { sendScheduledReminders, normalizePhoneForWhatsApp } = await import('./whatsappReminders');
    
    // Normalizar el teléfono para WhatsApp
    const normalizedPhone = normalizePhoneForWhatsApp(appointmentData.customerPhone);
    
    // Enviar recordatorios programados
    await sendScheduledReminders({
      customerName: appointmentData.customerName,
      customerPhone: normalizedPhone,
      service: {
        name: appointmentData.service.name,
        price: appointmentData.service.price
      },
      date: appointmentData.date,
      time: appointmentData.time
    });

    console.log('✅ Recordatorios programados en Make.com exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error al enviar a Make.com:', error);
    return false;
  }
};

// Función de compatibilidad (mantiene la API existente)
export const sendToZapier = sendToMake;

// Función para programar recordatorios (ahora usa Make.com)
export const scheduleReminders = async (appointment: AppointmentWebhookData) => {
  try {
    await sendToMake(appointment);
  } catch (error) {
    console.error('Error programando recordatorios:', error);
  }
};
