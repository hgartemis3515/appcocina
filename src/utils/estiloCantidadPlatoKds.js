/**
 * Contador de cantidad en tarjetas KDS (el "1" delante del nombre del plato).
 */

import { hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const CANTIDAD_PLATO_DEFAULT = {
  cantidadPlatoColor: '#ffffff',
  cantidadPlatoFondo: '#b45309',
  cantidadPlatoTamano: 14,
};

export const CANTIDAD_PLATO_TAMANO_MIN = 10;
export const CANTIDAD_PLATO_TAMANO_MAX = 28;

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function estiloCantidadPlatoKds(config = {}) {
  const color = hexValidoOrdenCola(config.cantidadPlatoColor)
    ? config.cantidadPlatoColor
    : CANTIDAD_PLATO_DEFAULT.cantidadPlatoColor;
  const fondo = hexValidoOrdenCola(config.cantidadPlatoFondo)
    ? config.cantidadPlatoFondo
    : CANTIDAD_PLATO_DEFAULT.cantidadPlatoFondo;
  const tam = clampInt(
    config.cantidadPlatoTamano,
    CANTIDAD_PLATO_TAMANO_MIN,
    CANTIDAD_PLATO_TAMANO_MAX,
    CANTIDAD_PLATO_DEFAULT.cantidadPlatoTamano
  );
  const padX = Math.max(5, Math.round(tam * 0.32));
  const padY = Math.max(1, Math.round(tam * 0.08));
  return {
    color,
    backgroundColor: fondo,
    border: `1px solid ${fondo}`,
    fontSize: `${tam}px`,
    fontWeight: 800,
    lineHeight: 1,
    minWidth: `${tam + 6}px`,
    minHeight: `${tam + 4}px`,
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    paddingTop: `${padY}px`,
    paddingBottom: `${padY}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    boxSizing: 'border-box',
    flexShrink: 0,
  };
}
