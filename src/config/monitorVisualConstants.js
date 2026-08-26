/**
 * Constantes de personalización visual del monitor Ver Cocina.
 */
export const MONITOR_LAYOUT = {
  COLUMNAS_MIN: 1,
  COLUMNAS_MAX: 10,
  COLUMNAS_DEFAULT: 1,
};

export const MONITOR_TIPOGRAFIA = {
  PLATO_MIN: 14,
  PLATO_MAX: 96,
  DETALLE_MIN: 10,
  DETALLE_MAX: 48,
  CRONO_MIN: 12,
  CRONO_MAX: 80,
  CRONO_CABECERA_MIN: 12,
  CRONO_CABECERA_MAX: 80,
  COCINERO_MIN: 18,
  COCINERO_MAX: 40,
  PESO_DEFAULT: '800',
};

/** Escala tamaños secundarios a partir de tamanioFuenteDetalle */
export const escalaDetalle = (tamanioDetalle, factor = 1) =>
  Math.max(10, Math.round((tamanioDetalle || 20) * factor));

export function colorNombrePlatoMonitor(configVisual = {}) {
  return configVisual.colorTextoPlato || configVisual.colorTextoPrincipal || '#ffffff';
}

export function colorDetallePlatoMonitor(configVisual = {}) {
  return configVisual.colorTextoDetalle || configVisual.colorTextoSecundario || '#9ca3af';
}

/** Guarniciones en la tarjeta del plato: siempre wrap, nunca "Arr…". */
export function estiloDetalleGuarnicionPlato(fontSizePx, color) {
  return {
    fontSize: `${fontSizePx}px`,
    color,
    whiteSpace: 'normal',
    overflow: 'visible',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    fontWeight: 500,
    lineHeight: 1.25,
  };
}

export const clampColumnas = (n) =>
  Math.min(
    MONITOR_LAYOUT.COLUMNAS_MAX,
    Math.max(MONITOR_LAYOUT.COLUMNAS_MIN, Number(n) || MONITOR_LAYOUT.COLUMNAS_DEFAULT)
  );

/** Ancho mínimo de una columna de tarjetas (kiosk vertical / split). */
export const MIN_ANCHO_COLUMNA_TARJETA = 280;

/**
 * Tope físico opcional (p. ej. previews). El layout Ver Cocina usa `clampColumnas`
 * para respetar la elección del operador; el grid CSS encoge las tarjetas.
 */
export function columnasQueCaben(anchoDisponible, columnasDeseadas, minAncho = MIN_ANCHO_COLUMNA_TARJETA) {
  const maxFit = Math.max(1, Math.floor(Math.max(0, Number(anchoDisponible) || 0) / minAncho));
  return Math.min(clampColumnas(columnasDeseadas), maxFit);
}

/**
 * Catálogo de animaciones de alerta para tarjetas del monitor Ver Cocina.
 * `value` es el nombre de la keyframe CSS. `duracion` se usa en la propiedad `animation`.
 */
export const ANIMACIONES_ALERTA = [
  { value: 'urgentePulse', label: 'Urgente Pulse (latido rápido)', duracion: '1s' },
  { value: 'alertaShake', label: 'Alerta Shake (vibración lateral)', duracion: '0.6s' },
  { value: 'flashBorde', label: 'Flash Borde (parpadea el borde)', duracion: '0.9s' },
  { value: 'sacudidaFuerte', label: 'Sacudida Fuerte (crítico)', duracion: '0.7s' },
  { value: 'latidoUrgente', label: 'Latido Urgente (corazón)', duracion: '0.9s' },
  { value: 'parpadeoAlerta', label: 'Parpadeo Alerta (fade)', duracion: '0.7s' },
  { value: 'reboteAlerta', label: 'Rebote Alerta (salto vertical)', duracion: '0.8s' },
  { value: 'resplandorUrgente', label: 'Resplandor Urgente (glow)', duracion: '1.6s' },
  { value: 'sirenaAlerta', label: 'Sirena Alerta (rojo/ámbar radial)', duracion: '1.2s' },
  { value: 'rayoUrgente', label: 'Rayo Urgente (⚡ cruzan)', duracion: '1.4s' },
  { value: 'explosionFuego', label: 'Explosión Fuego (🔥)', duracion: '1.6s' },
  { value: 'ondaChoque', label: 'Onda de Choque (⚠️)', duracion: '1.2s' },
  { value: 'tormentaAlerta', label: 'Tormenta Alerta (rayos)', duracion: '1.5s' },
  { value: 'pulsoRadioactivo', label: 'Pulso Radioactivo (☢️)', duracion: '1.3s' },
  { value: 'alarmaGiratoria', label: 'Alarma Giratoria (⚠️ rota)', duracion: '2.4s' },
  { value: 'fuegoCruzado', label: 'Fuego Cruzado (🔥/⚠️)', duracion: '1.4s' },
  { value: 'semaforoUrgente', label: 'Semáforo Urgente (rojo)', duracion: '1s' },
  { value: 'barreraPeligro', label: 'Barrera Peligro (franjas)', duracion: '1s' },
  { value: 'meteoritoAlerta', label: 'Meteorito Alerta (💥)', duracion: '1.8s' },
  { value: 'nucleoSobrecarga', label: 'Núcleo Sobrecarga (pulso fuerte)', duracion: '1.2s' },
  { value: 'pulsoNeon', label: 'Pulso Neón (borde neón)', duracion: '1.4s' },
  { value: 'glitchAlerta', label: 'Glitch Alerta (temblor digital)', duracion: '0.5s' },
];

export const DURACION_ANIMACION = (nombre) =>
  ANIMACIONES_ALERTA.find(a => a.value === nombre)?.duracion || '1s';
