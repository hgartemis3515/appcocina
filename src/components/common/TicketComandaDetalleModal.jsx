import React, { useEffect, useState } from 'react';
import { FaTimes, FaUtensils, FaUser, FaSyncAlt } from 'react-icons/fa';
import { apiGet } from '../../config/apiClient';
import {
  getComandaDisplayLabel,
  getComandaIdsFromTicket,
  itemsDesdeComandaLive,
  cocineroDePlatoVista,
  totalActivoItemsComanda,
  etiquetaEstadoPlato,
} from '../../utils/ticketComandaDisplay';
import {
  formatCurrency, formatDateTime, labelPagoTicket, tipoBadge, estadoTicketMeta,
  nombreClienteTicket, dniClienteTicket,
} from '../../utils/ticketAprobacionUi';
import { getMozoNombre } from '../../utils/ticketSort';
import { getComplementosDePlato } from '../../utils/platoComplementos';
import { platosTicketVisibles, totalesVistaTicket } from '../../utils/ticketTotales';

function unwrapComanda(data) {
  if (!data || typeof data !== 'object') return null;
  if (data._id && (data.platos || data.comandaNumber != null || data.items)) return data;
  if (data.comanda && typeof data.comanda === 'object') return data.comanda;
  return null;
}

function claseEstadoPlato(estado, eliminado) {
  if (eliminado) return 'bg-gray-600/30 text-gray-400';
  const e = String(estado || '').toLowerCase();
  if (e === 'en_espera' || e === 'pedido' || e === 'pendiente') return 'bg-amber-500/20 text-amber-300';
  if (e === 'recoger') return 'bg-green-500/20 text-green-300';
  if (e === 'salio' || e === 'entregado') return 'bg-blue-500/20 text-blue-300';
  if (e === 'pagado') return 'bg-emerald-500/20 text-emerald-300';
  return 'bg-gray-600/30 text-gray-300';
}

function mesaDeComanda(comanda, ticket) {
  const m = comanda?.mesas;
  if (m && typeof m === 'object') {
    return m.nombreCombinado || m.nummesa || ticket?.numMesa || '—';
  }
  return ticket?.numMesa != null ? ticket.numMesa : '—';
}

function TablaPlatosComanda({ items, totalComanda, montoDesc }) {
  const activos = (items || []).filter((i) => !i.eliminado && !i.anulado);
  const nPlatos = activos.reduce((s, i) => s + (Number(i.cantidad) || 1), 0);
  const bruto = totalActivoItemsComanda(items);
  const desc = Number(montoDesc) || 0;
  const total = desc > 0 ? Math.max(0, bruto - desc) : (Number(totalComanda) || bruto);

  return (
    <div className="bg-black/40 border border-amber-500/15 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-[10px] uppercase">
            <th className="text-left px-3 py-2 font-semibold">Plato</th>
            <th className="text-center px-2 py-2 font-semibold">Cant.</th>
            <th className="text-right px-2 py-2 font-semibold">P. Unit.</th>
            <th className="text-right px-2 py-2 font-semibold">Subtotal</th>
            <th className="text-left px-2 py-2 font-semibold">Complementos</th>
            <th className="text-center px-2 py-2 font-semibold">Cocinero</th>
            <th className="text-center px-2 py-2 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {(!items || items.length === 0) && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-xs">
                Sin platos registrados
              </td>
            </tr>
          )}
          {(items || []).map((item, idx) => {
            const comps = getComplementosDePlato(item);
            const chef = cocineroDePlatoVista(item);
            const off = item.eliminado || item.anulado;
            return (
              <tr
                key={item._id || idx}
                className={`border-t border-amber-500/10 ${off ? 'opacity-50' : ''}`}
              >
                <td className="px-3 py-2">
                  <p className={`font-medium ${off ? 'line-through text-gray-500' : 'text-white'}`}>
                    {item.nombre}
                  </p>
                  {item.tipoServicio === 'para_llevar' && (
                    <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Para llevar
                    </span>
                  )}
                  {item.notaEspecial ? (
                    <p className="text-[10px] text-gray-500 mt-0.5">📝 {item.notaEspecial}</p>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-center font-semibold text-gray-200">
                  {item.cantidad || 1}
                </td>
                <td className="px-2 py-2 text-right text-gray-400 whitespace-nowrap">
                  {formatCurrency(item.precio)}
                </td>
                <td className="px-2 py-2 text-right text-amber-400 font-semibold whitespace-nowrap">
                  {formatCurrency(item.subtotal)}
                </td>
                <td className="px-2 py-2">
                  {comps.length ? (
                    <div className="flex flex-wrap gap-1">
                      {comps.map((c, i) => (
                        <span
                          key={c.key || i}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300"
                        >
                          {c.grupo ? `${c.grupo}: ${c.opcion}` : c.opcion}
                          {c.pronombre ? ` · ${c.pronombre}` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-600">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  {chef.nombre !== '—' ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium text-green-400">{chef.nombre}</span>
                      {chef.enPreparacion && (
                        <span className="text-[8px] text-amber-400 animate-pulse">En curso</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-600">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${claseEstadoPlato(item.estado, off)}`}>
                    {etiquetaEstadoPlato(item.estado, off)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {desc > 0 && (
            <>
              <tr className="border-t-2 border-amber-500/25 bg-gray-900">
                <td className="px-3 py-2 font-semibold text-[10px] uppercase text-gray-500" colSpan={2}>
                  Subtotal
                </td>
                <td className="px-2 py-2 text-right text-xs text-gray-500">{nPlatos} platos</td>
                <td className="px-2 py-2 text-right text-gray-300 text-sm">{formatCurrency(bruto)}</td>
                <td colSpan={3} />
              </tr>
              <tr className="bg-gray-900">
                <td className="px-3 py-1 text-right text-[10px] text-red-400 uppercase font-semibold" colSpan={3}>
                  Descuento
                </td>
                <td className="px-2 py-1 text-right text-red-400 font-bold text-sm">
                  -{formatCurrency(desc)}
                </td>
                <td colSpan={3} />
              </tr>
            </>
          )}
          <tr className="border-t-2 border-amber-500/25 bg-gray-900">
            <td className="px-3 py-3 font-bold text-xs uppercase text-white" colSpan={2}>Total</td>
            <td className="px-2 py-3 text-right text-xs text-gray-500">{nPlatos} platos</td>
            <td className="px-2 py-3 text-right text-amber-400 font-bold text-lg whitespace-nowrap">
              {formatCurrency(total)}
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Modal de detalle de comanda (mismo layout que comandas.html → Ver comanda).
 */
export default function TicketComandaDetalleModal({
  ticket,
  onClose,
  footer = null,
}) {
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticket) return undefined;
    let cancelled = false;
    const ids = getComandaIdsFromTicket(ticket);
    if (!ids.length) {
      setComandas([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    Promise.all(ids.map((id) => apiGet(`/api/comanda/${id}`).catch(() => null)))
      .then((docs) => {
        if (cancelled) return;
        setComandas(docs.map(unwrapComanda).filter(Boolean));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ticket]);

  if (!ticket) return null;

  const badge = tipoBadge(ticket.tipo);
  const estado = estadoTicketMeta(ticket.estado);
  const cliente = nombreClienteTicket(ticket);
  const dni = dniClienteTicket(ticket);
  const { bruto, neto, montoDesc } = totalesVistaTicket(ticket);
  const fallbackItems = platosTicketVisibles(ticket).map((p) => ({
    ...p,
    nombre: p.nombre || 'Plato',
    cantidad: Number(p.cantidad) || 1,
    precio: Number(p.precio) || 0,
    subtotal: Number(p.subtotal) || (Number(p.precio) || 0) * (Number(p.cantidad) || 1),
  }));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[840px] max-h-[90vh] bg-gray-900 border border-amber-500/25 rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-amber-500/20 flex items-start justify-between gap-3 flex-shrink-0 bg-gray-950 rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-bold text-lg">
                Comanda {getComandaDisplayLabel(ticket)}
              </h2>
              {ticket.ticketNumber != null && (
                <span className="text-xs text-amber-200/80">Ticket #{ticket.ticketNumber}</span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${badge.bg}`}>
                {badge.label}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estado.bg}`}>
                {estado.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <FaUtensils className="text-gray-500" /> Mesa {ticket.numMesa || '?'}
              </span>
              <span className="flex items-center gap-1">
                <FaUser className="text-gray-500" /> {getMozoNombre(ticket)}
              </span>
              <span>{formatDateTime(ticket.createdAt)}</span>
              {cliente && <span>{cliente}{dni ? ` · DNI ${dni}` : ''}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <FaSyncAlt className="animate-spin" /> Cargando detalle de la comanda…
            </div>
          )}

          {!loading && comandas.length === 0 && (
            <TablaPlatosComanda items={fallbackItems} totalComanda={neto} montoDesc={montoDesc} />
          )}

          {comandas.map((c) => {
            const items = itemsDesdeComandaLive(c);
            const obs = c.observaciones;
            const totalC = Number(c.total) || Number(c.totalCalculado) || 0;
            const descC = Number(c.montoDescuento) || 0;
            return (
              <div key={c._id || c.comandaNumber} className="space-y-2">
                {comandas.length > 1 && (
                  <p className="text-white font-semibold text-sm">
                    Comanda #{c.numComanda || c.comandaNumber || '—'}
                    <span className="text-gray-400 font-normal text-xs ml-2">
                      Mesa {mesaDeComanda(c, ticket)}
                    </span>
                  </p>
                )}
                {obs ? (
                  <p className="text-[11px] text-gray-400 italic">"{obs}"</p>
                ) : null}
                <TablaPlatosComanda
                  items={items}
                  totalComanda={totalC}
                  montoDesc={descC}
                />
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-amber-500/20 flex-shrink-0 space-y-2 bg-gray-950 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{labelPagoTicket(ticket)}</span>
            <span className="text-white font-bold">{formatCurrency(neto)}</span>
          </div>
          {montoDesc > 0 && (
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(bruto)}</span>
              </div>
              <div className="text-red-400">
                Descuento: -{formatCurrency(montoDesc)}
                {ticket.descuentos?.[0]?.motivo ? ` · ${ticket.descuentos[0].motivo}` : ''}
              </div>
            </div>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}
