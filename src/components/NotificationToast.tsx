import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface NotificationToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
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

  const colors = {
    success: 'from-green-600 to-emerald-600 border-green-500/30',
    error: 'from-red-600 to-rose-600 border-red-500/30',
    warning: 'from-yellow-600 to-orange-600 border-yellow-500/30',
    info: 'from-blue-600 to-cyan-600 border-blue-500/30'
  };

  const Icon = icons[type];

  return (
    <div className={`
      bg-gradient-to-r ${colors[type]} border backdrop-blur-sm
      rounded-2xl p-4 shadow-2xl transform transition-all duration-300
      animate-in slide-in-from-right-full
    `}>
      <div className="flex items-start space-x-3">
        <Icon className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm">{title}</h4>
          <p className="text-white/90 text-sm mt-1">{message}</p>
        </div>
        <button
          onClick={() => onClose(id)}
          className="text-white/70 hover:text-white transition-colors duration-200 flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};