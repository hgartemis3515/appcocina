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

function limpiarZoomCss() {
  try {
    const r = document.documentElement;
    r.style.zoom = '';
    r.style.transform = '';
    r.style.width = '';
    r.style.height = '';
    if (document.body) document.body.style.zoom = '';
  } catch { /* noop */ }
}

/** Fallback si el Hub/CDP no está: escala visual (no cambia innerWidth). */
function aplicarZoomCss(percent) {
  const z = clampZoom(percent);
  try {
    document.documentElement.style.zoom = String(z / 100);
  } catch { /* noop */ }
  return z;
}

/**
 * Zoom de página que controla el Monitor Hub.
 * Con Hub activo el zoom lo aplica Chrome (CDP = Ctrl +/-).
 * Sin Hub, usa ?hubZoom= como CSS zoom de respaldo.
 */
export function useHubChromeZoom() {
  useEffect(() => {
    aplicarZoomCss(zoomDesdeUrl());
    const numero = numeroMonitorDesdeUrl();
    if (!numero) return undefined;
    let stop = false;
    let hubActivo = false;
    const tick = async () => {
      try {
        const r = await fetch(`${HUB_ZOOM_URL}/zoom/${numero}`, { cache: 'no-store' });
        if (!r.ok || stop) return;
        const d = await r.json();
        if (d?.zoom == null) return;
        hubActivo = true;
        limpiarZoomCss();
      } catch {
        if (!hubActivo && !stop) aplicarZoomCss(zoomDesdeUrl());
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
