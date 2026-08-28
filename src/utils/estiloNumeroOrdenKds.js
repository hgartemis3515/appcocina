/**
 * Número de orden secuencial en tarjetas KDS (#1, #2… de cola por cocinero).
 * Letra (fuente/tamaño/color) y cuadro (fondo/tamaño) se personalizan aparte.
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
  ordenColaCuadroColor: '#065f46',
  ordenColaCuadroTamano: 20,
};

export const ORDEN_COLA_TAMANO_MIN = 8;
export const ORDEN_COLA_TAMANO_MAX = 28;
export const ORDEN_COLA_CUADRO_TAMANO_MIN = 12;
export const ORDEN_COLA_CUADRO_TAMANO_MAX = 40;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function hexValidoOrdenCola(value) {
  return HEX.test(String(value || ''));
}

/** input type=color solo acepta #rrggbb */
export function hexParaColorPicker(value, fallback) {
  const raw = String(value || '');
  if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw;
  if (/^#([0-9a-fA-F]{3})$/.test(raw)) {
    const s = raw.slice(1);
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  return fallback;
}

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function textoNumeroOrdenKds(numero, config = {}) {
  if (numero == null || numero === '') return '';
  const conHash = config.ordenColaMostrarHash !== false;
  return `${conHash ? '#' : ''}${numero}`;
}

export function estiloNumeroOrdenKds(config = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.ordenColaFuente) || ORDEN_COLA_FUENTES[0];
  const tam = clampInt(
    config.ordenColaTamano,
    ORDEN_COLA_TAMANO_MIN,
    ORDEN_COLA_TAMANO_MAX,
    ORDEN_COLA_DEFAULT.ordenColaTamano
  );
  const color = hexValidoOrdenCola(config.ordenColaColor)
    ? config.ordenColaColor
    : ORDEN_COLA_DEFAULT.ordenColaColor;
  const cuadroColor = hexValidoOrdenCola(config.ordenColaCuadroColor)
    ? config.ordenColaCuadroColor
    : ORDEN_COLA_DEFAULT.ordenColaCuadroColor;
  const cuadroTam = clampInt(
    config.ordenColaCuadroTamano,
    ORDEN_COLA_CUADRO_TAMANO_MIN,
    ORDEN_COLA_CUADRO_TAMANO_MAX,
    ORDEN_COLA_DEFAULT.ordenColaCuadroTamano
  );
  const padX = Math.max(4, Math.round(cuadroTam * 0.22));
  const padY = Math.max(2, Math.round(cuadroTam * 0.1));
  return {
    fontFamily: fuente.css,
    fontSize: `${tam}px`,
    color,
    fontWeight: 700,
    lineHeight: 1.1,
    backgroundColor: cuadroColor,
    border: `1px solid ${cuadroColor}`,
    minWidth: `${cuadroTam}px`,
    minHeight: `${cuadroTam}px`,
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    paddingTop: `${padY}px`,
    paddingBottom: `${padY}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    boxSizing: 'border-box',
  };
}
