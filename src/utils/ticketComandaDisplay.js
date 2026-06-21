import { formatComandasNumbersLabel } from './comandaPrint/comandaHtml';

/** Números de comanda asociados a un ticket de aprobación o PPA. */
export function getComandasNumbersFromTicket(ticket) {
  if (!ticket) return [];

  const nums = new Set();
  (ticket.comandasNumbers || []).forEach((n) => {
    if (n == null || n === '') return;
    const num = Number(n);
    if (!Number.isNaN(num)) nums.add(num);
  });
  (ticket.platos || []).forEach((p) => {
    if (p?.comandaNumber == null || p.comandaNumber === '') return;
    const num = Number(p.comandaNumber);
    if (!Number.isNaN(num)) nums.add(num);
  });

  return [...nums].sort((a, b) => a - b);
}

/** Claves para agrupar tickets de la misma comanda (por id o número). */
export function getComandaKeysFromTicket(ticket) {
  if (!ticket) return [];

  const keys = new Set();
  (ticket.comandas || []).forEach((c) => {
    const id = typeof c === 'object' ? c?._id : c;
    if (id) keys.add(`id:${String(id)}`);
  });
  getComandasNumbersFromTicket(ticket).forEach((n) => keys.add(`num:${n}`));
  return [...keys];
}

/** Etiqueta visible: #12 o #12+#13+#14 */
export function getComandaDisplayLabel(ticket) {
  const label = formatComandasNumbersLabel(getComandasNumbersFromTicket(ticket));
  return label || '...';
}

export function getCantidadComandas(ticket) {
  const nums = getComandasNumbersFromTicket(ticket);
  return nums.length || 1;
}

/**
 * Agrupa tickets por comanda. Por defecto solo pendientes de aprobación.
 * @returns {Map<string, Array>} clave → tickets ordenados por createdAt asc
 */
export function buildTicketsByComandaMap(items, { soloPendientes = true } = {}) {
  const map = new Map();

  for (const t of items || []) {
    if (soloPendientes && t.estado !== 'pendiente_aprobacion') continue;
    for (const key of getComandaKeysFromTicket(t)) {
      if (!map.has(key)) map.set(key, []);
      const group = map.get(key);
      if (!group.some((x) => String(x._id) === String(t._id))) {
        group.push(t);
      }
    }
  }

  for (const group of map.values()) {
    group.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

  return map;
}

/**
 * Info cuando varios tickets (pagos parciales) pertenecen a la misma comanda.
 * @returns {{ total: number, indice: number, comandaLabel: string } | null}
 */
export function getInfoTicketMismaComanda(ticket, items, { soloPendientes = true } = {}) {
  const map = buildTicketsByComandaMap(items, { soloPendientes });
  const keys = getComandaKeysFromTicket(ticket);

  let group = [];
  for (const key of keys) {
    const candidates = map.get(key) || [];
    if (candidates.length > group.length) group = candidates;
  }

  if (group.length <= 1) return null;

  const indice = group.findIndex((t) => String(t._id) === String(ticket._id));
  return {
    total: group.length,
    indice: indice >= 0 ? indice + 1 : null,
    comandaLabel: getComandaDisplayLabel(ticket),
  };
}

/** Cuenta tickets pendientes por comanda (para badges en la tabla). */
export function countTicketsPendientesByComanda(items) {
  const map = buildTicketsByComandaMap(items, { soloPendientes: true });
  const counts = new Map();

  for (const [key, group] of map.entries()) {
    counts.set(key, group.length);
  }

  return counts;
}

/** ¿Este ticket comparte comanda con otros pendientes? */
export function tieneOtrosTicketsMismaComanda(ticket, items) {
  const info = getInfoTicketMismaComanda(ticket, items);
  return info != null && info.total > 1;
}
