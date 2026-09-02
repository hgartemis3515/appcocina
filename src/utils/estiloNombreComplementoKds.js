/**
 * Nombre de complementos / guarniciones en tarjetas KDS (Vista y alertas).
 */

import { ORDEN_COLA_FUENTES, hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const NOMBRE_COMPLEMENTO_DEFAULT = {
  nombreComplementoFuente: 'arial',
  nombreComplementoTamano: 12,
  nombreComplementoColor: '#e5e7eb',
  nombreComplementoFondo: '#374151',
};

export const NOMBRE_COMPLEMENTO_TAMANO_MIN = 8;
export const NOMBRE_COMPLEMENTO_TAMANO_MAX = 24;

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function estiloNombreComplementoKds(config = {}, opts = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.nombreComplementoFuente)
    || ORDEN_COLA_FUENTES.find((f) => f.id === NOMBRE_COMPLEMENTO_DEFAULT.nombreComplementoFuente)
    || ORDEN_COLA_FUENTES[0];
  const tam = clampInt(
    config.nombreComplementoTamano,
    NOMBRE_COMPLEMENTO_TAMANO_MIN,
    NOMBRE_COMPLEMENTO_TAMANO_MAX,
    NOMBRE_COMPLEMENTO_DEFAULT.nombreComplementoTamano
  );
  const size = opts.compact
    ? Math.max(NOMBRE_COMPLEMENTO_TAMANO_MIN, Math.round(tam * 0.85))
    : tam;
  const color = hexValidoOrdenCola(config.nombreComplementoColor)
    ? config.nombreComplementoColor
    : NOMBRE_COMPLEMENTO_DEFAULT.nombreComplementoColor;
  const fondo = hexValidoOrdenCola(config.nombreComplementoFondo)
    ? config.nombreComplementoFondo
    : NOMBRE_COMPLEMENTO_DEFAULT.nombreComplementoFondo;
  const padX = Math.max(4, Math.round(size * 0.28));
  const padY = Math.max(1, Math.round(size * 0.1));
  return {
    color,
    backgroundColor: fondo,
    fontSize: `${size}px`,
    fontFamily: fuente.css,
    fontWeight: 600,
    lineHeight: 1.2,
    display: 'inline',
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    paddingTop: `${padY}px`,
    paddingBottom: `${padY}px`,
    borderRadius: '4px',
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
  };
}
