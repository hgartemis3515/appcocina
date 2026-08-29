/**
 * Nombre del mozo en el header de tarjetas KDS (Vista y alerta).
 */

import { ORDEN_COLA_FUENTES, hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const MOZO_NOMBRE_DEFAULT = {
  mozoNombreFuente: 'arial',
  mozoNombreTamano: 12,
  mozoNombreColor: '#ffffff',
  mozoNombreFondo: '#1e3a8a',
};

export const MOZO_NOMBRE_TAMANO_MIN = 8;
export const MOZO_NOMBRE_TAMANO_MAX = 24;

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function estiloMozoNombreKds(config = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.mozoNombreFuente)
    || ORDEN_COLA_FUENTES.find((f) => f.id === MOZO_NOMBRE_DEFAULT.mozoNombreFuente)
    || ORDEN_COLA_FUENTES[0];
  const tam = clampInt(
    config.mozoNombreTamano,
    MOZO_NOMBRE_TAMANO_MIN,
    MOZO_NOMBRE_TAMANO_MAX,
    MOZO_NOMBRE_DEFAULT.mozoNombreTamano
  );
  const color = hexValidoOrdenCola(config.mozoNombreColor)
    ? config.mozoNombreColor
    : MOZO_NOMBRE_DEFAULT.mozoNombreColor;
  const fondo = hexValidoOrdenCola(config.mozoNombreFondo)
    ? config.mozoNombreFondo
    : MOZO_NOMBRE_DEFAULT.mozoNombreFondo;
  const padX = Math.max(6, Math.round(tam * 0.4));
  const padY = Math.max(2, Math.round(tam * 0.15));
  return {
    color,
    backgroundColor: fondo,
    fontSize: `${tam}px`,
    fontFamily: fuente.css,
    fontWeight: 600,
    lineHeight: 1.2,
    display: 'inline-flex',
    alignItems: 'center',
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    paddingTop: `${padY}px`,
    paddingBottom: `${padY}px`,
    borderRadius: '6px',
    boxSizing: 'border-box',
  };
}
