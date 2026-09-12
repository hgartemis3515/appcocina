import { hexValidoOrdenCola } from './estiloNumeroOrdenKds';
import { COLOR_PARA_LLEVAR, COLOR_PARA_LLEVAR_BORDE } from './estiloParaLlevarKds';

export const TICKETS_TABLA_TEXTO_TAMANO_MIN = 10;
export const TICKETS_TABLA_TEXTO_TAMANO_MAX = 22;

export const TICKETS_TABLA_VISUAL_DEFAULT = {
  paraLlevarFondo: COLOR_PARA_LLEVAR,
  paraLlevarContorno: COLOR_PARA_LLEVAR_BORDE,
  textoPlatosColor: '#e5e7eb',
  textoTotalColor: '#ffffff',
  textoRestoColor: '#9ca3af',
  textoTamano: 14,
  textoFondo: '',
};

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function hexOr(value, fallback) {
  return hexValidoOrdenCola(value) ? value : fallback;
}

function hexOrEmpty(value) {
  if (value == null || value === '' || value === 'transparent' || value === 'none') return '';
  return hexValidoOrdenCola(value) ? value : '';
}

export function normalizeTicketsTablaVisual(parsed) {
  const d = TICKETS_TABLA_VISUAL_DEFAULT;
  return {
    paraLlevarFondo: hexOr(parsed?.paraLlevarFondo, d.paraLlevarFondo),
    paraLlevarContorno: hexOr(parsed?.paraLlevarContorno, d.paraLlevarContorno),
    textoPlatosColor: hexOr(parsed?.textoPlatosColor, d.textoPlatosColor),
    textoTotalColor: hexOr(parsed?.textoTotalColor, d.textoTotalColor),
    textoRestoColor: hexOr(parsed?.textoRestoColor, d.textoRestoColor),
    textoTamano: clampInt(
      parsed?.textoTamano,
      TICKETS_TABLA_TEXTO_TAMANO_MIN,
      TICKETS_TABLA_TEXTO_TAMANO_MAX,
      d.textoTamano
    ),
    textoFondo: hexOrEmpty(parsed?.textoFondo),
  };
}

function estiloLetra(color, tamano, fondo, extra = {}) {
  const padX = fondo ? Math.max(4, Math.round(tamano * 0.28)) : 0;
  const padY = fondo ? Math.max(1, Math.round(tamano * 0.08)) : 0;
  const st = {
    color,
    fontSize: `${tamano}px`,
    lineHeight: 1.25,
    ...extra,
  };
  if (fondo) {
    st.backgroundColor = fondo;
    st.padding = `${padY}px ${padX}px`;
    st.borderRadius = '4px';
    st.boxDecorationBreak = 'clone';
    st.WebkitBoxDecorationBreak = 'clone';
  }
  return st;
}

export function estiloCuerpoParaLlevarTickets(prefs = {}) {
  const v = normalizeTicketsTablaVisual(prefs);
  return {
    backgroundColor: v.paraLlevarFondo,
    boxShadow: `inset 0 0 0 2px ${v.paraLlevarContorno}`,
  };
}

export function estilosTextoTicketsTabla(prefs = {}) {
  const v = normalizeTicketsTablaVisual(prefs);
  const meta = Math.max(TICKETS_TABLA_TEXTO_TAMANO_MIN, v.textoTamano - 2);
  return {
    platos: estiloLetra(v.textoPlatosColor, v.textoTamano, v.textoFondo),
    platosMeta: estiloLetra(v.textoPlatosColor, meta, v.textoFondo),
    total: estiloLetra(v.textoTotalColor, v.textoTamano, v.textoFondo, { fontWeight: 700 }),
    resto: estiloLetra(v.textoRestoColor, meta, v.textoFondo),
  };
}
