import React from 'react';

export const DeveloperCredits: React.FC = () => {
  return (
    <footer className="mt-4 border-t border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-2 text-center">
        <p className="text-sm sm:text-base text-gray-300">
          Desarrollado por{' '}
          <a
            href="https://waveframe.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-500/60 hover:decoration-purple-300 transition-colors duration-200"
          >
            Waveframe Studio
          </a>
        </p>
      </div>
    </footer>
  );
};
