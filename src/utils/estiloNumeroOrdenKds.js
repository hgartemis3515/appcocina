/**
 * Número de orden secuencial en tarjetas KDS (#1, #2… de cola por cocinero).
 */

export const ORDEN_COLA_FUENTES = [
  { id: 'inter', label: 'Inter', css: 'Inter, system-ui, sans-serif' },
  { id: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { id: 'roboto', label: 'Roboto', css: 'Roboto, Arial, sans-serif' },
  { id: 'segoe', label: 'Segoe UI', css: '"Segoe UI", Tahoma, sans-serif' },
  { id: 'georgia', label: 'Georgia', css: 'Georgia, serif' },
  { id: 'courier', label: 'Courier New', css: '"Courier New", Courier, monospace' },
];

export const ORDEN_COLA_DEFAULT = {
  ordenColaFuente: 'inter',
  ordenColaTamano: 10,
  ordenColaColor: '#a7f3d0',
  ordenColaMostrarHash: true,
};

export const ORDEN_COLA_TAMANO_MIN = 8;
export const ORDEN_COLA_TAMANO_MAX = 28;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function textoNumeroOrdenKds(numero, config = {}) {
  if (numero == null || numero === '') return '';
  const conHash = config.ordenColaMostrarHash !== false;
  return `${conHash ? '#' : ''}${numero}`;
}

export function estiloNumeroOrdenKds(config = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.ordenColaFuente) || ORDEN_COLA_FUENTES[0];
  const n = Number(config.ordenColaTamano);
  const tam = Number.isFinite(n)
    ? Math.min(ORDEN_COLA_TAMANO_MAX, Math.max(ORDEN_COLA_TAMANO_MIN, n))
    : ORDEN_COLA_DEFAULT.ordenColaTamano;
  const color = HEX.test(String(config.ordenColaColor || ''))
    ? config.ordenColaColor
    : ORDEN_COLA_DEFAULT.ordenColaColor;
  return {
    fontFamily: fuente.css,
    fontSize: `${tam}px`,
    color,
    fontWeight: 700,
    lineHeight: 1.1,
  };
}
