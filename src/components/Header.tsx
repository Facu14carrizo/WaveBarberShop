import React from 'react';
import { Scissors, Calendar, User, Instagram } from 'lucide-react';

interface HeaderProps {
  view: 'customer' | 'owner';
  onViewChange: (view: 'customer' | 'owner') => void;
}

export const Header: React.FC<HeaderProps> = ({ view, onViewChange }) => {
  return (
    <header className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 shadow-2xl border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <a
              href="https://www.instagram.com/wave.barber_"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-pink-500/30 hover:border-pink-400/50 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 animate-pulse-slow"
              aria-label="Síguenos en Instagram"
            >
              <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </a>
            <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-purple-500/30 animate-glow">
              <Scissors className="h-6 w-6 sm:h-8 sm:w-8 text-purple-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-lg animate-shimmer">
                💈𝙒𝘼𝙑𝙀💈
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm font-medium animate-fade-in">
                Barbería Premium
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Botón principal de Reservar */}
            <button
              onClick={() => onViewChange('customer')}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                view === 'customer'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-800/50 backdrop-blur-sm text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-700'
              }`}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Reservar</span>
            </button>

            {/* Botón discreto del Dashboard */}
            <div className="group relative">
              <button
                onClick={() => onViewChange('owner')}
                className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                  view === 'owner'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-800/30 hover:bg-gray-700/50 text-gray-500 hover:text-gray-300'
                }`}
                title="Panel de Administración"
              >
                <User className="h-3 w-3" />
              </button>
              
              {/* Tooltip discreto que aparece en hover */}
              <div className="absolute right-0 top-full mt-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Admin
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};