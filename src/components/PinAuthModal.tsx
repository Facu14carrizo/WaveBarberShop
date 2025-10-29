import React, { useState, useRef, useEffect } from 'react';
import { Lock, X, Shield } from 'lucide-react';

interface PinAuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  pin?: string;
  title?: string;
  subtitle?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({ 
  onSuccess, 
  onCancel, 
  pin = '7294',
  title = 'Acceso al Dashboard',
  subtitle = 'Ingresa el PIN de 4 dígitos para continuar'
}) => {
  const [enteredPinDigits, setEnteredPinDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const correctPin = pin;

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newPin = [...enteredPinDigits];
    newPin[index] = value;
    setEnteredPinDigits(newPin);
    setError(false);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if PIN is complete
    if (newPin.every(digit => digit !== '') && newPin.join('') === correctPin) {
      onSuccess();
    } else if (newPin.every(digit => digit !== '')) {
      // Wrong PIN
      setError(true);
      setIsShaking(true);
      setTimeout(() => {
        setEnteredPinDigits(['', '', '', '']);
        setIsShaking(false);
        inputRefs.current[0]?.focus();
      }, 500);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !enteredPinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    if (!/^\d+$/.test(pastedData)) return;

    const newPin = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
    setEnteredPinDigits(newPin);
    
    if (newPin.join('') === correctPin) {
      onSuccess();
    } else if (newPin.every(digit => digit !== '')) {
      setError(true);
      setIsShaking(true);
      setTimeout(() => {
        setEnteredPinDigits(['', '', '', '']);
        setIsShaking(false);
        inputRefs.current[0]?.focus();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all duration-300 ${
        isShaking ? 'animate-pulse' : ''
      }`}>
        <div className="text-center mb-8">
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-10 w-10 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-400">
            {subtitle}
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center space-x-3">
            {enteredPinDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-14 h-14 text-center text-2xl font-bold bg-gray-800 border-2 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                  error ? 'border-red-500 bg-red-900/20' : 'border-gray-600'
                }`}
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <div className="text-center">
              <p className="text-red-400 text-sm font-medium">
                PIN incorrecto. Inténtalo de nuevo.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Acceso seguro</span>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};