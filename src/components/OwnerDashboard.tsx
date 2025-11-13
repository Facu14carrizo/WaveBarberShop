import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Trash2, Edit, CheckCircle, XCircle, BarChart3, Filter, Search, Mail, MessageSquare, RotateCcw, Trash, RotateCw } from 'lucide-react';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { useNotifications } from '../hooks/useNotifications';
import { useDayAvailability } from '../hooks/useDayAvailability';
import { getAvailableDays, generateTimeSlots, CustomTimeRanges, getNextFriday, getNextSaturday, formatDate, isSlotAvailable } from '../utils/timeSlots';
import { services } from '../data/services';
import { Appointment, Service } from '../types';
import { buildWhatsAppLink } from '../utils/phone';
import { Analytics } from './Analytics';

interface OwnerDashboardProps {
  appointments: Appointment[];
  onDeleteAppointment: (id: string) => void;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => void;
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRestoreAppointment: (id: string) => Promise<void>;
  onPermanentlyDeleteAppointment: (id: string) => Promise<void>;
  loadDeletedAppointments: () => Promise<Appointment[]>;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  appointments,
  onDeleteAppointment,
  onUpdateAppointment,
  onNewAppointment,
  onRestoreAppointment,
  onPermanentlyDeleteAppointment,
  loadDeletedAppointments
}) => {
  const SHOW_STATUS = false;
  const [activeTab, setActiveTab] = useState<'appointments' | 'analytics' | 'settings' | 'trash'>('appointments');
  const [deletedAppointments, setDeletedAppointments] = useState<Appointment[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const { ranges } = useSupabaseCustomTimeRanges();
  const { availability } = useDayAvailability();
  const [dayFilter, setDayFilter] = useState<'all' | 'friday' | 'saturday' | 'sobreturno'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    customerName: '', 
    customerPhone: '', 
    customerEmail: '', 
    notes: '',
    additionalNames: '', // coma-separado para edición rápida
    time: '' // horario del turno
  });
  const [lastAction, setLastAction] = useState<null | { type: 'delete' | 'update'; snapshot: Appointment }>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Force scroll to top when component mounts
  React.useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    // Backup with timeout
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Actualizar el tiempo cada 30 segundos para que los turnos pasados se muevan al historial automáticamente
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Actualizar cada 30 segundos para mayor responsividad

    return () => clearInterval(interval);
  }, []);

  // Cargar turnos eliminados cuando se cambia a la pestaña de papelera
  React.useEffect(() => {
    if (activeTab === 'trash') {
      const loadTrash = async () => {
        setLoadingTrash(true);
        try {
          const deleted = await loadDeletedAppointments();
          setDeletedAppointments(deleted);
        } catch (error) {
          console.error('Error loading deleted appointments:', error);
        } finally {
          setLoadingTrash(false);
        }
      };
      loadTrash();
    }
  }, [activeTab, loadDeletedAppointments]);
  const filteredAppointments = appointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    const isFri = !!d && d.getDay() === 5;
    const isSat = !!d && d.getDay() === 6;
    const isSobreturno = apt.time.endsWith(':30');
    const matchesDay =
      dayFilter === 'all' ||
      (dayFilter === 'friday' && isFri) ||
      (dayFilter === 'saturday' && isSat) ||
      (dayFilter === 'sobreturno' && isSobreturno);
    const companions = (apt.additionalCustomerNames || []).join(' ').toLowerCase();
    const matchesSearch = searchTerm === '' ||
      apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companions.includes(searchTerm.toLowerCase()) ||
      apt.customerPhone.includes(searchTerm);
    return matchesDay && matchesSearch;
  });

  const confirmedAppointments = filteredAppointments.filter(apt => apt.status === 'confirmed');
  // Helper para comparar fecha y hora en formato de turno
  // Función para parsear la fecha ("viernes 14 de junio") + time --> Date
  function parseAppointmentDateTime(dateLabel: string, time: string) {
    // Formato esperado: "viernes 14 de junio" (sin año)
    const m = dateLabel.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const monthName = m[2].toLowerCase();
    const monthMap: Record<string, number> = {
      'enero': 0,
      'febrero': 1,
      'marzo': 2,
      'abril': 3,
      'mayo': 4,
      'junio': 5,
      'julio': 6,
      'agosto': 7,
      'septiembre': 8,
      'setiembre': 8, // variante común
      'octubre': 9,
      'noviembre': 10,
      'diciembre': 11
    };
    const month = monthMap[monthName];
    if (month == null) return null;
    const [hour, minute] = time.split(':').map(Number);
    const now = currentTime;
    let year = now.getFullYear();
    let candidate = new Date(year, month, day, hour || 0, minute || 0, 0, 0);
    
    // Heurística mejorada: si la fecha candidata está más de 6 meses en el pasado, 
    // asumimos que corresponde al próximo año (para turnos recurrentes)
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
    if (candidate.getTime() < now.getTime() - sixMonths) {
      candidate = new Date(year + 1, month, day, hour || 0, minute || 0, 0, 0);
    }
    return candidate;
  }
 
  function appointmentCompare(a: Appointment, b: Appointment, dir: 'asc' | 'desc') {
    const da = parseAppointmentDateTime(a.date, a.time);
    const db = parseAppointmentDateTime(b.date, b.time);
    if (!da || !db) return 0;
    const now = currentTime;
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const aIsToday = isSameDay(da, now);
    const bIsToday = isSameDay(db, now);
    if (aIsToday !== bIsToday) return aIsToday ? -1 : 1; // Hoy primero
    // Si ambos son hoy, ordenar: futuros primero, luego pasados; dentro aplicar dir
    if (aIsToday && bIsToday) {
      const aPast = da.getTime() < now.getTime();
      const bPast = db.getTime() < now.getTime();
      if (aPast !== bPast) return aPast ? 1 : -1; // futuros primero
      const diffToday = da.getTime() - db.getTime();
      return dir === 'asc' ? diffToday : -diffToday;
    }
    // Ninguno es hoy: mantener prioridad de futuros sobre pasados
    const aPast = da.getTime() < now.getTime();
    const bPast = db.getTime() < now.getTime();
    if (aPast !== bPast) return aPast ? 1 : -1;
    // Ambos no son hoy y están en el mismo grupo; ordenar por fecha completa según dir
    const diff = da.getTime() - db.getTime();
    return dir === 'asc' ? diff : -diff;
  }

  // Turnos de hoy separados en pasados y futuros
  const todayAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    if (!d) return false;
    const now = currentTime;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  // Turnos de hoy que ya pasaron
  const todayPastAppointments = todayAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    return !!d && d.getTime() < currentTime.getTime();
  }).sort((a, b) => {
    const da = parseAppointmentDateTime(a.date, a.time);
    const db = parseAppointmentDateTime(b.date, b.time);
    if (!da || !db) return 0;
    // Orden descendente: más recientes primero (mayor fecha primero)
    return db.getTime() - da.getTime();
  });

  const todayFutureAppointments = todayAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    return !!d && d.getTime() >= currentTime.getTime();
  }).sort((a, b) => appointmentCompare(a, b, sortDir));

  // Todos los turnos pasados (incluyendo los de hoy que ya pasaron)
  // Ordenados: más recientes arriba, más antiguos abajo
  const pastAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    if (!d) return false;
    // Incluir todos los turnos pasados (incluyendo los de hoy)
    return d.getTime() < currentTime.getTime();
  }).sort((a, b) => {
    const da = parseAppointmentDateTime(a.date, a.time);
    const db = parseAppointmentDateTime(b.date, b.time);
    if (!da || !db) return 0;
    // Orden descendente: más recientes primero (mayor fecha primero)
    return db.getTime() - da.getTime();
  });

  // Turnos futuros (no de hoy, y que no sean pasados)
  const upcomingAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    if (!d) return false;
    const now = currentTime;
    const isToday = d.getFullYear() === now.getFullYear() && 
                    d.getMonth() === now.getMonth() && 
                    d.getDate() === now.getDate();
    // Solo incluir turnos que sean futuros (después de ahora) y que NO sean de hoy
    return d.getTime() > currentTime.getTime() && !isToday;
  });

  // Turnos realmente futuros (desde ahora): incluye los que faltan hoy y los de días siguientes
  const futureAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time);
    return !!d && d.getTime() > currentTime.getTime();
  });

  const handleEditStart = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setEditForm({
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerEmail: appointment.customerEmail || '',
      notes: appointment.notes || '',
      additionalNames: (appointment.additionalCustomerNames || []).join(', '),
      time: appointment.time
    });
  };

  const handleEditSave = (id: string) => {
    const appointment = appointments.find(apt => apt.id === id);
    if (!appointment) return;
    
    const parsedAdditional = editForm.additionalNames
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .slice(0, 2);
    onUpdateAppointment(id, { 
      customerName: editForm.customerName,
      customerPhone: editForm.customerPhone,
      customerEmail: editForm.customerEmail || undefined,
      notes: editForm.notes || undefined,
      additionalCustomerNames: parsedAdditional.length > 0 ? parsedAdditional : undefined,
      time: editForm.time, // Actualizar el horario
      updatedAt: new Date()
    });
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '', additionalNames: '', time: '' });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '', additionalNames: '', time: '' });
  };

  const handleStatusChange = (id: string, status: Appointment['status']) => {
    const old = appointments.find(a => a.id === id);
    if (old) setLastAction({ type: 'update', snapshot: old });
    onUpdateAppointment(id, { status, updatedAt: new Date() });
  };

  const handleDelete = (appointment: Appointment) => {
    setLastAction({ type: 'delete', snapshot: appointment });
    onDeleteAppointment(appointment.id);
  };

  const handleUndo = () => {
    if (!lastAction) return;
    const snap = lastAction.snapshot;
    if (lastAction.type === 'delete') {
      onNewAppointment({
        date: snap.date,
        time: snap.time,
        customerName: snap.customerName,
        additionalCustomerNames: snap.additionalCustomerNames,
        customerPhone: snap.customerPhone,
        customerEmail: snap.customerEmail,
        status: snap.status,
        service: snap.service,
        notes: snap.notes
      });
    } else if (lastAction.type === 'update') {
      onUpdateAppointment(snap.id, {
        customerName: snap.customerName,
        customerPhone: snap.customerPhone,
        customerEmail: snap.customerEmail,
        notes: snap.notes,
        status: snap.status,
        service: snap.service,
        additionalCustomerNames: snap.additionalCustomerNames,
        date: snap.date,
        time: snap.time,
        updatedAt: new Date()
      });
    }
    setLastAction(null);
  };

  const renderAppointmentCard = (appointment: Appointment, isToday: boolean) => (
    (() => {
      const isSobreturno = appointment.time.endsWith(':30');
      const d = parseAppointmentDateTime(appointment.date, appointment.time);
      const dayIdx = d ? d.getDay() : 6; // 5=viernes, 6=sábado
      // Mapeo de colores por día: viernes -> azul, sábado -> violeta
      const theme = isSobreturno ? 'orange' : (dayIdx === 5 ? 'blue' : 'purple');
      const now = currentTime;
      const isPast = !!d && d.getTime() < now.getTime();
      const borderClass = theme === 'orange'
        ? 'border-l-orange-500'
        : theme === 'blue'
          ? (isPast ? 'border-l-blue-700' : 'border-l-blue-500')
          : (isPast ? 'border-l-purple-700' : 'border-l-purple-500');
      const bgBorderClass = theme === 'orange'
        ? 'bg-orange-500/20 border border-orange-500/30'
        : theme === 'blue'
          ? (isPast ? 'bg-blue-700/20 border border-blue-700/40' : 'bg-blue-500/20 border border-blue-500/30')
          : (isPast ? 'bg-purple-700/20 border border-purple-700/40' : 'bg-purple-500/20 border border-purple-500/30');
      const dateTextColor = theme === 'orange'
        ? 'text-orange-300'
        : theme === 'blue'
          ? (isPast ? 'text-blue-400' : 'text-blue-300')
          : (isPast ? 'text-purple-400' : 'text-purple-300');
      const themeChipClass = theme === 'orange' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : theme === 'blue' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      return (
    <div key={appointment.id} className={`bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg border-l-4 ${borderClass} hover:shadow-xl transition-all duration-300`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`rounded-full p-2 ${bgBorderClass} ${isPast ? 'opacity-60' : ''}`}>
            <span className="text-lg">{appointment.service.icon}</span>
          </div>
          <div>
            <p className={`font-semibold ${dateTextColor}`}>
              {appointment.date}
            </p>
            <div className="flex items-center space-x-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{appointment.time}</span>
              <span className="text-xs">({appointment.service.duration}min)</span>
            </div>
          </div>
        </div>
        <div className={isSobreturno ? "flex flex-col items-end gap-1" : "flex items-center gap-2"}>
          {SHOW_STATUS && (
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              appointment.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              appointment.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
              appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
              'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}>
              {appointment.status === 'confirmed' ? 'Confirmado' :
               appointment.status === 'completed' ? 'Completado' :
               appointment.status === 'cancelled' ? 'Cancelado' : 'No mostrar'}
            </div>
          )}
          {isSobreturno && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">SOBRETURNO</span>
          )}
        </div>
      </div>

      {editingId === appointment.id ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={editForm.customerName}
              onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={editForm.customerPhone}
              onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={editForm.customerEmail}
              onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Acompañantes (separados por coma, máx. 2)
            </label>
            <input
              type="text"
              value={editForm.additionalNames}
              onChange={(e) => setEditForm({ ...editForm, additionalNames: e.target.value })}
              placeholder="Ej: Juan, Pedro"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Campo para editar horario */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Horario
            </label>
            {(() => {
              // Calcular horarios disponibles para esta fecha
              const appointmentDate = appointment.date;
              const availableDays = getAvailableDays(ranges as CustomTimeRanges, availability);
              
              // Determinar qué día es (viernes o sábado)
              const d = parseAppointmentDateTime(appointment.date, appointment.time);
              const dayType = d?.getDay() === 5 ? 'friday' : d?.getDay() === 6 ? 'saturday' : null;
              const dayData = dayType ? availableDays.find(day => day.day === dayType) : null;
              
              // Obtener todos los slots posibles para este día (incluyendo sobreturnos :30)
              const allSlots = dayData?.slots.map(s => s.time) || [];
              
              // Agregar sobreturnos (:30) si el día está activo
              const sobreturnos: string[] = [];
              if (dayData && !dayData.isClosed) {
                // Generar sobreturnos desde las 8:30 hasta las 23:30
                for (let h = 8; h < 24; h++) {
                  sobreturnos.push(`${String(h).padStart(2, '0')}:30`);
                }
              }
              const allPossibleSlots = Array.from(new Set([...allSlots, ...sobreturnos]));
              
              // Filtrar slots ocupados (excluyendo el turno actual que se está editando)
              const otherAppointments = appointments.filter(apt => apt.id !== appointment.id);
              const availableSlots = allPossibleSlots.filter(slotTime => {
                return isSlotAvailable(appointmentDate, slotTime, otherAppointments);
              });
              
              // Incluir siempre el horario actual aunque esté "ocupado" (porque es el mismo turno)
              const slotsToShow = Array.from(new Set([...availableSlots, appointment.time])).sort((a, b) => {
                const [h1, m1] = a.split(':').map(Number);
                const [h2, m2] = b.split(':').map(Number);
                return (h1 * 60 + m1) - (h2 * 60 + m2);
              });
              
              if (slotsToShow.length === 0) {
                return (
                  <div className="text-sm text-yellow-400">
                    No hay horarios disponibles para este día
                  </div>
                );
              }
              
              return (
                <select
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {slotsToShow.map(time => (
                    <option key={time} value={time}>
                      {time} {time === appointment.time ? '(actual)' : ''}
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditSave(appointment.id)}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Guardar</span>
            </button>
            <button
              onClick={handleEditCancel}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{appointment.service.icon}</span>
              <div>
                <p className="font-semibold text-white">{appointment.service.name}</p>
                <p className="text-sm text-gray-400">${appointment.service.price.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-semibold text-white">{appointment.customerName}</p>
              {appointment.additionalCustomerNames && appointment.additionalCustomerNames.length > 0 && (
                <p className="text-sm text-gray-400">Acompañantes: {appointment.additionalCustomerNames.filter(n => n && n.trim().length > 0).join(', ')}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <a
                href={buildWhatsAppLink(appointment.customerPhone, 'AR')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-green-400 hover:text-green-300 hover:underline transition-colors duration-200 cursor-pointer group"
                title="Enviar mensaje por WhatsApp"
              >
                <span>{appointment.customerPhone}</span>
                <span className="text-lg group-hover:scale-110 transition-transform duration-200">💬</span>
              </a>
            </div>
          </div>
          
          {appointment.customerEmail && (
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-300">{appointment.customerEmail}</p>
              </div>
            </div>
          )}
          
          {appointment.notes && (
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-300 text-sm">{appointment.notes}</p>
              </div>
            </div>
          )}
          
          {/* Status and Action Controls */}
          <div className="pt-3 border-t border-gray-700">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                {SHOW_STATUS && (
                  <>
                    <label className="text-sm font-medium text-gray-300">Estado:</label>
                    <select
                      value={appointment.status}
                      onChange={(e) => handleStatusChange(appointment.id, e.target.value as Appointment['status'])}
                      className="text-sm bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer hover:bg-gray-600 transition-colors duration-200"
                    >
                      <option value="confirmed">Confirmado</option>
                      <option value="completed">Completado</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="no-show">No mostrar</option>
                    </select>
                  </>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditStart(appointment)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors duration-200"
                >
                  <Edit className="h-4 w-4" />
                  <span className="text-sm">Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(appointment)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex items-center justify-between">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isPast ? 'bg-gray-600/30 text-gray-300 border border-gray-600' : themeChipClass}`}>
              {isPast ? 'Pasado' : (isToday ? 'Hoy' : 'Próximo')}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(appointment.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
      );
    })()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-safe">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        
        {/* Dashboard Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4 drop-shadow-lg animate-gradient-x">
            Dashboard del Barbero
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 px-2 animate-fade-in-up">
            Gestiona tu barbería
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-1 flex">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'appointments'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Turnos</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Métricas</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'settings'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'trash'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <Analytics appointments={appointments} />
        ) : activeTab === 'trash' ? (
          <TrashSection 
            deletedAppointments={deletedAppointments}
            loading={loadingTrash}
            onRestore={async (id: string) => {
              try {
                await onRestoreAppointment(id);
                const deleted = await loadDeletedAppointments();
                setDeletedAppointments(deleted);
              } catch (error) {
                console.error('Error restoring appointment:', error);
              }
            }}
            onPermanentlyDelete={async (id: string) => {
              try {
                await onPermanentlyDeleteAppointment(id);
                const deleted = await loadDeletedAppointments();
                setDeletedAppointments(deleted);
              } catch (error) {
                console.error('Error permanently deleting appointment:', error);
              }
            }}
          />
        ) : activeTab === 'appointments' ? (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Total Reservas</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-400">{confirmedAppointments.length}</p>
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-full p-2 sm:p-3">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Turnos Hoy</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-400">{todayAppointments.length}</p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-full p-2 sm:p-3">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Próximos</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-400">{futureAppointments.length}</p>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-full p-2 sm:p-3">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-700 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base"
                >
                  <option value="all">Todos</option>
                  <option value="friday">Viernes</option>
                  <option value="saturday">Sábado</option>
                  <option value="sobreturno">Sobreturnos</option>
                </select>
                <button
                  onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg sm:rounded-xl hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  title="Alternar orden"
                >
                  {sortDir === 'asc' ? 'Próximo → Lejano' : 'Lejano → Próximo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Future Appointments */}
        {todayFutureAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Turnos Restantes de Hoy ({todayFutureAppointments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {todayFutureAppointments.map((appointment) => (
                renderAppointmentCard(appointment, true)
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Próximos Turnos ({upcomingAppointments.length})
              </h3>
              <button
                onClick={handleUndo}
                disabled={!lastAction}
                className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${lastAction ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'}`}
                title={lastAction ? 'Deshacer última acción (Ctrl+Z)' : 'Nada que deshacer'}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Deshacer</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {upcomingAppointments
                .slice() // copio array para no mutar upcomingAppointments original
                .sort((a, b) => appointmentCompare(a, b, sortDir))
                .map((appointment) => (
                  renderAppointmentCard(appointment, false)
                ))}
            </div>
          </div>
        )}

        {/* All Past Appointments */}
        {pastAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-400 mb-4 sm:mb-6 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Turnos Pasados ({pastAppointments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {pastAppointments.map((appointment) => (
                <div key={appointment.id} className="opacity-75">
                  {renderAppointmentCard(appointment, todayAppointments.some(t => t.id === appointment.id))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {pastAppointments.length === 0 && todayFutureAppointments.length === 0 && upcomingAppointments.length === 0 && (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-lg max-w-md mx-auto">
              <div className="bg-gray-700 border border-gray-600 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                {searchTerm || dayFilter !== 'all' ? 'No se encontraron resultados' : 'No hay reservas aún'}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {searchTerm || dayFilter !== 'all' ? 'Intenta cambiar los filtros de búsqueda' : 'Las nuevas reservas aparecerán aquí automáticamente'}
              </p>
            </div>
          </div>
        )}
        </>
        ) : (
          <SettingsSection appointments={appointments} onNewAppointment={onNewAppointment} />
        )}
      </div>
    </div>
  );
};

const SettingsSection: React.FC<{ appointments: Appointment[]; onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void }> = ({ appointments, onNewAppointment }) => {
  const [fridayStart, setFridayStart] = useState('');
  const [fridayEnd, setFridayEnd] = useState('');
  const [saturdayStart, setSaturdayStart] = useState('');
  const [saturdayEnd, setSaturdayEnd] = useState('');
  const { ranges, addRange, deleteRange, loading } = useSupabaseCustomTimeRanges();
  const { addNotification } = useNotifications();
  const { availability, updateDayAvailability, loading: availabilityLoading } = useDayAvailability();

  const stripWeekday = (s: string) => s.replace(/^[a-záéíóúñ]+\s+/i, '').trim();
  const fridayDateLabel = stripWeekday(formatDate(getNextFriday()));
  const saturdayDateLabel = stripWeekday(formatDate(getNextSaturday()));

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const buildAllHourTimes = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      times.push(`${hh}:00`);
    }
    return times;
  };

  const getExistingSet = (day: 'friday' | 'saturday') => {
    const available = getAvailableDays(ranges as CustomTimeRanges, availability);
    const current = available.find(d => d.day === day);
    return new Set((current?.slots || []).map(s => s.time));
  };

  const getStartOptions = (day: 'friday' | 'saturday') => {
    const existing = getExistingSet(day);
    const withinWindow = (t: string) => {
      const mins = toMinutes(t);
      const eight = 8 * 60;
      const friMax = 17 * 60; // 17:00 inclusive
      const satMax = 13 * 60; // 13:00 inclusive
      const inMorningWindow = day === 'friday'
        ? mins >= eight && mins <= friMax
        : mins >= eight && mins <= satMax;
      const inLateWindow = mins >= 22 * 60 || mins === 0; // 22:00, 23:00 y 00:00
      return inMorningWindow || inLateWindow;
    };
    return buildAllHourTimes().filter(t => withinWindow(t) && !existing.has(t));
  };

  const getEndOptions = (day: 'friday' | 'saturday', start?: string) => {
    if (!start) return [] as string[];
    const existing = getExistingSet(day);
    return buildAllHourTimes()
      .filter(t => toMinutes(t) >= toMinutes(start) && !existing.has(t))
      .filter(t => {
        const generated = generateTimeSlots(start, t);
        return generated.every(slot => !existing.has(slot));
      });
  };

  const onSaveRange = async (day: 'friday' | 'saturday', start: string, end: string) => {
    try {
      await addRange(day, start, end);
      addNotification({ type: 'success', title: 'Guardado', message: 'Rango agregado correctamente' });
      if (day === 'friday') { setFridayStart(''); setFridayEnd(''); }
      if (day === 'saturday') { setSaturdayStart(''); setSaturdayEnd(''); }
    } catch (e) {
      addNotification({ type: 'error', title: 'Error', message: e instanceof Error ? e.message : 'No se pudo guardar' });
    }
  };

  const handleToggleDay = async (day: 'friday' | 'saturday', enabled: boolean) => {
    try {
      await updateDayAvailability(day, enabled);
      addNotification({
        type: 'success',
        title: 'Actualizado',
        message: `${day === 'friday' ? 'Viernes' : 'Sábado'} ${enabled ? 'activado' : 'desactivado'} correctamente`
      });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: e instanceof Error ? e.message : 'No se pudo actualizar la disponibilidad'
      });
    }
  };

  return (
    <div className="mb-6 sm:mb-8 md:mb-12 space-y-6">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 text-center">Configuraciones</h3>
      <p className="text-gray-400 text-sm text-center">Los rangos se guardan en el servidor y se sincronizan en tiempo real. Ya están disponibles para todos los clientes.</p>

      {/* Switches para activar/desactivar días */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center">
          <Calendar className="h-4 w-4 text-purple-300 mr-2" />
          Disponibilidad de días
        </h4>
        <p className="text-gray-400 text-sm text-center mb-4">
          Activa o desactiva los días de atención. Los días desactivados aparecerán como cerrados para los clientes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Switch Viernes */}
          <div className="flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-xl p-4">
            <div>
              <p className="font-medium text-white">Viernes</p>
              <p className="text-xs text-gray-400 mt-1">
                {availability.friday ? 'Disponible para clientes' : 'Cerrado - No disponible'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={availability.friday}
                onChange={(e) => handleToggleDay('friday', e.target.checked)}
                disabled={availabilityLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Switch Sábado */}
          <div className="flex items-center justify-between bg-gray-700/50 border border-gray-600 rounded-xl p-4">
            <div>
              <p className="font-medium text-white">Sábado</p>
              <p className="text-xs text-gray-400 mt-1">
                {availability.saturday ? 'Disponible para clientes' : 'Cerrado - No disponible'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={availability.saturday}
                onChange={(e) => handleToggleDay('saturday', e.target.checked)}
                disabled={availabilityLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Añadir horarios adicionales + Rangos actuales en layout lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda (viernes y sábado apilados) */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center"><Clock className="h-4 w-4 text-purple-300 mr-2" />Añadir horarios adicionales para viernes</h4>
          <div className="flex items-center gap-3 mb-3">
            <select
              value={fridayStart}
              onChange={(e) => { setFridayStart(e.target.value); setFridayEnd(''); }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inicio</option>
              {getStartOptions('friday').map(t => (
                <option key={`fs-${t}`} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-gray-300">a</span>
            <select
              value={fridayEnd}
              onChange={(e) => setFridayEnd(e.target.value)}
              disabled={!fridayStart}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
            >
              <option value="">Fin</option>
              {getEndOptions('friday', fridayStart).map(t => (
                <option key={`fe-${t}`} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => onSaveRange('friday', fridayStart, fridayEnd)}
            disabled={!fridayStart || !fridayEnd}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Guardar rango para Viernes
          </button>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center"><Clock className="h-4 w-4 text-purple-300 mr-2" />Añadir horarios adicionales para sabado</h4>
          <div className="flex items-center gap-3 mb-3">
            <select
              value={saturdayStart}
              onChange={(e) => { setSaturdayStart(e.target.value); setSaturdayEnd(''); }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Inicio</option>
              {getStartOptions('saturday').map(t => (
                <option key={`ss-${t}`} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-gray-300">a</span>
            <select
              value={saturdayEnd}
              onChange={(e) => setSaturdayEnd(e.target.value)}
              disabled={!saturdayStart}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
            >
              <option value="">Fin</option>
              {getEndOptions('saturday', saturdayStart).map(t => (
                <option key={`se-${t}`} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => onSaveRange('saturday', saturdayStart, saturdayEnd)}
            disabled={!saturdayStart || !saturdayEnd}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Guardar rango para Sábado
          </button>
          </div>
        </div>
 
        {/* Columna derecha (Rangos actuales) */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6 md:col-span-1">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center"><Calendar className="h-4 w-4 text-blue-300 mr-2" />Rangos actuales</h4>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-white font-medium mb-2">Viernes <span className="text-gray-400 text-xs">{fridayDateLabel}</span></h5>
                <div className="flex flex-wrap gap-2">
                  {ranges.friday.length === 0 && <p className="text-gray-500 text-sm">Sin rangos</p>}
                  {ranges.friday.map((r) => (
                    <div key={`f-${r.start}-${r.end}`} className="inline-flex items-center gap-2 bg-gray-700/60 border border-gray-600 rounded-full px-3 py-1 text-sm">
                      <span className="text-gray-200">{r.start} a {r.end}</span>
                      <button
                        onClick={() => deleteRange('friday', r.start, r.end)}
                        className="text-red-400 hover:text-red-300"
                      >Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-white font-medium mb-2">Sábado <span className="text-gray-400 text-xs">{saturdayDateLabel}</span></h5>
                <div className="flex flex-wrap gap-2">
                  {ranges.saturday.length === 0 && <p className="text-gray-500 text-sm">Sin rangos</p>}
                  {ranges.saturday.map((r) => (
                    <div key={`s-${r.start}-${r.end}`} className="inline-flex items-center gap-2 bg-gray-700/60 border border-gray-600 rounded-full px-3 py-1 text-sm">
                      <span className="text-gray-200">{r.start} a {r.end}</span>
                      <button
                        onClick={() => deleteRange('saturday', r.start, r.end)}
                        className="text-red-400 hover:text-red-300"
                      >Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {/* Sobreturnos */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center"><Clock className="h-4 w-4 text-orange-300 mr-2" />Crear Sobreturno (:30)</h4>
        <SobreturnoForm
          appointments={appointments}
          onNewAppointment={onNewAppointment}
          ranges={ranges as CustomTimeRanges}
          availability={availability}
        />
        <p className="text-xs text-gray-400 mt-2 text-center">Crea un turno manual en horario y media (10:30, 11:30, etc.). Se refleja en la grilla y en la vista de clientes.</p>
      </div>
    </div>
  );
};

interface SobreturnoFormProps {
  appointments: Appointment[];
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  ranges: CustomTimeRanges;
  availability: { friday: boolean; saturday: boolean };
}
function SobreturnoForm({ appointments, onNewAppointment, ranges, availability }: SobreturnoFormProps) {
  const [day, setDay] = useState<'friday' | 'saturday'>('friday');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [time, setTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [additionalNames, setAdditionalNames] = useState<string[]>([]);
  const selectedService: Service | undefined = services.find(s => s.id === serviceId);

  const buildHalfHours = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      times.push(`${hh}:30`);
    }
    return times;
  };

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const availableDays = getAvailableDays(ranges, availability);
  const selectedDate = day === 'friday' ? formatDate(getNextFriday()) : formatDate(getNextSaturday());
  const existingSet = new Set(
    availableDays.find(d => d.day === day)?.slots.map(s => s.time) || []
  );
  const options = buildHalfHours()
    .filter(t => {
      const mins = toMinutes(t);
      return mins >= (8 * 60 + 30) && mins <= (23 * 60 + 30);
    })
    .filter(t => !existingSet.has(t));
  const slotAvailable = time ? isSlotAvailable(selectedDate, time, appointments) : false;

  const handleCreate = async () => {
    if (!selectedService || !time || !customerName || !customerPhone) return;
    if (!slotAvailable) return;
    await onNewAppointment({
      date: selectedDate,
      time,
      customerName,
      additionalCustomerNames: additionalNames,
      customerPhone,
      status: 'confirmed',
      service: selectedService
    });
    setTime('');
    setCustomerName('');
    setCustomerPhone('');
    setAdditionalNames([]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={day}
          onChange={(e) => setDay(e.target.value as any)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="friday">Viernes</option>
          <option value="saturday">Sábado</option>
        </select>

        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Hora (:30)</option>
          {options.map(t => (
            <option key={`half-${t}`} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
        <input
          type="tel"
          placeholder="Ej: 11 1234-5678"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

  {/* Acompañantes Sobreturno */}
  <div className="mt-3 space-y-2">
    {additionalNames.map((n, idx) => (
      <div key={idx} className="relative">
        <input
          type="text"
          value={n}
          onChange={(e) => {
            const copy = [...additionalNames];
            copy[idx] = e.target.value;
            setAdditionalNames(copy);
          }}
          placeholder={`Acompañante ${idx + 1}`}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-9"
        />
        <button
          type="button"
          onClick={() => {
            const copy = [...additionalNames];
            copy.splice(idx, 1);
            setAdditionalNames(copy);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded"
        >
          ×
        </button>
      </div>
    ))}
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => { if (additionalNames.length < 2) setAdditionalNames([...additionalNames, '']); }}
        disabled={additionalNames.length >= 2}
        className={`px-3 py-2 rounded-lg text-sm ${additionalNames.length < 2 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
      >
        + Agregar acompañante
      </button>
      <button
        onClick={handleCreate}
        disabled={!time || !selectedService || !customerName || !customerPhone || !slotAvailable}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        Crear Sobreturno
      </button>
    </div>
  </div>

      {!slotAvailable && time && (
        <p className="text-xs text-yellow-400">Ese horario ya está ocupado.</p>
      )}
    </div>
  );
}

// Componente de Papelera de Reciclaje
interface TrashSectionProps {
  deletedAppointments: Appointment[];
  loading: boolean;
  onRestore: (id: string) => Promise<void>;
  onPermanentlyDelete: (id: string) => Promise<void>;
}

const TrashSection: React.FC<TrashSectionProps> = ({
  deletedAppointments,
  loading,
  onRestore,
  onPermanentlyDelete
}) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await onRestore(id);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentlyDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente este turno? Esta acción no se puede deshacer.')) {
      return;
    }
    setDeletingId(id);
    try {
      await onPermanentlyDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  function parseAppointmentDateTime(dateLabel: string, time: string) {
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
    const now = new Date();
    let year = now.getFullYear();
    let candidate = new Date(year, month, day, hour || 0, minute || 0, 0, 0);
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
    if (candidate.getTime() < now.getTime() - sixMonths) {
      candidate = new Date(year + 1, month, day, hour || 0, minute || 0, 0, 0);
    }
    return candidate;
  }

  return (
    <div className="mb-6 sm:mb-8 md:mb-12">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
        <Trash className="h-5 w-5 mr-2 text-red-400" />
        Papelera de Reciclaje ({deletedAppointments.length})
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Los turnos eliminados se mantienen aquí. Puedes restaurarlos o eliminarlos permanentemente.
      </p>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Cargando turnos eliminados...</div>
        </div>
      ) : deletedAppointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md mx-auto">
            <Trash className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-white mb-2">Papelera vacía</h4>
            <p className="text-gray-400 text-sm">No hay turnos eliminados.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {deletedAppointments.map((appointment) => {
            const d = parseAppointmentDateTime(appointment.date, appointment.time);
            const isSobreturno = appointment.time.endsWith(':30');
            const dayIdx = d ? d.getDay() : 6;
            const theme = isSobreturno ? 'orange' : (dayIdx === 5 ? 'blue' : 'purple');
            
            return (
              <div
                key={appointment.id}
                className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg border-l-4 border-l-red-500 opacity-75"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full p-2 bg-red-500/20 border border-red-500/30">
                      <span className="text-lg">{appointment.service.icon}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-red-300">{appointment.date}</p>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{appointment.time}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    Eliminado
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{appointment.service.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{appointment.service.name}</p>
                      <p className="text-sm text-gray-400">${appointment.service.price.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-white">{appointment.customerName}</p>
                      {appointment.additionalCustomerNames && appointment.additionalCustomerNames.length > 0 && (
                        <p className="text-sm text-gray-400">
                          Acompañantes: {appointment.additionalCustomerNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">{appointment.customerPhone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700 flex space-x-2">
                  <button
                    onClick={() => handleRestore(appointment.id)}
                    disabled={restoringId === appointment.id}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-green-400 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="text-sm">
                      {restoringId === appointment.id ? 'Restaurando...' : 'Restaurar'}
                    </span>
                  </button>
                  <button
                    onClick={() => handlePermanentlyDelete(appointment.id)}
                    disabled={deletingId === appointment.id}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">
                      {deletingId === appointment.id ? 'Eliminando...' : 'Eliminar'}
                    </span>
                  </button>
                </div>

                <div className="pt-2 mt-2 text-xs text-gray-500 text-center">
                  Eliminado el {new Date(appointment.updatedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};