import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Muteado por defecto
  const [showControls, setShowControls] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Configurar audio para iOS
    audio.volume = 0.3; // Volumen moderado (30%)
    audio.loop = true; // Repetir automáticamente
    audio.preload = 'auto'; // Precargar el audio
    audio.muted = true; // Muteado por defecto
    
    // Sincronizar el estado inicial
    setIsMuted(audio.muted);

    // Función para intentar reproducir
    const attemptPlay = async () => {
      try {
        // Mantener el estado muteado (no desmutear automáticamente)
        audio.volume = 0.3;
        // No cambiar audio.muted aquí, mantener el estado actual (muteado por defecto)
        
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

    // Detectar si es iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Para iOS, ser más agresivo con los intentos
    const tryAutoplay = async () => {
      if (isIOS) {
        // En iOS, intentar múltiples veces con diferentes estrategias
        for (let i = 0; i < 5; i++) {
          if (await attemptPlay()) return;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Para otros dispositivos, intentos más espaciados
        if (await attemptPlay()) return;
        setTimeout(async () => {
          if (await attemptPlay()) return;
          setTimeout(attemptPlay, 2000);
        }, 1000);
      }
    };

    // Iniciar intentos
    tryAutoplay();

    // Eventos para desbloquear audio con interacción del usuario
    const unlockAudio = async () => {
      if (audio.paused && autoplayBlocked) {
        await attemptPlay();
      }
    };

    // Agregar listeners más amplios para iOS
    const events = isIOS 
      ? ['click', 'touchstart', 'touchend', 'keydown', 'scroll', 'mousemove', 'mouseup', 'focus']
      : ['click', 'touchstart', 'keydown', 'scroll'];
    
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
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
    const handleVolumeChange = () => {
      // Sincronizar el estado de mute con el audio real
      setIsMuted(audio.muted);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
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

    // Obtener el estado actual del audio
    const currentlyMuted = audio.muted;
    
    if (currentlyMuted) {
      // Desilenciar
      audio.muted = false;
      audio.volume = 0.3;
      setIsMuted(false);
    } else {
      // Silenciar
      audio.muted = true;
      setIsMuted(true);
    }
  };

  const startMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      // Mantener el estado muteado (no desmutear automáticamente)
      audio.volume = 0.3;
      // No cambiar audio.muted aquí, mantener el estado actual (muteado por defecto)
      
      await audio.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error('Error al reproducir música:', error);
      // En caso de error, intentar una vez más después de un breve delay
      setTimeout(async () => {
        try {
          // Mantener el estado muteado
          audio.volume = 0.3;
          // No cambiar audio.muted aquí
          await audio.play();
          setIsPlaying(true);
          setAutoplayBlocked(false);
        } catch (retryError) {
          console.error('Error en reintento:', retryError);
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Elemento de audio oculto */}
      <audio
        ref={audioRef}
        src="/Smile.mp3"
        preload="auto"
        muted={true}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={() => {
          if (audioRef.current) {
            setIsMuted(audioRef.current.muted);
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
