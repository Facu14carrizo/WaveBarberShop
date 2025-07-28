import React from 'react';
import { Clock } from 'lucide-react';
import { TimeSlot } from '../types';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  onSlotSelect: (time: string) => void;
  selectedTime?: string;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  onSlotSelect,
  selectedTime
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
      {slots.map((slot) => (
        <button
          key={slot.time}
          onClick={() => slot.available && onSlotSelect(slot.time)}
          disabled={!slot.available}
          className={`
            group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-95 sm:hover:scale-105 min-h-[60px] sm:min-h-[70px]
            ${slot.available
              ? selectedTime === slot.time
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-gray-800 border-2 border-gray-600 hover:border-purple-400 hover:shadow-md text-gray-200 hover:bg-gray-700'
              : 'bg-gray-900 border-2 border-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
            <Clock className={`h-4 w-4 ${
              selectedTime === slot.time ? 'text-white' : 
              slot.available ? 'text-purple-600' : 'text-gray-400'
            }`} />
            <span className="font-medium text-sm sm:text-base">{slot.time}</span>
          </div>
          
          {!slot.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 bg-opacity-80 rounded-xl sm:rounded-2xl border border-red-500/30">
              <span className="text-xs font-medium text-red-400">Ocupado</span>
            </div>
          )}
          
          {slot.available && (
            <div className={`absolute inset-x-0 bottom-1 h-1 rounded-full transition-all duration-300 ${
              selectedTime === slot.time ? 'bg-white/50' : 'bg-transparent group-hover:bg-purple-400'
            }`} />
          )}
        </button>
      ))}
    </div>
  );
};