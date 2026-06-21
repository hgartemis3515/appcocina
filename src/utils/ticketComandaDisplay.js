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

/** Etiqueta visible: #12 o #12+#13+#14 */
export function getComandaDisplayLabel(ticket) {
  const label = formatComandasNumbersLabel(getComandasNumbersFromTicket(ticket));
  return label || '...';
}

export function getCantidadComandas(ticket) {
  const nums = getComandasNumbersFromTicket(ticket);
  return nums.length || 1;
}
