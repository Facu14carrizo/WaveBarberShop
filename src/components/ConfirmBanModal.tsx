import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Appointment } from '../types';

interface ConfirmBanModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmBanModal: React.FC<ConfirmBanModalProps> = ({
  isOpen,
  appointment,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !appointment) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onCancel}
    >
      <div 
        className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-full p-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Confirmar Baneo
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-gray-300 text-sm sm:text-base mb-4">
            ¿Estás seguro de que deseas banear este turno?
          </p>

          <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
              Se baneará:
            </p>
            <div className="space-y-2">
              {appointment.ipAddress && (
                <div className="flex items-center space-x-2">
                  <span className="text-orange-400">•</span>
                  <span className="text-white text-sm">
                    <span className="text-gray-400">IP:</span> {appointment.ipAddress}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-orange-400">•</span>
                <span className="text-white text-sm">
                  <span className="text-gray-400">Teléfono:</span> {appointment.customerPhone}
                </span>
              </div>
              {appointment.customerEmail && (
                <div className="flex items-center space-x-2">
                  <span className="text-orange-400">•</span>
                  <span className="text-white text-sm">
                    <span className="text-gray-400">Email:</span> {appointment.customerEmail}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
            <p className="text-orange-300 text-xs sm:text-sm flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Esto impedirá que creen nuevos turnos desde esta IP, teléfono o email.</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-orange-500/25 text-sm sm:text-base"
          >
            Confirmar Baneo
          </button>
        </div>
      </div>
    </div>
  );
};

