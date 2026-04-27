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

export const parseAppointmentDateTime = (dateLabel: string, time: string, createdAt: Date): Date | null => {
  const m = dateLabel.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].toLowerCase();
  const monthMap: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'setiembre': 8,
    'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  const month = monthMap[monthName];
  if (month == null) return null;
  const [hour, minute] = time.split(':').map(Number);
  
  const dateMonth = month;
  const createdMonth = createdAt.getMonth();
  let year = createdAt.getFullYear();

  // Heurística robusta: el año del turno es el año de creación, 
  // a menos que el mes del turno sea mucho menor que el de creación (wrap-around de fin de año)
  if (dateMonth < createdMonth && (createdMonth - dateMonth) > 6) {
    year++;
  }

  return new Date(year, dateMonth, day, hour || 0, minute || 0, 0, 0);
};

export const isSlotAvailable = (dateLabel: string, time: string, appointments: Appointment[]): boolean => {
  // Para comparar correctamente, necesitamos saber para qué año estamos consultando
  // En la vista de cliente, 'dateLabel' es para el próximo viernes/sábado (año actual o próximo)
  // Pero aquí no tenemos el 'Date' objeto de la consulta fácilmente sin cambiar la firma.
  // Sin embargo, podemos usar la lógica de que un turno de hace un año NO debería bloquear un turno de hoy.
  
  const now = new Date();
  
  return !appointments.some(
    appointment => {
      if (appointment.date !== dateLabel || appointment.time !== time || appointment.status !== 'confirmed') {
        return false;
      }
      
      // Si el label coincide, verificar el año usando createdAt
      const aptDate = parseAppointmentDateTime(appointment.date, appointment.time, appointment.createdAt);
      if (!aptDate) return false;
      
      // Solo nos importan los turnos que están cerca de "ahora" (mismo año/mes aprox)
      // O más simple: si el turno es del pasado (más de 1 mes atrás), no bloquea slots futuros.
      // Pero espera, isSlotAvailable se usa para ver si alguien PUEDE reservar.
      // Así que solo comparamos contra turnos que NO son pasados.
      
      return aptDate.getTime() > (now.getTime() - 24 * 60 * 60 * 1000); // Permitir turnos de hoy
    }
  );
};