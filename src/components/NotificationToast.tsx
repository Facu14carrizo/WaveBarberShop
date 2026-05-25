import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface NotificationToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string | React.ReactNode;
  onClose: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  type,
  title,
  message,
  onClose
}) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const borderColors = {
    success: 'border-t-green-500',
    error: 'border-t-red-500',
    warning: 'border-t-amber-500',
    info: 'border-t-purple-500'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-purple-400'
  };

  const btnColors = {
    success: 'bg-green-600 hover:bg-green-750 text-white shadow-lg shadow-green-950/50',
    error: 'bg-red-600 hover:bg-red-750 text-white shadow-lg shadow-red-950/50',
    warning: 'bg-amber-600 hover:bg-amber-750 text-white shadow-lg shadow-amber-950/50',
    info: 'bg-purple-600 hover:bg-purple-750 text-white shadow-lg shadow-purple-950/50'
  };

  const Icon = icons[type];

  return (
    <div className={`
      bg-gray-950/98 border border-gray-800 border-t-4 ${borderColors[type]} backdrop-blur-md
      rounded-md p-6 sm:p-8 shadow-2xl w-full max-w-[320px] mx-auto text-center relative
      animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center justify-center
    `}>
      <button
        onClick={() => onClose(id)}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors duration-200 p-1 hover:bg-white/5 rounded-md"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center w-full">
        <div className="p-3 rounded-full bg-gray-900 border border-gray-800/80 mb-4 inline-flex">
          <Icon className={`h-10 w-10 ${iconColors[type]}`} />
        </div>
        
        <h4 className="font-extrabold text-white text-lg tracking-wide mb-2.5">
          {title}
        </h4>
        
        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          {message}
        </p>
        
        <button
          onClick={() => onClose(id)}
          className={`w-full py-2.5 px-4 rounded-md font-bold text-sm tracking-wider transition-all duration-200 ${btnColors[type]}`}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
};