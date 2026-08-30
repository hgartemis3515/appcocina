import React, { useEffect, useState } from 'react';
import { FaTimes, FaUtensils, FaUser, FaSyncAlt } from 'react-icons/fa';
import { apiGet } from '../../config/apiClient';
import { getComandaDisplayLabel, getComandaIdsFromTicket } from '../../utils/ticketComandaDisplay';
import {
  formatCurrency, formatDateTime, labelPagoTicket, tipoBadge, estadoTicketMeta,
  nombreClienteTicket, dniClienteTicket,
} from '../../utils/ticketAprobacionUi';
import { getMozoNombre } from '../../utils/ticketSort';
import { mergePlatosTicketConComandas, platosTicketVisibles } from '../../utils/ticketTotales';
import PlatoTicketItem from './PlatoTicketItem';

function unwrapComanda(data) {
  if (!data || typeof data !== 'object') return null;
  if (data._id && (data.platos || data.comandaNumber != null)) return data;
  if (data.comanda && typeof data.comanda === 'object') return data.comanda;
  return null;
}

/**
 * Modal de detalle de comanda desde un ticket (tabla avanzada).
 * Carga la comanda en vivo para guarniciones, estado y notas.
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

  const platos = mergePlatosTicketConComandas(ticket, comandas);
  const fallback = platosTicketVisibles(ticket);
  const lista = platos.length ? platos : fallback;
  const badge = tipoBadge(ticket.tipo);
  const estado = estadoTicketMeta(ticket.estado);
  const cliente = nombreClienteTicket(ticket);
  const dni = dniClienteTicket(ticket);
  const comandaLive = comandas[0];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-700 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold">
                Comanda {getComandaDisplayLabel(ticket)}
              </span>
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
            {comandaLive?.observaciones && (
              <p className="text-[11px] text-gray-400 italic mt-1 truncate">
                "{comandaLive.observaciones}"
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Platos y guarniciones
          </p>
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <FaSyncAlt className="animate-spin" /> Cargando detalle de la comanda…
            </div>
          )}
          {lista.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">Sin platos en este ticket</p>
          ) : (
            lista.map((plato, i) => (
              <PlatoTicketItem
                key={plato.platoLineaId || plato._id || i}
                plato={plato}
                size="sm"
                showEstado
              />
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{labelPagoTicket(ticket)}</span>
            <span className="text-white font-bold">{formatCurrency(ticket.total)}</span>
          </div>
          {Number(ticket.montoDescuento) > 0 && (
            <div className="text-xs text-red-400">
              Descuento: -{formatCurrency(ticket.montoDescuento)}
              {ticket.descuentos?.[0]?.motivo ? ` · ${ticket.descuentos[0].motivo}` : ''}
            </div>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}
