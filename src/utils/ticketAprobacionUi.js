import moment from 'moment-timezone';

const ZONA = 'America/Lima';
const MODO_VISTA_KEY = 'cocinaTicketsModoVista';
const TABLA_PREFS_KEY = 'cocinaTicketsTablaPrefs';
const MAX_DIAS_RANGO = 90;
const DEFAULT_DIAS = 30;

export const DEFAULT_TICKETS_TABLA_PREFS = {
  ocultarGuarniciones: false,
  imprimirSinGuarniciones: false,
};

export const getFechaOperativa = () => moment().tz(ZONA).format('YYYY-MM-DD');

export function rangoFechasDefault() {
  const hasta = getFechaOperativa();
  const desde = moment.tz(hasta, ZONA).subtract(DEFAULT_DIAS, 'days').format('YYYY-MM-DD');
  return { desde, hasta };
}

export function clampRangoFechas(fechaDesde, fechaHasta) {
  const hoy = getFechaOperativa();
  let desde = fechaDesde || moment.tz(hoy, ZONA).subtract(DEFAULT_DIAS, 'days').format('YYYY-MM-DD');
  let hasta = fechaHasta || hoy;
  const start = moment.tz(desde, ZONA);
  const end = moment.tz(hasta, ZONA);
  if (!start.isValid() || !end.isValid()) return rangoFechasDefault();
  if (end.isBefore(start)) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }
  if (moment.tz(hasta, ZONA).diff(moment.tz(desde, ZONA), 'days') > MAX_DIAS_RANGO) {
    hasta = moment.tz(desde, ZONA).add(MAX_DIAS_RANGO, 'days').format('YYYY-MM-DD');
  }
  return { desde, hasta };
}

export function loadModoVistaTickets() {
  try {
    const v = localStorage.getItem(MODO_VISTA_KEY);
    if (v === 'avanzado' || v === 'mozos') return v;
    return 'basico';
  } catch {
    return 'basico';
  }
}

export function saveModoVistaTickets(modo) {
  try {
    const v = modo === 'avanzado' || modo === 'mozos' ? modo : 'basico';
    localStorage.setItem(MODO_VISTA_KEY, v);
  } catch {
    /* ignore */
  }
}

export function loadTicketsTablaPrefs() {
  try {
    const raw = localStorage.getItem(TABLA_PREFS_KEY);
    if (!raw) return { ...DEFAULT_TICKETS_TABLA_PREFS };
    const parsed = JSON.parse(raw);
    return {
      ocultarGuarniciones: !!parsed?.ocultarGuarniciones,
      imprimirSinGuarniciones: !!parsed?.imprimirSinGuarniciones,
    };
  } catch {
    return { ...DEFAULT_TICKETS_TABLA_PREFS };
  }
}

export function saveTicketsTablaPrefs(prefs) {
  const next = {
    ocultarGuarniciones: !!prefs?.ocultarGuarniciones,
    imprimirSinGuarniciones: !!prefs?.imprimirSinGuarniciones,
  };
  try {
    localStorage.setItem(TABLA_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export const formatCurrency = (amount) => `S/. ${Number(amount || 0).toFixed(2)}`;

export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`.trim();
};

export const labelPagoTicket = (ticket) => {
  if (ticket?.estado === 'pendiente_aprobacion') {
    if (ticket.boucher) return 'Por aprobar';
    return 'Pago: Pendiente';
  }
  if (ticket?.pagoForzado) return `Forzado · ${ticket.metodoPago || 'efectivo'}`;
  if (ticket?.metodoPago) return ticket.metodoPago;
  return 'Pago: Pendiente';
};

export const tipoBadge = (tipo) => {
  const t = String(tipo || '').toLowerCase();
  if (t === 'comanda_completa' || t === 'comanda') {
    return { label: 'COMANDA', bg: 'bg-blue-500/30 text-blue-300 border-blue-500/40' };
  }
  if (t === 'pago_parcial') {
    return { label: 'PAGO PARCIAL', bg: 'bg-amber-500/30 text-amber-300 border-amber-500/40' };
  }
  if (t === 'pago_adelantado' || t === 'adelantado') {
    return { label: 'ADELANTADO', bg: 'bg-violet-500/30 text-violet-300 border-violet-500/40' };
  }
  return { label: tipo || 'OTRO', bg: 'bg-gray-500/30 text-gray-300 border-gray-500/40' };
};

export const estadoTicketMeta = (estado) => {
  if (estado === 'pendiente_aprobacion') {
    return { label: 'Pendiente', short: '⏳ Pendiente', bg: 'bg-yellow-500/30 text-yellow-300' };
  }
  if (estado === 'aprobado') {
    return { label: 'Aprobado', short: '✅ Aprobado', bg: 'bg-green-500/30 text-green-300' };
  }
  if (estado === 'reportado') {
    return { label: 'Reportado', short: '🔴 Reportado', bg: 'bg-red-500/30 text-red-300' };
  }
  if (estado === 'rechazado') {
    return { label: 'Rechazado', short: '❌ Rechazado', bg: 'bg-gray-500/30 text-gray-300' };
  }
  return { label: estado || '—', short: estado || '—', bg: 'bg-gray-500/30 text-gray-300' };
};

/** Comanda cerrada en comandas.html (chip Pagado / Entregado / Completado). */
const ESTADOS_COMANDA_CERRADA = new Set(['entregado', 'pagado', 'completado']);
/** Plato ya entregado en app mozos (no basta salió ni pago adelantado). */
const ESTADOS_PLATO_ENTREGADO_MOZOS = new Set(['entregado', 'pagado']);

const META_ENTREGA_SI = {
  label: 'ENTREGADO',
  entregado: true,
  bg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
};
const META_ENTREGA_NO = {
  label: 'Pendiente',
  entregado: false,
  bg: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
};

function statusComandaDeTicket(c) {
  if (!c || typeof c !== 'object') return '';
  return String(c.status || c.estado || '').toLowerCase();
}

function platoLineaActivaEntrega(p) {
  if (!p || p.eliminado || p.anulado) return false;
  const e = String(p.estado || '').toLowerCase();
  if (e === 'cancelado' || e === 'anulado') return false;
  return true;
}

/** Estados vivos de plato en comandas populadas (no el snapshot del ticket). */
function estadosPlatosVivosComanda(ticket) {
  const cmds = Array.isArray(ticket?.comandas) ? ticket.comandas : [];
  const estados = [];
  for (const c of cmds) {
    if (!c || typeof c !== 'object') continue;
    const platos = Array.isArray(c.platos) ? c.platos : [];
    for (const p of platos) {
      if (!platoLineaActivaEntrega(p)) continue;
      estados.push(String(p.estado || '').toLowerCase());
    }
  }
  return estados;
}

function todosPlatosEntregadosEnMozos(estados) {
  if (!estados.length) return false;
  return estados.every((s) => ESTADOS_PLATO_ENTREGADO_MOZOS.has(s));
}

function comandasCerradasComoHtml(ticket) {
  const cmds = Array.isArray(ticket?.comandas) ? ticket.comandas : [];
  const statuses = cmds.map(statusComandaDeTicket).filter(Boolean);
  if (!statuses.length) return false;
  return statuses.every((s) => ESTADOS_COMANDA_CERRADA.has(s));
}

function mesaEstaLibre(ticket) {
  const mesa = ticket?.mesa;
  if (!mesa || typeof mesa !== 'object') return null;
  const e = String(mesa.estado || '').toLowerCase();
  if (!e) return null;
  return e === 'libre';
}

export const esPagoAdelantado = (ticket) => {
  if (ticket?.esPagoAdelantado === true) return true;
  const t = String(ticket?.tipo || '').toLowerCase();
  return t === 'pago_adelantado' || t === 'adelantado';
};

/**
 * Estado de entrega de la comanda (comandas.html), no el de aprobación del ticket.
 * Pago adelantado: ENTREGADO solo si en mozos los platos ya están entregado/pagado.
 * Comanda normal: ENTREGADO si en comandas.html está pagado/entregado/completado,
 * o si los platos ya se entregaron en mozos y la mesa quedó libre.
 */
export function estadoEntregaComandaTicket(ticket) {
  const vivos = estadosPlatosVivosComanda(ticket);
  const entregadosMozos = todosPlatosEntregadosEnMozos(vivos);

  if (esPagoAdelantado(ticket)) {
    return entregadosMozos ? META_ENTREGA_SI : META_ENTREGA_NO;
  }

  const cerradas = comandasCerradasComoHtml(ticket);
  const mesaLibre = mesaEstaLibre(ticket);

  if (cerradas) return META_ENTREGA_SI;
  if (entregadosMozos && mesaLibre === true) return META_ENTREGA_SI;

  return META_ENTREGA_NO;
}

export function estadoEntregaTickets(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  if (!list.length) return META_ENTREGA_NO;
  const metas = list.map(estadoEntregaComandaTicket);
  if (metas.every((m) => m.entregado)) return META_ENTREGA_SI;
  return META_ENTREGA_NO;
}

export const nombreClienteTicket = (ticket) =>
  ticket?.cliente?.nombre || ticket?.nombreCliente || ticket?.clienteNombre || '';

export const dniClienteTicket = (ticket) =>
  ticket?.cliente?.dni || ticket?.dniCliente || ticket?.clienteDni || '';

export const esTicketComanda = (ticket) =>
  ticket?.tipo === 'comanda_completa' || String(ticket?.tipo || '').toUpperCase() === 'COMANDA';

export const esPagoParcial = (ticket) => ticket?.tipo === 'pago_parcial';

export function ticketTieneExtraLlevar(ticket) {
  return (ticket?.platos || []).some(
    (p) => p && !p.eliminado && !p.anulado && p.tipoServicio === 'extra_llevar'
  );
}

export function etiquetaTipoServicioTicket(tipo) {
  if (tipo === 'extra_llevar') return 'EXTRA LLEVAR';
  if (tipo === 'para_llevar') return 'Para llevar';
  return '';
}

export function ticketEsAltaSinPago(ticket) {
  if (!ticket) return false;
  const origen = String(ticket.origen || '').toLowerCase();
  return ticket.estado === 'pendiente_aprobacion'
    && !ticket.boucher
    && (origen === 'alta_comanda' || origen === 'alta');
}

export function ticketPuedeAprobarse(ticket) {
  if (!ticket || ticket.estado !== 'pendiente_aprobacion') return false;
  if (esPagoAdelantado(ticket)) return true;
  return !!ticket.boucher;
}

export function ticketPuedeForzarPago(ticket) {
  if (!ticket || ticket.estado !== 'pendiente_aprobacion') return false;
  if (esPagoAdelantado(ticket)) return false;
  return esTicketComanda(ticket) || esPagoParcial(ticket);
}

export function limaHM(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('es-PE', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function limaDayStart(ymd) {
  return moment.tz(ymd, 'YYYY-MM-DD', ZONA).startOf('day').toDate();
}

export function limaDayEnd(ymd) {
  return moment.tz(ymd, 'YYYY-MM-DD', ZONA).endOf('day').toDate();
}

export function rangoFechasDePeriodo(periodo, customDesde, customHasta) {
  const hoy = getFechaOperativa();
  const key = String(periodo || 'hoy').toLowerCase();
  if (key === 'todos') {
    return {
      desde: moment.tz(hoy, ZONA).subtract(MAX_DIAS_RANGO, 'days').format('YYYY-MM-DD'),
      hasta: hoy,
    };
  }
  if (key === 'ayer') {
    const ayer = moment.tz(hoy, ZONA).subtract(1, 'day').format('YYYY-MM-DD');
    return { desde: ayer, hasta: ayer };
  }
  if (key === '7dias') {
    return { desde: moment.tz(hoy, ZONA).subtract(6, 'days').format('YYYY-MM-DD'), hasta: hoy };
  }
  if (key === 'custom') {
    return clampRangoFechas(customDesde || hoy, customHasta || hoy);
  }
  return { desde: hoy, hasta: hoy };
}

/** Misma lógica que comandas.html matchFechaRango. */
export function matchFechaRangoTicket(createdAt, {
  periodo = 'hoy',
  primerCierreHoyAt = null,
  desde = null,
  hasta = null,
} = {}) {
  const key = String(periodo || 'hoy').toLowerCase();
  if (key === 'todos') return true;
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;

  if (key === 'dia' || key === 'noche') {
    if (!primerCierreHoyAt) return false;
    const corte = new Date(primerCierreHoyAt).getTime();
    const ymd = getFechaOperativa();
    if (t < limaDayStart(ymd).getTime() || t > limaDayEnd(ymd).getTime()) return false;
    if (key === 'dia') return t < corte;
    return t >= corte;
  }

  const ymd = moment.tz(createdAt, ZONA).format('YYYY-MM-DD');
  if (key === 'hoy') return ymd === getFechaOperativa();
  if (key === 'ayer') {
    const ayer = moment.tz(ZONA).subtract(1, 'day').format('YYYY-MM-DD');
    return ymd === ayer;
  }
  if (desde && ymd < desde) return false;
  if (hasta && ymd > hasta) return false;
  return true;
}

/**
 * Rango que usa /api/aprobacion/desglose-ventas (igual que cierre/reportes).
 * DIA = 00:00 → primer cierre; NOCHE = primer cierre → 23:59.
 */
export function rangoConsultaDesglose(periodo, {
  primerCierreHoyAt = null,
  fechaDesde = null,
  fechaHasta = null,
} = {}) {
  const key = String(periodo || 'hoy').toLowerCase();
  const hoy = getFechaOperativa();
  const corte = primerCierreHoyAt ? new Date(primerCierreHoyAt) : null;
  const corteOk = corte && Number.isFinite(corte.getTime());
  if (key === 'dia' && corteOk) {
    return {
      fechaInicio: moment.tz(hoy, 'YYYY-MM-DD', ZONA).startOf('day').toISOString(),
      fechaFin: corte.toISOString(),
    };
  }
  if (key === 'noche' && corteOk) {
    return {
      fechaInicio: corte.toISOString(),
      fechaFin: moment.tz(hoy, 'YYYY-MM-DD', ZONA).endOf('day').toISOString(),
    };
  }
  const r = rangoFechasDePeriodo(periodo, fechaDesde, fechaHasta);
  return { fechaInicio: r.desde, fechaFin: r.hasta };
}

export function etiquetaPeriodoTickets(periodo, primerCierreHoyAt) {
  const key = String(periodo || '').toLowerCase();
  if (key === 'dia' && primerCierreHoyAt) {
    return `Día · ${getFechaOperativa()} 00:00–${limaHM(primerCierreHoyAt)}`;
  }
  if (key === 'noche' && primerCierreHoyAt) {
    return `Noche · ${limaHM(primerCierreHoyAt)}–23:59`;
  }
  return '';
}

/** Igual que comandas.html refreshTurnosCierre: al primer cierre del día pasa a NOCHE. */
export function nextTurnosCierreState(prev, data) {
  const ymd = getFechaOperativa();
  if (!data || typeof data.limaYMD !== 'string') return prev;
  const mismoDia = data.limaYMD === ymd;
  const cantidad = mismoDia ? (Number(data.cantidad) || 0) : 0;
  const hay = mismoDia && data.hayCierreHoy === true && cantidad >= 1 && !!data.primerCierreAt;
  let filtroPeriodo = prev.filtroPeriodo;
  let autoNocheHecho = prev._turnosAutoNocheHecho === true;
  const diaCambio = prev.turnosLimaYMD && prev.turnosLimaYMD !== ymd;

  if (diaCambio) {
    autoNocheHecho = false;
    if (filtroPeriodo === 'dia' || filtroPeriodo === 'noche') filtroPeriodo = 'hoy';
  }

  if (hay && !autoNocheHecho) {
    filtroPeriodo = 'noche';
    autoNocheHecho = true;
  }
  if (!hay) {
    autoNocheHecho = false;
    if (filtroPeriodo === 'dia' || filtroPeriodo === 'noche') filtroPeriodo = 'hoy';
  }

  return {
    filtroPeriodo,
    showTurnoDiaNoche: hay,
    primerCierreHoyAt: hay ? data.primerCierreAt : null,
    cierresHoyCount: cantidad,
    turnosLimaYMD: ymd,
    _turnosAutoNocheHecho: autoNocheHecho,
  };
}

export const PRESETS_PERIODO_TICKETS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7dias', label: '7 días' },
  { id: 'todos', label: 'Todos' },
  { id: 'custom', label: 'Personalizado' },
];
