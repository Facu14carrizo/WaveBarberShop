import { AvailableDay, TimeSlot, Appointment } from '../types';

export type CustomTimeRanges = {
  friday: { start: string; end: string }[];
  saturday: { start: string; end: string }[];
};

const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const getNextFriday = (): Date => {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilFriday = (5 - currentDay + 7) % 7; // 5 = Friday (0-indexed)
  
  // If today is Friday, get next Friday
  const daysToAdd = daysUntilFriday === 0 ? 7 : daysUntilFriday;
  
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysToAdd);
  
  return nextFriday;
};

export const getNextSaturday = (): Date => {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilSaturday = (6 - currentDay + 7) % 7; // 6 = Saturday (0-indexed)
  
  // If today is Saturday, get next Saturday
  const daysToAdd = daysUntilSaturday === 0 ? 7 : daysUntilSaturday;
  
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysToAdd);
  
  return nextSaturday;
};

export const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots: string[] = [];
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  let current = new Date(start);
  while (current <= end) {
    slots.push(current.toTimeString().slice(0, 5));
    current.setMinutes(current.getMinutes() + 60);
  }
  
  return slots;
};

export const getAvailableDays = (custom?: CustomTimeRanges): AvailableDay[] => [
  // We'll merge defaults with any custom ranges from localStorage
  (() => {
    const defaultSlots = generateTimeSlots('18:00', '21:00');
    const customRanges = custom || { friday: [], saturday: [] };
    const customSlots = customRanges.friday
      .flatMap(r => generateTimeSlots(r.start, r.end));
    const combined = Array.from(new Set([...defaultSlots, ...customSlots])).sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b)
    );
    const startTime = combined.length > 0 ? combined[0] : '18:00';
    const endTime = combined.length > 0 ? combined[combined.length - 1] : '21:00';
    return {
      day: 'friday',
      label: 'Viernes',
      startTime,
      endTime,
      slots: combined.map(time => ({ time, available: true }))
    } as AvailableDay;
  })(),
  (() => {
    const defaultSlots = generateTimeSlots('14:00', '21:00');
    const customRanges = custom || { friday: [], saturday: [] };
    const customSlots = customRanges.saturday
      .flatMap(r => generateTimeSlots(r.start, r.end));
    const combined = Array.from(new Set([...defaultSlots, ...customSlots])).sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b)
    );
    const startTime = combined.length > 0 ? combined[0] : '14:00';
    const endTime = combined.length > 0 ? combined[combined.length - 1] : '21:00';
    return {
      day: 'saturday',
      label: 'Sábado',
      startTime,
      endTime,
      slots: combined.map(time => ({ time, available: true }))
    } as AvailableDay;
  })()
];

export const formatDate = (date: Date): string => {
  const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${weekday} ${day} de ${month}`;
};

export const isSlotAvailable = (date: string, time: string, appointments: Appointment[]): boolean => {
  return !appointments.some(
    appointment => 
      appointment.date === date && 
      appointment.time === time && 
      appointment.status === 'confirmed'
  );
};