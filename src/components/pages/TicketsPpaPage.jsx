/**
 * TicketsPpaPage - Tablero unificado de Comandas y Pagos Adelantados
 * Renombrado: "Tabla de comandas y pagos adelantados"
 * Acceso desde el menú principal de App Cocina.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import TicketsAprobacionTable from '../common/TicketsAprobacionTable';
import TicketsMozosPendientesGrid from '../common/TicketsMozosPendientesGrid';
import { sortTickets, filterTicketsByMozo, getMozosFromTickets, sortTicketsPendientesPrimero } from '../../utils/ticketSort';
import {
  formatCurrency, formatTime, formatDate, labelPagoTicket, tipoBadge, estadoTicketMeta,
  getFechaOperativa, loadModoVistaTickets, saveModoVistaTickets,
  nombreClienteTicket, dniClienteTicket,
  ticketPuedeAprobarse, ticketPuedeForzarPago, ticketEsAltaSinPago,
  rangoFechasDePeriodo, matchFechaRangoTicket, etiquetaPeriodoTickets,
  nextTurnosCierreState, PRESETS_PERIODO_TICKETS,
} from '../../utils/ticketAprobacionUi';
import { platosTicketVisibles, resumenKpisTickets, totalesVistaTicket } from '../../utils/ticketTotales';
import ForzarPagoTicketModal from '../common/ForzarPagoTicketModal';
import { apiGet } from '../../config/apiClient';
import BotonCandadoCocina from '../common/BotonCandadoCocina';

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
  const opts = [
    { id: 'basico', label: 'Básico' },
    { id: 'avanzado', label: 'Avanzado' },
    { id: 'mozos', label: 'Mozos pendientes' },
  ];
  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap
            ${modo === o.id ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KpiChip({ label, value, valueClass }) {
  return (
    <div className="bg-gray-800/90 border border-amber-500/20 rounded-lg px-2.5 py-1 min-w-[6.5rem]">
      <p className="text-[9px] uppercase tracking-wide text-gray-400 leading-tight">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function TicketsPpaPage({ onGoToMenu }) {
  const { user } = useAuth();
  const hoyOp = getFechaOperativa();
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoy');
  const [fechaDesde, setFechaDesde] = useState(hoyOp);
  const [fechaHasta, setFechaHasta] = useState(hoyOp);
  const [showTurnoDiaNoche, setShowTurnoDiaNoche] = useState(false);
  const [primerCierreHoyAt, setPrimerCierreHoyAt] = useState(null);
  const [turnosMeta, setTurnosMeta] = useState({
    turnosLimaYMD: hoyOp,
    _turnosAutoNocheHecho: false,
  });
  const { items, loading, error, fetchItems, aprobarItem, reportarItem, rechazarItem, forzarPagoItem, imprimirComanda, connectionStatus, authError } = useTablaAprobacion({
    fechaDesde,
    fechaHasta,
    incluirHistorial: true,
  });
  const [filtro, setFiltro] = useState('pendientes'); // pendientes, todos, aprobados, reportados
  const [aprobarLoading, setAprobarLoading] = useState({});
  const [reportarLoading, setReportarLoading] = useState({});
  const [rechazarLoading, setRechazarLoading] = useState({});
  const [reportarMotivo, setReportarMotivo] = useState({});
  const [showReportarModal, setShowReportarModal] = useState(null);
  const [showRechazarModal, setShowRechazarModal] = useState(null);
  const [modoVista, setModoVista] = useState(loadModoVistaTickets);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');
  const [filtroMozo, setFiltroMozo] = useState(null);
  const [forzarPagoLoading, setForzarPagoLoading] = useState({});
  const [ticketForzarPago, setTicketForzarPago] = useState(null);
  const filtroPeriodoRef = useRef(filtroPeriodo);
  const turnosMetaRef = useRef(turnosMeta);
  filtroPeriodoRef.current = filtroPeriodo;
  turnosMetaRef.current = turnosMeta;

  const aplicarTurnos = (data) => {
    const next = nextTurnosCierreState(
      {
        filtroPeriodo: filtroPeriodoRef.current,
        turnosLimaYMD: turnosMetaRef.current.turnosLimaYMD,
        _turnosAutoNocheHecho: turnosMetaRef.current._turnosAutoNocheHecho,
      },
      data
    );
    setShowTurnoDiaNoche(next.showTurnoDiaNoche);
    setPrimerCierreHoyAt(next.primerCierreHoyAt);
    setTurnosMeta({
      turnosLimaYMD: next.turnosLimaYMD,
      _turnosAutoNocheHecho: next._turnosAutoNocheHecho,
    });
    if (next.filtroPeriodo !== filtroPeriodoRef.current) {
      setFiltroPeriodo(next.filtroPeriodo);
      const r = rangoFechasDePeriodo(next.filtroPeriodo, fechaDesde, fechaHasta);
      setFechaDesde(r.desde);
      setFechaHasta(r.hasta);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await apiGet('/api/aprobacion/turnos-dia');
        if (!cancelled) aplicarTurnos(data);
      } catch (_) { /* sin cierre de caja */ }
    };
    refresh();
    const id = setInterval(refresh, 45000);
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
    // Solo al montar: aplicarTurnos lee el periodo actual al responder.
  }, []);

  const setPeriodo = (id) => {
    setFiltroPeriodo(id);
    const r = rangoFechasDePeriodo(id, fechaDesde, fechaHasta);
    setFechaDesde(r.desde);
    setFechaHasta(r.hasta);
  };

  const handleModoVista = (modo) => {
    setModoVista(modo);
    saveModoVistaTickets(modo);
  };

  const handleAprobar = async (ticket) => {
    if (!ticketPuedeAprobarse(ticket)) {
      alert('Este ticket aún no tiene cobro. Use Forzar pago o espere la solicitud del mozo.');
      return;
    }
    if (aprobarLoading[ticket._id]) return;
    setAprobarLoading(prev => ({ ...prev, [ticket._id]: true }));
    try {
      const ticketTipo = (ticket.tipo === 'pago_adelantado' || ticket.tipo === 'ADELANTADO') ? 'ADELANTADO' : 'COMANDA';
      const result = await aprobarItem(ticket._id, ticketTipo, user?._id || user?.id, user?.name || 'Cocina');
      if (result?.alreadyApproved || result?.skipped) return;
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

  const handleForzarPago = async (pago) => {
    const ticket = ticketForzarPago;
    if (!ticket) return;
    setForzarPagoLoading((prev) => ({ ...prev, [ticket._id]: true }));
    try {
      await forzarPagoItem(ticket._id, pago, user?._id || user?.id, user?.name || 'Cocina');
      setTicketForzarPago(null);
    } catch (err) {
      alert('Error al forzar pago: ' + (err.userMessage || err.message));
    } finally {
      setForzarPagoLoading((prev) => ({ ...prev, [ticket._id]: false }));
    }
  };

  const itemsEnPeriodo = useMemo(() => items.filter((t) => matchFechaRangoTicket(t.createdAt, {
    periodo: filtroPeriodo,
    primerCierreHoyAt,
    desde: fechaDesde,
    hasta: fechaHasta,
  })), [items, filtroPeriodo, primerCierreHoyAt, fechaDesde, fechaHasta]);

  const cantidadPendientes = itemsEnPeriodo.filter((t) => t.estado === 'pendiente_aprobacion').length;
  const cantidadParciales = itemsEnPeriodo.filter((t) => t.tipo === 'pago_parcial' && t.estado === 'pendiente_aprobacion').length;
  const cantidadPPA = itemsEnPeriodo.filter((t) => t.tipo === 'pago_adelantado' && t.estado === 'pendiente_aprobacion').length;

  const itemsPorEstado = useMemo(() => {
    if (filtro === 'pendientes') return itemsEnPeriodo.filter(t => t.estado === 'pendiente_aprobacion');
    if (filtro === 'aprobados') return itemsEnPeriodo.filter(t => t.estado === 'aprobado');
    if (filtro === 'reportados') return itemsEnPeriodo.filter(t => t.estado === 'reportado');
    if (filtro === 'rechazados') return itemsEnPeriodo.filter(t => t.estado === 'rechazado');
    if (filtro === 'comandas') return itemsEnPeriodo.filter(t => t.tipo === 'comanda_completa');
    if (filtro === 'adelantados') return itemsEnPeriodo.filter(t => t.tipo === 'pago_adelantado');
    if (filtro === 'parciales') return itemsEnPeriodo.filter(t => t.tipo === 'pago_parcial');
    return itemsEnPeriodo;
  }, [itemsEnPeriodo, filtro]);

  const mozosDisponibles = useMemo(
    () => getMozosFromTickets(itemsPorEstado),
    [itemsPorEstado]
  );

  const itemsFiltrados = useMemo(() => {
    const porMozo = filterTicketsByMozo(itemsPorEstado, filtroMozo);
    if (filtro === 'todos') {
      return sortTicketsPendientesPrimero(porMozo, sortBy, sortDir);
    }
    return sortTickets(porMozo, sortBy, sortDir);
  }, [itemsPorEstado, filtroMozo, sortBy, sortDir, filtro]);

  const kpisTabla = useMemo(() => {
    let list = itemsEnPeriodo;
    if (filtro === 'comandas') list = list.filter((t) => t.tipo === 'comanda_completa');
    else if (filtro === 'adelantados') list = list.filter((t) => t.tipo === 'pago_adelantado');
    else if (filtro === 'parciales') list = list.filter((t) => t.tipo === 'pago_parcial');
    return resumenKpisTickets(filterTicketsByMozo(list, filtroMozo));
  }, [itemsEnPeriodo, filtro, filtroMozo]);

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
          <div className="flex items-center gap-3 min-w-0 flex-1">
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
            <div className="flex items-center gap-2 flex-wrap">
              <KpiChip
                label="Ventas pendientes"
                value={formatCurrency(kpisTabla.pendiente)}
                valueClass="text-[#f59e0b]"
              />
              <KpiChip
                label="Ventas pagadas"
                value={formatCurrency(kpisTabla.aprobados)}
                valueClass="text-[#2ecc71]"
              />
              {kpisTabla.descuento > 0 && (
                <KpiChip
                  label="Descuentos"
                  value={`-${formatCurrency(kpisTabla.descuento)}`}
                  valueClass="text-[#e74c3c]"
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <VistaModoToggle modo={modoVista} onChange={handleModoVista} />
            {cantidadPendientes > 0 && (
              <span className="bg-violet-500 text-white text-sm px-3 py-1 rounded-full font-bold animate-pulse">
                {cantidadPendientes} pendiente{cantidadPendientes > 1 ? 's' : ''}
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
            <BotonCandadoCocina compact />
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

      {/* Filtros de estado (siempre visibles) + fechas abajo (siempre visibles) */}
      <div className="flex-shrink-0 z-40 bg-gray-900/95 border-b border-gray-800">
        <div className="max-w-7xl w-full mx-auto px-4 py-2 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { key: 'pendientes', label: 'Pendientes', icon: FaClock },
              { key: 'aprobados', label: 'Aprobados', icon: FaCheck },
              { key: 'rechazados', label: 'Rechazados', icon: FaTimes },
              { key: 'reportados', label: 'Reportados', icon: FaExclamationTriangle },
              { key: 'todos', label: 'Todos', icon: FaFilter },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
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
            <span className="hidden sm:inline w-px h-5 bg-gray-700 mx-0.5" />
            {[
              { key: 'comandas', label: 'Comandas', icon: FaUtensils },
              { key: 'parciales', label: 'Parciales', icon: FaShoppingBag },
              { key: 'adelantados', label: 'Adelantados', icon: FaMoneyBill },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
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
          <div className="flex flex-wrap items-center gap-2">
          {showTurnoDiaNoche && ['dia', 'noche'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriodo(id)}
              className={`px-2 py-1 rounded-md text-xs border ${
                filtroPeriodo === id
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
              }`}
            >
              {id === 'dia' ? 'DIA' : 'NOCHE'}
            </button>
          ))}
          {PRESETS_PERIODO_TICKETS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriodo(id)}
              className={`px-2 py-1 rounded-md text-xs border ${
                filtroPeriodo === id
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
          {filtroPeriodo === 'custom' && (
            <>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            Desde
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-200"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            Hasta
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde}
              max={getFechaOperativa()}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-200"
            />
          </label>
            </>
          )}
          <span className="text-[10px] text-gray-500 font-mono">
            {etiquetaPeriodoTickets(filtroPeriodo, primerCierreHoyAt)
              || (filtroPeriodo === 'todos' ? 'Todas' : `${fechaDesde}${fechaDesde !== fechaHasta ? ` → ${fechaHasta}` : ''}`)}
          </span>
          <TicketSortBar
            sortBy={sortBy}
            sortDir={sortDir}
            onChange={handleSortChange}
            mozoFilter={filtroMozo}
            mozosDisponibles={mozosDisponibles}
            onMozoFilterChange={setFiltroMozo}
          />
          </div>
        </div>
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
        <div className={`${modoVista === 'mozos' ? 'max-w-[1800px]' : 'max-w-7xl'} mx-auto px-4 py-4`}>
        {modoVista === 'avanzado' ? (
          <TicketsAprobacionTable
            tickets={itemsFiltrados}
            loading={loading}
            emptyLabel={
              filtroMozo
                ? `Sin tickets del mozo "${mozosDisponibles.find((m) => m.key === filtroMozo)?.nombre || filtroMozo}"`
                : `Sin tickets ${filtro === 'pendientes' ? 'pendientes' : filtro}`
            }
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onImprimir={handleImprimir}
            onAprobar={handleAprobar}
            onReportar={(ticket) => {
              setShowReportarModal(ticket._id);
              setReportarMotivo((prev) => ({ ...prev, [ticket._id]: '' }));
            }}
            onRechazar={(ticket) => {
              setShowRechazarModal(ticket._id);
              setRechazarLoading((prev) => ({ ...prev, [ticket._id + '_motivo']: '' }));
            }}
            onForzarPago={(ticket) => setTicketForzarPago(ticket)}
            aprobarLoading={aprobarLoading}
            reportarLoading={reportarLoading}
            rechazarLoading={rechazarLoading}
            forzarPagoLoading={forzarPagoLoading}
          />
        ) : modoVista === 'mozos' ? (
          <TicketsMozosPendientesGrid
            tickets={itemsFiltrados}
            loading={loading}
            emptyLabel={
              filtroMozo
                ? `Sin tickets del mozo "${mozosDisponibles.find((m) => m.key === filtroMozo)?.nombre || filtroMozo}"`
                : `Sin tickets ${filtro === 'pendientes' ? 'pendientes' : filtro}`
            }
            mozoFilter={filtroMozo}
            mozosDisponibles={mozosDisponibles}
            onMozoFilterChange={setFiltroMozo}
            onImprimir={handleImprimir}
            onAprobar={handleAprobar}
            onReportar={(ticket) => {
              setShowReportarModal(ticket._id);
              setReportarMotivo((prev) => ({ ...prev, [ticket._id]: '' }));
            }}
            onRechazar={(ticket) => {
              setShowRechazarModal(ticket._id);
              setRechazarLoading((prev) => ({ ...prev, [ticket._id + '_motivo']: '' }));
            }}
            onForzarPago={(ticket) => setTicketForzarPago(ticket)}
            aprobarLoading={aprobarLoading}
            reportarLoading={reportarLoading}
            rechazarLoading={rechazarLoading}
            forzarPagoLoading={forzarPagoLoading}
          />
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
                const platosVis = platosTicketVisibles(ticket);
                const { bruto, neto, montoDesc } = totalesVistaTicket(ticket);
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
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoTicketMeta(ticket.estado).bg}`}>
                            {estadoTicketMeta(ticket.estado).short}
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
                          Pago parcial — {platosVis.length} plato{platosVis.length !== 1 ? 's' : ''} en este envío
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
                      {platosVis.map((plato, i) => (
                        <PlatoTicketItem key={plato.platoLineaId || plato._id || i} plato={plato} size="sm" />
                      ))}
                    </div>

                    {/* Total & Pago */}
                    <div className="p-3 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <FaMoneyBill className="text-green-400" />
                          <span className="text-white font-bold">{formatCurrency(neto)}</span>
                        </div>
                        <div className="text-gray-500 text-xs flex items-center gap-2">
                          {ticket.voucherId && <span>V: {ticket.voucherId}</span>}
                          <span className="uppercase">{ticket.moneda || 'Soles'}</span>
                          <span className={ticket.estado === 'pendiente_aprobacion' ? 'text-yellow-400 font-medium' : ''}>
                            · {labelPagoTicket(ticket)}
                          </span>
                        </div>
                      </div>
                      {montoDesc > 0 && (
                        <div className="mt-1.5 space-y-0.5 text-xs">
                          <div className="flex justify-between text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(bruto)}</span>
                          </div>
                          <div className="text-red-400">
                            Descuento: -{formatCurrency(montoDesc)}
                            {ticket.descuentos?.[0]?.motivo ? ` · ${ticket.descuentos[0].motivo}` : ''}
                            {ticket.descuentos?.[0]?.porcentaje ? ` (${Number(ticket.descuentos[0].porcentaje)}%)` : ''}
                          </div>
                          <div className="flex justify-between text-white font-semibold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(neto)}</span>
                          </div>
                        </div>
                      )}
                      {(ticket.metodoPago === 'efectivo' || String(ticket.tipoPago || '').toLowerCase() === 'efectivo') &&
                        (ticket.montoRecibido != null || ticket.vuelto != null) && (
                        <div className="mt-2 flex items-center justify-between text-xs bg-gray-900/50 rounded px-2 py-1.5">
                          <span className="text-gray-400">
                            Recibido: <span className="text-gray-200 font-medium">{formatCurrency(ticket.montoRecibido)}</span>
                          </span>
                          <span className="text-green-400 font-bold">
                            Vuelto: {formatCurrency(ticket.vuelto)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cliente */}
                    {(nombreClienteTicket(ticket) || dniClienteTicket(ticket)) && (
                      <div className="px-3 py-1 border-b border-gray-700 text-xs text-gray-400">
                        <FaUser className="inline mr-1" />
                        {nombreClienteTicket(ticket) || 'Cliente'}
                        {dniClienteTicket(ticket) && (
                          <span className="ml-2 text-gray-500">DNI: {dniClienteTicket(ticket)}</span>
                        )}
                      </div>
                    )}

                    {/* Acciones según estado del ticket */}
                    {ticket.estado === 'pendiente_aprobacion' && (
                      <div className="p-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleImprimir(ticket)}
                          className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-500
                            text-white py-2 rounded-lg transition-colors font-medium text-sm"
                        >
                          <FaPrint className="text-xs" />
                          Imprimir
                        </button>
                        {ticketPuedeAprobarse(ticket) && (
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
                        )}
                        {ticketPuedeForzarPago(ticket) && !ticket.boucher && (
                        <button
                          onClick={() => setTicketForzarPago(ticket)}
                          disabled={forzarPagoLoading[ticket._id]}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500
                            disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                            transition-colors font-medium text-sm"
                        >
                          <FaMoneyBill className="text-xs" />
                          Forzar pago
                        </button>
                        )}
                        {isComanda && !ticketEsAltaSinPago(ticket) ? (
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
                        ) : !isComanda ? (
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
                        ) : null}
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

      {ticketForzarPago && (
        <ForzarPagoTicketModal
          ticket={ticketForzarPago}
          loading={!!forzarPagoLoading[ticketForzarPago._id]}
          onClose={() => setTicketForzarPago(null)}
          onConfirm={handleForzarPago}
        />
      )}

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