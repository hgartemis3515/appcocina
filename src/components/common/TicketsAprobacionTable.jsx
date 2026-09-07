import React, { useMemo, useState } from 'react';
import {
  FaCheck, FaTimes, FaPrint, FaExclamationTriangle, FaSyncAlt, FaSort, FaSortUp, FaSortDown, FaEye, FaMoneyBill, FaTrash,
} from 'react-icons/fa';
import { getComandaDisplayLabel } from '../../utils/ticketComandaDisplay';
import { getDefaultSortDir, getMozoNombre, groupTicketsComoComandasHtml, ticketParaDetalleGrupo } from '../../utils/ticketSort';
import BadgeNombreMozo from './BadgeNombreMozo';
import {
  formatCurrency, formatDateTime, labelPagoTicket, tipoBadge,
  nombreClienteTicket, dniClienteTicket, esTicketComanda, esPagoParcial,
  ticketPuedeAprobarse, ticketPuedeForzarPago, ticketEsAltaSinPago,
  estadoEntregaComandaTicket, estadoEntregaTickets,
} from '../../utils/ticketAprobacionUi';
import PlatoTicketItem from './PlatoTicketItem';
import TicketComandaDetalleModal from './TicketComandaDetalleModal';
import { platosTicketVisibles, totalesVistaTicket, totalVentasObservadas } from '../../utils/ticketTotales';

function SortIcon({ active, dir }) {
  if (!active) return <FaSort className="inline text-[9px] opacity-40 ml-1" />;
  return dir === 'asc'
    ? <FaSortUp className="inline text-[9px] ml-1" />
    : <FaSortDown className="inline text-[9px] ml-1" />;
}

export function AccionesTicket({
  ticket, onImprimir, onAprobar, onReportar, onRechazar, onForzarPago, onQuitarDuplicado,
  aprobarLoading, reportarLoading, rechazarLoading, forzarPagoLoading, quitarDuplicadoLoading,
  compact = false,
}) {
  const isComanda = esTicketComanda(ticket);
  const esComandaOParcial = isComanda || esPagoParcial(ticket);
  const pendiente = ticket.estado === 'pendiente_aprobacion';
  const puedeAprobar = ticketPuedeAprobarse(ticket);
  const puedeForzar = ticketPuedeForzarPago(ticket) && !ticket.boucher;
  const puedeReportar = esComandaOParcial && pendiente && !ticketEsAltaSinPago(ticket);
  const puedeQuitarDuplicado = ticket.isActive !== false && typeof onQuitarDuplicado === 'function';
  const btnPad = compact
    ? 'p-1.5 w-8 h-8'
    : 'p-2.5 w-10 h-10';
  const iconCls = compact ? 'text-sm' : 'text-lg';

  return (
    <div className={`flex items-center gap-1 flex-wrap ${compact ? 'justify-center' : 'justify-end'}`}>
      <button
        type="button"
        onClick={() => onImprimir(ticket)}
        className={`${btnPad} inline-flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 text-white`}
        title="Imprimir"
      >
        <FaPrint className={iconCls} />
      </button>
      {puedeQuitarDuplicado && (
        <button
          type="button"
          onClick={() => onQuitarDuplicado(ticket)}
          disabled={quitarDuplicadoLoading}
          className={`${btnPad} inline-flex items-center justify-center rounded-md bg-rose-800 hover:bg-rose-700 disabled:bg-gray-600 text-white`}
          title="Quitar duplicado (sale de la tabla, no cambia platos)"
        >
          <FaTrash className={iconCls} />
        </button>
      )}
      {pendiente && (
        <>
          {puedeAprobar && (
            <button
              type="button"
              onClick={() => onAprobar(ticket)}
              disabled={aprobarLoading}
              className={`${btnPad} inline-flex items-center justify-center rounded-md bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white`}
              title="Aprobar solicitud de cobro"
            >
              <FaCheck className={iconCls} />
            </button>
          )}
          {puedeForzar && onForzarPago && (
            <button
              type="button"
              onClick={() => onForzarPago(ticket)}
              disabled={forzarPagoLoading}
              className={`${btnPad} inline-flex items-center justify-center rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white`}
              title="Forzar pago"
            >
              <FaMoneyBill className={iconCls} />
            </button>
          )}
          {puedeReportar ? (
            <button
              type="button"
              onClick={() => onReportar(ticket)}
              disabled={reportarLoading}
              className={`${btnPad} inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white`}
              title="Reportar"
            >
              <FaExclamationTriangle className={iconCls} />
            </button>
          ) : !esComandaOParcial && pendiente ? (
            <button
              type="button"
              onClick={() => onRechazar(ticket)}
              disabled={rechazarLoading}
              className={`${btnPad} inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white`}
              title="Rechazar"
            >
              <FaTimes className={iconCls} />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function FilaTicketAvanzado({
  ticket,
  indent = false,
  onDetalle,
  onImprimir,
  onAprobar,
  onReportar,
  onRechazar,
  onForzarPago,
  onQuitarDuplicado,
  aprobarLoading,
  reportarLoading,
  rechazarLoading,
  forzarPagoLoading,
  quitarDuplicadoLoading = {},
}) {
  const badge = tipoBadge(ticket.tipo);
  const estadoComanda = estadoEntregaComandaTicket(ticket);
  const comandaLabel = getComandaDisplayLabel(ticket);
  const cliente = nombreClienteTicket(ticket);
  const dni = dniClienteTicket(ticket);
  const platosVis = platosTicketVisibles(ticket);
  const nPlatos = platosVis.length;
  const { neto, montoDesc } = totalesVistaTicket(ticket);
  return (
    <tr className={`border-t border-gray-800 hover:bg-gray-800/60 align-top ${indent ? 'bg-gray-950/40' : ''}`}>
      <td className="px-3 py-2 text-gray-300 whitespace-nowrap text-xs">
        {indent ? '' : formatDateTime(ticket.createdAt)}
      </td>
      <td className={`px-3 py-2 min-w-[240px] max-w-[320px] ${indent ? 'pl-8' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-white font-semibold">
              {indent ? <span className="text-gray-600 mr-1">↳</span> : null}
              {comandaLabel}
            </div>
            {ticket.ticketNumber != null && (
              <div className="text-[10px] text-amber-200/80">Ticket #{ticket.ticketNumber}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDetalle(ticket)}
            className="p-1.5 rounded-md bg-gray-700 hover:bg-violet-600 text-white flex-shrink-0"
            title="Detalle de la comanda"
          >
            <FaEye className="text-xs" />
          </button>
        </div>
        <div className="mt-1 max-h-28 overflow-y-auto">
          {platosVis.map((plato, i) => (
            <PlatoTicketItem
              key={plato.platoLineaId || plato._id || i}
              plato={plato}
              size="xs"
              showSubtotal={false}
            />
          ))}
          {nPlatos === 0 && (
            <div className="text-[10px] text-gray-500">Sin platos en el ticket</div>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-gray-200 whitespace-nowrap">
        {indent ? '' : `Mesa ${ticket.numMesa || '?'}`}
      </td>
      <td className="px-3 py-2 min-w-[120px]">
        {indent ? null : (
          <>
            <div className="truncate"><BadgeNombreMozo ticket={ticket} nombre={getMozoNombre(ticket)} /></div>
            {cliente && (
              <div className="text-[10px] text-gray-500 truncate">
                {cliente}{dni ? ` · DNI ${dni}` : ''}
              </div>
            )}
          </>
        )}
      </td>
      <td className="px-3 py-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${badge.bg}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-white font-bold whitespace-nowrap">
        {formatCurrency(neto)}
        {montoDesc > 0 && (
          <div className="text-[10px] text-red-400 font-normal">-{formatCurrency(montoDesc)}</div>
        )}
        <div className="text-[10px] text-gray-500 font-normal">{nPlatos} plato{nPlatos !== 1 ? 's' : ''}</div>
      </td>
      <td className="px-3 py-2 text-xs text-gray-400 uppercase">
        {labelPagoTicket(ticket)}
      </td>
      <td className="px-3 py-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wide ${estadoComanda.bg}`}>
          {estadoComanda.label}
        </span>
        {ticket.estado === 'pendiente_aprobacion' && !estadoComanda.entregado && (
          <div className="text-[9px] text-yellow-500/80 mt-0.5">Por aprobar</div>
        )}
      </td>
      <td className="px-3 py-2">
        <AccionesTicket
          ticket={ticket}
          onImprimir={onImprimir}
          onAprobar={onAprobar}
          onReportar={onReportar}
          onRechazar={onRechazar}
          onForzarPago={onForzarPago}
          onQuitarDuplicado={onQuitarDuplicado}
          aprobarLoading={!!aprobarLoading[ticket._id]}
          reportarLoading={!!reportarLoading[ticket._id]}
          rechazarLoading={!!rechazarLoading[ticket._id]}
          forzarPagoLoading={!!forzarPagoLoading[ticket._id]}
          quitarDuplicadoLoading={!!quitarDuplicadoLoading[ticket._id]}
        />
      </td>
    </tr>
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
  onForzarPago,
  onQuitarDuplicado,
  aprobarLoading = {},
  reportarLoading = {},
  rechazarLoading = {},
  forzarPagoLoading = {},
  quitarDuplicadoLoading = {},
}) {
  const [detalleTicket, setDetalleTicket] = useState(null);
  const [gruposAbiertos, setGruposAbiertos] = useState(() => new Set());
  const totalVentas = useMemo(() => totalVentasObservadas(tickets), [tickets]);
  const filas = useMemo(() => groupTicketsComoComandasHtml(tickets), [tickets]);

  const toggleGrupo = (id) => {
    setGruposAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      {detalleTicket && (
        <TicketComandaDetalleModal
          ticket={detalleTicket}
          onClose={() => setDetalleTicket(null)}
          footer={
            <div className="flex justify-end pt-1">
              <AccionesTicket
                ticket={detalleTicket}
                onImprimir={onImprimir}
                onAprobar={(t) => { onAprobar(t); setDetalleTicket(null); }}
                onReportar={(t) => { onReportar(t); }}
                onRechazar={(t) => { onRechazar(t); }}
                onForzarPago={(t) => { onForzarPago?.(t); setDetalleTicket(null); }}
                onQuitarDuplicado={onQuitarDuplicado}
                aprobarLoading={!!aprobarLoading[detalleTicket._id]}
                reportarLoading={!!reportarLoading[detalleTicket._id]}
                rechazarLoading={!!rechazarLoading[detalleTicket._id]}
                forzarPagoLoading={!!forzarPagoLoading[detalleTicket._id]}
                quitarDuplicadoLoading={!!quitarDuplicadoLoading[detalleTicket._id]}
              />
            </div>
          }
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1080px]">
          <thead className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
            <tr className="text-[10px] uppercase tracking-wider text-gray-400">
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
            {filas.map((fila) => {
              const propsFila = {
                onDetalle: setDetalleTicket,
                onImprimir,
                onAprobar,
                onReportar,
                onRechazar,
                onForzarPago,
                onQuitarDuplicado,
                aprobarLoading,
                reportarLoading,
                rechazarLoading,
                forzarPagoLoading,
                quitarDuplicadoLoading,
              };
              if (fila.tipo !== 'grupo') {
                return (
                  <FilaTicketAvanzado
                    key={fila.id}
                    ticket={fila.tickets[0]}
                    {...propsFila}
                  />
                );
              }
              const grupoTicket = ticketParaDetalleGrupo(fila.tickets);
              const expandido = gruposAbiertos.has(fila.id);
              const { neto, montoDesc } = totalesVistaTicket(grupoTicket);
              const nPlatos = platosTicketVisibles(grupoTicket).length;
              const first = fila.tickets[0];
              const estadoGrupo = estadoEntregaTickets(fila.tickets);
              return (
                <React.Fragment key={fila.id}>
                  <tr className="border-t border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] align-top">
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap text-xs">
                      {formatDateTime(first.createdAt)}
                    </td>
                    <td className="px-3 py-2 min-w-[240px] max-w-[320px]">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleGrupo(fila.id)}
                          className="min-w-0 text-left"
                        >
                          <div className="text-amber-300 font-bold">
                            <span className="inline-block w-3 text-[10px]">{expandido ? '▼' : '▶'}</span>
                            {' '}GRUPO {fila.label || ''}
                          </div>
                          <div className="text-[10px] text-amber-200/80">
                            {fila.tickets.length} comandas
                            {fila.clienteNombre ? ` · ${fila.clienteNombre}` : ''}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetalleTicket(grupoTicket)}
                          className="p-1.5 rounded-md bg-gray-700 hover:bg-violet-600 text-white flex-shrink-0"
                          title="Ver detalle del grupo"
                        >
                          <FaEye className="text-xs" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-200 whitespace-nowrap">
                      Mesa {fila.mesa || first.numMesa || '?'}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <div className="truncate">
                        <BadgeNombreMozo ticket={first} nombre={getMozoNombre(first)} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-amber-500/15 text-amber-200 border-amber-500/40">
                        Grupo
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-amber-300 font-bold whitespace-nowrap">
                      {formatCurrency(neto)}
                      {montoDesc > 0 && (
                        <div className="text-[10px] text-red-400 font-normal">-{formatCurrency(montoDesc)}</div>
                      )}
                      <div className="text-[10px] text-gray-500 font-normal">{nPlatos} plato{nPlatos !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 uppercase">—</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wide ${estadoGrupo.bg}`}>
                        {estadoGrupo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onImprimir(grupoTicket)}
                        className="p-2.5 w-10 h-10 inline-flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 text-white"
                        title="Imprimir grupo de comandas"
                      >
                        <FaPrint className="text-lg" />
                      </button>
                    </td>
                  </tr>
                  {expandido && fila.tickets.map((ticket) => (
                    <FilaTicketAvanzado
                      key={ticket._id}
                      ticket={ticket}
                      indent
                      {...propsFila}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-gray-950 border-t-2 border-amber-500/50">
            <tr>
              <td colSpan={5} className="px-3 py-3 text-sm font-semibold text-gray-200">
                Total ventas
                <span className="ml-2 text-[11px] font-normal text-gray-500">
                  {tickets.length} en esta vista
                </span>
              </td>
              <td className="px-3 py-3 text-right text-lg font-black text-amber-300 tabular-nums whitespace-nowrap">
                {formatCurrency(totalVentas)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
