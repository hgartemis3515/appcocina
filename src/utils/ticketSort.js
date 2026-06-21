import { getComandasNumbersFromTicket } from './ticketComandaDisplay';

export const TICKET_SORT_OPTIONS = [
  { key: 'fecha', label: 'Fecha', defaultDir: 'desc' },
  { key: 'comanda', label: 'Comanda', defaultDir: 'asc' },
  { key: 'mozo', label: 'Mozo', defaultDir: 'asc' },
  { key: 'mesa', label: 'Mesa', defaultDir: 'asc' },
  { key: 'total', label: 'Total', defaultDir: 'desc' },
  { key: 'tipo', label: 'Tipo', defaultDir: 'asc' },
];

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
    case 'mozo':
      return String(ticket.nombreMozo || ticket.mozoNombre || '').toLowerCase();
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
 * @param {string} sortBy - fecha | comanda | mozo | mesa | total | tipo
 * @param {'asc'|'desc'} sortDir
 */
export function sortTickets(tickets, sortBy = 'fecha', sortDir = 'desc') {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];

  const dir = sortDir === 'asc' ? 1 : -1;
  const isStringSort = sortBy === 'mozo';

  return [...tickets].sort((a, b) => {
    const va = getSortValue(a, sortBy);
    const vb = getSortValue(b, sortBy);

    if (isStringSort) {
      const cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
      return cmp * dir;
    }

    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;

    // Desempate estable por fecha descendente
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export function getDefaultSortDir(sortBy) {
  return TICKET_SORT_OPTIONS.find((o) => o.key === sortBy)?.defaultDir || 'desc';
}
