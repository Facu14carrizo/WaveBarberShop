import React from 'react';
import { Check } from 'lucide-react';
import { Service } from '../types';
import { services } from '../data/services';

interface ServiceSelectorProps {
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedService,
  onServiceSelect
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
        Selecciona tu servicio
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onServiceSelect(service)}
            className={`
              group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-95 sm:hover:scale-105 text-left
              ${selectedService?.id === service.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-800 border-2 border-gray-600 hover:border-purple-400 hover:shadow-md text-gray-200 hover:bg-gray-700'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="text-xl sm:text-2xl">{service.icon}</span>
                <div>
                  <h4 className="font-bold text-base sm:text-lg">{service.name}</h4>
                  <p className="text-xs sm:text-sm opacity-80">{service.duration} min</p>
                </div>
              </div>
              
              {selectedService?.id === service.id && (
                <div className="bg-white/20 rounded-full p-1 flex-shrink-0">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
            </div>
            
            <p className="text-xs sm:text-sm opacity-90 mb-2 sm:mb-3 leading-relaxed">{service.description}</p>
            
            <div className="flex items-center justify-between">
              <span className="text-lg sm:text-2xl font-bold">
                ${service.price.toLocaleString()}
              </span>
              <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                selectedService?.id === service.id 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-500/20 text-purple-300'
              }`}>
                {service.duration} min
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};