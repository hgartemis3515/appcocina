/**
 * Etiqueta PARA LLEVAR en tarjetas KDS (Vista y alertas)
 * y recuadro del nombre en Ver cocina cuando el plato es para llevar.
 */

export const COLOR_PARA_LLEVAR = '#7c3aed';
export const COLOR_PARA_LLEVAR_BORDE = '#6d28d9';

export const PARA_LLEVAR_DEFAULT = {
  paraLlevarTamano: 11,
};

export const PARA_LLEVAR_TAMANO_MIN = 8;
export const PARA_LLEVAR_TAMANO_MAX = 32;

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function tamanoParaLlevarKds(config = {}) {
  return clampInt(
    config.paraLlevarTamano,
    PARA_LLEVAR_TAMANO_MIN,
    PARA_LLEVAR_TAMANO_MAX,
    PARA_LLEVAR_DEFAULT.paraLlevarTamano
  );
}

export function estiloParaLlevarKds(config = {}) {
  const size = tamanoParaLlevarKds(config);
  const padX = Math.max(6, Math.round(size * 0.55));
  const padY = Math.max(2, Math.round(size * 0.12));
  return {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    padding: `${padY}px ${padX}px`,
    borderRadius: '999px',
    fontSize: `${size}px`,
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#ffffff',
    background: COLOR_PARA_LLEVAR,
    border: `1px solid ${COLOR_PARA_LLEVAR_BORDE}`,
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };
}

/**
 * Recuadro morado detrás del nombre del plato en Ver cocina.
 * Padding y radio siguen el tamaño de letra del plato.
 */
export function estiloCuadroNombreParaLlevar(fontSizePx) {
  const n = Number(fontSizePx);
  const size = Number.isFinite(n) && n > 0 ? n : 36;
  const padX = Math.max(6, Math.round(size * 0.22));
  const padY = Math.max(2, Math.round(size * 0.08));
  const radius = Math.max(4, Math.round(size * 0.12));
  return {
    backgroundColor: COLOR_PARA_LLEVAR,
    padding: `${padY}px ${padX}px`,
    borderRadius: `${radius}px`,
    display: 'inline',
    width: 'fit-content',
    maxWidth: '100%',
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
    boxShadow: `0 0 0 1px ${COLOR_PARA_LLEVAR_BORDE}`,
  };
}
