import { AvailableDay, TimeSlot, Appointment } from '../types';
import { DayAvailability } from '../hooks/useDayAvailability';

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
  // Si es viernes o sábado (5 o 6), mostrar el viernes actual hasta las 00:01hs del domingo (día 0)
  if (currentDay === 5 || currentDay === 6) {
    // domingo a las 00:01
    const switchMoment = new Date(today);
    switchMoment.setDate(switchMoment.getDate() + (7 - currentDay) % 7 + 0); // próximo domingo del ciclo semanal
    switchMoment.setHours(0, 1, 0, 0); // 00:01hs
    if (today < switchMoment) {
      // Último viernes
      const lastFriday = new Date(today);
      lastFriday.setDate(today.getDate() - ((currentDay - 5 + 7) % 7));
      lastFriday.setHours(0, 0, 0, 0);
      return lastFriday;
    }
    // Si ya es domingo después de las 00:01, mostrar el próximo viernes
  }
  const daysUntilFriday = (5 - currentDay + 7) % 7;
  const daysToAdd = daysUntilFriday === 0 ? 7 : daysUntilFriday;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysToAdd);
  nextFriday.setHours(0, 0, 0, 0);
  return nextFriday;
};

export const getNextSaturday = (): Date => {
  const today = new Date();
  const currentDay = today.getDay();
  // Si es sábado, mostrar el sábado actual hasta las 00:01hs del domingo
  if (currentDay === 6) {
    const switchMoment = new Date(today);
    switchMoment.setDate(switchMoment.getDate() + 1); // próximo día (domingo)
    switchMoment.setHours(0, 1, 0, 0); // 00:01hs
    if (today < switchMoment) {
      const thisSaturday = new Date(today);
      thisSaturday.setHours(0, 0, 0, 0);
      return thisSaturday;
    }
    // Si ya es domingo después de las 00:01, mostrar el próximo sábado
  }
  const daysUntilSaturday = (6 - currentDay + 7) % 7;
  const daysToAdd = daysUntilSaturday === 0 ? 7 : daysUntilSaturday;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysToAdd);
  nextSaturday.setHours(0, 0, 0, 0);
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

export const getAvailableDays = (
  custom?: CustomTimeRanges,
  dayAvailability?: DayAvailability
): AvailableDay[] => {
  const availability = dayAvailability || { friday: true, saturday: true };
  const days: AvailableDay[] = [];

  // Viernes
  if (availability.friday) {
    const defaultSlots = generateTimeSlots('18:00', '21:00');
    const customRanges = custom || { friday: [], saturday: [] };
    const customSlots = customRanges.friday
      .flatMap(r => generateTimeSlots(r.start, r.end));
    const combined = Array.from(new Set([...defaultSlots, ...customSlots])).sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b)
    );
    const startTime = combined.length > 0 ? combined[0] : '18:00';
    const endTime = combined.length > 0 ? combined[combined.length - 1] : '21:00';
    days.push({
      day: 'friday',
      label: 'Viernes',
      startTime,
      endTime,
      slots: combined.map(time => ({ time, available: true })),
      isClosed: false
    } as AvailableDay);
  } else {
    days.push({
      day: 'friday',
      label: 'Viernes',
      startTime: '00:00',
      endTime: '00:00',
      slots: [],
      isClosed: true
    } as AvailableDay);
  }

  // Sábado
  if (availability.saturday) {
    const defaultSlots = generateTimeSlots('14:00', '21:00');
    const customRanges = custom || { friday: [], saturday: [] };
    const customSlots = customRanges.saturday
      .flatMap(r => generateTimeSlots(r.start, r.end));
    const combined = Array.from(new Set([...defaultSlots, ...customSlots])).sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b)
    );
    const startTime = combined.length > 0 ? combined[0] : '14:00';
    const endTime = combined.length > 0 ? combined[combined.length - 1] : '21:00';
    days.push({
      day: 'saturday',
      label: 'Sábado',
      startTime,
      endTime,
      slots: combined.map(time => ({ time, available: true })),
      isClosed: false
    } as AvailableDay);
  } else {
    days.push({
      day: 'saturday',
      label: 'Sábado',
      startTime: '00:00',
      endTime: '00:00',
      slots: [],
      isClosed: true
    } as AvailableDay);
  }

  return days;
};

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