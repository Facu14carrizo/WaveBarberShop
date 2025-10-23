import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Trash2, Edit, CheckCircle, XCircle, BarChart3, Filter, Search, Mail, MessageSquare, RotateCcw } from 'lucide-react';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { useNotifications } from '../hooks/useNotifications';
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
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  appointments,
  onDeleteAppointment,
  onUpdateAppointment,
  onNewAppointment
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'analytics' | 'settings'>('appointments');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    customerName: '', 
    customerPhone: '', 
    customerEmail: '', 
    notes: '',
    additionalNames: '' // coma-separado para edición rápida
  });
  const [lastAction, setLastAction] = useState<null | { type: 'delete' | 'update'; snapshot: Appointment }>(null);

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
  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    const companions = (apt.additionalCustomerNames || []).join(' ').toLowerCase();
    const matchesSearch = searchTerm === '' || 
      apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companions.includes(searchTerm.toLowerCase()) ||
      apt.customerPhone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const confirmedAppointments = filteredAppointments.filter(apt => apt.status === 'confirmed');
  const todayAppointments = confirmedAppointments.filter(apt => {
    const today = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return apt.date === today;
  });

  const upcomingAppointments = confirmedAppointments.filter(apt => {
    const today = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return apt.date !== today;
  });

  const handleEditStart = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setEditForm({
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerEmail: appointment.customerEmail || '',
      notes: appointment.notes || '',
      additionalNames: (appointment.additionalCustomerNames || []).join(', ')
    });
  };

  const handleEditSave = (id: string) => {
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
      updatedAt: new Date()
    });
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '', additionalNames: '' });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '', additionalNames: '' });
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
      const borderClass = isSobreturno
        ? 'border-l-orange-500'
        : isToday
          ? 'border-l-green-500'
          : 'border-l-purple-500';
      return (
    <div key={appointment.id} className={`bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg border-l-4 ${borderClass} hover:shadow-xl transition-all duration-300`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`rounded-full p-2 ${
            isSobreturno ? 'bg-orange-500/20 border border-orange-500/30' : (isToday ? 'bg-green-500/20 border border-green-500/30' : 'bg-purple-500/20 border border-purple-500/30')
          }`}>
            <span className="text-lg">{appointment.service.icon}</span>
          </div>
          <div>
            <p className={`font-semibold ${
              isSobreturno ? 'text-orange-300' : (isToday ? 'text-green-300' : 'text-purple-300')
            }`}>
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
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isToday ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              {isToday ? 'Hoy' : 'Próximo'}
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
              <span className="text-sm sm:text-base">Analytics</span>
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
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <Analytics appointments={appointments} />
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
                <p className="text-2xl sm:text-3xl font-bold text-blue-400">{upcomingAppointments.length}</p>
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
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base"
                >
                  <option value="all">Todos los estados</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="completed">Completados</option>
                  <option value="cancelled">Cancelados</option>
                  <option value="no-show">No mostrar</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        {todayAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
              Turnos de Hoy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {todayAppointments.map((appointment) => (
                renderAppointmentCard(appointment, true)
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {filteredAppointments.filter(apt => apt.status !== 'cancelled').length > todayAppointments.length && (
          <div>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Todas las Reservas ({filteredAppointments.length})
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
              {filteredAppointments.map((appointment) => (
                renderAppointmentCard(appointment, todayAppointments.some(t => t.id === appointment.id))
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAppointments.length === 0 && (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-lg max-w-md mx-auto">
              <div className="bg-gray-700 border border-gray-600 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                {searchTerm || filterStatus !== 'all' ? 'No se encontraron resultados' : 'No hay reservas aún'}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {searchTerm || filterStatus !== 'all' ? 'Intenta cambiar los filtros de búsqueda' : 'Las nuevas reservas aparecerán aquí automáticamente'}
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
    const available = getAvailableDays(ranges as CustomTimeRanges);
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

  return (
    <div className="mb-6 sm:mb-8 md:mb-12">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">Configuraciones</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Añadir horarios adicionales para viernes</h4>
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
          <h4 className="text-lg font-semibold text-white mb-4">Añadir horarios adicionales para sabado</h4>
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
      <p className="text-gray-400 text-sm mt-4 text-center">Los rangos se guardan en el servidor y se sincronizan en tiempo real. Ya están disponibles para todos los clientes.</p>

      <div className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Rangos actuales</h4>
        {loading ? (
          <p className="text-gray-400">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h5 className="text-white font-medium mb-2">Viernes</h5>
              <div className="space-y-2">
                {ranges.friday.length === 0 && <p className="text-gray-500 text-sm">Sin rangos</p>}
                {ranges.friday.map((r) => (
                  <div key={`f-${r.start}-${r.end}`} className="flex items-center justify-between bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2">
                    <span className="text-gray-200 text-sm">{r.start} a {r.end}</span>
                    <button
                      onClick={() => deleteRange('friday', r.start, r.end)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-white font-medium mb-2">Sábado</h5>
              <div className="space-y-2">
                {ranges.saturday.length === 0 && <p className="text-gray-500 text-sm">Sin rangos</p>}
                {ranges.saturday.map((r) => (
                  <div key={`s-${r.start}-${r.end}`} className="flex items-center justify-between bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2">
                    <span className="text-gray-200 text-sm">{r.start} a {r.end}</span>
                    <button
                      onClick={() => deleteRange('saturday', r.start, r.end)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sobreturnos */}
      <div className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Crear Sobreturno (:30)</h4>
        <SobreturnoForm
          appointments={appointments}
          onNewAppointment={onNewAppointment}
          ranges={ranges as CustomTimeRanges}
        />
        <p className="text-xs text-gray-400 mt-2">Crea un turno manual en horario y media (10:30, 11:30, etc.). Se refleja en la grilla y en la vista de clientes.</p>
      </div>
    </div>
  );
};

interface SobreturnoFormProps {
  appointments: Appointment[];
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  ranges: CustomTimeRanges;
}
function SobreturnoForm({ appointments, onNewAppointment, ranges }: SobreturnoFormProps) {
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

  const availableDays = getAvailableDays(ranges);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

        <button
          onClick={handleCreate}
          disabled={!time || !selectedService || !customerName || !customerPhone || !slotAvailable}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Crear Sobreturno
        </button>
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
          placeholder="Teléfono del cliente"
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
    <button
      type="button"
      onClick={() => { if (additionalNames.length < 2) setAdditionalNames([...additionalNames, '']); }}
      disabled={additionalNames.length >= 2}
      className={`px-3 py-2 rounded-lg text-sm ${additionalNames.length < 2 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
    >
      + Agregar acompañante
    </button>
  </div>

      {!slotAvailable && time && (
        <p className="text-xs text-yellow-400">Ese horario ya está ocupado.</p>
      )}
    </div>
  );
}