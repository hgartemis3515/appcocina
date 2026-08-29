import React, { useState } from 'react';
import {
  FaCheck, FaTimes, FaPrint, FaExclamationTriangle, FaSyncAlt, FaChevronDown, FaSort, FaSortUp, FaSortDown,
} from 'react-icons/fa';
import { getComandaDisplayLabel } from '../../utils/ticketComandaDisplay';
import { getDefaultSortDir, getMozoNombre } from '../../utils/ticketSort';
import {
  formatCurrency, formatDateTime, labelPagoTicket, tipoBadge, estadoTicketMeta,
  nombreClienteTicket, dniClienteTicket, esTicketComanda,
} from '../../utils/ticketAprobacionUi';
import PlatoTicketItem from './PlatoTicketItem';

function SortIcon({ active, dir }) {
  if (!active) return <FaSort className="inline text-[9px] opacity-40 ml-1" />;
  return dir === 'asc'
    ? <FaSortUp className="inline text-[9px] ml-1" />
    : <FaSortDown className="inline text-[9px] ml-1" />;
}

function AccionesTicket({
  ticket, onImprimir, onAprobar, onReportar, onRechazar,
  aprobarLoading, reportarLoading, rechazarLoading,
}) {
  const isComanda = esTicketComanda(ticket);
  const pendiente = ticket.estado === 'pendiente_aprobacion';

  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => onImprimir(ticket)}
        className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
        title="Imprimir"
      >
        <FaPrint className="text-xs" />
      </button>
      {pendiente && (
        <>
          <button
            type="button"
            onClick={() => onAprobar(ticket)}
            disabled={aprobarLoading}
            className="p-1.5 rounded-md bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white"
            title="Aprobar"
          >
            <FaCheck className="text-xs" />
          </button>
          {isComanda ? (
            <button
              type="button"
              onClick={() => onReportar(ticket)}
              disabled={reportarLoading}
              className="p-1.5 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white"
              title="Reportar"
            >
              <FaExclamationTriangle className="text-xs" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRechazar(ticket)}
              disabled={rechazarLoading}
              className="p-1.5 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white"
              title="Rechazar"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Vista avanzada: tabla formal de tickets de aprobación y pagos adelantados.
 */
export default function TicketsAprobacionTable({
  tickets,
  loading,
  emptyLabel,
  sortBy,
  sortDir,
  onSortChange,
  onImprimir,
  onAprobar,
  onReportar,
  onRechazar,
  aprobarLoading = {},
  reportarLoading = {},
  rechazarLoading = {},
}) {
  const [expandedId, setExpandedId] = useState(null);

  const handleSort = (key) => {
    if (!onSortChange) return;
    if (sortBy === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, getDefaultSortDir(key));
    }
  };

  const colSortKey = {
    fecha: 'fecha',
    comanda: 'comanda',
    mesa: 'mesa',
    total: 'total',
    tipo: 'tipo',
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <FaSyncAlt className="text-4xl text-violet-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">Cargando tickets...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <FaCheck className="text-4xl text-green-500 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
            <tr className="text-[10px] uppercase tracking-wider text-gray-400">
              <th className="w-8 px-2 py-3" />
              {[
                { key: 'fecha', label: 'Fecha', align: 'text-left' },
                { key: 'comanda', label: 'Comanda', align: 'text-left' },
                { key: 'mesa', label: 'Mesa', align: 'text-left' },
                { key: null, label: 'Mozo / Cliente', align: 'text-left' },
                { key: 'tipo', label: 'Tipo', align: 'text-left' },
                { key: 'total', label: 'Total', align: 'text-right' },
                { key: null, label: 'Pago', align: 'text-left' },
                { key: null, label: 'Estado', align: 'text-left' },
                { key: null, label: 'Acciones', align: 'text-right' },
              ].map((col, i) => {
                const sortable = Boolean(col.key && colSortKey[col.key]);
                const active = sortBy === col.key;
                return (
                  <th key={`${col.label}-${i}`} className={`px-3 py-3 font-semibold ${col.align}`}>
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`inline-flex items-center ${active ? 'text-violet-300' : 'hover:text-white'}`}
                      >
                        {col.label}
                        <SortIcon active={active} dir={sortDir} />
                      </button>
                    ) : col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const badge = tipoBadge(ticket.tipo);
              const estado = estadoTicketMeta(ticket.estado);
              const comandaLabel = getComandaDisplayLabel(ticket);
              const cliente = nombreClienteTicket(ticket);
              const dni = dniClienteTicket(ticket);
              const open = expandedId === ticket._id;
              const nPlatos = (ticket.platos || []).length;
              return (
                <React.Fragment key={ticket._id}>
                  <tr className="border-t border-gray-800 hover:bg-gray-800/60">
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : ticket._id)}
                        className="p-1 text-gray-500 hover:text-white"
                        title={open ? 'Ocultar platos' : 'Ver platos'}
                      >
                        <FaChevronDown className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap text-xs">
                      {formatDateTime(ticket.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-white font-semibold">{comandaLabel}</div>
                      {ticket.ticketNumber != null && (
                        <div className="text-[10px] text-amber-200/80">Ticket #{ticket.ticketNumber}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-200 whitespace-nowrap">
                      Mesa {ticket.numMesa || '?'}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <div className="text-gray-200 truncate">{getMozoNombre(ticket)}</div>
                      {cliente && (
                        <div className="text-[10px] text-gray-500 truncate">
                          {cliente}{dni ? ` · DNI ${dni}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-white font-bold whitespace-nowrap">
                      {formatCurrency(ticket.total)}
                      <div className="text-[10px] text-gray-500 font-normal">{nPlatos} plato{nPlatos !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 uppercase">
                      {labelPagoTicket(ticket)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estado.bg}`}>
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <AccionesTicket
                        ticket={ticket}
                        onImprimir={onImprimir}
                        onAprobar={onAprobar}
                        onReportar={onReportar}
                        onRechazar={onRechazar}
                        aprobarLoading={!!aprobarLoading[ticket._id]}
                        reportarLoading={!!reportarLoading[ticket._id]}
                        rechazarLoading={!!rechazarLoading[ticket._id]}
                      />
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-gray-950/80 border-t border-gray-800">
                      <td colSpan={10} className="px-6 py-3">
                        <div className="max-h-56 overflow-y-auto">
                          {(ticket.platos || []).map((plato, i) => (
                            <PlatoTicketItem key={plato.platoLineaId || plato._id || i} plato={plato} size="xs" />
                          ))}
                        </div>
                        {Number(ticket.montoDescuento) > 0 && (
                          <div className="mt-2 text-xs text-red-400">
                            Descuento: -{formatCurrency(ticket.montoDescuento)}
                            {ticket.descuentos?.[0]?.motivo ? ` · ${ticket.descuentos[0].motivo}` : ''}
                          </div>
                        )}
                        {ticket.estado === 'reportado' && ticket.motivoReporte && (
                          <p className="mt-2 text-xs text-red-400"><strong>Motivo:</strong> {ticket.motivoReporte}</p>
                        )}
                        {ticket.estado === 'rechazado' && ticket.motivoRechazo && (
                          <p className="mt-2 text-xs text-red-400"><strong>Motivo:</strong> {ticket.motivoRechazo}</p>
                        )}
                        {ticket.estado === 'aprobado' && ticket.aprobadoPorNombre && (
                          <p className="mt-2 text-xs text-green-400">
                            Aprobado por: {ticket.aprobadoPorNombre}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
