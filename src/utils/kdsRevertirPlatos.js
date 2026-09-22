/**
 * Revertir en KDS: recoger, salió o entregado → pedido.
 * No incluye pagado ni platos anulados/eliminados.
 */

import { getFechaOperativa, limaDayStart, limaDayEnd } from './ticketAprobacionUi';

export const ESTADOS_PLATO_REVERSIBLES = ['recoger', 'salio', 'entregado'];
export const ESTADO_DESTINO_REVERTIR_KDS = 'pedido';

/** Letras de plato en el modal Revertir: fondo negro, amarillo. */
export const ESTILO_NOMBRE_PLATO_REVERTIR = {
  backgroundColor: '#000000',
  color: '#facc15',
  fontWeight: 800,
  padding: '2px 8px',
  borderRadius: '4px',
  display: 'inline-block',
  lineHeight: 1.25,
};

export function esPlatoReversibleKds(plato) {
  if (!plato || plato.eliminado === true || plato.anulado === true) return false;
  const estado = String(plato.estado || '').toLowerCase();
  if (estado === 'pagado') return false;
  return ESTADOS_PLATO_REVERSIBLES.includes(estado);
}

export function todosPlatosActivosReversiblesKds(comanda) {
  const activos = (comanda?.platos || []).filter((p) => p && p.eliminado !== true && p.anulado !== true);
  if (!activos.length) return false;
  return activos.every(esPlatoReversibleKds);
}

export function filtrarComandasReversiblesKds(comandas) {
  return (comandas || [])
    .filter((c) => {
      if (!c || c.status === 'pagado' || c.status === 'cancelado') return false;
      if (!c.platos || c.platos.length === 0) return false;
      return c.platos.some(esPlatoReversibleKds);
    })
    .sort((a, b) => {
      const fechaA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const fechaB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return fechaB - fechaA;
    });
}

export function contarPlatosReversiblesKds(comandas) {
  return (comandas || []).reduce((acc, c) => {
    if (!c || c.status === 'pagado' || c.status === 'cancelado') return acc;
    return acc + (c.platos || []).filter(esPlatoReversibleKds).length;
  }, 0);
}

function limaYmdDeDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

/** Fechas calendario que cubren el día operativo HOY (04:00–04:00 Lima). */
export function ymdsCalendarioDiaOperativo(now = new Date()) {
  const ymd = getFechaOperativa(now);
  const a = limaYmdDeDate(limaDayStart(ymd));
  const b = limaYmdDeDate(limaDayEnd(ymd));
  return a === b ? [a] : [a, b];
}

export function comandaEsDeHoyOperativo(comanda, now = new Date()) {
  const t = new Date(comanda?.createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  const ymd = getFechaOperativa(now);
  return t >= limaDayStart(ymd).getTime() && t <= limaDayEnd(ymd).getTime();
}

export function filtrarComandasHoyOperativo(comandas, now = new Date()) {
  return (comandas || []).filter((c) => comandaEsDeHoyOperativo(c, now));
}

export function nombreMozoComandaRevertir(c) {
  if (!c) return '';
  if (c.mozoNombre) return String(c.mozoNombre);
  const m = c.mozos;
  if (Array.isArray(m)) return String(m[0]?.name || m[0]?.nombre || '');
  return String(m?.name || m?.nombre || '');
}

export function numeroMesaComandaRevertir(c) {
  const n = c?.mesaNumero ?? c?.mesas?.nummesa ?? c?.mesas?.numero;
  if (n == null || n === '') return '';
  return String(n);
}

export function listarMozosRevertir(comandas) {
  return [...new Set((comandas || []).map(nombreMozoComandaRevertir).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export function listarMesasRevertir(comandas) {
  return [...new Set((comandas || []).map(numeroMesaComandaRevertir).filter(Boolean))]
    .sort((a, b) => (Number(a) - Number(b)) || a.localeCompare(b, 'es'));
}

export function filtrarComandasRevertirVista(comandas, { mozo = '', mesa = '' } = {}) {
  const mozoKey = String(mozo || '');
  const mesaKey = String(mesa || '');
  return (comandas || []).filter((c) => {
    if (mozoKey && nombreMozoComandaRevertir(c) !== mozoKey) return false;
    if (mesaKey && numeroMesaComandaRevertir(c) !== mesaKey) return false;
    return true;
  });
}
