import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Configurar audio
    audio.volume = 0.3; // Volumen moderado (30%)
    audio.loop = true; // Repetir automáticamente

    // Función para intentar reproducir
    const attemptPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        setAutoplayBlocked(false);
        return true;
      } catch (error) {
        console.log('Autoplay bloqueado:', error);
        setAutoplayBlocked(true);
        return false;
      }
    };

    // Múltiples intentos de autoplay
    const tryAutoplay = async () => {
      // Intento inmediato
      if (await attemptPlay()) return;

      // Intento después de 1 segundo
      setTimeout(async () => {
        if (await attemptPlay()) return;

        // Intento después de 3 segundos
        setTimeout(async () => {
          if (await attemptPlay()) return;

          // Intento después de 5 segundos
          setTimeout(attemptPlay, 2000);
        }, 2000);
      }, 1000);
    };

    // Iniciar intentos
    tryAutoplay();

    // Eventos para desbloquear audio con interacción del usuario
    const unlockAudio = async () => {
      if (audio.paused && autoplayBlocked) {
        await attemptPlay();
      }
    };

    // Agregar listeners para eventos de usuario
    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, [autoplayBlocked]);

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

  // Efecto para intentar reproducir en cualquier interacción del usuario
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isPlaying) return;

    const handleUserInteraction = async () => {
      if (audio.paused && autoplayBlocked) {
        try {
          await audio.play();
          setIsPlaying(true);
          setAutoplayBlocked(false);
        } catch (error) {
          console.log('Aún bloqueado después de interacción');
        }
      }
    };

    // Agregar listeners más amplios
    const events = ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup', 'scroll', 'wheel'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [isPlaying, autoplayBlocked]);

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

  const startMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error('Error al reproducir música:', error);
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
        {/* Botón principal para mostrar/ocultar controles o iniciar música */}
        <button
          onClick={autoplayBlocked ? startMusic : () => setShowControls(!showControls)}
          className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-full p-3 hover:bg-gray-700/80 transition-all duration-200 shadow-lg"
          title={autoplayBlocked ? "Iniciar música" : "Controles de música"}
        >
          <Music className="h-5 w-5 text-white" />
        </button>

        {/* Panel de controles */}
        {showControls && !autoplayBlocked && (
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
