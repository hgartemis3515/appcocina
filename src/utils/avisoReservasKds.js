/** Recordatorio de reservas cobradas que todavía no entraron a cocina. */
export const INTERVALO_AVISO_RESERVA_MS = 30 * 60 * 1000;

/** Solo después de Cobrar. Pendiente de cobro no enciende el icono Reserva. */
export function reservaCobradaPendienteDeCocina(reserva) {
  const estado = String(reserva?.estado || '').toLowerCase();
  if (estado !== 'pendiente') return false;
  const ticket = String(reserva?.pagoAdelantado?.estadoTicket || '').toLowerCase();
  if (ticket === 'pendiente_aprobacion' || ticket === 'rechazado') return false;
  return true;
}

export function horaDisponibleReserva(reserva) {
  const fecha = reserva?.fechaCocina || reserva?.fechaReserva;
  if (!fecha) return '—';
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function textoAvisoReserva(reserva) {
  const mesa = reserva?.mesa?.nummesa ?? '?';
  const num = reserva?.comandaGenerada?.numeroComandaDia
    || reserva?.comandaGenerada?.comandaNumber
    || reserva?.comanda?.comandaNumber
    || '';
  const comanda = num ? `Comanda #${num}` : 'Comanda reserva';
  return `${comanda} · Mesa ${mesa} disponible a las ${horaDisponibleReserva(reserva)}`;
}

export function reservasParaAvisar(reservas, ultimoAviso, ahora = Date.now(), intervalo = INTERVALO_AVISO_RESERVA_MS) {
  const lista = Array.isArray(reservas) ? reservas : [];
  const vistos = ultimoAviso instanceof Map ? ultimoAviso : new Map();
  return lista.filter((reserva) => {
    const id = String(reserva?._id || '');
    if (!id) return false;
    if (!vistos.has(id)) return true;
    return ahora - vistos.get(id) >= intervalo;
  });
}

export function avisoReservasAToast(reservas) {
  const textos = (reservas || []).map(textoAvisoReserva).filter(Boolean);
  return {
    type: 'info',
    message: textos.join(' · ') || 'Reserva disponible',
    duration: 12000,
  };
}
