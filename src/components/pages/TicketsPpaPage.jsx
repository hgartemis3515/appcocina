/**
 * TicketsPpaPage - Tablero unificado de Comandas y Pagos Adelantados
 * Renombrado: "Tabla de comandas y pagos adelantados"
 * Acceso desde el menú principal de App Cocina.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShoppingBag, FaCheck, FaTimes, FaClock, FaUtensils, FaUser,
  FaMoneyBill, FaArrowLeft, FaSyncAlt, FaFilter, FaExclamationTriangle, FaPrint,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import useTablaAprobacion from '../../hooks/useTablaAprobacion';
import SocketConnectionBadge from '../common/SocketConnectionBadge';
import { getComandaDisplayLabel, getCantidadComandas, getInfoTicketMismaComanda } from '../../utils/ticketComandaDisplay';
import PlatoTicketItem from '../common/PlatoTicketItem';
import TicketSortBar from '../common/TicketSortBar';
import { sortTickets, filterTicketsByMozo, getMozosFromTickets } from '../../utils/ticketSort';

const formatCurrency = (amount) => `S/. ${Number(amount || 0).toFixed(2)}`;
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const labelPagoTicket = (ticket) => {
  if (ticket.estado === 'pendiente_aprobacion') return 'Pago: Pendiente';
  if (ticket.metodoPago) return ticket.metodoPago;
  return 'Pago: Pendiente';
};

// Badge type label + color
const tipoBadge = (tipo) => {
  const t = String(tipo || '').toLowerCase();
  if (t === 'comanda_completa' || t === 'comanda') return { label: 'COMANDA', bg: 'bg-blue-500/30 text-blue-300 border-blue-500/40' };
  if (t === 'pago_parcial') return { label: 'PAGO PARCIAL', bg: 'bg-amber-500/30 text-amber-300 border-amber-500/40' };
  if (t === 'pago_adelantado' || t === 'adelantado') return { label: 'ADELANTADO', bg: 'bg-violet-500/30 text-violet-300 border-violet-500/40' };
  return { label: tipo || 'OTRO', bg: 'bg-gray-500/30 text-gray-300 border-gray-500/40' };
};

// Cuenta cuántos tickets pendientes hay por mesa (para avisar a cocina que aún faltan)
const countTicketsPendientesByMesa = (items) => {
  const map = new Map();
  for (const t of items) {
    if (t.estado !== 'pendiente_aprobacion') continue;
    const key = String(t.mesa?._id || t.mesa || '');
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
};

function VistaModoToggle({ modo, onChange }) {
  const isAvanzado = modo === 'avanzado';
  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
      <button
        type="button"
        onClick={() => onChange('basico')}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap
          ${!isAvanzado ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
      >
        Básico
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={isAvanzado}
        aria-label="Cambiar entre vista básica y avanzada"
        onClick={() => onChange(isAvanzado ? 'basico' : 'avanzado')}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
          ${isAvanzado ? 'bg-violet-500' : 'bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            ${isAvanzado ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <button
        type="button"
        onClick={() => onChange('avanzado')}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap
          ${isAvanzado ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
      >
        Avanzado
      </button>
    </div>
  );
}

export default function TicketsPpaPage({ onGoToMenu }) {
  const { user, getToken } = useAuth();
  const { items, loading, error, fetchItems, aprobarItem, reportarItem, rechazarItem, imprimirComanda, cantidadPendientes, cantidadComandas, cantidadParciales, cantidadPPA, connectionStatus, authError } = useTablaAprobacion();
  const [filtro, setFiltro] = useState('pendientes'); // pendientes, todos, aprobados, reportados
  const [aprobarLoading, setAprobarLoading] = useState({});
  const [reportarLoading, setReportarLoading] = useState({});
  const [rechazarLoading, setRechazarLoading] = useState({});
  const [reportarMotivo, setReportarMotivo] = useState({});
  const [showReportarModal, setShowReportarModal] = useState(null);
  const [showRechazarModal, setShowRechazarModal] = useState(null);
  const [modoVista, setModoVista] = useState('basico'); // basico: tarjetas | avanzado: tabla (próximamente)
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');
  const [filtroMozo, setFiltroMozo] = useState(null);

  const handleAprobar = async (ticket) => {
    setAprobarLoading(prev => ({ ...prev, [ticket._id]: true }));
    try {
      const ticketTipo = (ticket.tipo === 'pago_adelantado' || ticket.tipo === 'ADELANTADO') ? 'ADELANTADO' : 'COMANDA';
      await aprobarItem(ticket._id, ticketTipo, user?._id || user?.id, user?.name || 'Cocina');
    } catch (err) {
      alert('Error al aprobar: ' + (err.userMessage || err.message));
    } finally {
      setAprobarLoading(prev => ({ ...prev, [ticket._id]: false }));
    }
  };

  const handleReportar = async (ticketId) => {
    const motivo = (reportarMotivo[ticketId] || '').trim();
    if (motivo.length < 3) {
      alert('El motivo es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }
    setReportarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      await reportarItem(ticketId, motivo, user?._id || user?.id, user?.name || 'Cocina');
      setShowReportarModal(null);
    } catch (err) {
      alert('Error al reportar: ' + (err.userMessage || err.message));
    } finally {
      setReportarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleRechazar = async (ticketId) => {
    const motivo = (rechazarLoading[ticketId + '_motivo'] || '').trim();
    if (motivo.length < 3) {
      alert('El motivo es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }
    setRechazarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      await rechazarItem(ticketId, motivo, user?._id || user?.id, user?.name || 'Cocina');
      setShowRechazarModal(null);
    } catch (err) {
      alert('Error al rechazar: ' + (err.userMessage || err.message));
    } finally {
      setRechazarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleImprimir = async (ticket) => {
    try {
      await imprimirComanda(ticket);
    } catch (err) {
      alert('Error al imprimir comanda: ' + (err.userMessage || err.message));
    }
  };

  const itemsPorEstado = useMemo(() => {
    if (filtro === 'pendientes') return items.filter(t => t.estado === 'pendiente_aprobacion');
    if (filtro === 'aprobados') return items.filter(t => t.estado === 'aprobado');
    if (filtro === 'reportados') return items.filter(t => t.estado === 'reportado');
    if (filtro === 'comandas') return items.filter(t => t.tipo === 'comanda_completa');
    if (filtro === 'adelantados') return items.filter(t => t.tipo === 'pago_adelantado');
    if (filtro === 'parciales') return items.filter(t => t.tipo === 'pago_parcial');
    return items;
  }, [items, filtro]);

  const mozosDisponibles = useMemo(
    () => getMozosFromTickets(itemsPorEstado),
    [itemsPorEstado]
  );

  const itemsFiltrados = useMemo(() => {
    const porMozo = filterTicketsByMozo(itemsPorEstado, filtroMozo);
    return sortTickets(porMozo, sortBy, sortDir);
  }, [itemsPorEstado, filtroMozo, sortBy, sortDir]);

  const handleSortChange = (field, dir) => {
    setSortBy(field);
    setSortDir(dir);
  };

  // Limpiar filtro de mozo si ya no hay tickets de ese mozo en la pestaña actual
  useEffect(() => {
    if (filtroMozo && !mozosDisponibles.some((m) => m.key === filtroMozo)) {
      setFiltroMozo(null);
    }
  }, [filtroMozo, mozosDisponibles]);

  // BUG_PAGOS_PARCIALES_APROBACION_COCINA (Fase 6): mapa de tickets pendientes por mesa
  const ticketsPendientesPorMesa = countTicketsPendientesByMesa(items);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onGoToMenu}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaShoppingBag className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Comandas y Pagos Adelantados</h1>
              <p className="text-gray-400 text-xs">Aprobar comandas, reportar incidencias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <VistaModoToggle modo={modoVista} onChange={setModoVista} />
            {cantidadPendientes > 0 && (
              <span className="bg-violet-500 text-white text-sm px-3 py-1 rounded-full font-bold animate-pulse">
                {cantidadPendientes} pendiente{cantidadPendientes > 1 ? 's' : ''}
              </span>
            )}
            {cantidadComandas > 0 && (
              <span className="bg-blue-500/80 text-white text-xs px-2 py-1 rounded-full">
                {cantidadComandas} comanda{cantidadComandas > 1 ? 's' : ''} por aprobar
              </span>
            )}
            {cantidadParciales > 0 && (
              <span className="bg-amber-500/80 text-white text-xs px-2 py-1 rounded-full">
                {cantidadParciales} parcial{cantidadParciales > 1 ? 'es' : ''} por aprobar
              </span>
            )}
            {cantidadPPA > 0 && (
              <span className="bg-violet-500/80 text-white text-xs px-2 py-1 rounded-full">
                {cantidadPPA} adelantado{cantidadPPA > 1 ? 's' : ''} por aprobar
              </span>
            )}
            <SocketConnectionBadge connectionStatus={connectionStatus} authError={authError} />
            <button
              onClick={fetchItems}
              className="text-gray-400 hover:text-white p-2 transition-colors"
              title="Actualizar"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Filtros + Ordenar */}
      <div className="flex-shrink-0 max-w-7xl w-full mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800">
        <div className="flex gap-2 overflow-x-auto min-w-0 flex-1 pb-0.5">
          {[
            { key: 'pendientes', label: 'Pendientes', icon: FaClock },
            { key: 'comandas', label: 'Comandas', icon: FaUtensils },
            { key: 'parciales', label: 'Parciales', icon: FaShoppingBag },
            { key: 'adelantados', label: 'Adelantados', icon: FaMoneyBill },
            { key: 'reportados', label: 'Reportados', icon: FaExclamationTriangle },
            { key: 'aprobados', label: 'Aprobados', icon: FaCheck },
            { key: 'todos', label: 'Todos', icon: FaFilter },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${filtro === key
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
              <Icon className="text-xs" />
              {label}
            </button>
          ))}
        </div>
        <TicketSortBar
          sortBy={sortBy}
          sortDir={sortDir}
          onChange={handleSortChange}
          mozoFilter={filtroMozo}
          mozosDisponibles={mozosDisponibles}
          onMozoFilterChange={setFiltroMozo}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 max-w-7xl w-full mx-auto px-4 py-2">
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Contenido con scroll independiente */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
        {modoVista === 'avanzado' ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 mb-5">
              <FaFilter className="text-3xl text-violet-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Vista Avanzada — Próximamente</h2>
            <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
              La vista avanzada mostrará las solicitudes en formato de tabla formal,
              con ordenamiento y columnas para gestionar comandas y pagos adelantados de forma más eficiente.
            </p>
            <button
              onClick={() => setModoVista('basico')}
              className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              Volver a vista Básica
            </button>
          </div>
        ) : loading && itemsFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <FaSyncAlt className="text-4xl text-violet-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Cargando tickets...</p>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <FaCheck className="text-4xl text-green-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {filtroMozo
                ? `Sin tickets del mozo "${mozosDisponibles.find((m) => m.key === filtroMozo)?.nombre || filtroMozo}"`
                : `Sin tickets ${filtro === 'pendientes' ? 'pendientes' : filtro}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {itemsFiltrados.map((ticket) => {
                const badge = tipoBadge(ticket.tipo);
                const isComanda = ticket.tipo === 'comanda_completa' || String(ticket.tipo || '').toUpperCase() === 'COMANDA';
                const isPagoParcial = ticket.tipo === 'pago_parcial';
                const comandaLabel = getComandaDisplayLabel(ticket);
                const cantidadComandasTicket = getCantidadComandas(ticket);
                // BUG_PAGOS_PARCIALES_APROBACION_COCINA (Fase 6): mostrar si quedan más tickets
                // pendientes de esta misma mesa para que cocina sepa que no debe liberar aún.
                const infoMismaComanda = getInfoTicketMismaComanda(ticket, items);
                const mesaId = String(ticket.mesa?._id || ticket.mesa || '');
                const ticketsPendientesMismaMesa = ticketsPendientesPorMesa.get(mesaId) || 0;
                const quedanMasTickets = ticketsPendientesMismaMesa > 1;
                return (
                  <motion.div
                    key={ticket._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg"
                  >
                    {/* Header del card */}
                    <div className={`p-3 ${
                      ticket.estado === 'pendiente_aprobacion' ? 'bg-yellow-600/20 border-b border-yellow-500/30' :
                      ticket.estado === 'aprobado' ? 'bg-green-600/20 border-b border-green-500/30' :
                      ticket.estado === 'reportado' ? 'bg-red-600/20 border-b border-red-500/30' :
                      'bg-violet-600/20 border-b border-violet-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-300 text-sm font-mono font-bold">
                          Comanda: {comandaLabel}
                          {ticket.ticketNumber != null && (
                            <span className="text-amber-200/90 font-normal ml-1">
                              · Ticket #{ticket.ticketNumber}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            ticket.estado === 'pendiente_aprobacion' ? 'bg-yellow-500/30 text-yellow-300' :
                            ticket.estado === 'aprobado' ? 'bg-green-500/30 text-green-300' :
                            ticket.estado === 'reportado' ? 'bg-red-500/30 text-red-300' :
                            'bg-gray-500/30 text-gray-300'
                          }`}>
                            {ticket.estado === 'pendiente_aprobacion' ? '⏳ Pendiente' :
                             ticket.estado === 'aprobado' ? '✅ Aprobado' :
                             ticket.estado === 'reportado' ? '🔴 Reportado' :
                             ticket.estado === 'rechazado' ? '❌ Rechazado' : ticket.estado}
                          </span>
                        </div>
                      </div>
                      {cantidadComandasTicket > 1 && (
                        <div className="text-yellow-400/80 text-[11px] font-medium mt-0.5">
                          {cantidadComandasTicket} comandas agrupadas · {comandaLabel}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-gray-300 text-xs">
                          <FaUtensils className="text-gray-400" />
                          <span>Mesa {ticket.numMesa || '?'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <FaUser className="text-gray-500" />
                          <span>{ticket.nombreMozo || ticket.mozoNombre || '?'}</span>
                        </div>
                      </div>
                      <div className="text-gray-500 text-[10px] mt-1">
                        {formatDate(ticket.createdAt)} {formatTime(ticket.createdAt)}
                        {ticket.observaciones && (
                          <span className="block text-gray-400 mt-0.5 truncate" title={ticket.observaciones}>
                            Obs: {ticket.observaciones}
                          </span>
                        )}
                      </div>
                      {/* BUG_PAGOS_PARCIALES_APROBACION_COCINA (Fase 6): aviso de tickets pendientes de la misma mesa */}
                      {infoMismaComanda && (
                        <div className="mt-1 px-2 py-1 bg-amber-600/25 border border-amber-500/40 rounded text-[10px] text-amber-200 font-medium">
                          {infoMismaComanda.indice != null
                            ? `Ticket ${infoMismaComanda.indice} de ${infoMismaComanda.total} de la misma comanda ${infoMismaComanda.comandaLabel}`
                            : `${infoMismaComanda.total} tickets de la misma comanda ${infoMismaComanda.comandaLabel} — apruebe cada envío por separado`}
                        </div>
                      )}
                      {isPagoParcial && !infoMismaComanda && (
                        <div className="mt-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] text-amber-300">
                          Pago parcial — {ticket.platos?.length || 0} plato{(ticket.platos?.length || 0) !== 1 ? 's' : ''} en este envío
                        </div>
                      )}
                      {quedanMasTickets && ticket.estado === 'pendiente_aprobacion' && (
                        <div className="mt-1 px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded text-[10px] text-yellow-400">
                          Esta mesa tiene {ticketsPendientesMismaMesa} ticket{ticketsPendientesMismaMesa > 1 ? 's' : ''} pendiente{ticketsPendientesMismaMesa > 1 ? 's' : ''} — apruebe todos para liberar la mesa
                        </div>
                      )}
                    </div>

                    {/* Platos */}
                    <div className="p-3 max-h-48 overflow-y-auto border-b border-gray-700">
                      {(ticket.platos || []).map((plato, i) => (
                        <PlatoTicketItem key={plato.platoLineaId || plato._id || i} plato={plato} size="sm" />
                      ))}
                    </div>

                    {/* Total & Pago */}
                    <div className="p-3 flex items-center justify-between border-b border-gray-700">
                      <div className="flex items-center gap-1">
                        <FaMoneyBill className="text-green-400" />
                        <span className="text-white font-bold">{formatCurrency(ticket.total)}</span>
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-2">
                        {ticket.voucherId && <span>V: {ticket.voucherId}</span>}
                        <span className="uppercase">{ticket.moneda || 'Soles'}</span>
                        <span className={ticket.estado === 'pendiente_aprobacion' ? 'text-yellow-400 font-medium' : ''}>
                          · {labelPagoTicket(ticket)}
                        </span>
                      </div>
                    </div>

                    {/* Cliente */}
                    {(ticket.cliente?.nombre || ticket.nombreCliente) && (
                      <div className="px-3 py-1 border-b border-gray-700 text-xs text-gray-400">
                        <FaUser className="inline mr-1" />
                        {ticket.cliente?.nombre || ticket.nombreCliente || 'Cliente'}
                        {(ticket.cliente?.dni || ticket.dniCliente) && (
                          <span className="ml-2 text-gray-500">DNI: {ticket.cliente?.dni || ticket.dniCliente}</span>
                        )}
                      </div>
                    )}

                    {/* Acciones según estado del ticket */}
                    {ticket.estado === 'pendiente_aprobacion' && (
                      <div className="p-3 flex gap-2">
                        <button
                          onClick={() => handleImprimir(ticket)}
                          className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-500
                            text-white py-2 rounded-lg transition-colors font-medium text-sm"
                        >
                          <FaPrint className="text-xs" />
                          Imprimir
                        </button>
                        <button
                          onClick={() => handleAprobar(ticket)}
                          disabled={aprobarLoading[ticket._id]}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500
                            disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                            transition-colors font-medium text-sm"
                        >
                          <FaCheck />
                          {aprobarLoading[ticket._id] ? 'Aprobando...' : 'Aprobar'}
                        </button>
                        {isComanda ? (
                          <button
                            onClick={() => {
                              setShowReportarModal(ticket._id);
                              setReportarMotivo(prev => ({ ...prev, [ticket._id]: '' }));
                            }}
                            disabled={reportarLoading[ticket._id]}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500
                              disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                              transition-colors font-medium text-sm"
                          >
                            <FaExclamationTriangle className="text-xs" />
                            Reportar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowRechazarModal(ticket._id);
                              setRechazarLoading(prev => ({ ...prev, [ticket._id + '_motivo']: '' }));
                            }}
                            disabled={rechazarLoading[ticket._id]}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500
                              disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                              transition-colors font-medium text-sm"
                          >
                            <FaTimes className="text-xs" />
                            Rechazar
                          </button>
                        )}
                      </div>
                    )}

                    {/* Aprobados: solo imprimir */}
                    {ticket.estado === 'aprobado' && (
                      <div className="p-2">
                        <button
                          onClick={() => handleImprimir(ticket)}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-600
                            text-white py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          <FaPrint className="text-xs" />
                          Imprimir
                        </button>
                      </div>
                    )}

                    {/* Info de reporte */}
                    {ticket.estado === 'reportado' && ticket.motivoReporte && (
                      <div className="p-3 bg-red-900/20">
                        <p className="text-red-400 text-xs">
                          <strong>Motivo:</strong> {ticket.motivoReporte}
                        </p>
                        {ticket.reportadoPorNombre && (
                          <p className="text-gray-500 text-[10px] mt-1">
                            Reportado por: {ticket.reportadoPorNombre}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Info de rechazo (PPA) */}
                    {ticket.estado === 'rechazado' && ticket.motivoRechazo && (
                      <div className="p-3 bg-red-900/20">
                        <p className="text-red-400 text-xs">
                          <strong>Motivo:</strong> {ticket.motivoRechazo}
                        </p>
                      </div>
                    )}

                    {/* Info de aprobación */}
                    {ticket.estado === 'aprobado' && ticket.aprobadoPorNombre && (
                      <div className="p-2 bg-green-900/20">
                        <p className="text-green-400 text-xs">
                          Aprobado por: {ticket.aprobadoPorNombre} — {formatTime(ticket.fechaAprobacion)}
                        </p>
                      </div>
                    )}

                    {/* Imprimir para rechazados u otros estados no pendientes */}
                    {(ticket.estado === 'rechazado') && (
                      <div className="p-2">
                        <button
                          onClick={() => handleImprimir(ticket)}
                          className="w-full flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600
                            text-white py-1.5 rounded-lg transition-colors text-sm"
                        >
                          <FaPrint className="text-xs" />
                          Reimprimir
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        </div>
      </main>

      {/* Modal de reportar (comandas) */}
      <AnimatePresence>
        {showReportarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReportarModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-600"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <FaExclamationTriangle className="text-red-400 text-lg" />
                <h4 className="text-white font-bold text-lg">Reportar Comanda</h4>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                ¿Reportar un problema con esta comanda? El mozo será notificado.
              </p>
              <textarea
                value={reportarMotivo[showReportarModal] || ''}
                onChange={e => setReportarMotivo(prev => ({ ...prev, [showReportarModal]: e.target.value }))}
                placeholder="Describe el motivo del reporte (mínimo 3 caracteres)..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm h-24 resize-none border border-gray-600
                  focus:border-red-500 focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowReportarModal(null)}
                  className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReportar(showReportarModal)}
                  disabled={(reportarMotivo[showReportarModal] || '').trim().length < 3 || reportarLoading[showReportarModal]}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors font-medium
                    disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {reportarLoading[showReportarModal] ? 'Reportando...' : 'Reportar Comanda'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de rechazo (PPA) */}
      <AnimatePresence>
        {showRechazarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRechazarModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-600"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-white font-bold text-lg mb-3">Motivo de rechazo</h4>
              <textarea
                value={rechazarLoading[showRechazarModal + '_motivo'] || ''}
                onChange={e => setRechazarLoading(prev => ({ ...prev, [showRechazarModal + '_motivo']: e.target.value }))}
                placeholder="Describe el motivo del rechazo..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm h-24 resize-none border border-gray-600
                  focus:border-violet-500 focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRechazarModal(null)}
                  className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRechazar(showRechazarModal)}
                  disabled={(rechazarLoading[showRechazarModal + '_motivo'] || '').trim().length < 3 || rechazarLoading[showRechazarModal]}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors font-medium
                    disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {rechazarLoading[showRechazarModal] ? 'Rechazando...' : 'Rechazar Ticket'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}