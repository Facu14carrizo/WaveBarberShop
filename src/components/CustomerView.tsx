import React, { useState } from 'react';
import { Calendar, MapPin, Phone, Clock, Star, Award, Shield } from 'lucide-react';
import { TimeSlotGrid } from './TimeSlotGrid';
import { ServiceSelector } from './ServiceSelector';
import { BookingForm } from './BookingForm';
import { BackButton } from './BackButton';
import { getAvailableDays, getNextFriday, getNextSaturday, formatDate, isSlotAvailable, CustomTimeRanges } from '../utils/timeSlots';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { Appointment, Service } from '../types';
import { services } from '../data/services';

interface CustomerViewProps {
  appointments: Appointment[];
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  appointments,
  onNewAppointment
}) => {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { ranges } = useSupabaseCustomTimeRanges();

  const availableDays = getAvailableDays(ranges as CustomTimeRanges);
  const currentDay = availableDays.find(day => day.day === selectedDay)!;
  
  const selectedDate = selectedDay === 'friday' 
    ? formatDate(getNextFriday())
    : formatDate(getNextSaturday());

  const availableSlots = currentDay.slots.map(slot => ({
    ...slot,
    available: selectedService ? isSlotAvailable(selectedDate, slot.time, appointments) : false
  }));

  const handleSlotSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleBookingSubmit = () => {
    if (selectedTime && selectedService) {
      setShowBookingForm(true);
    }
  };

  const handleBookingComplete = (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    onNewAppointment(appointment);
    setSelectedService(null);
    setSelectedTime(null);
    setShowBookingForm(false);
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setSelectedTime(null);
  };

  const handleBackToTimeSelection = () => {
    setSelectedTime(null);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-safe">
      {/* Context-aware back buttons */}
      {selectedTime && selectedService && !showBookingForm && (
        <BackButton 
          onClick={handleBackToTimeSelection}
          label="Cambiar horario"
          className="top-24"
        />
      )}
      {selectedService && !selectedTime && (
        <BackButton 
          onClick={handleBackToServices}
          label="Volver"
          className="top-24"
        />
      )}
      
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4 drop-shadow-lg animate-pulse">
            Reserva tu Turno
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-4 sm:mb-6 md:mb-8 px-2 animate-fade-in-up">
            Experimenta el mejor servicio de barbería en un ambiente exclusivo
          </p>
          
          <div className="bg-gray-800 border border-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl max-w-4xl mx-auto animate-slide-up hover:shadow-2xl transition-all duration-500 hover:scale-105">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-full p-2 sm:p-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm sm:text-base">Ubicación</p>
                  <p className="text-xs sm:text-sm text-gray-400">Ricardo Rojas, Tigre</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-full p-2 sm:p-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm sm:text-base">Calidad</p>
                  <p className="text-xs sm:text-sm text-gray-400">5 estrellas</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-full p-2 sm:p-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm sm:text-base">Experiencia</p>
                  <p className="text-xs sm:text-sm text-gray-400">+5 años</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                <div className="bg-green-500/20 border border-green-500/30 rounded-full p-2 sm:p-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm sm:text-base">Higiene</p>
                  <p className="text-xs sm:text-sm text-gray-400">Sanidad</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        {!selectedService && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
              <ServiceSelector
                selectedService={selectedService}
                onServiceSelect={(service) => {
                  setSelectedService(service);
                  setSelectedTime(null);
                }}
              />
            </div>
          </div>
        )}

        {selectedService && (
          <>
        {/* Day Selection */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
            Selecciona el día
          </h3>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            {availableDays.map((day) => (
              <button
                key={day.day}
                onClick={() => {
                  setSelectedDay(day.day);
                  setSelectedTime(null);
                }}
                className={`
                  px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 transform active:scale-95 sm:hover:scale-105 w-full sm:w-auto
                  ${selectedDay === day.day
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 border-2 border-gray-600 hover:border-purple-400 text-gray-200 hover:shadow-md hover:bg-gray-700'
                  }
                `}
              >
                <div className="text-center">
                  <div className="font-bold text-base sm:text-lg">{day.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Date */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 shadow-md">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <span className="font-medium text-white">{selectedDate}</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{selectedService.icon}</span>
              <span className="font-medium text-white text-sm sm:text-base">{selectedService.name}</span>
            </div>
          </div>
        </div>

        {/* Time Slots */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
            Horarios disponibles
          </h3>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
            <TimeSlotGrid
              slots={availableSlots}
              onSlotSelect={handleSlotSelect}
              selectedTime={selectedTime || undefined}
            />
          </div>
        </div>

        {/* Book Button */}
        {selectedTime && (
          <div className="text-center">
            <button
              onClick={handleBookingSubmit}
              className="w-full sm:w-auto px-6 sm:px-8 md:px-12 py-3 sm:py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transform active:scale-95 sm:hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto touch-manipulation"
            >
              <span className="text-center">Reservar {selectedService.name} - {selectedTime}</span>
              <span className="bg-white/20 px-2 py-1 rounded-lg text-xs sm:text-sm">
                ${selectedService.price.toLocaleString()}
              </span>
            </button>
          </div>
        )}
        </>
        )}

        {/* Booking Form Modal */}
        {showBookingForm && selectedTime && selectedService && (
          <BookingForm
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedService={selectedService}
            onBookingComplete={handleBookingComplete}
            onCancel={() => setShowBookingForm(false)}
          />
        )}
      </div>
    </div>
  );
};