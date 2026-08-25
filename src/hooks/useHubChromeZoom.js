import { useEffect } from 'react';
import { numeroMonitorDesdeUrl } from '../utils/monitorDesignSync';

const HUB_ZOOM_URL = 'http://127.0.0.1:7331';

function clampZoom(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 100;
  return Math.min(200, Math.max(50, Math.round(v)));
}

function zoomDesdeUrl() {
  try {
    return clampZoom(new URLSearchParams(window.location.search).get('hubZoom') || 100);
  } catch {
    return 100;
  }
}

function aplicarZoom(percent) {
  const z = clampZoom(percent);
  try {
    document.documentElement.style.zoom = String(z / 100);
  } catch { /* noop */ }
  return z;
}

/**
 * Zoom de página que controla el Monitor Hub (slider en vivo).
 * Lee ?hubZoom= y consulta http://127.0.0.1:7331/zoom/:monitor.
 */
export function useHubChromeZoom() {
  useEffect(() => {
    aplicarZoom(zoomDesdeUrl());
    const numero = numeroMonitorDesdeUrl();
    if (!numero) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`${HUB_ZOOM_URL}/zoom/${numero}`, { cache: 'no-store' });
        if (!r.ok || stop) return;
        const d = await r.json();
        if (d?.zoom != null) aplicarZoom(d.zoom);
      } catch {
        /* Hub no está en esta PC */
      }
    };
    const id = setInterval(tick, 800);
    void tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);
}

export default useHubChromeZoom;
