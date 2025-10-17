import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Solo configurar si no está ya configurado
    if (audio.volume === 1) {
      audio.volume = 0.3; // Volumen moderado (30%)
    }
    if (!audio.loop) {
      audio.loop = true; // Repetir automáticamente
    }

    // Solo intentar reproducir si no está ya reproduciéndose
    if (audio.paused) {
      const playAudio = async () => {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          // Si falla el autoplay (políticas del navegador), no hacer nada
          console.log('Autoplay bloqueado por el navegador');
        }
      };

      // Pequeño delay para asegurar que la página esté completamente cargada
      const timer = setTimeout(playAudio, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, []);

  // Efecto adicional para manejar el estado de reproducción
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      // Cuando termine la canción, reiniciar automáticamente (por el loop)
      setIsPlaying(true);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = 0.3;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <>
      {/* Elemento de audio oculto */}
      <audio
        ref={audioRef}
        src="/Smile.mp3"
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={() => {
          if (audioRef.current) {
            setIsMuted(audioRef.current.volume === 0);
          }
        }}
      />

      {/* Controles de música flotantes */}
      <div className="fixed bottom-4 right-4 z-40">
        {/* Botón principal para mostrar/ocultar controles */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-full p-3 hover:bg-gray-700/80 transition-all duration-200 shadow-lg"
          title="Controles de música"
        >
          <Music className="h-5 w-5 text-white" />
        </button>

        {/* Panel de controles */}
        {showControls && (
          <div className="absolute bottom-16 right-0 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-xl p-3 shadow-xl">
            <div className="flex items-center space-x-3">
              {/* Botón mute/unmute */}
              <button
                onClick={toggleMute}
                className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 transition-colors duration-200"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-green-400" />
                )}
              </button>

              {/* Indicador de estado */}
              <div className="text-xs text-gray-300">
                {isMuted ? '♪ Silenciado' : '♪ Reproduciendo'}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
