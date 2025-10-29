// Archivo de prueba para el sistema de WhatsApp
// Usa este archivo para probar los recordatorios

import { sendTestReminder, normalizePhoneForWhatsApp } from './whatsappReminders';

// Función para probar desde la consola del navegador
export const testWhatsAppSystem = () => {
  console.log('🧪 Iniciando prueba del sistema de WhatsApp...');
  
  // Tu número de teléfono para pruebas (reemplaza con tu número real)
  const testPhone = '11 1234-5678'; // Reemplaza con tu número
  const testName = 'Juan Prueba';
  
  console.log('📱 Enviando mensaje de prueba a:', testPhone);
  
  sendTestReminder(testPhone, testName)
    .then(() => {
      console.log('✅ Prueba completada. Revisa Make.com para ver si se procesó correctamente.');
    })
    .catch((error) => {
      console.error('❌ Error en la prueba:', error);
    });
};

// Función para probar la normalización de teléfonos
export const testPhoneNormalization = () => {
  const testPhones = [
    '11 1234-5678',
    '11-1234-5678',
    '91112345678',
    '01112345678',
    '5491112345678',
    '+5491112345678',
    '(011) 1234-5678'
  ];
  
  console.log('📞 Probando normalización de teléfonos:');
  testPhones.forEach(phone => {
    const normalized = normalizePhoneForWhatsApp(phone);
    console.log(`${phone} → ${normalized}`);
  });
};

// Hacer las funciones disponibles globalmente para pruebas en consola
if (typeof window !== 'undefined') {
  (window as any).testWhatsAppSystem = testWhatsAppSystem;
  (window as any).testPhoneNormalization = testPhoneNormalization;
  console.log('🔧 Funciones de prueba disponibles:');
  console.log('- testWhatsAppSystem() - Prueba el sistema completo');
  console.log('- testPhoneNormalization() - Prueba la normalización de teléfonos');
}
