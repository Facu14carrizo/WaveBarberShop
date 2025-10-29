import React, { useState } from 'react';
import { Phone, User, Calendar, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Appointment, Service } from '../types';
// Los recordatorios se manejan automáticamente en App.tsx

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
  const [additionalNames, setAdditionalNames] = useState<string[]>([]); // hasta 2 adicionales
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const appointment: Omit<Appointment, 'id' | 'createdAt'> = {
      date: selectedDate,
      time: selectedTime,
      customerName,
      additionalCustomerNames: additionalNames,
      customerPhone,
      service: selectedService,
      status: 'confirmed',
      updatedAt: new Date(),
      reminderSent: false
    };

    // Los recordatorios se programan automáticamente en App.tsx

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
                {additionalNames.length > 0 && (
                  <p><strong>Acompañantes:</strong> {additionalNames.filter(n => n.trim().length > 0).join(', ')}</p>
                )}
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
                  className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Ingresa tu nombre"
                  required
                />
                {/* Botón para agregar personas */}
                <button
                  type="button"
                  onClick={() => {
                    if (additionalNames.length < 2) setAdditionalNames([...additionalNames, '']);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs font-medium transition-colors ${additionalNames.length < 2 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                  title={additionalNames.length < 2 ? 'Agregar otra persona' : 'Máximo alcanzado'}
                  disabled={additionalNames.length >= 2}
                >
                  +
                </button>
              </div>

              {/* Campos adicionales */}
              {additionalNames.map((name, idx) => (
                <div key={idx} className="relative mt-2">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const copy = [...additionalNames];
                      copy[idx] = e.target.value;
                      setAdditionalNames(copy);
                    }}
                    className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                    placeholder={`Nombre adicional ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...additionalNames];
                      copy.splice(idx, 1);
                      setAdditionalNames(copy);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                    title="Quitar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                WhatsApp *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-800 border border-gray-600 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Ej: 11 1234-5678"
                  required
                />
              </div>
            </div>

          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setShowPolicies(!showPolicies)}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-semibold text-white text-sm sm:text-base">Políticas de Cancelación</h4>
              {showPolicies ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {showPolicies && (
              <ul className="text-xs sm:text-sm text-gray-400 space-y-1 mt-3">
                <li>• Cancelaciones hasta 2 horas antes sin cargo</li>
                <li>• Llegadas tardías pueden resultar en reducción del servicio</li>
                <li>• Recibirás confirmación por WhatsApp</li>
              </ul>
            )}
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
              {isSubmitting ? 'Confirmando...' : `Confirmar  $${selectedService.price.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};