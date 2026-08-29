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
  if (ticket?.estado === 'pendiente_aprobacion') return 'Pago: Pendiente';
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
