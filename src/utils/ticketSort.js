import { getComandasNumbersFromTicket, getComandaIdsFromTicket } from './ticketComandaDisplay';
import { formatComandasNumbersLabel } from './comandaPrint/comandaHtml';

export const TICKET_SORT_OPTIONS = [
  { key: 'fecha', label: 'Fecha', defaultDir: 'desc' },
  { key: 'comanda', label: 'Comanda', defaultDir: 'asc' },
  { key: 'mesa', label: 'Mesa', defaultDir: 'asc' },
  { key: 'total', label: 'Total', defaultDir: 'desc' },
  { key: 'tipo', label: 'Tipo', defaultDir: 'asc' },
];

/** Nombre visible del mozo en un ticket. */
export function getMozoNombre(ticket) {
  return String(ticket?.nombreMozo || ticket?.mozoNombre || 'Sin mozo').trim() || 'Sin mozo';
}

/** Lista única de mozos presentes en los tickets (con conteo). */
export function getMozosFromTickets(tickets) {
  if (!Array.isArray(tickets)) return [];

  const map = new Map();
  for (const ticket of tickets) {
    const nombre = getMozoNombre(ticket);
    const key = nombre.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { nombre, key, count: 0 });
    }
    map.get(key).count += 1;
  }

  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
}

/** Agrupa tickets por mozo (orden alfabético). Conserva el orden relativo de cada lista. */
export function groupTicketsByMozo(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];
  const map = new Map();
  for (const ticket of tickets) {
    const nombre = getMozoNombre(ticket);
    const key = nombre.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, nombre, tickets: [] });
    }
    map.get(key).tickets.push(ticket);
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
}

/** Filtra tickets por nombre de mozo (null = todos). */
export function filterTicketsByMozo(tickets, mozoKey) {
  if (!mozoKey) return tickets;
  const key = String(mozoKey).toLowerCase();
  return tickets.filter((t) => getMozoNombre(t).toLowerCase() === key);
}

const TIPO_ORDEN = {
  comanda_completa: 1,
  comanda: 1,
  pago_parcial: 2,
  pago_adelantado: 3,
  adelantado: 3,
};

function getComandaSortValue(ticket) {
  const nums = getComandasNumbersFromTicket(ticket);
  if (nums.length > 0) {
    return Math.min(...nums.map((n) => Number(n) || 0));
  }
  return Number(ticket.ticketNumber) || 0;
}

function getSortValue(ticket, sortBy) {
  switch (sortBy) {
    case 'fecha':
      return new Date(ticket.createdAt || 0).getTime();
    case 'comanda':
      return getComandaSortValue(ticket);
    case 'mesa':
      return Number(ticket.numMesa) || 0;
    case 'total':
      return Number(ticket.total) || 0;
    case 'tipo': {
      const t = String(ticket.tipo || '').toLowerCase();
      return TIPO_ORDEN[t] ?? 99;
    }
    default:
      return 0;
  }
}

/**
 * Ordena tickets según campo y dirección.
 * @param {Array} tickets
 * @param {string} sortBy - fecha | comanda | mesa | total | tipo
 * @param {'asc'|'desc'} sortDir
 */
export function sortTickets(tickets, sortBy = 'fecha', sortDir = 'desc') {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];

  const dir = sortDir === 'asc' ? 1 : -1;

  return [...tickets].sort((a, b) => {
    const va = getSortValue(a, sortBy);
    const vb = getSortValue(b, sortBy);

    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;

    // Desempate estable por fecha descendente
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

/** En «Todos», los pendientes van primero para que no queden bajo el historial aprobado. */
export function sortTicketsPendientesPrimero(tickets, sortBy = 'fecha', sortDir = 'desc') {
  const sorted = sortTickets(tickets, sortBy, sortDir);
  return [...sorted].sort((a, b) => {
    const pa = a?.estado === 'pendiente_aprobacion' ? 0 : 1;
    const pb = b?.estado === 'pendiente_aprobacion' ? 0 : 1;
    return pa - pb;
  });
}

export function getDefaultSortDir(sortBy) {
  return TICKET_SORT_OPTIONS.find((o) => o.key === sortBy)?.defaultDir || 'desc';
}

export function mesaKeyDeTicket(ticket) {
  const n = ticket?.numMesa;
  if (n == null || n === '') return 'sin-mesa';
  return String(n);
}

export function tsTicketCreated(ticket) {
  const d = ticket?.createdAt ? new Date(ticket.createdAt).getTime() : 0;
  return Number.isFinite(d) ? d : 0;
}

/** Más antiguo → más nuevo (desempate: ticketNumber, _id). */
export function sortTicketsMasAntiguoPrimero(tickets) {
  return [...(tickets || [])].sort((a, b) => {
    const ta = tsTicketCreated(a);
    const tb = tsTicketCreated(b);
    if (ta !== tb) return ta - tb;
    const na = Number(a?.ticketNumber) || 0;
    const nb = Number(b?.ticketNumber) || 0;
    if (na !== nb) return na - nb;
    return String(a?._id || '').localeCompare(String(b?._id || ''));
  });
}

/**
 * Agrupa tickets de un mozo por mesa.
 * Orden: grupos por la comanda más antigua de esa mesa; dentro, antiguo → nuevo.
 */
export function groupTicketsByMesa(tickets) {
  const sorted = sortTicketsMasAntiguoPrimero(tickets);
  const map = new Map();
  for (const ticket of sorted) {
    const key = mesaKeyDeTicket(ticket);
    if (!map.has(key)) {
      map.set(key, {
        key,
        mesa: ticket.numMesa != null && ticket.numMesa !== '' ? ticket.numMesa : null,
        tickets: [],
      });
    }
    map.get(key).tickets.push(ticket);
  }
  return [...map.values()];
}

/** ObjectId de Mongo a string, misma idea que comandas.html normalizeObjectId. */
export function normalizeObjectIdTicket(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'object') {
    if (val.$oid) return String(val.$oid);
    if (val._id != null) return normalizeObjectIdTicket(val._id);
    if (typeof val.toString === 'function') {
      const s = val.toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  const s = String(val).trim();
  return /^[a-f0-9]{24}$/i.test(s) ? s : null;
}

export function pedidoIdDeTicket(ticket) {
  return normalizeObjectIdTicket(ticket?.pedido?._id ?? ticket?.pedido ?? ticket?.pedidoId);
}

export function clienteIdDeTicket(ticket) {
  return normalizeObjectIdTicket(ticket?.cliente?._id ?? ticket?.cliente ?? ticket?.clienteId);
}

export function labelComandasDeTickets(tickets) {
  const nums = [];
  for (const t of tickets || []) {
    nums.push(...getComandasNumbersFromTicket(t));
  }
  return formatComandasNumbersLabel(nums);
}

/** Ticket sintético para el modal: todas las comandas del grupo. */
export function ticketParaDetalleGrupo(tickets) {
  const lista = tickets || [];
  if (lista.length === 0) return null;
  if (lista.length === 1) return lista[0];
  const seenId = new Set();
  const ids = [];
  const nums = [];
  for (const t of lista) {
    for (const id of getComandaIdsFromTicket(t)) {
      if (!seenId.has(id)) {
        seenId.add(id);
        ids.push(id);
      }
    }
    nums.push(...getComandasNumbersFromTicket(t));
  }
  return {
    ...lista[0],
    comandas: ids,
    comandasIds: ids,
    comandasNumbers: [...new Set(nums)].sort((a, b) => Number(a) - Number(b)),
  };
}

/**
 * Misma regla que comandas.html processGrouping:
 * pedidoId (primario) o clienteId+mesa (histórico). Sin eso, fila individual.
 * Un solo ticket en el grupo se muestra como individual.
 * Orden: más antiguo → más nuevo.
 */
export function groupTicketsComoComandasHtml(tickets) {
  const sorted = sortTicketsMasAntiguoPrimero(tickets);
  const gruposPedido = new Map();
  const gruposCliente = new Map();
  const sueltos = [];

  for (const t of sorted) {
    const origenDashboard = (t.origenCreacion || '') === 'dashboard' || !!t.createdByDashboard;
    if (origenDashboard) {
      sueltos.push(t);
      continue;
    }
    const pedidoId = pedidoIdDeTicket(t);
    const clienteId = clienteIdDeTicket(t);
    const mesaNum = t.numMesa != null && t.numMesa !== '' ? t.numMesa : null;
    const clienteNombre = t.clienteNombre || t.cliente?.nombre || null;

    if (pedidoId) {
      const key = `pedido_${pedidoId}`;
      if (!gruposPedido.has(key)) {
        gruposPedido.set(key, {
          key,
          pedidoId,
          clienteId,
          clienteNombre,
          mesa: mesaNum,
          tickets: [],
        });
      }
      gruposPedido.get(key).tickets.push(t);
    } else if (clienteId) {
      const key = `cliente_${clienteId}_${mesaNum}`;
      if (!gruposCliente.has(key)) {
        gruposCliente.set(key, {
          key,
          clienteId,
          clienteNombre: clienteNombre || 'Cliente',
          mesa: mesaNum,
          tickets: [],
        });
      }
      gruposCliente.get(key).tickets.push(t);
    } else {
      sueltos.push(t);
    }
  }

  const filas = [];
  const volcarGrupo = (g) => {
    if (g.tickets.length > 1) {
      filas.push({
        tipo: 'grupo',
        id: g.key,
        key: g.key,
        mesa: g.mesa,
        clienteNombre: g.clienteNombre,
        tickets: g.tickets,
        label: labelComandasDeTickets(g.tickets),
      });
    } else {
      sueltos.push(g.tickets[0]);
    }
  };
  gruposPedido.forEach(volcarGrupo);
  gruposCliente.forEach(volcarGrupo);

  for (const t of sueltos) {
    filas.push({
      tipo: 'individual',
      id: String(t._id),
      key: String(t._id),
      mesa: t.numMesa != null && t.numMesa !== '' ? t.numMesa : null,
      clienteNombre: t.clienteNombre || t.cliente?.nombre || null,
      tickets: [t],
      label: labelComandasDeTickets([t]),
    });
  }

  return filas.sort((a, b) => tsTicketCreated(a.tickets[0]) - tsTicketCreated(b.tickets[0]));
}
