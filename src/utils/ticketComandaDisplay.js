import { formatComandasNumbersLabel } from './comandaPrint/comandaHtml';

/** Números de comanda asociados a un ticket de aprobación o PPA. */
export function getComandasNumbersFromTicket(ticket) {
  if (!ticket) return [];

  if (Array.isArray(ticket.comandasNumbers) && ticket.comandasNumbers.length > 0) {
    return ticket.comandasNumbers;
  }

  const fromPlatos = (ticket.platos || [])
    .map((p) => p.comandaNumber)
    .filter((n) => n != null && n !== '');

  return [...new Set(fromPlatos)];
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
