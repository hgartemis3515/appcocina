/**
 * Recuadro del nombre del cocinero en cada plato de las tablas KDS.
 * Colores: Vista y alertas. Texto: alias o pronombre de cocineros.html.
 */

import { hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const COCINERO_NOMBRE_DEFAULT = {
  cocineroNombreColor: '#fef08a',
  cocineroNombreFondo: '#713f12',
};

export function estiloCocineroNombreKds(config = {}) {
  const color = hexValidoOrdenCola(config.cocineroNombreColor)
    ? config.cocineroNombreColor
    : COCINERO_NOMBRE_DEFAULT.cocineroNombreColor;
  const fondo = hexValidoOrdenCola(config.cocineroNombreFondo)
    ? config.cocineroNombreFondo
    : COCINERO_NOMBRE_DEFAULT.cocineroNombreFondo;
  return {
    color,
    backgroundColor: fondo,
    border: `1px solid ${fondo}`,
    borderRadius: 4,
    fontWeight: 600,
    lineHeight: 1.15,
  };
}

export function textoNombreCocineroKds(procesandoPor, { usuarioActualId, usarPronombre } = {}) {
  if (!procesandoPor) return 'Cocinero';
  if (
    procesandoPor.cocineroId
    && usuarioActualId
    && String(procesandoPor.cocineroId) === String(usuarioActualId)
  ) {
    return 'Tú';
  }
  const pron = String(procesandoPor.pronombre || '').trim();
  if (usarPronombre && pron) return pron;
  return procesandoPor.alias || procesandoPor.nombre || 'Cocinero';
}
