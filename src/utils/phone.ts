export function normalizePhoneForWhatsApp(rawPhone: string, defaultCountry: 'AR' | 'INT' = 'AR'): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  const startsWithPlus = trimmed.startsWith('+');
  const onlyDigits = trimmed.replace(/[^\d]/g, '');

  // If phone already includes country code with +
  if (startsWithPlus) {
    // Argentina special handling: require 54 + 9 + area + number, remove 15 after area code
    if (trimmed.startsWith('+54')) {
      // Remove country code 54 from digits
      let rest = onlyDigits.slice(2);
      // Remove leading 0s (e.g., 011 → 11)
      rest = rest.replace(/^0+/, '');
      // Remove local mobile prefix 15 right after area code (2 to 4 digits)
      rest = rest.replace(/^(\d{2,4})15/, '$1');
      // Ensure the WhatsApp mobile 9 after 54
      if (!rest.startsWith('9')) rest = '9' + rest;
      return `54${rest}`; // wa.me expects digits only (no +)
    }
    // Other countries: return digits without plus for wa.me
    return onlyDigits;
  }

  // No country code provided
  if (defaultCountry === 'AR') {
    let rest = onlyDigits;
    rest = rest.replace(/^0+/, '');
    rest = rest.replace(/^(\d{2,4})15/, '$1');
    if (!rest.startsWith('9')) rest = '9' + rest;
    return `54${rest}`;
  }

  // Fallback: return as-is digits (not ideal, but prevents crashes)
  return onlyDigits;
}

export function buildWhatsAppLink(rawPhone: string, defaultCountry: 'AR' | 'INT' = 'AR', message?: string): string {
  const normalized = normalizePhoneForWhatsApp(rawPhone, defaultCountry);
  if (!normalized) return 'https://wa.me/';
  
  const baseUrl = `https://wa.me/${normalized}`;
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}?text=${encodedMessage}`;
  }
  
  return baseUrl;
}

export function buildSobreturnoWhatsAppLink(rawPhone: string, defaultCountry: 'AR' | 'INT' = 'AR'): string {
  const message = `¡Que onda! 👋 Me interesa agendar un *SOBRETURNO* 💈\n\n¡Gracias! 🙏`;
  return buildWhatsAppLink(rawPhone, defaultCountry, message);
}




