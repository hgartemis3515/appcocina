/**
 * Subtotal = bruto (antes del descuento). TOTAL = bruto − descuento.
 */

function montoDescDeTicket(ticket) {
  const n = Number(ticket?.montoDescuento);
  if (Number.isFinite(n) && n > 0) return n;
  const cmds = Array.isArray(ticket?.comandas) ? ticket.comandas : [];
  const fromC = cmds.reduce((s, c) => {
    if (!c || typeof c !== 'object') return s;
    return s + (Number(c.montoDescuento) || 0);
  }, 0);
  if (fromC > 0) return fromC;
  return Number(ticket?.boucher?.montoDescuento) || 0;
}

export function resolverBrutoYNeto(doc, extraSubtotal = 0) {
  const montoDesc = montoDescDeTicket(doc);
  const sin = Number(doc?.totalSinDescuento);
  const sub = Number(doc?.subtotal);
  const tot = Number(doc?.total);
  const extra = Number(extraSubtotal) || 0;
  const bruto = (Number.isFinite(sin) && sin > 0)
    ? sin
    : (extra > 0
      ? extra
      : (Number.isFinite(sub) && sub > 0
        ? sub
        : (Number.isFinite(tot) && tot > 0 ? tot : 0)));
  const neto = montoDesc > 0
    ? Number(Math.max(0, bruto - montoDesc).toFixed(2))
    : (Number.isFinite(tot) && tot > 0 ? tot : bruto);
  return { bruto, neto, montoDesc };
}

export function aplicarTotalNetoTicket(ticket) {
  if (!ticket) return ticket;
  const { bruto, neto, montoDesc } = resolverBrutoYNeto(ticket);
  if (montoDesc <= 0) return ticket;
  return {
    ...ticket,
    montoDescuento: montoDesc,
    totalSinDescuento: bruto,
    total: neto,
  };
}

export function totalTicketNeto(ticket) {
  return resolverBrutoYNeto(ticket).neto;
}
