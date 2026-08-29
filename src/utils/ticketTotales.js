/**
 * Subtotal = bruto (antes del descuento). TOTAL = bruto − descuento.
 * Si totalSinDescuento quedó mal (p.ej. 264.01 en un pedido de 624),
 * se usa el mayor entre snapshot, suma de platos y comanda.
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

function maxPositivo(...vals) {
  let m = 0;
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > m) m = n;
  }
  return m;
}

function sumaPlatosTicket(doc) {
  const platos = doc?.platos;
  if (!Array.isArray(platos) || !platos.length) return 0;
  const suma = platos.reduce((s, p) => {
    if (!p || p.eliminado || p.anulado) return s;
    return s + (Number(p.subtotal) || (Number(p.precio) || 0) * (Number(p.cantidad) || 1));
  }, 0);
  return Number(suma.toFixed(2));
}

function brutoDesdeComandas(doc) {
  const cmds = Array.isArray(doc?.comandas) ? doc.comandas : [];
  const suma = cmds.reduce((s, c) => {
    if (!c || typeof c !== 'object') return s;
    return s + (Number(c.totalSinDescuento) || 0);
  }, 0);
  return suma > 0 ? suma : 0;
}

export function resolverBrutoYNeto(doc, extraSubtotal = 0) {
  const montoDesc = montoDescDeTicket(doc);
  const extra = Number(extraSubtotal) || 0;
  const plates = extra > 0 ? extra : sumaPlatosTicket(doc);
  const tot = Number(doc?.total);
  const bruto = maxPositivo(
    doc?.totalSinDescuento,
    plates,
    brutoDesdeComandas(doc),
    doc?.subtotal,
    Number.isFinite(tot) && tot > 0 && !(montoDesc > 0) ? tot : 0
  ) || (Number.isFinite(tot) && tot > 0 ? tot : 0);
  const neto = montoDesc > 0
    ? Number(Math.max(0, bruto - montoDesc).toFixed(2))
    : (Number.isFinite(tot) && tot > 0 ? tot : bruto);
  return { bruto, neto, montoDesc };
}

export function aplicarTotalNetoTicket(ticket) {
  if (!ticket) return ticket;
  const extra = sumaPlatosTicket(ticket);
  const { bruto, neto, montoDesc } = resolverBrutoYNeto(ticket, extra);
  if (montoDesc <= 0) return ticket;
  return {
    ...ticket,
    montoDescuento: montoDesc,
    totalSinDescuento: bruto,
    subtotal: bruto,
    total: neto,
  };
}

export function totalTicketNeto(ticket) {
  return resolverBrutoYNeto(ticket, sumaPlatosTicket(ticket)).neto;
}
