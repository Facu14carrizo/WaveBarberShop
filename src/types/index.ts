export interface Appointment {
  id: string;
  date: string;
  time: string;
  customerName: string;
  additionalCustomerNames?: string[]; // hasta 2 adicionales
  customerPhone: string;
  customerEmail?: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  service: Service;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  reminderSent?: boolean;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  description: string;
  icon: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
  isBreak?: boolean;
}

export interface AvailableDay {
  day: 'friday' | 'saturday';
  label: string;
  startTime: string;
  endTime: string;
  slots: TimeSlot[];
  isClosed?: boolean; // Indica si el día está cerrado/desactivado
}

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  workingDays: AvailableDay[];
  breakTimes: { start: string; end: string }[];
  advanceBookingDays: number;
  cancellationHours: number;
}

export interface Analytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  revenue: number;
  popularServices: { service: string; count: number }[];
  busyHours: { hour: string; count: number }[];
}