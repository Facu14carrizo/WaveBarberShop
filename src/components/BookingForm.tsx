import React, { useState } from 'react';
import { Phone, User, Calendar, Clock, CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { Appointment, Service } from '../types';

interface BookingFormProps {
  selectedDate: string;
  selectedTime: string;
  selectedService: Service;
  onBookingComplete: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  selectedDate,
  selectedTime,
  selectedService,
  onBookingComplete,
  onCancel
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const appointment: Omit<Appointment, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: selectedTime,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      service: selectedService,
      notes: notes || undefined,
      status: 'confirmed',
      updatedAt: new Date(),
      reminderSent: false
    };

    onBookingComplete(appointment);
    setShowConfirmation(true);
    setIsSubmitting(false);

    // Auto close after 3 seconds
    setTimeout(() => {
      setShowConfirmation(false);
      onCancel();
    }, 3000);
  };

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-md w-full transform animate-pulse shadow-2xl">
          <div className="text-center">
            <div className="bg-green-500/20 border border-green-500/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              ¡Turno Confirmado!
            </h3>
            <p className="text-gray-300 mb-4">
              Tu reserva ha sido confirmada exitosamente
            </p>
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-4 space-y-2">
              <div className="text-sm text-gray-300 space-y-1">
                <p><strong>Fecha:</strong> {selectedDate}</p>
                <p><strong>Hora:</strong> {selectedTime}</p>
                <p><strong>Servicio:</strong> {selectedService.name}</p>
                <p><strong>Duración:</strong> {selectedService.duration} min</p>
                <p><strong>Precio:</strong> ${selectedService.price.toLocaleString()}</p>
                <p><strong>Cliente:</strong> {customerName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
          Confirmar Reserva
        </h3>

        <div className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-cyan-900/30 border border-purple-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <div className="flex items-center space-x-2 justify-center sm:justify-start">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-gray-300">{selectedDate}</span>
              </div>
              <div className="flex items-center space-x-2 justify-center sm:justify-end">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-300">{selectedTime}</span>
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2 sm:pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-white text-center sm:text-left">{selectedService.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">{selectedService.description}</p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="font-bold text-white text-lg sm:text-base">${selectedService.price.toLocaleString()}</p>
                  <p className="text-xs sm:text-sm text-gray-400">{selectedService.duration} min</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Nombre completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Ingresa tu nombre"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Ej: +54 9 11 1234-5678"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Email (opcional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Notas adicionales (opcional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 resize-none text-sm sm:text-base"
                  placeholder="Alguna preferencia especial o comentario..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <h4 className="font-semibold text-white mb-2 text-sm sm:text-base">Políticas de Cancelación</h4>
            <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
              <li>• Cancelaciones hasta 2 horas antes sin cargo</li>
              <li>• Llegadas tardías pueden resultar en reducción del servicio</li>
              <li>• Recibirás confirmación por WhatsApp</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-600 text-gray-300 bg-gray-800 rounded-lg sm:rounded-xl hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 font-medium text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 text-sm sm:text-base"
            >
              {isSubmitting ? 'Confirmando...' : `Confirmar - $${selectedService.price.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};