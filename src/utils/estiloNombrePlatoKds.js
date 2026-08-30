/**
 * Nombre del plato en tarjetas KDS (Vista y alertas).
 */

import { ORDEN_COLA_FUENTES, hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const NOMBRE_PLATO_DEFAULT = {
  nombrePlatoFuente: 'arial',
  tamanoFuentePlatos: 18,
  nombrePlatoColor: '#ffffff',
};

export const NOMBRE_PLATO_TAMANO_MIN = 12;
export const NOMBRE_PLATO_TAMANO_MAX = 32;

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function estiloNombrePlatoKds(config = {}, opts = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.nombrePlatoFuente)
    || ORDEN_COLA_FUENTES.find((f) => f.id === NOMBRE_PLATO_DEFAULT.nombrePlatoFuente)
    || ORDEN_COLA_FUENTES[0];
  const tam = clampInt(
    config.tamanoFuentePlatos,
    NOMBRE_PLATO_TAMANO_MIN,
    NOMBRE_PLATO_TAMANO_MAX,
    NOMBRE_PLATO_DEFAULT.tamanoFuentePlatos
  );
  const size = opts.compact ? Math.max(NOMBRE_PLATO_TAMANO_MIN, Math.round(tam * 0.78)) : tam;
  const color = hexValidoOrdenCola(config.nombrePlatoColor)
    ? config.nombrePlatoColor
    : NOMBRE_PLATO_DEFAULT.nombrePlatoColor;
  return {
    color,
    fontSize: `${size}px`,
    fontFamily: fuente.css,
    fontWeight: 700,
    lineHeight: 1.2,
  };
}
