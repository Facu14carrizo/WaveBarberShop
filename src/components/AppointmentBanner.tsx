import React from 'react';
import { Calendar, Clock, RefreshCw } from 'lucide-react';
import { Appointment } from '../types';

interface AppointmentBannerProps {
    appointment: Appointment;
    onCancel: () => void;
}

export const AppointmentBanner: React.FC<AppointmentBannerProps> = ({ appointment, onCancel }) => {
    return (
        <div className="bg-gradient-to-r from-purple-900/95 to-blue-900/95 border-b border-purple-500/30 backdrop-blur-md shadow-lg sticky top-0 z-50 animate-slide-down">
            <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/10 p-1.5 rounded-full animate-pulse-slow">
                                <Calendar className="w-4 h-4 text-purple-300" />
                            </div>
                            <span className="text-sm font-medium text-purple-100">
                                Tu turno:
                            </span>
                        </div>

                        <button
                            onClick={onCancel}
                            className="sm:hidden flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium transition-colors border border-white/10"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Cambiar
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-sm font-semibold">
                        <div className="flex items-center gap-1.5">
                            <span className="text-2xl pt-1 pr-1">{appointment.service.icon}</span>
                            <span>{appointment.service.name}</span>
                        </div>

                        <div className="h-4 w-px bg-white/20 hidden sm:block" />

                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-300" />
                            <span>{appointment.date}</span>
                        </div>

                        <div className="h-4 w-px bg-white/20 hidden sm:block" />

                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-cyan-300" />
                            <span>{appointment.time} hs</span>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4">
                        <div className="text-xs text-blue-200/80 italic whitespace-nowrap">
                            ¡Te espero rey!
                        </div>
                        <button
                            onClick={onCancel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all hover:scale-105 border border-white/10 shadow-sm"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Cambiar turno
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
