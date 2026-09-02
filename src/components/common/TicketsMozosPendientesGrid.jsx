import React from 'react';
import { FaUser, FaCheck, FaSyncAlt } from 'react-icons/fa';
import { AccionesTicket } from './TicketsAprobacionTable';
import PlatoTicketItem from './PlatoTicketItem';
import { groupTicketsByMozo } from '../../utils/ticketSort';
import { getComandaDisplayLabel } from '../../utils/ticketComandaDisplay';
import { formatCurrency, tipoBadge } from '../../utils/ticketAprobacionUi';
import { platosTicketVisibles, totalesVistaTicket, resumenKpisTickets } from '../../utils/ticketTotales';

function resumenPlatos(ticket) {
  const vis = platosTicketVisibles(ticket);
  if (!vis.length) return 'Sin platos';
  return vis
    .map((p) => {
      const cant = Number(p.cantidad) || 1;
      const nom = p.nombre || 'Plato';
      return cant > 1 ? `${nom} x${cant}` : nom;
    })
    .join(', ');
}

function CuadroMozo({
  grupo,
  soloUno,
  onImprimir,
  onAprobar,
  onReportar,
  onRechazar,
  onForzarPago,
  aprobarLoading,
  reportarLoading,
  rechazarLoading,
  forzarPagoLoading,
}) {
  const kpis = resumenKpisTickets(grupo.tickets);
  const n = grupo.tickets.length;

  return (
    <section
      id={`mozo-pendiente-${grupo.key}`}
      className={`flex flex-col min-h-0 bg-gray-900/80 border border-amber-500/25 rounded-xl overflow-hidden
        ${soloUno ? 'min-h-[420px]' : 'h-[calc((100vh-13.5rem)/2)] min-h-[280px]'}`}
    >
      <header className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-gray-800/90 border-b border-amber-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <FaUser className="text-amber-400 text-xs flex-shrink-0" />
          <h3 className="text-white font-bold text-sm truncate">{grupo.nombre}</h3>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {n} comanda{n !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="bg-black rounded px-2 py-1 flex-shrink-0">
          <span className="text-[10px] font-extrabold text-amber-400 tracking-wide whitespace-nowrap">
            PENDIENTE: {formatCurrency(kpis.pendiente)}
          </span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-[1] bg-gray-900 border-b border-gray-700">
            <tr className="text-[9px] uppercase tracking-wider text-gray-400">
              <th className="text-left px-2 py-1.5 font-semibold">Comanda</th>
              <th className="text-left px-2 py-1.5 font-semibold">Mesa</th>
              <th className="text-left px-2 py-1.5 font-semibold">Platos</th>
              <th className="text-right px-2 py-1.5 font-semibold">Total</th>
              <th className="text-right px-2 py-1.5 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grupo.tickets.map((ticket) => {
              const badge = tipoBadge(ticket.tipo);
              const { neto } = totalesVistaTicket(ticket);
              const platosVis = platosTicketVisibles(ticket);
              return (
                <tr key={ticket._id} className="border-t border-gray-800 align-top hover:bg-gray-800/50">
                  <td className="px-2 py-1.5 min-w-[88px]">
                    <div className="text-white font-semibold leading-tight">
                      {getComandaDisplayLabel(ticket)}
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-200 whitespace-nowrap">
                    {ticket.numMesa != null ? ticket.numMesa : '—'}
                  </td>
                  <td className="px-2 py-1.5 max-w-[160px]">
                    {platosVis.length ? (
                      <div className="max-h-16 overflow-y-auto">
                        {platosVis.slice(0, 4).map((plato, i) => (
                          <PlatoTicketItem
                            key={plato.platoLineaId || plato._id || i}
                            plato={plato}
                            size="xs"
                            showSubtotal={false}
                          />
                        ))}
                        {platosVis.length > 4 && (
                          <div className="text-[10px] text-gray-500">+{platosVis.length - 4} más</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">{resumenPlatos(ticket)}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white font-bold whitespace-nowrap">
                    {formatCurrency(neto)}
                  </td>
                  <td className="px-2 py-1.5">
                    <AccionesTicket
                      ticket={ticket}
                      onImprimir={onImprimir}
                      onAprobar={onAprobar}
                      onReportar={onReportar}
                      onRechazar={onRechazar}
                      onForzarPago={onForzarPago}
                      aprobarLoading={!!aprobarLoading[ticket._id]}
                      reportarLoading={!!reportarLoading[ticket._id]}
                      rechazarLoading={!!rechazarLoading[ticket._id]}
                      forzarPagoLoading={!!forzarPagoLoading[ticket._id]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Vista «Mozos pendientes»: un cuadro por mozo (mín. 6 visibles en pantalla ancha).
 */
export default function TicketsMozosPendientesGrid({
  tickets,
  loading,
  emptyLabel,
  mozoFilter,
  mozosDisponibles,
  onMozoFilterChange,
  onImprimir,
  onAprobar,
  onReportar,
  onRechazar,
  onForzarPago,
  aprobarLoading = {},
  reportarLoading = {},
  rechazarLoading = {},
  forzarPagoLoading = {},
}) {
  const grupos = groupTicketsByMozo(tickets);
  const soloUno = Boolean(mozoFilter) || grupos.length === 1;

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

  const irAMozo = (key) => {
    onMozoFilterChange?.(key);
    if (!key) return;
    requestAnimationFrame(() => {
      document.getElementById(`mozo-pendiente-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onMozoFilterChange?.(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border
            ${!mozoFilter
              ? 'bg-amber-500 text-black border-amber-400'
              : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'}`}
        >
          Todos ({mozosDisponibles.reduce((s, m) => s + m.count, 0)})
        </button>
        {mozosDisponibles.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => irAMozo(m.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap
              ${mozoFilter === m.key
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'}`}
          >
            {m.nombre}
            <span className="ml-1 opacity-70">{m.count}</span>
          </button>
        ))}
      </div>

      <div className={`grid gap-3 ${soloUno ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {grupos.map((grupo) => (
          <CuadroMozo
            key={grupo.key}
            grupo={grupo}
            soloUno={soloUno}
            onImprimir={onImprimir}
            onAprobar={onAprobar}
            onReportar={onReportar}
            onRechazar={onRechazar}
            onForzarPago={onForzarPago}
            aprobarLoading={aprobarLoading}
            reportarLoading={reportarLoading}
            rechazarLoading={rechazarLoading}
            forzarPagoLoading={forzarPagoLoading}
          />
        ))}
      </div>
    </div>
  );
}
