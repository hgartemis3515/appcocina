import React, { useState } from 'react';
import { FaUser, FaCheck, FaSyncAlt, FaEye } from 'react-icons/fa';
import { AccionesTicket } from './TicketsAprobacionTable';
import TicketComandaDetalleModal from './TicketComandaDetalleModal';
import {
  groupTicketsByMozo,
  groupTicketsComoComandasHtml,
  ticketParaDetalleGrupo,
} from '../../utils/ticketSort';
import { getComandaDisplayLabel } from '../../utils/ticketComandaDisplay';
import { formatCurrency, formatTime, tipoBadge } from '../../utils/ticketAprobacionUi';
import { totalesVistaTicket, resumenKpisTickets } from '../../utils/ticketTotales';

function BotonVerDetalle({ onClick, titulo = 'Ver detalle' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/40 bg-gray-800 hover:bg-amber-600/20 text-amber-200 text-[10px] font-semibold whitespace-nowrap"
    >
      <FaEye className="text-[10px]" />
      Ver
    </button>
  );
}

function AccionesCompactas(props) {
  return <AccionesTicket {...props} compact />;
}

function FilaTicket({
  ticket,
  mesa,
  indent,
  onVerDetalle,
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
  const badge = tipoBadge(ticket.tipo);
  const { neto } = totalesVistaTicket(ticket);
  return (
    <tr className={`border-t border-gray-800/80 hover:bg-gray-800/40 ${indent ? 'bg-gray-950/50' : ''}`}>
      <td className="px-2 py-0.5 text-gray-200 text-xs whitespace-nowrap">
        {indent ? '' : (mesa != null ? mesa : '—')}
      </td>
      <td className={`px-2 py-0.5 ${indent ? 'pl-5' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {indent && <span className="text-gray-600 text-[10px]">↳</span>}
          <span className="text-white font-semibold text-xs whitespace-nowrap">
            {getComandaDisplayLabel(ticket)}
          </span>
          <span className={`text-[8px] px-1 py-0 rounded-full border leading-none ${badge.bg}`}>
            {badge.label}
          </span>
          {ticket.createdAt && (
            <span className="text-[9px] text-gray-500">{formatTime(ticket.createdAt)}</span>
          )}
        </div>
      </td>
      <td className="px-1 py-0.5">
        <div className="flex items-center justify-center gap-1">
          <BotonVerDetalle onClick={() => onVerDetalle(ticket)} />
          <AccionesCompactas
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
        </div>
      </td>
      <td className="px-2 py-0.5 text-right text-white font-semibold text-xs whitespace-nowrap">
        {formatCurrency(neto)}
      </td>
    </tr>
  );
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
  onVerDetalle,
}) {
  const [abiertos, setAbiertos] = useState(() => new Set());
  const kpis = resumenKpisTickets(grupo.tickets);
  const n = grupo.tickets.length;
  const filas = groupTicketsComoComandasHtml(grupo.tickets);

  const toggleGrupo = (id) => {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      id={`mozo-pendiente-${grupo.key}`}
      className={`flex flex-col min-h-0 bg-gray-900/80 border border-amber-500/25 rounded-xl overflow-hidden
        ${soloUno ? 'min-h-[420px]' : 'h-[calc((100vh-13.5rem)/2)] min-h-[280px]'}`}
    >
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-gray-800/90 border-b border-amber-500/20">
        <FaUser className="text-amber-400 text-xs flex-shrink-0" />
        <h3 className="text-white font-bold text-sm truncate">{grupo.nombre}</h3>
        <span className="text-[10px] text-gray-400 flex-shrink-0">
          {n} comanda{n !== 1 ? 's' : ''}
        </span>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-[1] bg-gray-900 border-b border-gray-700">
            <tr className="text-[9px] uppercase tracking-wider text-gray-400">
              <th className="text-left px-2 py-1 font-semibold">Mesa</th>
              <th className="text-left px-2 py-1 font-semibold">Comanda</th>
              <th className="text-center px-2 py-1 font-semibold">Ver detalle</th>
              <th className="text-right px-2 py-1 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const esGrupo = fila.tipo === 'grupo';
              const expandido = esGrupo && abiertos.has(fila.id);
              const pendienteFila = resumenKpisTickets(fila.tickets).pendiente;
              const mesaLabel = fila.mesa != null ? String(fila.mesa) : '—';

              if (!esGrupo) {
                return (
                  <FilaTicket
                    key={fila.id}
                    ticket={fila.tickets[0]}
                    mesa={fila.mesa}
                    onVerDetalle={onVerDetalle}
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
                );
              }

              return (
                <React.Fragment key={fila.id}>
                  <tr className="border-t border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]">
                    <td className="px-2 py-0.5 text-gray-200 text-xs whitespace-nowrap">{mesaLabel}</td>
                    <td className="px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => toggleGrupo(fila.id)}
                        className="flex items-center gap-1 min-w-0 text-left"
                      >
                        <span className="text-amber-400 text-[10px] w-3 shrink-0">
                          {expandido ? '▼' : '▶'}
                        </span>
                        <span className="text-amber-300 font-bold text-xs truncate">
                          GRUPO {fila.label || ''}
                        </span>
                        <span className="text-[9px] text-amber-200/70 shrink-0">
                          {fila.tickets.length} comandas
                        </span>
                        {fila.clienteNombre && (
                          <span className="text-[9px] text-gray-400 truncate max-w-[90px]">
                            {fila.clienteNombre}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-1 py-0.5 text-center">
                      <BotonVerDetalle
                        onClick={() => onVerDetalle(ticketParaDetalleGrupo(fila.tickets))}
                        titulo="Ver comandas del grupo"
                      />
                    </td>
                    <td className="px-2 py-0.5 text-right text-amber-300 font-bold text-xs whitespace-nowrap">
                      {formatCurrency(pendienteFila)}
                    </td>
                  </tr>
                  {expandido && fila.tickets.map((ticket) => (
                    <FilaTicket
                      key={ticket._id}
                      ticket={ticket}
                      mesa={fila.mesa}
                      indent
                      onVerDetalle={onVerDetalle}
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-black border-t border-amber-500/30">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          Total pendiente
        </span>
        <span className="text-sm font-extrabold text-amber-400 tracking-wide whitespace-nowrap">
          {formatCurrency(kpis.pendiente)}
        </span>
      </footer>
    </section>
  );
}

/**
 * Vista «Mozos pendientes»: un cuadro por mozo.
 * Agrupa como comandas.html (pedido / mismo cliente). Filas compactas.
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
  const [detalleTicket, setDetalleTicket] = useState(null);
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
      {detalleTicket && (
        <TicketComandaDetalleModal
          ticket={detalleTicket}
          onClose={() => setDetalleTicket(null)}
          footer={
            detalleTicket._id ? (
              <div className="flex justify-end pt-1">
                <AccionesTicket
                  ticket={detalleTicket}
                  onImprimir={onImprimir}
                  onAprobar={(t) => { onAprobar(t); setDetalleTicket(null); }}
                  onReportar={onReportar}
                  onRechazar={onRechazar}
                  onForzarPago={(t) => { onForzarPago?.(t); setDetalleTicket(null); }}
                  aprobarLoading={!!aprobarLoading[detalleTicket._id]}
                  reportarLoading={!!reportarLoading[detalleTicket._id]}
                  rechazarLoading={!!rechazarLoading[detalleTicket._id]}
                  forzarPagoLoading={!!forzarPagoLoading[detalleTicket._id]}
                />
              </div>
            ) : null
          }
        />
      )}

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
            onVerDetalle={setDetalleTicket}
          />
        ))}
      </div>
    </div>
  );
}
