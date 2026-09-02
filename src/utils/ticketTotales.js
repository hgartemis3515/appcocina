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

export function platosTicketVisibles(ticket) {
  return (ticket?.platos || []).filter((p) => p && !p.eliminado && !p.anulado);
}

function idLineaPlato(p) {
  return String((p && (p.platoLineaId || p._id)) || '').trim();
}

/**
 * Enriquecer líneas del ticket con la comanda en vivo (guarniciones, estado, nota).
 * Cantidad/precio del ticket se conservan (son lo cobrado en ese envío).
 */
export function mergePlatosTicketConComandas(ticket, comandasLive = []) {
  const byLinea = new Map();
  for (const c of comandasLive || []) {
    if (!c || !Array.isArray(c.platos)) continue;
    c.platos.forEach((p, i) => {
      if (!p || p.eliminado || p.anulado) return;
      const id = p._id ? String(p._id) : '';
      if (!id) return;
      const cant = Number(c.cantidades?.[i] ?? p.cantidad) || 1;
      byLinea.set(id, { live: p, cantidadLive: cant, comandaNumber: c.comandaNumber });
    });
  }

  const vis = platosTicketVisibles(ticket);
  if (vis.length) {
    return vis.map((tp) => {
      const hit = byLinea.get(idLineaPlato(tp));
      if (!hit) return tp;
      const live = hit.live;
      const compsLive = live.complementosSeleccionados || live.complementos;
      return {
        ...tp,
        nombre: tp.nombre || live.nombre || live.plato?.nombre,
        estado: live.estado || tp.estado,
        notaEspecial: live.notaEspecial || tp.notaEspecial,
        tipoServicio: tp.tipoServicio || live.tipoServicio,
        complementosSeleccionados: (Array.isArray(compsLive) && compsLive.length)
          ? compsLive
          : (tp.complementosSeleccionados || tp.complementos || []),
        mostrarResumenComplementos: live.mostrarResumenComplementos ?? tp.mostrarResumenComplementos,
        resumenComplementosImpresion: live.resumenComplementosImpresion || tp.resumenComplementosImpresion,
      };
    });
  }

  return [...byLinea.values()].map(({ live, cantidadLive, comandaNumber }) => ({
    ...live,
    nombre: live.nombre || live.plato?.nombre || 'Plato',
    cantidad: cantidadLive,
    precio: live.precioUnitario ?? live.precio ?? live.plato?.precio ?? 0,
    subtotal: (Number(live.precioUnitario ?? live.precio ?? live.plato?.precio) || 0) * cantidadLive,
    comandaNumber,
    complementosSeleccionados: live.complementosSeleccionados || live.complementos || [],
  }));
}

function sumaPlatosTicket(doc) {
  const platos = platosTicketVisibles(doc);
  if (!platos.length) return 0;
  const suma = platos.reduce((s, p) => {
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
  const plates = sumaPlatosTicket(doc);
  const tot = Number(doc?.total);
  const haySnapshot = Array.isArray(doc?.platos) && doc.platos.length > 0;
  const bruto = haySnapshot
    ? plates
    : (maxPositivo(
      extra,
      doc?.totalSinDescuento,
      plates,
      brutoDesdeComandas(doc),
      doc?.subtotal,
      Number.isFinite(tot) && tot > 0 && !(montoDesc > 0) ? tot : 0
    ) || (Number.isFinite(tot) && tot > 0 ? tot : 0));
  const neto = montoDesc > 0
    ? Number(Math.max(0, bruto - montoDesc).toFixed(2))
    : (haySnapshot ? bruto : (Number.isFinite(tot) && tot > 0 ? tot : bruto));
  return { bruto, neto, montoDesc };
}

export function aplicarTotalNetoTicket(ticket) {
  if (!ticket) return ticket;
  const extra = sumaPlatosTicket(ticket);
  const { bruto, neto, montoDesc } = resolverBrutoYNeto(ticket, extra);
  const haySnapshot = Array.isArray(ticket.platos) && ticket.platos.length > 0;
  if (montoDesc <= 0 && !haySnapshot) return ticket;
  if (montoDesc <= 0) {
    if (Number(ticket.total) === bruto && Number(ticket.subtotal) === bruto) return ticket;
    return {
      ...ticket,
      totalSinDescuento: bruto,
      subtotal: bruto,
      total: bruto,
    };
  }
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

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * KPIs de la tabla de tickets (misma idea que reportes.html):
 * Pendiente / Aprobados / Descuento / Total venta.
 * Total venta = pendiente + aprobado. Descuento solo suma esos estados.
 */
export function resumenKpisTickets(tickets = []) {
  let pendiente = 0;
  let aprobados = 0;
  let descuento = 0;
  for (const t of tickets || []) {
    const { neto, montoDesc } = resolverBrutoYNeto(t, sumaPlatosTicket(t));
    const est = String(t.estado || '').toLowerCase();
    if (est === 'pendiente_aprobacion') {
      pendiente += neto;
      if (montoDesc > 0) descuento += montoDesc;
    } else if (est === 'aprobado') {
      aprobados += neto;
      if (montoDesc > 0) descuento += montoDesc;
    }
  }
  return {
    pendiente: round2(pendiente),
    aprobados: round2(aprobados),
    descuento: round2(descuento),
    totalVenta: round2(pendiente + aprobados),
  };
}
