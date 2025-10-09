import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Trash2, Edit, CheckCircle, XCircle, BarChart3, Filter, Search, Mail, MessageSquare } from 'lucide-react';
import { Appointment } from '../types';
import { buildWhatsAppLink } from '../utils/phone';
import { Analytics } from './Analytics';

interface OwnerDashboardProps {
  appointments: Appointment[];
  onDeleteAppointment: (id: string) => void;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  appointments,
  onDeleteAppointment,
  onUpdateAppointment
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'analytics'>('appointments');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    customerName: '', 
    customerPhone: '', 
    customerEmail: '', 
    notes: '' 
  });

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
    const matchesSearch = searchTerm === '' || 
      apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      notes: appointment.notes || ''
    });
  };

  const handleEditSave = (id: string) => {
    onUpdateAppointment(id, { 
      ...editForm, 
      customerEmail: editForm.customerEmail || undefined,
      notes: editForm.notes || undefined,
      updatedAt: new Date()
    });
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '' });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '' });
  };

  const handleStatusChange = (id: string, status: Appointment['status']) => {
    onUpdateAppointment(id, { status, updatedAt: new Date() });
  };

  const AppointmentCard: React.FC<{ appointment: Appointment; isToday: boolean }> = ({ 
    appointment, 
    isToday 
  }) => (
    <div className={`bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg border-l-4 ${
      isToday ? 'border-l-green-500' : 'border-l-purple-500'
    } hover:shadow-xl transition-all duration-300`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`rounded-full p-2 ${
            isToday ? 'bg-green-500/20 border border-green-500/30' : 'bg-purple-500/20 border border-purple-500/30'
          }`}>
            <span className="text-lg">{appointment.service.icon}</span>
          </div>
          <div>
            <p className={`font-semibold ${
              isToday ? 'text-green-300' : 'text-purple-300'
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
                  onClick={() => onDeleteAppointment(appointment.id)}
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
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <Analytics appointments={appointments} />
        ) : (
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
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isToday={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {filteredAppointments.filter(apt => apt.status !== 'cancelled').length > todayAppointments.length && (
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
              Todas las Reservas ({filteredAppointments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isToday={todayAppointments.some(t => t.id === appointment.id)}
                />
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
        )}
      </div>
    </div>
  );
};