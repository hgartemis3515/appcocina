function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function idsComanda(ticket) {
  const ids = (ticket?.comandas || [])
    .map((c) => String(c?._id || c?.id || c || ''))
    .filter((id) => id && id !== 'undefined');
  return ids.sort().join(',');
}

function sumaPlatos(ticket) {
  return round2((ticket?.platos || []).reduce((s, p) => {
    const sub = Number(p?.subtotal);
    if (Number.isFinite(sub) && sub > 0) return s + sub;
    return s + (Number(p?.precio) || 0) * (Number(p?.cantidad) || 1);
  }, 0));
}

/** Agrupa abonos por dinero para pintarlos bajo el total de la cuenta. */
export function indexarCobroPorCantidad(tickets = []) {
  const grupos = new Map();
  for (const t of tickets || []) {
    if (!t?._id) continue;
    const key = idsComanda(t) || `t:${t._id}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(t);
  }
  const porTicket = new Map();
  for (const list of grupos.values()) {
    const abonos = list.filter((t) => t.cobroPorCantidad === true);
    if (!abonos.length) continue;
    const anclas = list.filter((t) => t.cobroPorCantidad !== true);
    const anchor = anclas[0] || abonos[abonos.length - 1];
    const bill = round2(Math.max(
      0,
      ...list.map((t) => Number(t.totalCuenta) || 0),
      ...list.map(sumaPlatos),
    ));
    const pagos = list.map((t) => ({
      id: String(t._id),
      ticketNumber: t.ticketNumber,
      monto: round2(Number(t.total) || 0),
      metodo: t.metodoPago || '',
      createdAt: t.createdAt,
      abono: t.cobroPorCantidad === true,
      voucherId: t.voucherId || null,
    }));
    const cobrado = round2(pagos.reduce((s, p) => s + p.monto, 0));
    const restante = round2(Math.max(0, bill - cobrado));
    const vista = {
      anchorId: String(anchor._id),
      bill,
      restante,
      abonos: pagos.filter((p) => p.abono),
      pagos,
      mostrarAbonos: restante > 0.009,
      mostrarHistorial: restante <= 0.009 && pagos.length > 1,
    };
    for (const t of list) porTicket.set(String(t._id), vista);
  }
  return porTicket;
}

export function idsOcultosCobro(porTicket, visibles = []) {
  const ids = new Set((visibles || []).map((t) => String(t?._id)));
  const hide = new Set();
  for (const t of visibles || []) {
    const vista = porTicket.get(String(t?._id));
    if (!vista) continue;
    if (String(t._id) !== vista.anchorId && ids.has(vista.anchorId)) hide.add(String(t._id));
  }
  return hide;
}
