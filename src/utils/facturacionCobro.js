/**
 * Cobro de caja → sistema de facturación (POST /api/facturacion/comprobantes).
 * No arma correlativos locales: la serie la reserva el backend.
 */
import { getServerBaseUrl } from '../config/apiConfig';
import { platosTicketVisibles, totalesVistaTicket } from './ticketTotales';

const AUTH_KEY = 'cocinaAuth';
const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PREFIJOS_RUC = ['10', '15', '16', '17', '20'];

function tokenCocina() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw).token || null;
  } catch {
    return null;
  }
}

export function esObjectId(v) {
  const id = v && typeof v === 'object' ? v._id : v;
  const s = id ? String(id) : '';
  return /^[a-f0-9]{24}$/i.test(s) ? s : undefined;
}

export function esRucValido(ruc) {
  if (!/^\d{11}$/.test(ruc || '')) return false;
  if (!PREFIJOS_RUC.includes(ruc.slice(0, 2))) return false;
  const suma = PESOS_RUC.reduce((acc, peso, i) => acc + peso * Number(ruc[i]), 0);
  const dv = (11 - (suma % 11)) % 10;
  return dv === Number(ruc[10]);
}

export async function facturacionFetch(ruta, { method = 'GET', body } = {}) {
  const token = tokenCocina();
  const res = await fetch(`${getServerBaseUrl()}${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Error ${res.status}`);
    err.codigo = data.codigo;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function idsTicketsCobro(ticket) {
  if (ticket?._esGrupoComandas && Array.isArray(ticket._grupoTickets) && ticket._grupoTickets.length) {
    return ticket._grupoTickets.map((t) => t._id).filter(Boolean);
  }
  return ticket?._id ? [ticket._id] : [];
}

export function tipoOrigenTicket(ticket) {
  const tipo = String(ticket?.tipo || '').toLowerCase();
  if (tipo === 'adelantado' || tipo === 'pago_adelantado' || ticket?.esPagoAdelantado) return 'adelantado';
  if (tipo === 'pago_parcial') return 'pago_parcial';
  return 'comanda';
}

function etiquetaComandaCorta(ticket) {
  const n = ticket?.comandasNumbers?.[0] ?? ticket?.numeroComandaDia ?? ticket?.ticketNumber;
  return n != null && n !== '' ? `#${n}` : '';
}

export function itemsFiscalesDeTicket(ticket) {
  if (!ticket) return [];
  if (ticket.cobroPorCantidad) {
    const total = Number(ticket.total) || 0;
    if (total <= 0) return [];
    return [{
      descripcion: `Abono comanda ${etiquetaComandaCorta(ticket)}`.trim(),
      cantidad: 1,
      precioUnitario: total,
      unidad: 'NIU',
    }];
  }
  const platos = platosTicketVisibles(ticket);
  if (platos.length) {
    return platos.map((p) => {
      const cantidad = Number(p.cantidad) || 1;
      const precio = Number(p.precio ?? p.precioUnitario);
      const subtotal = Number(p.subtotal);
      const precioUnitario = Number.isFinite(precio) && precio > 0
        ? precio
        : (Number.isFinite(subtotal) ? subtotal / cantidad : 0);
      return {
        descripcion: p.nombre || 'Plato',
        cantidad,
        precioUnitario,
        unidad: 'NIU',
      };
    });
  }
  const total = Number(ticket.total) || 0;
  if (total <= 0) return [];
  return [{
    descripcion: `Consumo comanda ${etiquetaComandaCorta(ticket)}`.trim(),
    cantidad: 1,
    precioUnitario: total,
    unidad: 'NIU',
  }];
}

export function descuentoFiscalDeTicket(ticket) {
  if (!ticket || ticket.cobroPorCantidad) return undefined;
  const { montoDesc } = totalesVistaTicket(ticket);
  if (!(montoDesc > 0)) return undefined;
  return { monto: montoDesc };
}

export function clienteFiscal(tipoSunat, payload) {
  const numDoc = String(payload.clienteDocumento || '').replace(/\D/g, '');
  const nombre = String(payload.clienteNombre || '').trim();
  const direccion = String(payload.clienteDireccion || '').trim();
  if (tipoSunat === '01') {
    return { tipoDoc: '6', numDoc, nombre, direccion, validacionPadron: payload.validacionPadron || 'pendiente' };
  }
  if (!numDoc) return undefined;
  return { tipoDoc: '1', numDoc, nombre: nombre || 'CLIENTES VARIOS', direccion, validacionPadron: payload.validacionPadron || 'pendiente' };
}

export function validarDatosFiscales(tipo, payload, total, limiteBoleta) {
  if (tipo === 'ninguno' || payload.sincronizarFacturacion === false) return '';
  const doc = String(payload.clienteDocumento || '').replace(/\D/g, '');
  const nombre = String(payload.clienteNombre || '').trim();
  const direccion = String(payload.clienteDireccion || '').trim();
  if (tipo === 'factura') {
    if (!esRucValido(doc)) return 'Para factura ingresa un RUC válido de 11 dígitos.';
    if (nombre.length < 3) return 'La factura necesita la razón social.';
    if (!direccion) return 'La factura necesita la dirección fiscal.';
    return '';
  }
  if (tipo === 'boleta') {
    if (doc && !/^\d{8}$/.test(doc)) return 'El DNI debe tener 8 dígitos, o déjalo vacío.';
    const limite = Number(limiteBoleta) || 700;
    if (!doc && Number(total) > limite) return `Boleta mayor a S/ ${limite.toFixed(2)}: hace falta DNI.`;
    if (doc && nombre.length < 3) return 'Escribe el nombre del cliente.';
    return '';
  }
  return '';
}

const MEDIO_FISCAL = {
  efectivo: 'efectivo',
  digital: 'yape',
  tarjeta: 'tarjeta_debito',
  transferencia: 'transferencia',
};

export function solicitudEmision({ ticket, payload, total, cajero, pinSupervisor }) {
  const tipo = payload.tipoComprobante === 'factura' ? '01' : '03';
  const ids = idsTicketsCobro(ticket).map(esObjectId).filter(Boolean);
  const comandas = (Array.isArray(ticket?.comandas) ? ticket.comandas : []).map(esObjectId).filter(Boolean);
  const numMesa = Number(ticket?.numMesa ?? ticket?.mesa?.nummesa);
  return {
    tipo,
    cliente: clienteFiscal(tipo, payload),
    items: itemsFiscalesDeTicket(ticket),
    descuentoGlobal: descuentoFiscalDeTicket(ticket),
    pagos: [{ medio: MEDIO_FISCAL[payload.metodoPago] || 'efectivo', monto: Number(total) }],
    pinSupervisor: pinSupervisor || undefined,
    cajero: cajero || null,
    origen: {
      mesa: esObjectId(ticket?.mesa),
      numMesa: Number.isFinite(numMesa) ? numMesa : null,
      mozo: esObjectId(ticket?.mozo),
      boucher: esObjectId(ticket?.boucher),
      comandas,
      ticket: ids[0] || undefined,
      tickets: ids,
      ticketTipo: tipoOrigenTicket(ticket),
    },
  };
}

export async function cotizarTicket(ticket, tipoComprobante) {
  const tipo = tipoComprobante === 'factura' ? '01' : '03';
  return facturacionFetch('/api/facturacion/cotizar', {
    method: 'POST',
    body: {
      tipo,
      items: itemsFiscalesDeTicket(ticket),
      descuentoGlobal: descuentoFiscalDeTicket(ticket),
    },
  });
}

export async function emitirComprobanteTicket(ticket, payload, cajero, pinSupervisor, total) {
  const body = solicitudEmision({ ticket, payload, total, cajero, pinSupervisor });
  if (!body.items.length) {
    const err = new Error('Este ticket no tiene consumo para emitir.');
    err.codigo = 'SIN_ITEMS';
    throw err;
  }
  const r = await facturacionFetch('/api/facturacion/comprobantes', { method: 'POST', body });
  const doc = r.comprobante || {};
  return {
    id: doc._id ? String(doc._id) : '',
    serieNumero: doc.idCompleto || '',
    tipo: doc.tipo || body.tipo,
  };
}

export async function leerSeriesFiscales() {
  const cfg = await facturacionFetch('/api/facturacion/configuracion');
  return {
    boleta: cfg?.series?.['03'] || 'B001',
    factura: cfg?.series?.['01'] || 'F001',
    limiteBoleta: Number(cfg?.limiteBoletaAnonima) || 700,
    listo: cfg?.listoParaEmitir !== false,
  };
}

export async function consultarPadron(tipoDoc, numero) {
  return facturacionFetch(`/api/facturacion/padron/${tipoDoc}/${encodeURIComponent(numero)}`);
}

export async function listarMarcasFacturadas() {
  const data = await facturacionFetch('/api/facturacion/tickets-facturados');
  return Array.isArray(data?.marcas) ? data.marcas : [];
}

export function aplicarMarcasFactura(tickets, marcas) {
  if (!marcas?.length) return tickets;
  const byId = new Map(marcas.map((m) => [String(m.id), m]));
  return (tickets || []).map((t) => {
    const m = byId.get(String(t?._id));
    if (!m) return t;
    return { ...t, comprobanteSerieNumero: m.serieNumero, comprobanteTipo: m.tipo };
  });
}
