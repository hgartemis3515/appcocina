/**
 * monitorWindowManager - Utilidad para abrir ventanas de monitor en TVs.
 *
 * Usa la API Window Management (window.getScreenDetails) cuando está disponible
 * para posicionar ventanas en monitores específicos del escritorio extendido.
 * Fallback a win.moveTo() si la API no está disponible o el usuario no da permiso.
 *
 * Flujos soportados:
 *  - Personalizado (legacy): `modo=fijo` + `vistaId` -> Ver Cocina Personalizado.
 *  - Distribuir Cocina en monitores: `modo=completo-fijo` + `cocineroId`.
 */

const VENTANA_PREFIX = 'cocina-monitor-';

// Cache de screenDetails (se pide permiso una vez por sesión)
let cachedScreenDetails = null;
let screenDetailsPromise = null;

/**
 * Pide permiso de Window Management y devuelve los monitores disponibles.
 * Ordenados de izquierda a derecha (por left ascendente).
 * @returns {Promise<Array<{left,top,width,height,isPrimary,id}>|null>}
 */
export const obtenerMonitores = async () => {
  if (cachedScreenDetails) return cachedScreenDetails;
  if (screenDetailsPromise) return screenDetailsPromise;

  if (typeof window === 'undefined' || typeof window.getScreenDetails !== 'function') {
    return null; // API no disponible
  }

  screenDetailsPromise = window.getScreenDetails().then((details) => {
    const screens = (details.screens || []).slice().sort((a, b) => a.left - b.left);
    cachedScreenDetails = screens;
    return screens;
  }).catch((err) => {
    console.warn('[monitorWindowManager] getScreenDetails falló:', err.message);
    return null;
  }).finally(() => {
    screenDetailsPromise = null;
  });

  return screenDetailsPromise;
};

/**
 * Indica si la API Window Management está disponible.
 */
export const soportaMultiMonitor = () => {
  return typeof window !== 'undefined' && typeof window.getScreenDetails === 'function';
};

/**
 * Mapea un numero de pantalla (1..N) a un monitor físico.
 * Monitor 1 = primario, 2 = segundo de izquierda a derecha, etc.
 * @returns {Promise<{left,top,width,height}|null>}
 */
const obtenerMonitorParaNumero = async (numero) => {
  const monitores = await obtenerMonitores();
  if (!monitores || monitores.length === 0) return null;
  // Monitor 1 = primario o el primero; N = (N-1) en el array ordenado
  const idx = Math.max(0, Math.min(numero - 1, monitores.length - 1));
  return monitores[idx];
};

/**
 * Calcula posicionX/Y/ancho/alto para una pantalla.
 * Si posicionX es 0 y el monitor es > 1, auto-calcula asumiendo
 * monitores del mismo ancho en fila horizontal.
 */
const calcularPosicion = (cfg = {}, numero = 1) => {
  const anchoBase = cfg.anchoVentana || 1920;
  const altoBase = cfg.altoVentana || 1080;
  let posX = cfg.posicionX || 0;
  let posY = cfg.posicionY || 0;
  if (numero > 1 && posX === 0) {
    try {
      const screenAncho = (typeof screen !== 'undefined' && screen.width) ? screen.width : anchoBase;
      posX = screenAncho * (numero - 1);
    } catch { /* noop */ }
  }
  return { posX, posY, ancho: anchoBase, alto: altoBase };
};

/**
 * Construye las features de window.open.
 */
const construirFeatures = (pos) => [
  `left=${pos.posX}`,
  `top=${pos.posY}`,
  `width=${pos.ancho}`,
  `height=${pos.alto}`,
  'menubar=no',
  'toolbar=no',
  'location=no',
  'status=no',
  'scrollbars=no',
].join(',');

/**
 * Después de abrir la ventana, la mueve y redimensiona al monitor correcto.
 * Reintenta varias veces porque la ventana puede no estar lista inmediatamente.
 * También intenta fullscreen automático (puede fallar si Chrome no lo considera
 * gesto del usuario; en ese caso el overlay de click en la vista es el fallback).
 */
const posicionarVentana = (win, pos) => {
  if (!win) return;
  let intentos = 0;
  const maxIntentos = 10;
  const intervalo = 200;
  const intentar = () => {
    intentos++;
    try {
      win.moveTo(pos.posX, pos.posY);
      win.resizeTo(pos.ancho, pos.alto);
      // Intentar fullscreen automatico (puede funcionar si el gesture del
      // click del boton "Abrir" aun esta activo en Chrome).
      try {
        const doc = win.document;
        if (doc && doc.documentElement && doc.documentElement.requestFullscreen) {
          doc.documentElement.requestFullscreen().catch(() => { /* sin gesto */ });
        }
      } catch (e) { /* cross-origin o no listo */ }
      if (typeof win.screenX === 'number' && Math.abs(win.screenX - pos.posX) < 50) {
        return;
      }
    } catch (err) { /* ventana aún no lista */ }
    if (intentos < maxIntentos) {
      setTimeout(intentar, intervalo);
    }
  };
  intentar();
};

/**
 * Abre (o reutiliza) una ventana de monitor en modo Personalizado (vistaId).
 * Legacy - TVs por estación.
 */
export const abrirMonitorPantalla = (pantalla) => {
  if (!pantalla) return null;
  const numero = pantalla.numeroPantalla;
  const vistaId = pantalla.vistaCocinaId?._id || pantalla.vistaCocinaId || '';
  const url = `${window.location.origin}/?monitor=${numero}&vistaId=${vistaId}&modo=fijo`;
  const pos = calcularPosicion(pantalla.configDespliegue, numero);
  const features = construirFeatures(pos);
  const win = window.open(url, `${VENTANA_PREFIX}${numero}`, features);
  posicionarVentana(win, pos);
  return win;
};

/**
 * Abre (o reutiliza) una ventana de monitor en modo "Distribuir Cocina en monitores".
 * Usa Window Management API si está disponible para posicionar en el monitor físico correcto.
 *
 * @param {Object} pantalla - documento PantallaCocina
 * @param {Object} opts - { cocineroIdOverride } opcional
 * @returns {Promise<Window|null>} referencia a la ventana abierta/reutilizada
 */
export const abrirMonitorCocinero = async (pantalla, opts = {}) => {
  if (!pantalla) return null;
  const numero = pantalla.numeroPantalla;
  const cocineroId = opts.cocineroIdOverride
    || pantalla.cocineroId?._id
    || pantalla.cocineroId
    || '';
  // Flujo "Distribuir Cocina en monitores":
  //  - perfilId=<id> aplica un perfil de personalización con nombre guardado.
  //  - perfil=auto aplica el perfil personal del cocinero (legacy).
  let perfilParam = '';
  if (opts.perfilId) {
    perfilParam = `&perfilId=${encodeURIComponent(opts.perfilId)}`;
  } else if (opts.aplicarPerfil) {
    perfilParam = '&perfil=auto';
  }
  const url = `${window.location.origin}/?monitor=${numero}&cocineroId=${cocineroId}&modo=completo-fijo${perfilParam}`;

  // Intentar usar Window Management API para obtener coords exactas del monitor
  let pos;
  const monitor = await obtenerMonitorParaNumero(numero);
  if (monitor) {
    // Usar coords reales del monitor físico (pantalla completa)
    pos = {
      posX: monitor.left,
      posY: monitor.top,
      ancho: monitor.width,
      alto: monitor.height,
    };
  } else {
    // Fallback: auto-calculo con screen.width
    pos = calcularPosicion(pantalla.configDespliegue, numero);
  }

  const features = construirFeatures(pos);
  const targetName = `${VENTANA_PREFIX}${numero}`;
  const win = window.open(url, targetName, features);
  posicionarVentana(win, pos);
  return win;
};

/**
 * Reutiliza una ventana ya abierta cambiando solo la URL (sin popup nuevo).
 */
export const redirigirVentanaMonitor = (win, pantalla, cocineroId = '', opts = {}) => {
  if (!win || win.closed) return false;
  const numero = pantalla?.numeroPantalla ?? '';
  let perfilParam = '';
  if (opts.perfilId) {
    perfilParam = `&perfilId=${encodeURIComponent(opts.perfilId)}`;
  } else if (opts.aplicarPerfil) {
    perfilParam = '&perfil=auto';
  }
  const url = `${window.location.origin}/?monitor=${numero}&cocineroId=${cocineroId}&modo=completo-fijo${perfilParam}`;
  try {
    win.location.href = url;
    const pos = calcularPosicion(pantalla?.configDespliegue, numero);
    posicionarVentana(win, pos);
    return true;
  } catch (err) {
    return false;
  }
};

export const cerrarVentanaMonitor = (win) => {
  if (!win) return;
  try { if (!win.closed) win.close(); } catch (err) { /* noop */ }
};

export const featuresTemplate = (numero, positionX = 0, positionY = 0) => {
  return `left=${positionX},top=${positionY},width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,scrollbars=no`;
};

export default {
  abrirMonitorPantalla,
  abrirMonitorCocinero,
  redirigirVentanaMonitor,
  cerrarVentanaMonitor,
  featuresTemplate,
  obtenerMonitores,
  soportaMultiMonitor,
};
