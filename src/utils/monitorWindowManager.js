/**
 * monitorWindowManager - Utilidad para abrir ventanas de monitor en TVs.
 *
 * Cada ventana se abre con `window.open` usando parámetros de posición/tamaño
 * definidos en la config de `PantallaCocina`. La URL incluye `modo=fijo` para
 * que la ventana entre en modo monitor (sin menú ni logout).
 *
 * Limitaciones del navegador: el popup blocker puede requerir interacción
 * del usuario para abrir múltiples ventanas. La consola debe ser iniciada
 * con un click del usuario.
 */

export const abrirMonitorPantalla = (pantalla) => {
  if (!pantalla) return null;

  const numero = pantalla.numeroPantalla;
  const vistaId = pantalla.vistaCocinaId?._id || pantalla.vistaCocinaId || '';
  const url = `${window.location.origin}/?monitor=${numero}&vistaId=${vistaId}&modo=fijo`;

  const cfg = pantalla.configDespliegue || {};
  const features = [
    `left=${cfg.posicionX || 0}`,
    `top=${cfg.posicionY || 0}`,
    `width=${cfg.anchoVentana || 1920}`,
    `height=${cfg.altoVentana || 1080}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
  ].join(',');

  const win = window.open(url, `cocina-monitor-${numero}`, features);
  if (win && cfg.pantallaCompleta) {
    // Intentar pantalla completa de forma diferida
    setTimeout(() => {
      try {
        if (win.document.documentElement.requestFullscreen) {
          win.document.documentElement.requestFullscreen();
        }
      } catch (err) {
        // Ignorar - el navegador puede bloquear requestFullscreen
      }
    }, 500);
  }
  return win;
};

export const cerrarVentanaMonitor = (numero) => {
  const name = `cocina-monitor-${numero}`;
  // No podemos cerrar por nombre; el caller debe guardar referencias
  console.log('[monitorWindowManager] Solicitud cerrar ventana', name);
};

export const featuresTemplate = (numero, positionX = 0, positionY = 0) => {
  return `left=${positionX},top=${positionY},width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,scrollbars=no`;
};

export default {
  abrirMonitorPantalla,
  cerrarVentanaMonitor,
  featuresTemplate,
};