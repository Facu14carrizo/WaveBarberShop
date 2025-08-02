import { AvailableDay, TimeSlot, Appointment } from '../types';

export const getNextFriday = (): Date => {
  // Always return August 1, 2025 (Friday)
  return new Date(2025, 7, 1); // Month is 0-indexed, so 7 = August
};

export const getNextSaturday = (): Date => {
  // Always return August 2, 2025 (Saturday)
  return new Date(2025, 7, 2); // Month is 0-indexed, so 7 = August
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