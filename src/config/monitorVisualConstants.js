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
  COCINERO_MIN: 18,
  COCINERO_MAX: 40,
  PESO_DEFAULT: '800',
};

/** Escala tamaños secundarios a partir de tamanioFuenteDetalle */
export const escalaDetalle = (tamanioDetalle, factor = 1) =>
  Math.max(10, Math.round((tamanioDetalle || 20) * factor));

export const clampColumnas = (n) =>
  Math.min(
    MONITOR_LAYOUT.COLUMNAS_MAX,
    Math.max(MONITOR_LAYOUT.COLUMNAS_MIN, Number(n) || MONITOR_LAYOUT.COLUMNAS_DEFAULT)
  );
