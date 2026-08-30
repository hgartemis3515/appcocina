import moment from 'moment-timezone';

const ZONA = 'America/Lima';
const MODO_VISTA_KEY = 'cocinaTicketsModoVista';
const MAX_DIAS_RANGO = 90;
const DEFAULT_DIAS = 30;

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
    return localStorage.getItem(MODO_VISTA_KEY) === 'avanzado' ? 'avanzado' : 'basico';
  } catch {
    return 'basico';
  }
}

export function saveModoVistaTickets(modo) {
  try {
    localStorage.setItem(MODO_VISTA_KEY, modo === 'avanzado' ? 'avanzado' : 'basico');
  } catch {
    /* ignore */
  }
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

export const nombreClienteTicket = (ticket) =>
  ticket?.cliente?.nombre || ticket?.nombreCliente || ticket?.clienteNombre || '';

export const dniClienteTicket = (ticket) =>
  ticket?.cliente?.dni || ticket?.dniCliente || ticket?.clienteDni || '';

export const esTicketComanda = (ticket) =>
  ticket?.tipo === 'comanda_completa' || String(ticket?.tipo || '').toUpperCase() === 'COMANDA';

export const esPagoParcial = (ticket) => ticket?.tipo === 'pago_parcial';

export const esPagoAdelantado = (ticket) => {
  const t = String(ticket?.tipo || '').toLowerCase();
  return t === 'pago_adelantado' || t === 'adelantado';
};

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
