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

/** IDs de comanda (string) asociados al ticket. */
export function getComandaIdsFromTicket(ticket) {
  if (!ticket) return [];
  const ids = new Set();
  const push = (raw) => {
    const id = typeof raw === 'object' && raw ? (raw._id || raw.id) : raw;
    if (id) ids.add(String(id));
  };
  (ticket.comandasIds || []).forEach(push);
  (ticket.comandas || []).forEach(push);
  (ticket.platos || []).forEach((p) => {
    if (p?.comandaId) push(p.comandaId);
  });
  return [...ids];
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

/** Líneas de plato como en comandas.html (ver comanda). */
export function itemsDesdeComandaLive(comanda) {
  if (!comanda) return [];
  const platos = comanda.platos || comanda.items || [];
  return platos.map((item, index) => {
    const nested = item && typeof item.plato === 'object' && item.plato ? item.plato : null;
    const cantidad = Number(comanda.cantidades?.[index] ?? item?.cantidad) || 1;
    const precio = Number(
      item?.precioUnitario ?? item?.precio ?? nested?.precio ?? 0
    ) || 0;
    const nombre = item?.nombre || nested?.nombre || 'Sin nombre';
    const subSnap = Number(item?.subtotal);
    const subtotal = Number.isFinite(subSnap) && subSnap > 0
      ? subSnap
      : Number((cantidad * precio).toFixed(2));
    return {
      _id: item?._id || nested?._id,
      nombre,
      cantidad,
      precio,
      subtotal,
      estado: item?.estado || 'en_espera',
      eliminado: !!item?.eliminado,
      anulado: !!item?.anulado,
      notaEspecial: item?.notaEspecial || '',
      tipoServicio: item?.tipoServicio || 'mesa',
      complementosSeleccionados: item?.complementosSeleccionados || item?.complementos || [],
      procesandoPor: item?.procesandoPor || null,
      procesadoPor: item?.procesadoPor || null,
      finalizadoPor: item?.finalizadoPor || null,
    };
  });
}

export function cocineroDePlatoVista(item) {
  const de = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    const nombre = String(obj.alias || obj.nombre || obj.name || '').trim();
    if (!nombre) return null;
    return nombre;
  };
  const estado = String(item?.estado || '').toLowerCase();
  const esFinal = estado === 'recoger' || estado === 'salio'
    || estado === 'entregado' || estado === 'pagado';
  const procesando = de(item?.procesandoPor);
  const elegido = procesando || de(item?.procesadoPor) || de(item?.finalizadoPor);
  if (!elegido) return { nombre: '—', enPreparacion: false };
  return { nombre: elegido, enPreparacion: !!(procesando && !esFinal) };
}

export function totalActivoItemsComanda(items) {
  return (items || []).reduce((s, i) => {
    if (!i || i.eliminado || i.anulado) return s;
    return s + (Number(i.subtotal) || (Number(i.cantidad) || 1) * (Number(i.precio) || 0));
  }, 0);
}

export function etiquetaEstadoPlato(estado, eliminado) {
  if (eliminado) return 'Eliminado';
  const e = String(estado || '').toLowerCase();
  const labels = {
    pendiente: 'Pendiente',
    pedido: 'Pedido',
    en_espera: 'En espera',
    recoger: 'Recoger',
    salio: 'Salió',
    entregado: 'Entregado',
    pagado: 'Pagado',
    pendiente_aprobar: 'Pend. aprobar',
  };
  return labels[e] || (e ? e.replace(/_/g, ' ') : '—');
}
