import React from 'react';
import { Scissors } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Cargando...' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <Scissors className="h-full w-full text-purple-500" />
        </div>
        <div className="absolute inset-0 animate-ping">
          <Scissors className={`${sizeClasses[size]} text-purple-300 opacity-20`} />
        </div>
      </div>
      {text && (
        <p className="text-gray-400 text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};