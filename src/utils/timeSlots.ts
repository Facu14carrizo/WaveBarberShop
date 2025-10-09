import { AvailableDay, TimeSlot, Appointment } from '../types';

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
    startTime: '10:00',
    endTime: '21:00',
    slots: [
      ...generateTimeSlots('10:00', '13:00').map(time => ({
        time,
        available: true
      })),
      ...generateTimeSlots('14:00', '21:00').map(time => ({
        time,
        available: true
      }))
    ]
  }
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