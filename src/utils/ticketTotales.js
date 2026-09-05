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

export function totalesVistaTicket(ticket) {
  return resolverBrutoYNeto(ticket, sumaPlatosTicket(ticket));
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function idDeRef(v) {
  if (v == null) return '';
  if (typeof v === 'object') return String(v._id || v.id || '');
  return String(v);
}

function idsComandaDeTicket(t, index) {
  const raw = Array.isArray(t && t.comandas) ? t.comandas : [];
  const ids = raw.map(idDeRef).filter(Boolean);
  if (ids.length) return ids;
  if (t && t.comandaId != null) {
    const cid = idDeRef(t.comandaId);
    if (cid) return [cid];
  }
  if (t && t._id != null) return [String(t._id)];
  return [`__orphan_${index}`];
}

function tsTicket(t) {
  const d = t && t.createdAt ? new Date(t.createdAt).getTime() : 0;
  return Number.isFinite(d) ? d : 0;
}

function ticketMasNuevo(a, b) {
  const ta = tsTicket(a);
  const tb = tsTicket(b);
  if (ta !== tb) return ta > tb ? a : b;
  const na = Number(a && a.ticketNumber) || 0;
  const nb = Number(b && b.ticketNumber) || 0;
  if (na !== nb) return na > nb ? a : b;
  return String(a && a._id) >= String(b && b._id) ? a : b;
}

/** Último ticket por comanda; el mismo ticket no se cuenta dos veces. */
export function ultimoTicketPorComanda(tickets) {
  const byComanda = new Map();
  (tickets || []).forEach((t, index) => {
    if (!t) return;
    for (const cid of idsComandaDeTicket(t, index)) {
      const prev = byComanda.get(cid);
      byComanda.set(cid, prev ? ticketMasNuevo(t, prev) : t);
    }
  });
  const seenObj = new Set();
  const seenId = new Set();
  const out = [];
  for (const t of byComanda.values()) {
    if (seenObj.has(t)) continue;
    seenObj.add(t);
    if (t._id != null) {
      const id = String(t._id);
      if (seenId.has(id)) continue;
      seenId.add(id);
    }
    out.push(t);
  }
  return out;
}

/**
 * KPIs de la tabla de tickets:
 * Ventas pendientes / Ventas pagadas / Descuentos (solo si hay).
 * Solo el último ticket de cada comanda. Total venta = pendiente + pagadas.
 */
export function resumenKpisTickets(tickets = []) {
  let pendiente = 0;
  let aprobados = 0;
  let descuento = 0;
  for (const t of ultimoTicketPorComanda(tickets)) {
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
