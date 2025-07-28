import { AvailableDay, TimeSlot, Appointment } from '../types';

export const getNextFriday = (): Date => {
  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Target dates: July 26, 2024 (Friday) and August 2, 2024 (Friday)
  const july26 = new Date(2024, 6, 26); // Month is 0-indexed, so 6 = July
  const august2 = new Date(2024, 7, 2); // 7 = August
  
  // If today is before or on July 26, return July 26
  if (currentDate <= july26) {
    return july26;
  }
  // If today is after July 26 but before or on August 2, return August 2
  else if (currentDate <= august2) {
    return august2;
  }
  // If both dates have passed, calculate next Friday dynamically
  else {
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    return nextFriday;
  }
};

export const getNextSaturday = (): Date => {
  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Target dates: July 27, 2024 (Saturday) and August 3, 2024 (Saturday)
  const july27 = new Date(2024, 6, 27); // Month is 0-indexed, so 6 = July
  const august3 = new Date(2024, 7, 3); // 7 = August
  
  // If today is before or on July 27, return July 27
  if (currentDate <= july27) {
    return july27;
  }
  // If today is after July 27 but before or on August 3, return August 3
  else if (currentDate <= august3) {
    return august3;
  }
  // If both dates have passed, calculate next Saturday dynamically
  else {
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    return nextSaturday;
  }
};

export const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots: string[] = [];
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  let current = new Date(start);
  while (current < end) {
    slots.push(current.toTimeString().slice(0, 5));
    current.setMinutes(current.getMinutes() + 30);
  }
  
  return slots;
};

export const getAvailableDays = (): AvailableDay[] => [
  {
    day: 'friday',
    label: 'Viernes',
    startTime: '18:00',
    endTime: '21:00',
    slots: generateTimeSlots('18:00', '21:00').map(time => ({
      time,
      available: true
    }))
  },
  {
    day: 'saturday',
    label: 'Sábado',
    startTime: '14:00',
    endTime: '21:00',
    slots: generateTimeSlots('14:00', '21:00').map(time => ({
      time,
      available: true
    }))
  }
];

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const isSlotAvailable = (date: string, time: string, appointments: Appointment[]): boolean => {
  return !appointments.some(
    appointment => 
      appointment.date === date && 
      appointment.time === time && 
      appointment.status === 'confirmed'
  );
};