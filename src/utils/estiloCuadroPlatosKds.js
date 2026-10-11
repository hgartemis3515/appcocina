import { hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const SCROLL_PLATOS_DEFAULT = {
  scrollPlatosColor: '#4A4A4A',
  scrollPlatosColorClaro: '#6b7280',
  scrollPlatosRiel: '#2A2A2A',
  scrollPlatosRielClaro: '#d1d5db',
  scrollPlatosContorno: '#000000',
  scrollPlatosContornoClaro: '#111827',
  scrollPlatosGrosor: 0,
};

export function grosorScrollPlatosKds(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  return Math.min(6, Math.max(0, Math.round(n)));
}

function colorDe(valor, fallback) {
  return hexValidoOrdenCola(valor) ? valor : fallback;
}

/** Variables del botón de scroll (gris) y su riel (negro) en la lista de platos. */
export function varsScrollPlatosKds(config = {}, nightMode = true) {
  const d = SCROLL_PLATOS_DEFAULT;
  const color = colorDe(nightMode ? config.scrollPlatosColor : config.scrollPlatosColorClaro, nightMode ? d.scrollPlatosColor : d.scrollPlatosColorClaro);
  const riel = colorDe(nightMode ? config.scrollPlatosRiel : config.scrollPlatosRielClaro, nightMode ? d.scrollPlatosRiel : d.scrollPlatosRielClaro);
  const contorno = colorDe(nightMode ? config.scrollPlatosContorno : config.scrollPlatosContornoClaro, nightMode ? d.scrollPlatosContorno : d.scrollPlatosContornoClaro);
  const grosor = grosorScrollPlatosKds(config.scrollPlatosGrosor == null ? d.scrollPlatosGrosor : config.scrollPlatosGrosor);
  return {
    '--kds-scroll-thumb': color,
    '--kds-scroll-track': riel,
    '--kds-scroll-contorno': contorno,
    '--kds-scroll-grosor': `${grosor}px`,
  };
}
