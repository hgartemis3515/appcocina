/**
 * Vista avanzada de tickets: un check bajo Fecha/hora pinta la fila de verde.
 * No cambia cobro, impresión ni filtros.
 */

export const FILAS_TICKET_VERDE_KEY = 'cocinaTicketsFilasVerde';
export const MAX_FILAS_TICKET_VERDE = 500;

export function claveFilaTicketResalte(ticketOrId) {
  if (ticketOrId == null) return '';
  if (typeof ticketOrId === 'string' || typeof ticketOrId === 'number') {
    return String(ticketOrId).trim();
  }
  return String(ticketOrId._id || ticketOrId.id || '').trim();
}

export function parseFilasTicketVerde(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set();
  const out = [];
  for (const item of parsed) {
    const k = claveFilaTicketResalte(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MAX_FILAS_TICKET_VERDE) break;
  }
  return out;
}

export function loadFilasTicketVerde() {
  try {
    return new Set(parseFilasTicketVerde(localStorage.getItem(FILAS_TICKET_VERDE_KEY)));
  } catch {
    return new Set();
  }
}

export function saveFilasTicketVerde(ids) {
  const arr = parseFilasTicketVerde([...(ids || [])]);
  try {
    localStorage.setItem(FILAS_TICKET_VERDE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
  return new Set(arr);
}

export function filaTicketResaltadaVerde(ids, clave) {
  const k = claveFilaTicketResalte(clave);
  if (!k || !ids) return false;
  if (ids instanceof Set) return ids.has(k);
  if (Array.isArray(ids)) return ids.map(String).includes(k);
  return false;
}

export function toggleFilaTicketVerde(ids, clave) {
  const k = claveFilaTicketResalte(clave);
  const next = new Set();
  (ids instanceof Set ? [...ids] : (ids || [])).forEach((id) => {
    const cur = claveFilaTicketResalte(id);
    if (cur) next.add(cur);
  });
  if (!k) return next;
  if (next.has(k)) next.delete(k);
  else next.add(k);
  return next;
}

export function clasesFilaTicketAvanzado({
  indent = false,
  seleccionado = false,
  resaltadoVerde = false,
  seleccionActiva = false,
  esGrupo = false,
} = {}) {
  const parts = ['border-t align-top'];
  if (seleccionActiva) parts.push('cursor-pointer');
  parts.push(esGrupo ? 'border-amber-500/20' : 'border-gray-800');
  if (seleccionado) {
    parts.push('bg-rose-900/30');
  } else if (resaltadoVerde) {
    parts.push('bg-emerald-600/45 hover:bg-emerald-500/50');
  } else if (esGrupo) {
    parts.push('bg-amber-500/[0.04] hover:bg-amber-500/[0.08]');
  } else {
    parts.push('hover:bg-gray-800/60');
    if (indent) parts.push('bg-gray-950/40');
  }
  return parts.join(' ');
}
