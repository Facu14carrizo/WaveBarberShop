import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  label = "Volver", 
  className = "" 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed top-20 left-4 z-40 flex items-center space-x-2 px-4 py-2.5 
        bg-gray-800/90 backdrop-blur-sm border border-gray-600 
        text-gray-300 hover:text-white hover:bg-gray-700/90 
        rounded-xl transition-all duration-200 shadow-lg
        hover:shadow-xl hover:scale-105 active:scale-95
        ${className}
      `}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};