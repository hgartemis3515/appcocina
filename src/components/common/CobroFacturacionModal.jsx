import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes, FaMoneyBill, FaMobileAlt, FaCreditCard, FaUniversity,
  FaReceipt, FaFileInvoice, FaCashRegister, FaUser, FaUtensils,
  FaHashtag, FaCalendarAlt, FaExclamationCircle, FaCheck, FaSearch,
} from 'react-icons/fa';
import {
  formatCurrency, formatDate, formatTime, labelPagoTicket, tipoBadge,
  etiquetaMesaTicket, nombreClienteTicket, dniClienteTicket, nombresClienteDeTicket,
  estadoEntregaComandaTicket, ticketEsParaLlevar, ticketEsReserva,
} from '../../utils/ticketAprobacionUi';
import { totalesVistaTicket, platosTicketVisibles, saldoPendienteTicket } from '../../utils/ticketTotales';
import { getComandaDisplayLabel, getCantidadComandas } from '../../utils/ticketComandaDisplay';
import { getMozoNombre, fechaCreacionComandaDeTicket } from '../../utils/ticketSort';
import { getComplementosDePlato } from '../../utils/platoComplementos';
import {
  cotizarTicket, leerSeriesFiscales, consultarPadron, validarDatosFiscales,
} from '../../utils/facturacionCobro';

const METODOS = [
  { id: 'efectivo', label: 'Efectivo', Icon: FaMoneyBill },
  { id: 'digital', label: 'Yape / Plin', Icon: FaMobileAlt },
  { id: 'tarjeta', label: 'Tarjeta POS', Icon: FaCreditCard },
  { id: 'transferencia', label: 'Transferencia', Icon: FaUniversity },
];

const TIPOS = [
  { id: 'boleta', label: 'Boleta', sub: 'DNI o clientes varios' },
  { id: 'factura', label: 'Factura', sub: 'RUC 11 dígitos' },
  { id: 'ninguno', label: 'Solo caja', sub: 'Sin comprobante' },
];

function parseMonto(str) {
  const n = parseFloat(String(str ?? '').replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export default function CobroFacturacionModal({
  ticket,
  mode = 'forzar',
  ocultarGuarniciones = false,
  loading = false,
  onClose,
  onConfirm,
}) {
  const isForzar = mode === 'forzar';
  const { bruto, neto, montoDesc } = useMemo(() => totalesVistaTicket(ticket), [ticket]);
  const platos = useMemo(() => platosTicketVisibles(ticket), [ticket]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibidoStr, setMontoRecibidoStr] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('ninguno');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [sincronizar, setSincronizar] = useState(true);
  const [padron, setPadron] = useState('');
  const [series, setSeries] = useState({ boleta: 'B001', factura: 'F001', limiteBoleta: 700 });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pidePin, setPidePin] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!ticket) return;
    const total = neto > 0 ? neto : bruto;
    setMetodoPago(ticket.metodoPago || 'efectivo');
    setMontoRecibidoStr(total > 0 ? total.toFixed(2) : '');
    setReferenciaPago(typeof ticket.boucher === 'string' ? ticket.boucher : '');
    setTipoComprobante('ninguno');
    setClienteDocumento(ticket.cliente?.ruc || dniClienteTicket(ticket) || '');
    setClienteNombre(nombreClienteTicket(ticket) || '');
    setClienteDireccion(ticket.cliente?.direccion || '');
    setSincronizar(true);
    setPadron('');
    setQuote(null);
    setQuoteError('');
    setErrorMsg('');
    setPidePin(false);
    setPin('');
  }, [ticket, mode, neto, bruto]);

  useEffect(() => {
    let vivo = true;
    leerSeriesFiscales().then((cfg) => { if (vivo) setSeries(cfg); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!ticket || tipoComprobante === 'ninguno') {
      setQuote(null);
      setQuoteError('');
      return undefined;
    }
    let vivo = true;
    const timer = setTimeout(() => {
      cotizarTicket(ticket, tipoComprobante)
        .then((q) => { if (vivo) { setQuote(q); setQuoteError(''); } })
        .catch((err) => { if (vivo) { setQuote(null); setQuoteError(err.message); } });
    }, 250);
    return () => { vivo = false; clearTimeout(timer); };
  }, [ticket, tipoComprobante]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, loading]);

  if (!ticket) return null;

  const totalCaja = neto > 0 ? neto : bruto;
  const totalCobrar = tipoComprobante !== 'ninguno' && quote?.totales?.importeTotal != null
    ? Number(quote.totales.importeTotal)
    : totalCaja;
  const recibido = parseMonto(montoRecibidoStr);
  const vuelto = metodoPago === 'efectivo' ? Math.max(0, Math.round((recibido - totalCobrar) * 100) / 100) : 0;
  const fechaCmd = fechaCreacionComandaDeTicket(ticket);
  const comandaLabel = getComandaDisplayLabel(ticket);
  const badge = tipoBadge(ticket.tipo);
  const entrega = estadoEntregaComandaTicket(ticket);
  const clienteDisplay = nombresClienteDeTicket(ticket).join(', ') || 'Cliente general';
  const dniDisplay = ticket.cliente?.ruc || dniClienteTicket(ticket);
  const saldoPend = saldoPendienteTicket(ticket);
  const rapidos = [totalCobrar, 50, 100, 200].filter((v, i, arr) => v >= totalCobrar - 0.001 && arr.indexOf(v) === i);

  const buscarPadron = async () => {
    const tipoDoc = tipoComprobante === 'factura' ? '6' : '1';
    setErrorMsg('');
    try {
      const r = await consultarPadron(tipoDoc, clienteDocumento);
      if (r.nombre) setClienteNombre(r.nombre);
      if (r.direccion) setClienteDireccion(r.direccion);
      setPadron(r.encontrado ? 'ok' : 'pendiente');
    } catch (err) {
      setPadron('');
      setErrorMsg(err.message);
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (metodoPago === 'efectivo' && recibido + 0.001 < totalCobrar) {
      setErrorMsg(`El monto recibido debe ser al menos ${formatCurrency(totalCobrar)}.`);
      return;
    }
    const fiscal = tipoComprobante !== 'ninguno' && sincronizar;
    if (fiscal) {
      if (!quote) {
        setErrorMsg(quoteError || 'El sistema de facturación todavía no cotizó este ticket.');
        return;
      }
      const fallo = validarDatosFiscales(tipoComprobante, {
        clienteDocumento, clienteNombre, clienteDireccion, sincronizarFacturacion: true,
      }, totalCobrar, quote.limiteBoletaAnonima ?? series.limiteBoleta);
      if (fallo) {
        setErrorMsg(fallo);
        return;
      }
      if (pidePin && !/^\d{6,}$/.test(pin)) {
        setErrorMsg('El PIN de supervisor tiene al menos 6 dígitos.');
        return;
      }
    }
    try {
      await onConfirm({
        mode,
        metodoPago,
        montoRecibido: metodoPago === 'efectivo' ? recibido : null,
        vuelto: metodoPago === 'efectivo' ? vuelto : null,
        referenciaPago,
        tipoComprobante,
        clienteDocumento,
        clienteNombre,
        clienteDireccion,
        validacionPadron: padron || 'pendiente',
        sincronizarFacturacion: fiscal,
        pinSupervisor: pin,
        totalFiscal: totalCobrar,
      });
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo cerrar el cobro.');
      if (String(err.codigo || '').startsWith('PIN')) setPidePin(true);
    }
  };

  const serieActiva = tipoComprobante === 'factura' ? series.factura : series.boleta;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
        onClick={() => !loading && onClose()}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cobro-title"
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          className="w-full max-w-5xl max-h-[93vh] bg-[#0F1623] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="px-5 sm:px-6 py-4 bg-[#0B101B] border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="modal-cobro-title" className="text-base sm:text-lg font-bold text-white truncate">
                  {isForzar ? 'Forzar cobro y facturación' : 'Cobrar ticket y emitir comprobante'}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${badge.bg}`}>{badge.label}</span>
                {ticketEsParaLlevar(ticket) && (
                  <span className="text-[10px] px-2 py-0.5 rounded border font-bold bg-violet-500/20 text-violet-200 border-violet-500/40">PARA LLEVAR</span>
                )}
                {ticketEsReserva(ticket) && (
                  <span className="text-[10px] px-2 py-0.5 rounded border font-bold bg-pink-500/20 text-pink-200 border-pink-500/40">RESERVA</span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Comanda <span className="font-mono font-bold text-amber-300">{comandaLabel}</span>
                {' · '}{etiquetaMesaTicket(ticket)}
                {' · '}<span className="text-slate-200">{clienteDisplay}</span>
              </p>
            </div>
            <button type="button" disabled={loading} onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={enviar} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 bg-slate-900/75 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <FaHashtag /> Detalles de la comanda
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${entrega.bg}`}>Cocina: {entrega.label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">N° comanda</div>
                    <div className="font-mono font-bold text-white text-sm truncate">{comandaLabel}</div>
                    <div className="text-[10px] font-mono text-slate-400">{getCantidadComandas(ticket)} cmd</div>
                  </div>
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1"><FaCalendarAlt /> Emisión</div>
                    <div className="font-mono text-[11px] text-white mt-1">{formatDate(fechaCmd)} {String(formatTime(fechaCmd) || '').slice(0, 5)}</div>
                  </div>
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1"><FaUtensils /> Mesa</div>
                    <div className="font-bold text-slate-100 truncate">{etiquetaMesaTicket(ticket)}</div>
                    <div className="text-[10px] text-slate-400 truncate">{labelPagoTicket(ticket)}</div>
                  </div>
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-2 col-span-2">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1"><FaUser /> Cliente</div>
                    <div className="font-semibold text-white truncate">{clienteDisplay}</div>
                    {dniDisplay ? <div className="text-[10px] font-mono text-slate-400">Doc: {dniDisplay}</div> : null}
                  </div>
                  <div className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Mozo</div>
                    <div className="font-semibold text-amber-200 truncate">{getMozoNombre(ticket)}</div>
                  </div>
                </div>
                {ticket.tipo === 'pago_parcial' && saldoPend > 0 && (
                  <div className="px-3 py-1.5 rounded-lg border border-amber-500/35 flex justify-between text-xs">
                    <span className="text-amber-200">Saldo pendiente</span>
                    <span className="font-mono font-bold text-amber-300">{formatCurrency(saldoPend)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 uppercase">
                    <span>Detalle de consumo</span>
                    <span className="font-mono normal-case">{platos.length} ítem{platos.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {platos.map((p, idx) => {
                      const comps = ocultarGuarniciones ? [] : getComplementosDePlato(p);
                      const cant = Number(p.cantidad) || 1;
                      const sub = Number(p.subtotal) || (Number(p.precio) || 0) * cant;
                      return (
                        <div key={p.platoLineaId || p._id || idx} className="bg-[#0B0F17]/80 border border-slate-800 rounded-lg px-2.5 py-2 text-xs">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-amber-400 mr-1.5">{cant}x</span>
                              <span className="text-slate-100">{p.nombre}</span>
                            </div>
                            <span className="font-mono font-bold text-white shrink-0">{formatCurrency(sub)}</span>
                          </div>
                          {(comps.length > 0 || p.notaEspecial) && (
                            <div className="mt-1 pl-4 text-[11px] text-slate-400">
                              {comps.map((c) => <div key={c.key}>└ {c.grupo ? `${c.grupo}: ` : ''}{c.opcion}</div>)}
                              {p.notaEspecial ? <div className="italic text-amber-300">{p.notaEspecial}</div> : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!platos.length && <p className="text-xs text-slate-500">Sin platos en el ticket. Se emite el total de la cuenta.</p>}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-800 text-xs space-y-1 font-mono">
                  {montoDesc > 0 && (
                    <div className="flex justify-between text-rose-300"><span>Descuento</span><span>-{formatCurrency(montoDesc)}</span></div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Op. gravada</span>
                    <span>{quote ? formatCurrency(quote.totales?.gravadas) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IGV {quote?.porcentajeIgv != null ? `(${quote.porcentajeIgv}%)` : ''}</span>
                    <span>{quote ? formatCurrency(quote.totales?.igv) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-sm">
                    <span className="text-slate-300 font-sans font-bold">Total a cobrar</span>
                    <span className="text-amber-300 font-black text-lg">{formatCurrency(totalCobrar)}</span>
                  </div>
                  {quoteError && tipoComprobante !== 'ninguno' && <p className="text-rose-300 font-sans">{quoteError}</p>}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((tc) => {
                    const on = tipoComprobante === tc.id;
                    const Icon = tc.id === 'factura' ? FaFileInvoice : tc.id === 'boleta' ? FaReceipt : FaCashRegister;
                    return (
                      <button key={tc.id} type="button" onClick={() => setTipoComprobante(tc.id)} className={`rounded-xl border px-2 py-2 text-left ${on ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-slate-800 bg-[#0B0F17] text-slate-300'}`}>
                        <Icon className="text-amber-300 mb-1" />
                        <div className="text-xs font-bold">{tc.label}</div>
                        <div className="text-[10px] text-slate-400">{tc.id === 'ninguno' ? tc.sub : `${tc.sub} · ${tc.id === 'factura' ? series.factura : series.boleta}`}</div>
                      </button>
                    );
                  })}
                </div>

                {tipoComprobante !== 'ninguno' && (
                  <div className="space-y-2 text-xs">
                    <label className="block text-slate-300">
                      {tipoComprobante === 'factura' ? 'RUC' : 'DNI (opcional)'}
                      <span className="flex gap-2 mt-1">
                        <input
                          value={clienteDocumento}
                          onChange={(e) => { setClienteDocumento(e.target.value.replace(/\D/g, '')); setPadron(''); }}
                          inputMode="numeric"
                          maxLength={tipoComprobante === 'factura' ? 11 : 8}
                          className="flex-1 bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                          placeholder={tipoComprobante === 'factura' ? '20…' : '8 dígitos'}
                        />
                        <button type="button" onClick={buscarPadron} className="px-3 rounded-lg border border-slate-700 text-amber-300" aria-label="Buscar en el padrón"><FaSearch /></button>
                      </span>
                    </label>
                    <label className="block text-slate-300">
                      {tipoComprobante === 'factura' ? 'Razón social' : 'Nombre'}
                      <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="mt-1 w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    </label>
                    {tipoComprobante === 'factura' && (
                      <label className="block text-slate-300">
                        Dirección
                        <input value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} className="mt-1 w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-white" />
                      </label>
                    )}
                    {padron === 'ok' && <p className="text-emerald-300">Padrón: dato encontrado</p>}
                    {padron === 'pendiente' && <p className="text-amber-300">Padrón no conectado · se emite con lo escrito</p>}
                    <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-800 bg-[#0B0F17]">
                      <input type="checkbox" checked={sincronizar} onChange={(e) => setSincronizar(e.target.checked)} className="mt-0.5 accent-sky-500" />
                      <span>
                        <span className="block text-white font-semibold">Sincronizar con el sistema de facturación</span>
                        <span className="text-slate-400">Emite {tipoComprobante} {serieActiva} en el backend. No guarda un comprobante local.</span>
                      </span>
                    </label>
                    {pidePin && (
                      <label className="block text-slate-300">
                        PIN de supervisor
                        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="mt-1 w-full bg-[#0B0F17] border border-amber-500/50 rounded-lg px-3 py-2 text-white font-mono" />
                      </label>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {METODOS.map((m) => {
                    const on = metodoPago === m.id;
                    const Icon = m.Icon;
                    return (
                      <button key={m.id} type="button" onClick={() => setMetodoPago(m.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${on ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-slate-800 bg-[#0B0F17] text-slate-300'}`}>
                        <Icon className="text-amber-300" /> {m.label}
                      </button>
                    );
                  })}
                </div>
                {metodoPago === 'efectivo' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300">
                      ¿Con cuánto paga?
                      <input value={montoRecibidoStr} onChange={(e) => setMontoRecibidoStr(e.target.value)} inputMode="decimal" className="mt-1 w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-right" />
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {rapidos.map((v) => (
                        <button key={v} type="button" onClick={() => setMontoRecibidoStr(Number(v).toFixed(2))} className="px-2 py-1 rounded bg-[#0B0F17] border border-slate-700 text-[10px] font-mono text-slate-200">
                          {v === totalCobrar ? 'Exacto' : formatCurrency(v)}
                        </button>
                      ))}
                    </div>
                    <p className="flex justify-between text-sm font-mono"><span className="text-slate-400">Vuelto</span><b className="text-emerald-400">{formatCurrency(vuelto)}</b></p>
                  </div>
                )}
                {metodoPago !== 'efectivo' && (
                  <label className="block text-xs text-slate-300">
                    Referencia
                    <input value={referenciaPago} onChange={(e) => setReferenciaPago(e.target.value)} placeholder="Yape o voucher" className="mt-1 w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                  </label>
                )}
                {errorMsg && (
                  <p className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex gap-2">
                    <FaExclamationCircle className="shrink-0 mt-0.5" /> {errorMsg}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {tipoComprobante !== 'ninguno' && sincronizar
                  ? 'Al confirmar se cobra en caja y se emite el comprobante en el sistema de facturación.'
                  : 'Se registra solo el cobro de caja.'}
              </p>
              <div className="flex gap-2 ml-auto">
                <button type="button" disabled={loading} onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold">Cancelar</button>
                <button type="submit" disabled={loading} className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50 ${isForzar ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                  <FaCheck />
                  {loading
                    ? 'Procesando...'
                    : tipoComprobante !== 'ninguno' && sincronizar
                      ? (isForzar ? 'Forzar cobro y facturar' : 'Cobrar y facturar')
                      : (isForzar ? 'Confirmar forzar cobro' : 'Confirmar cobro')}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
