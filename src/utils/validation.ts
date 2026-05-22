const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;

export const LIMITS = {
  customerName: 80,
  companionName: 80,
  phone: 30,
  notes: 500,
} as const;

export function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAG, '')
    .trim()
    .slice(0, maxLength);
}

/** Nombre: letras (incl. acentos), espacios, apóstrofo y guión */
export function isValidPersonName(name: string): boolean {
  const n = sanitizeText(name, LIMITS.customerName);
  if (n.length < 2 || n.length > LIMITS.customerName) return false;
  return /^[\p{L}\s'.-]+$/u.test(n);
}

/** Teléfono AR/internacional: 8–15 dígitos */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhoneDigits(phone);
  return digits.length >= 8 && digits.length <= 15;
}

export interface BookingFormInput {
  customerName: string;
  customerPhone: string;
  additionalNames: string[];
}

export type BookingValidationResult =
  | { ok: true; data: BookingFormInput }
  | { ok: false; message: string };

export function validateBookingForm(input: BookingFormInput): BookingValidationResult {
  const customerName = sanitizeText(input.customerName, LIMITS.customerName);
  const customerPhone = sanitizeText(input.customerPhone, LIMITS.phone);

  if (!isValidPersonName(customerName)) {
    return { ok: false, message: 'Ingresá un nombre válido (solo letras, mínimo 2 caracteres).' };
  }

  if (!isValidPhone(customerPhone)) {
    return { ok: false, message: 'Ingresá un WhatsApp válido (8 a 15 dígitos).' };
  }

  const companions = input.additionalNames
    .map((n) => sanitizeText(n, LIMITS.companionName))
    .filter((n) => n.length > 0);

  if (companions.length > 2) {
    return { ok: false, message: 'Máximo 2 acompañantes.' };
  }

  for (const name of companions) {
    if (!isValidPersonName(name)) {
      return { ok: false, message: 'Nombre de acompañante inválido.' };
    }
  }

  return {
    ok: true,
    data: { customerName, customerPhone, additionalNames: companions },
  };
}
