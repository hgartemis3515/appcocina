import { useCallback, useEffect, useState } from 'react';

function elementoFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

/**
 * Toggle Fullscreen API (incluye webkit para iPad / Safari).
 */
export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!elementoFullscreen());

  useEffect(() => {
    const sync = () => setIsFullscreen(!!elementoFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (elementoFullscreen()) {
      const salir = document.exitFullscreen || document.webkitExitFullscreen;
      if (typeof salir === 'function') salir.call(document);
      return;
    }
    const el = document.documentElement;
    const entrar = el.requestFullscreen || el.webkitRequestFullscreen;
    if (typeof entrar === 'function') {
      Promise.resolve(entrar.call(el)).catch(() => {});
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}
