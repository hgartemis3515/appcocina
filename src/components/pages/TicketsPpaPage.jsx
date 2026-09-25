/**
 * TicketsPpaPage - Tablero unificado de Comandas y Pagos Adelantados
 * Renombrado: "Tabla de comandas y pagos adelantados"
 * Acceso desde el menú principal de App Cocina.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShoppingBag, FaCheck, FaTimes, FaClock, FaUtensils, FaUser,
  FaMoneyBill, FaArrowLeft, FaSyncAlt, FaFilter, FaExclamationTriangle, FaPrint, FaTrash, FaCog,
  FaCalendarDay, FaHistory, FaCalendarWeek, FaLayerGroup, FaSlidersH, FaSun, FaMoon,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import useTablaAprobacion from '../../hooks/useTablaAprobacion';
import SocketConnectionBadge from '../common/SocketConnectionBadge';
import { getComandaDisplayLabel, getCantidadComandas, getInfoTicketMismaComanda, getComandasNumbersFromTicket, getComandaIdsFromTicket } from '../../utils/ticketComandaDisplay';
import PlatoTicketItem from '../common/PlatoTicketItem';
import TicketSortBar from '../common/TicketSortBar';
import TicketsAprobacionTable from '../common/TicketsAprobacionTable';
import TicketsMozosPendientesGrid from '../common/TicketsMozosPendientesGrid';
import TicketsTablaConfigModal from '../common/TicketsTablaConfigModal';
import { sortTickets, filterTicketsByMozo, getMozosFromTickets, sortTicketsPendientesPrimero, groupTicketsComoComandasHtml, ticketParaDetalleGrupo, ticketParaCobroGrupo } from '../../utils/ticketSort';
import BadgeNombreMozo from '../common/BadgeNombreMozo';
import { etiquetaMozoDeTickets } from '../../utils/numeroComandaMozo';
import { indexarCobroPorCantidad, idsOcultosCobro } from '../../utils/cobroPorCantidadVista';
import TotalCuentaCobro from '../common/TotalCuentaCobro';
import { useConfiguracionCocina } from '../../hooks/useConfiguracionCocina';
import {
  formatCurrency, formatTime, formatDate, labelPagoTicket, tipoBadge,
  getFechaOperativa, loadModoVistaTickets, saveModoVistaTickets,
  loadTicketsTablaPrefs, saveTicketsTablaPrefs,
  nombreClienteTicket, dniClienteTicket,
  ticketPuedeAprobarse, ticketPuedeForzarPago, ticketsForzablesDeGrupo, ticketEsAltaSinPago,
  rangoFechasDePeriodo, matchFechaRangoTicket, etiquetaPeriodoTickets,
  nextTurnosCierreState, PRESETS_PERIODO_TICKETS,
  estadoEntregaComandaTicket,
  estadoEntregaTickets,
  ticketTieneExtraLlevar,
  rangoConsultaDesglose,
  ticketEsParaLlevar,
} from '../../utils/ticketAprobacionUi';
import { estiloCuerpoParaLlevarTickets, estilosTextoTicketsTabla } from '../../utils/estiloTicketsTabla';
import { platosTicketVisibles, resumenKpisTickets, saldoPendienteTicket, saldoPendienteTicketsUnicos, totalesVistaTicket } from '../../utils/ticketTotales';
import ForzarPagoTicketModal from '../common/ForzarPagoTicketModal';
import { apiGet } from '../../config/apiClient';
import BotonCandadoCocina from '../common/BotonCandadoCocina';
import { letraRevisionTicket } from '../../utils/comandaPrint/ticketCocinaHtml';

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

function opcionesComandasTicketCocina(tickets) {
  const seen = new Map();
  for (const t of tickets || []) {
    const nums = getComandasNumbersFromTicket(t);
    const ids = getComandaIdsFromTicket(t);
    const mesa = t.numMesa ?? t.mesa?.nummesa ?? '';
    const mozo = t.nombreMozo || t.mozoNombre || t.mozo?.name || '';
    const docs = Array.isArray(t.comandas) ? t.comandas : [];
    if (nums.length) {
      nums.forEach((n) => {
        const key = `n:${n}`;
        if (seen.has(key)) return;
        const doc = docs.find((c) => Number(c?.numeroComandaDia ?? c?.comandaNumber) === n);
        const rawId = doc?._id || doc?.id || ids[0] || null;
        const rev = Number(doc?.revisionTicket) || 0;
        seen.set(key, {
          key,
          ticket: t,
          numero: n,
          comandaId: rawId ? String(rawId) : null,
          revisionTicket: rev,
          mesa,
          mozo,
          label: `#${n}${letraRevisionTicket(rev)}`,
        });
      });
      continue;
    }
    ids.forEach((id) => {
      const key = `id:${id}`;
      if (seen.has(key)) return;
      seen.set(key, {
        key,
        ticket: t,
        numero: null,
        comandaId: id,
        revisionTicket: 0,
        mesa,
        mozo,
        label: getComandaDisplayLabel(t) || 'Comanda',
      });
    });
  }
  return [...seen.values()].sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
}

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

function KpiChip({ label, value, valueClass, ocultable = false, visible = true, onToggle }) {
  const mostrar = !ocultable || visible;
  return (
    <button
      type="button"
      disabled={!ocultable}
      onClick={ocultable ? onToggle : undefined}
      className={`bg-gray-800/90 border border-amber-500/20 rounded-lg px-2.5 py-1 min-w-[6.5rem] text-left ${
        ocultable ? 'cursor-pointer hover:border-amber-400/40' : 'cursor-default'
      }`}
      title={ocultable ? (mostrar ? 'Ocultar montos' : 'Mostrar montos') : undefined}
      aria-pressed={ocultable ? mostrar : undefined}
    >
      <p className="text-[9px] uppercase tracking-wide text-gray-400 leading-tight">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${mostrar ? valueClass : 'text-gray-500 tracking-widest'}`}>
        {mostrar ? value : '####'}
      </p>
    </button>
  );
}

export default function TicketsPpaPage({ onGoToMenu }) {
  const { user } = useAuth();
  const puedeGestionarTickets = user?.rol === 'admin' || user?.rol === 'supervisor' || user?.rol === 'cajero';
  const { cobroPorCantidad } = useConfiguracionCocina();
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
  const { items, loading, error, fetchItems, aprobarItem, reportarItem, rechazarItem, quitarDuplicadoItem, forzarPagoItem, forzarPagoGrupo, imprimirComanda, connectionStatus, authError } = useTablaAprobacion({
    fechaDesde,
    fechaHasta,
    incluirHistorial: true,
  });
  const [filtro, setFiltro] = useState('pendientes'); // pendientes, todos, aprobados, reportados
  const [kpisVisibles, setKpisVisibles] = useState(false);
  const [aprobarLoading, setAprobarLoading] = useState({});
  const [reportarLoading, setReportarLoading] = useState({});
  const [rechazarLoading, setRechazarLoading] = useState({});
  const [reportarMotivo, setReportarMotivo] = useState({});
  const [showReportarModal, setShowReportarModal] = useState(null);
  const [showRechazarModal, setShowRechazarModal] = useState(null);
  const [modoVista, setModoVista] = useState(loadModoVistaTickets);
  const [gruposAbiertosBasico, setGruposAbiertosBasico] = useState(() => new Set());
  const [tablaPrefs, setTablaPrefs] = useState(loadTicketsTablaPrefs);
  const estilosTxtTabla = useMemo(() => estilosTextoTicketsTabla(tablaPrefs), [tablaPrefs]);
  const letraFiltro = Math.min(22, Math.max(12, Number(tablaPrefs.filtroTamano) || 14));
  const [showTablaConfig, setShowTablaConfig] = useState(false);
  const [showModalTicketCocina, setShowModalTicketCocina] = useState(false);
  const [busquedaTicketCocina, setBusquedaTicketCocina] = useState('');
  const [imprimiendoTicketCocina, setImprimiendoTicketCocina] = useState(false);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');
  const [filtroMozo, setFiltroMozo] = useState(null);
  const [forzarPagoLoading, setForzarPagoLoading] = useState({});
  const [ticketForzarPago, setTicketForzarPago] = useState(null);
  const [modoEliminar, setModoEliminar] = useState(false);
  const [idsEliminar, setIdsEliminar] = useState([]);
  const [motivoEliminarLote, setMotivoEliminarLote] = useState('Ticket duplicado');
  const [showEliminarLoteModal, setShowEliminarLoteModal] = useState(false);
  const [eliminandoLote, setEliminandoLote] = useState(false);
  const [kpisCierre, setKpisCierre] = useState(null);
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

  useEffect(() => {
    let cancelled = false;
    const rango = rangoConsultaDesglose(filtroPeriodo, {
      primerCierreHoyAt,
      fechaDesde,
      fechaHasta,
    });
    apiGet('/api/aprobacion/desglose-ventas', {
      fechaInicio: rango.fechaInicio,
      fechaFin: rango.fechaFin,
    }).then((data) => {
      if (cancelled || !data?.success) return;
      setKpisCierre({
        totalVentas: Number(data.totalVentas) || 0,
        pendiente: Number(data.ventasPendientes) || 0,
        aprobados: Number(data.ventasAprobadas) || 0,
      });
    }).catch(() => {
      if (!cancelled) setKpisCierre(null);
    });
    return () => { cancelled = true; };
  }, [filtroPeriodo, primerCierreHoyAt, fechaDesde, fechaHasta, items]);

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

  const handleTablaPrefs = (patch) => {
    setTablaPrefs((prev) => saveTicketsTablaPrefs({ ...prev, ...patch }));
  };

  const handleAprobar = async (ticket) => {
    if (!ticketPuedeAprobarse(ticket)) {
      alert('Este ticket aún no tiene cobro. Use Forzar cobro o espere la solicitud del mozo.');
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

  const toggleSeleccionTickets = (ticketOrList) => {
    const list = Array.isArray(ticketOrList) ? ticketOrList : [ticketOrList];
    const ids = list.map((t) => String(t?._id || t || '')).filter(Boolean);
    if (!ids.length) return;
    setIdsEliminar((prev) => {
      const set = new Set(prev.map(String));
      const allOn = ids.every((id) => set.has(id));
      if (allOn) ids.forEach((id) => set.delete(id));
      else ids.forEach((id) => set.add(id));
      return [...set];
    });
  };

  const salirModoEliminar = () => {
    setModoEliminar(false);
    setIdsEliminar([]);
    setShowEliminarLoteModal(false);
  };

  const handleEliminarSeleccionados = async () => {
    const motivo = (motivoEliminarLote || '').trim();
    if (motivo.length < 3) {
      alert('El motivo es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }
    if (!idsEliminar.length) return;
    setEliminandoLote(true);
    const errores = [];
    for (const id of idsEliminar) {
      const ticket = items.find((t) => String(t._id) === String(id)) || { _id: id };
      try {
        await quitarDuplicadoItem(ticket, motivo, user?._id || user?.id, user?.name || 'Cocina');
      } catch (err) {
        errores.push(`#${ticket.ticketNumber || id}: ${err.userMessage || err.message}`);
      }
    }
    setEliminandoLote(false);
    salirModoEliminar();
    setMotivoEliminarLote('Ticket duplicado');
    if (errores.length) {
      alert('Algunos tickets no se pudieron quitar:\n' + errores.join('\n'));
    }
  };

  const handleImprimir = async (ticket) => {
    try {
      await imprimirComanda(ticket);
    } catch (err) {
      alert('Error al imprimir comanda: ' + (err.userMessage || err.message));
    }
  };

  const abrirForzarPago = (ticket) => {
    if (!ticket) return;
    if (ticket._esGrupoComandas) {
      const cobro = ticketParaCobroGrupo(ticket._grupoTickets);
      if (!cobro) {
        alert('Ninguna comanda del grupo se puede forzar.');
        return;
      }
      setTicketForzarPago(cobro);
      return;
    }
    setTicketForzarPago(ticket);
  };

  const handleForzarPago = async (pago) => {
    const ticket = ticketForzarPago;
    if (!ticket) return;
    const idsGrupo = ticket._esGrupoComandas
      ? (ticket._grupoTickets || []).map((t) => t._id).filter(Boolean)
      : null;
    const loadingIds = idsGrupo?.length ? idsGrupo : [ticket._id];
    setForzarPagoLoading((prev) => {
      const next = { ...prev };
      loadingIds.forEach((id) => { next[id] = true; });
      return next;
    });
    try {
      if (idsGrupo && idsGrupo.length > 1) {
        await forzarPagoGrupo(idsGrupo, pago, user?._id || user?.id, user?.name || 'Cocina');
      } else {
        await forzarPagoItem(ticket._id, pago, user?._id || user?.id, user?.name || 'Cocina');
      }
      setTicketForzarPago(null);
    } catch (err) {
      alert('Error al forzar pago: ' + (err.userMessage || err.message));
    } finally {
      setForzarPagoLoading((prev) => {
        const next = { ...prev };
        loadingIds.forEach((id) => { next[id] = false; });
        return next;
      });
    }
  };

  const itemsEnPeriodo = useMemo(() => items.filter((t) => matchFechaRangoTicket(t.createdAt, {
    periodo: filtroPeriodo,
    primerCierreHoyAt,
    desde: fechaDesde,
    hasta: fechaHasta,
  })), [items, filtroPeriodo, primerCierreHoyAt, fechaDesde, fechaHasta]);

  const kpisPeriodo = useMemo(() => resumenKpisTickets(itemsEnPeriodo), [itemsEnPeriodo]);
  const kpisHeader = kpisCierre || {
    totalVentas: kpisPeriodo.totalVenta,
    pendiente: kpisPeriodo.pendiente,
    aprobados: kpisPeriodo.aprobados,
  };

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

  const vistaCobroPeriodo = useMemo(
    () => (cobroPorCantidad ? indexarCobroPorCantidad(itemsEnPeriodo) : new Map()),
    [cobroPorCantidad, itemsEnPeriodo]
  );

  const itemsFiltrados = useMemo(() => {
    const porMozo = filterTicketsByMozo(itemsPorEstado, filtroMozo);
    const ocultos = cobroPorCantidad ? idsOcultosCobro(vistaCobroPeriodo, porMozo) : new Set();
    const visibles = ocultos.size ? porMozo.filter((t) => !ocultos.has(String(t._id))) : porMozo;
    if (filtro === 'todos') {
      return sortTicketsPendientesPrimero(visibles, sortBy, sortDir);
    }
    return sortTickets(visibles, sortBy, sortDir);
  }, [itemsPorEstado, filtroMozo, sortBy, sortDir, filtro, cobroPorCantidad, vistaCobroPeriodo]);

  const filasBasico = useMemo(
    () => groupTicketsComoComandasHtml(itemsFiltrados),
    [itemsFiltrados],
  );

  const opcionesTicketCocina = useMemo(
    () => opcionesComandasTicketCocina(itemsFiltrados),
    [itemsFiltrados],
  );

  const opcionesTicketCocinaFiltradas = useMemo(() => {
    const q = busquedaTicketCocina.trim().toLowerCase();
    if (!q) return opcionesTicketCocina;
    return opcionesTicketCocina.filter((o) =>
      `${o.label} ${o.mesa} ${o.mozo}`.toLowerCase().includes(q)
    );
  }, [opcionesTicketCocina, busquedaTicketCocina]);

  const abrirSelectorTicketCocina = () => {
    if (!opcionesTicketCocina.length) {
      alert('No hay comandas en la vista actual para imprimir.');
      return;
    }
    setBusquedaTicketCocina('');
    setShowModalTicketCocina(true);
  };

  const handleImprimirTicketCocina = async (opcion) => {
    if (!opcion?.ticket) return;
    setImprimiendoTicketCocina(true);
    try {
      await imprimirComanda(opcion.ticket, {
        ticketCocina: true,
        filtrarComandaNumero: opcion.numero,
        filtrarComandaId: opcion.comandaId,
        revisionTicket: opcion.revisionTicket,
      });
      setShowModalTicketCocina(false);
    } catch (err) {
      alert('Error al imprimir ticket de cocina: ' + (err.userMessage || err.message));
    } finally {
      setImprimiendoTicketCocina(false);
    }
  };

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

  const renderTarjetaBasica = (ticket) => {
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
                // BUG_PAGO_PARCIAL_TABLA: saldo vivo por cobrar (backend) — pagos parciales
                const saldoPend = saldoPendienteTicket(ticket);
                const mostrarSaldoPend = saldoPend != null && saldoPend > 0;
                const estadoComanda = estadoEntregaComandaTicket(ticket);
                const selEliminar = modoEliminar && idsEliminar.includes(String(ticket._id));
                const esParaLlevar = ticketEsParaLlevar(ticket);
                const estiloCuerpoPL = esParaLlevar ? estiloCuerpoParaLlevarTickets(tablaPrefs) : undefined;
                const bordeSeccion = esParaLlevar ? 'border-white/25' : 'border-gray-700';
                return (
                  <motion.div
                    key={ticket._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    onClick={() => { if (modoEliminar) toggleSeleccionTickets(ticket); }}
                    className={`bg-gray-800 rounded-xl border overflow-hidden shadow-lg ${
                      selEliminar ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-gray-700'
                    } ${modoEliminar ? 'cursor-pointer' : ''}`}
                  >
                    {/* Header del card */}
                    <div className={`p-3 ${
                      ticket.estado === 'pendiente_aprobacion' ? 'bg-yellow-600/20 border-b border-yellow-500/30' :
                      ticket.estado === 'aprobado' ? 'bg-green-600/20 border-b border-green-500/30' :
                      ticket.estado === 'reportado' ? 'bg-red-600/20 border-b border-red-500/30' :
                      'bg-violet-600/20 border-b border-violet-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-300 text-sm font-mono font-bold flex items-center gap-2">
                          {modoEliminar && (
                            <span className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold ${
                              selEliminar ? 'bg-rose-600 border-rose-400 text-white' : 'border-gray-500 bg-gray-900'
                            }`}>{selEliminar ? '✓' : ''}</span>
                          )}
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
                          <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold tracking-wide ${estadoComanda.bg}`}>
                            {estadoComanda.label}
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
                          <BadgeNombreMozo ticket={ticket} configVista={tablaPrefs} />
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

                    <div style={estiloCuerpoPL}>
                    {/* Platos */}
                    <div className={`p-3 max-h-48 overflow-y-auto border-b ${bordeSeccion}`}>
                      {platosVis.map((plato, i) => (
                        <PlatoTicketItem
                          key={plato.platoLineaId || plato._id || i}
                          plato={plato}
                          size="sm"
                          ocultarGuarniciones={tablaPrefs.ocultarGuarniciones}
                          estiloNombre={estilosTxtTabla.platos}
                          estiloMeta={estilosTxtTabla.platosMeta}
                        />
                      ))}
                    </div>

                    {/* Total & Pago */}
                    <div className={`p-3 border-b ${bordeSeccion}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <FaMoneyBill className="text-green-400" />
                          <TotalCuentaCobro vista={cobroPorCantidad ? (vistaCobroPeriodo.get(String(ticket._id)) || null) : null} neto={neto} montoDesc={montoDesc} />
                        </div>
                        <div className="text-gray-500 text-xs flex items-center gap-2">
                          {ticket.voucherId && <span style={estilosTxtTabla.resto}>V: {ticket.voucherId}</span>}
                          <span className="uppercase" style={estilosTxtTabla.resto}>{ticket.moneda || 'Soles'}</span>
                          <span className={ticket.estado === 'pendiente_aprobacion' ? 'text-yellow-400 font-medium' : ''} style={ticket.estado === 'pendiente_aprobacion' ? undefined : estilosTxtTabla.resto}>
                            · {labelPagoTicket(ticket)}
                          </span>
                        </div>
                      </div>
                      {montoDesc > 0 && (
                        <div className="mt-1.5 space-y-0.5 text-xs">
                          <div className="flex justify-between text-gray-400" style={estilosTxtTabla.resto}>
                            <span>Subtotal</span>
                            <span>{formatCurrency(bruto)}</span>
                          </div>
                          <div className="text-red-400">
                            Descuento: -{formatCurrency(montoDesc)}
                            {ticket.descuentos?.[0]?.motivo ? ` · ${ticket.descuentos[0].motivo}` : ''}
                            {ticket.descuentos?.[0]?.porcentaje ? ` (${Number(ticket.descuentos[0].porcentaje)}%)` : ''}
                          </div>
                          <div className="flex justify-between text-white font-semibold" style={estilosTxtTabla.total}>
                            <span>TOTAL</span>
                            <span>{formatCurrency(neto)}</span>
                          </div>
                        </div>
                      )}
                      {mostrarSaldoPend && (
                        <div className="mt-2 flex items-center justify-between text-xs bg-amber-900/40 border border-amber-500/30 rounded px-2 py-1.5">
                          <span className="text-amber-300/90 font-medium">
                            Pendiente por cobrar (comanda)
                          </span>
                          <span className="text-amber-200 font-bold">{formatCurrency(saldoPend)}</span>
                        </div>
                      )}
                      {(ticket.metodoPago === 'efectivo' || String(ticket.tipoPago || '').toLowerCase() === 'efectivo') &&
                        (ticket.montoRecibido != null || ticket.vuelto != null) && (
                        <div className="mt-2 flex items-center justify-between text-xs bg-gray-900/50 rounded px-2 py-1.5">
                          <span className="text-gray-400" style={estilosTxtTabla.resto}>
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
                      <div className={`px-3 py-1 border-b ${bordeSeccion} text-xs text-gray-400`} style={estilosTxtTabla.resto}>
                        <FaUser className="inline mr-1" />
                        {nombreClienteTicket(ticket) || 'Cliente'}
                        {dniClienteTicket(ticket) && (
                          <span className="ml-2" style={estilosTxtTabla.resto}>DNI: {dniClienteTicket(ticket)}</span>
                        )}
                      </div>
                    )}

                    {/* Acciones según estado del ticket */}
                    {ticket.estado === 'pendiente_aprobacion' && (
                      <div className="p-3 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleImprimir(ticket)}
                          className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-500
                            text-white py-2 rounded-lg transition-colors font-medium text-sm"
                        >
                          <FaPrint className="text-xs" />
                          Imprimir
                        </button>
                        {!puedeGestionarTickets && (
                          <span className="flex-1 text-center text-xs font-semibold text-gray-300 bg-gray-700/80 py-2 rounded-lg">
                            Solo lectura
                          </span>
                        )}
                        {puedeGestionarTickets && ticketPuedeAprobarse(ticket) && (
                        <button
                          onClick={() => handleAprobar(ticket)}
                          disabled={aprobarLoading[ticket._id]}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500
                            disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                            transition-colors font-medium text-sm"
                        >
                          <FaCheck />
                          {aprobarLoading[ticket._id] ? 'Cobrando...' : 'Cobrar'}
                        </button>
                        )}
                        {puedeGestionarTickets && ticketPuedeForzarPago(ticket) && !ticket.boucher && (
                        <button
                          onClick={() => abrirForzarPago(ticket)}
                          disabled={forzarPagoLoading[ticket._id]}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500
                            disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                            transition-colors font-medium text-sm"
                        >
                          <FaMoneyBill className="text-xs" />
                          Forzar cobro
                        </button>
                        )}
                        {puedeGestionarTickets && isComanda && !ticketEsAltaSinPago(ticket) ? (
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
                        ) : puedeGestionarTickets && !isComanda ? (
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
                      </div>
                    )}

                    {/* Aprobados: imprimir */}
                    {ticket.estado === 'aprobado' && (
                      <div className="p-2" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                  </motion.div>
                );
  };

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
              <p className="text-gray-400 text-xs">Cobrar comandas, reportar incidencias</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <KpiChip
                label="Total ventas"
                value={formatCurrency(kpisHeader.totalVentas)}
                valueClass="text-amber-300"
                ocultable
                visible={kpisVisibles}
                onToggle={() => setKpisVisibles((v) => !v)}
              />
              <KpiChip
                label="Ventas pendientes"
                value={formatCurrency(kpisHeader.pendiente)}
                valueClass="text-[#f59e0b]"
                ocultable
                visible={kpisVisibles}
                onToggle={() => setKpisVisibles((v) => !v)}
              />
              <KpiChip
                label="Ventas pagadas"
                value={formatCurrency(kpisHeader.aprobados)}
                valueClass="text-[#2ecc71]"
                ocultable
                visible={kpisVisibles}
                onToggle={() => setKpisVisibles((v) => !v)}
              />
              {kpisPeriodo.descuento > 0 && (
                <KpiChip
                  label="Descuentos"
                  value={`-${formatCurrency(kpisPeriodo.descuento)}`}
                  valueClass="text-[#e74c3c]"
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={abrirSelectorTicketCocina}
              className="relative p-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-amber-500/50 transition-colors"
              title="Imprimir ticket de cocina"
            >
              <FaPrint className="text-sm" />
              <span className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none" aria-hidden>🍳</span>
            </button>
            <VistaModoToggle modo={modoVista} onChange={handleModoVista} />
            <button
              type="button"
              onClick={() => setShowTablaConfig(true)}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-amber-500/50 transition-colors"
              title="Personalizar tabla"
            >
              <FaCog className="text-sm" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (modoEliminar) salirModoEliminar();
                else setModoEliminar(true);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                modoEliminar
                  ? 'bg-rose-700 border-rose-400 text-white'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-rose-500/50'
              }`}
              title="Eliminar tickets de la tabla (marcar comandas)"
            >
              <FaTrash className="text-sm" />
            </button>
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

      {modoEliminar && (
        <div className="flex-shrink-0 z-40 bg-rose-950/90 border-b border-rose-700/50">
          <div className="max-w-7xl w-full mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
            <p className="text-rose-100 text-sm">
              Marca las comandas a quitar de la tabla
              {idsEliminar.length > 0 ? ` · ${idsEliminar.length} seleccionada${idsEliminar.length !== 1 ? 's' : ''}` : ''}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={salirModoEliminar}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!idsEliminar.length}
                onClick={() => setShowEliminarLoteModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Eliminar{idsEliminar.length ? ` (${idsEliminar.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 z-40 bg-gray-900/95 border-b border-gray-800">
        <div className="max-w-7xl w-full mx-auto px-4 py-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { key: 'pendientes', label: 'Pendientes', icon: FaClock },
              { key: 'aprobados', label: 'Cobrados', icon: FaCheck },
              { key: 'rechazados', label: 'Rechazados', icon: FaTimes },
              { key: 'reportados', label: 'Reportados', icon: FaExclamationTriangle },
              { key: 'todos', label: 'Todos', icon: FaFilter },
              { key: 'comandas', label: 'Comandas', icon: FaUtensils },
              { key: 'parciales', label: 'Parciales', icon: FaShoppingBag },
              { key: 'adelantados', label: 'Adelantados', icon: FaMoneyBill },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFiltro(key)}
                style={{ fontSize: `${letraFiltro}px` }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-colors border
                  ${filtro === key
                    ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-900/40'
                    : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white border-gray-600'}`}
              >
                <Icon size={Math.max(16, letraFiltro)} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showTurnoDiaNoche && ['dia', 'noche'].map((id) => {
              const Icono = id === 'dia' ? FaSun : FaMoon;
              const on = filtroPeriodo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriodo(id)}
                  style={{ fontSize: `${letraFiltro}px` }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold border ${
                    on
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-gray-800/90 text-gray-300 hover:text-white border-gray-600'
                  }`}
                >
                  <Icono size={Math.max(16, letraFiltro)} />
                  {id === 'dia' ? 'Día' : 'Noche'}
                </button>
              );
            })}
            {PRESETS_PERIODO_TICKETS.map(({ id, label }) => {
              const iconos = {
                hoy: FaCalendarDay,
                ayer: FaHistory,
                '7dias': FaCalendarWeek,
                todos: FaLayerGroup,
                custom: FaSlidersH,
              };
              const Icono = iconos[id] || FaCalendarDay;
              const on = filtroPeriodo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriodo(id)}
                  style={{ fontSize: `${letraFiltro}px` }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold border ${
                    on
                      ? 'bg-violet-600 text-white border-violet-400'
                      : 'bg-gray-800/90 text-gray-300 hover:text-white border-gray-600'
                  }`}
                >
                  <Icono size={Math.max(16, letraFiltro)} />
                  {label}
                </button>
              );
            })}
            {filtroPeriodo === 'custom' && (
              <div className="inline-flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-xl border border-violet-500/40 bg-gray-800/80">
                <label className="inline-flex items-center gap-1.5 text-gray-300" style={{ fontSize: `${letraFiltro}px` }}>
                  Desde
                  <input
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    style={{ fontSize: `${letraFiltro}px` }}
                    className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-gray-100"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5 text-gray-300" style={{ fontSize: `${letraFiltro}px` }}>
                  Hasta
                  <input
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde}
                    max={getFechaOperativa()}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    style={{ fontSize: `${letraFiltro}px` }}
                    className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-gray-100"
                  />
                </label>
              </div>
            )}
            <span className="text-gray-500 font-mono px-1" style={{ fontSize: `${Math.max(11, letraFiltro - 2)}px` }}>
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
              letraPx={letraFiltro}
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
        <div className={`${modoVista === 'basico' ? 'max-w-none' : modoVista === 'mozos' ? 'max-w-[1800px]' : 'max-w-7xl'} mx-auto px-3 py-4`}>
        {modoVista === 'avanzado' ? (
          <TicketsAprobacionTable
            tickets={itemsFiltrados}
            loading={loading}
            emptyLabel={
              filtroMozo
                ? `Sin tickets del mozo "${mozosDisponibles.find((m) => m.key === filtroMozo)?.nombre || filtroMozo}"`
                : `Sin tickets ${filtro === 'aprobados' ? 'cobrados' : filtro}`
            }
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onImprimir={handleImprimir}
            onAprobar={puedeGestionarTickets ? handleAprobar : undefined}
            onReportar={puedeGestionarTickets ? (ticket) => {
              setShowReportarModal(ticket._id);
              setReportarMotivo((prev) => ({ ...prev, [ticket._id]: '' }));
            } : undefined}
            onRechazar={puedeGestionarTickets ? (ticket) => {
              setShowRechazarModal(ticket._id);
              setRechazarLoading((prev) => ({ ...prev, [ticket._id + '_motivo']: '' }));
            } : undefined}
            onForzarPago={puedeGestionarTickets ? abrirForzarPago : undefined}
            aprobarLoading={aprobarLoading}
            reportarLoading={reportarLoading}
            rechazarLoading={rechazarLoading}
            forzarPagoLoading={forzarPagoLoading}
            seleccionActiva={modoEliminar}
            idsSeleccionados={idsEliminar}
            onToggleSeleccion={toggleSeleccionTickets}
            ocultarGuarniciones={tablaPrefs.ocultarGuarniciones}
            tamanoFecha={letraFiltro}
            vistaPorTicket={cobroPorCantidad ? vistaCobroPeriodo : null}
          />
        ) : modoVista === 'mozos' ? (
          <TicketsMozosPendientesGrid
            tickets={itemsFiltrados}
            loading={loading}
            emptyLabel={
              filtroMozo
                ? `Sin tickets del mozo "${mozosDisponibles.find((m) => m.key === filtroMozo)?.nombre || filtroMozo}"`
                : `Sin tickets ${filtro === 'aprobados' ? 'cobrados' : filtro}`
            }
            mozoFilter={filtroMozo}
            mozosDisponibles={mozosDisponibles}
            onMozoFilterChange={setFiltroMozo}
            onImprimir={handleImprimir}
            onAprobar={puedeGestionarTickets ? handleAprobar : undefined}
            onReportar={puedeGestionarTickets ? (ticket) => {
              setShowReportarModal(ticket._id);
              setReportarMotivo((prev) => ({ ...prev, [ticket._id]: '' }));
            } : undefined}
            onRechazar={puedeGestionarTickets ? (ticket) => {
              setShowRechazarModal(ticket._id);
              setRechazarLoading((prev) => ({ ...prev, [ticket._id + '_motivo']: '' }));
            } : undefined}
            onForzarPago={puedeGestionarTickets ? abrirForzarPago : undefined}
            seleccionActiva={modoEliminar}
            idsSeleccionados={idsEliminar}
            onToggleSeleccion={toggleSeleccionTickets}
            aprobarLoading={aprobarLoading}
            reportarLoading={reportarLoading}
            rechazarLoading={rechazarLoading}
            forzarPagoLoading={forzarPagoLoading}
            ocultarGuarniciones={tablaPrefs.ocultarGuarniciones}
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
                : `Sin tickets ${filtro === 'aprobados' ? 'cobrados' : filtro}`}
            </p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            <AnimatePresence>
              {filasBasico.map((fila) => {
                if (fila.tipo === 'grupo') {
                  const abierto = gruposAbiertosBasico.has(fila.id);
                  const grupoTicket = ticketParaDetalleGrupo(fila.tickets);
                  const platosGrupo = platosTicketVisibles(grupoTicket);
                  const { bruto, neto, montoDesc } = totalesVistaTicket(grupoTicket);
                  // BUG_PAGO_PARCIAL_TABLA: saldo vivo por cobrar del grupo (únicos por comanda)
                  const saldoPendGrupo = saldoPendienteTicketsUnicos(fila.tickets);
                  const estadoGrupo = estadoEntregaTickets(fila.tickets);
                  const primero = fila.tickets[0];
                  const grupoSel = modoEliminar && fila.tickets.every((t) => idsEliminar.includes(String(t._id)));
                  const extraLlevar = fila.tickets.some(ticketTieneExtraLlevar);
                  const estiloGrupo = fila.tickets.some(ticketEsParaLlevar)
                    ? estiloCuerpoParaLlevarTickets(tablaPrefs)
                    : undefined;
                  const forzablesGrupo = ticketsForzablesDeGrupo(fila.tickets);
                  const solicitudesGrupo = fila.tickets.filter((t) => {
                    if (!ticketPuedeAprobarse(t)) return false;
                    const tipo = String(t.tipo || '').toLowerCase();
                    return tipo === 'pago_parcial' || tipo === 'pago_adelantado' || tipo === 'adelantado';
                  });
                  const botonesAdelanto = solicitudesGrupo.map((sol) => {
                    const netoSol = totalesVistaTicket(sol).neto;
                    const esParcial = String(sol.tipo || '').toLowerCase() === 'pago_parcial';
                    return (
                      <button
                        key={sol._id}
                        type="button"
                        disabled={aprobarLoading[sol._id]}
                        onClick={(e) => { e.stopPropagation(); handleAprobar(sol); }}
                        className={`text-[11px] px-2 py-1 rounded-md font-semibold border inline-flex items-center justify-center gap-1 ${
                          esParcial
                            ? 'bg-amber-500/30 text-amber-200 border-amber-500/40 hover:bg-amber-500/50'
                            : 'bg-black text-white border-white/40 hover:bg-neutral-900'
                        }`}
                      >
                        <FaMoneyBill className="text-[10px]" />
                        {aprobarLoading[sol._id] ? 'Cobrando…' : `Cobrar AD (${formatCurrency(netoSol)})`}
                      </button>
                    );
                  });
                  const cargandoGrupo = fila.tickets.some((t) => forzarPagoLoading[t._id]);
                  return (
                    <motion.div
                      key={fila.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      onClick={() => { if (modoEliminar) toggleSeleccionTickets(fila.tickets); }}
                      className={`bg-gray-800 rounded-xl border overflow-hidden shadow-lg ${
                        grupoSel ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-amber-500/50'
                      } ${modoEliminar ? 'cursor-pointer' : ''}`}
                    >
                      <div className="p-3 bg-amber-600/20 border-b border-amber-500/40">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGruposAbiertosBasico((prev) => {
                                const next = new Set(prev);
                                if (next.has(fila.id)) next.delete(fila.id);
                                else next.add(fila.id);
                                return next;
                              });
                            }}
                            className="text-left text-amber-200 text-sm font-mono font-bold"
                          >
                            <span className="inline-block w-3 text-[10px]">{abierto ? '▼' : '▶'}</span>
                            {' '}GRUPO {fila.label || ''}
                            {extraLlevar ? (
                              <span className="ml-1.5 inline-flex align-middle text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                EXTRA LLEVAR
                              </span>
                            ) : null}
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            {abierto && forzablesGrupo.length > 0 && (
                              <button
                                type="button"
                                disabled={cargandoGrupo}
                                onClick={(e) => { e.stopPropagation(); abrirForzarPago(grupoTicket); }}
                                className="text-[11px] px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white font-semibold"
                              >
                                {cargandoGrupo ? 'Cobrando…' : 'Forzar cobro'}
                              </button>
                            )}
                            {abierto ? botonesAdelanto : null}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold tracking-wide ${estadoGrupo.bg}`}>
                              {estadoGrupo.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-amber-200/80 text-[11px] font-medium mt-0.5">
                          {modoEliminar && (
                            <span className={`mr-2 inline-flex w-5 h-5 rounded border items-center justify-center text-[10px] font-bold ${
                              grupoSel ? 'bg-rose-600 border-rose-400 text-white' : 'border-gray-500 bg-gray-900'
                            }`}>{grupoSel ? '✓' : ''}</span>
                          )}
                          {fila.tickets.length} comandas agrupadas
                          {fila.clienteNombre ? ` · ${fila.clienteNombre}` : ''}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-gray-300 text-xs">
                            <FaUtensils className="text-gray-400" />
                            <span>Mesa {fila.mesa || primero.numMesa || '?'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <FaUser className="text-gray-500" />
                            <BadgeNombreMozo nombre={etiquetaMozoDeTickets(fila.tickets) || undefined} ticket={etiquetaMozoDeTickets(fila.tickets) ? null : primero} configVista={tablaPrefs} />
                          </div>
                        </div>
                      </div>
                      {abierto ? (
                        <div className="p-2 space-y-3 bg-black/25" onClick={(e) => e.stopPropagation()}>
                          {fila.tickets.map((ticket) => renderTarjetaBasica(ticket))}
                        </div>
                      ) : (
                        <div style={estiloGrupo}>
                          <div className="p-3 max-h-48 overflow-y-auto border-b border-amber-500/20">
                            {platosGrupo.map((plato, i) => (
                              <PlatoTicketItem
                                key={plato.platoLineaId || plato._id || i}
                                plato={plato}
                                size="sm"
                                ocultarGuarniciones={tablaPrefs.ocultarGuarniciones}
                                estiloNombre={estilosTxtTabla.platos}
                                estiloMeta={estilosTxtTabla.platosMeta}
                              />
                            ))}
                          </div>
                          <div className="p-3 border-b border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <FaMoneyBill className="text-green-400" />
                                <TotalCuentaCobro vista={fila.tickets.map((t) => vistaCobroPeriodo.get(String(t._id))).find(Boolean) || null} neto={neto} montoDesc={montoDesc} />
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-amber-500/15 text-amber-200 border-amber-500/40">
                                Grupo
                              </span>
                            </div>
                            {saldoPendGrupo != null && saldoPendGrupo > 0 && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-amber-900/40 border border-amber-500/30 rounded px-2 py-1.5">
                                <span className="text-amber-300/90 font-medium">Pendiente por cobrar (comandas)</span>
                                <span className="text-amber-200 font-bold">{formatCurrency(saldoPendGrupo)}</span>
                              </div>
                            )}
                            {montoDesc > 0 && (
                              <div className="mt-1.5 space-y-0.5 text-xs">
                                <div className="flex justify-between text-gray-400">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(bruto)}</span>
                                </div>
                                <div className="text-red-400">Descuento: -{formatCurrency(montoDesc)}</div>
                                <div className="flex justify-between text-white font-semibold">
                                  <span>TOTAL</span>
                                  <span>{formatCurrency(neto)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            {forzablesGrupo.length > 0 && (
                              <button
                                type="button"
                                disabled={cargandoGrupo}
                                onClick={() => abrirForzarPago(grupoTicket)}
                                className="flex-1 flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm"
                              >
                                <FaMoneyBill className="text-xs" />
                                {cargandoGrupo ? 'Cobrando…' : 'Forzar cobro'}
                              </button>
                            )}
                            {botonesAdelanto}
                            <button
                              type="button"
                              onClick={() => handleImprimir(grupoTicket)}
                              className="flex-1 flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg font-medium text-sm"
                            >
                              <FaPrint className="text-xs" />
                              Imprimir
                            </button>
                            <button
                              type="button"
                              onClick={() => setGruposAbiertosBasico((prev) => {
                                const next = new Set(prev);
                                next.add(fila.id);
                                return next;
                              })}
                              className="flex-1 flex items-center justify-center gap-1 bg-amber-700 hover:bg-amber-600 text-white py-2 rounded-lg font-medium text-sm"
                            >
                              Ver {fila.tickets.length} comandas
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                }
                return renderTarjetaBasica(fila.tickets[0]);
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

      {/* Modal eliminar tickets seleccionados */}
      <AnimatePresence>
        {showEliminarLoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => !eliminandoLote && setShowEliminarLoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-600"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <FaTrash className="text-rose-400 text-lg" />
                <h4 className="text-white font-bold text-lg">Quitar de la tabla</h4>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                {idsEliminar.length} ticket{idsEliminar.length !== 1 ? 's' : ''} saldrán de la tabla y de los totales.
                No cambia platos ni el boucher. Queda registrado en auditoría.
              </p>
              <textarea
                value={motivoEliminarLote}
                onChange={e => setMotivoEliminarLote(e.target.value)}
                placeholder="Motivo (mínimo 3 caracteres)..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm h-24 resize-none border border-gray-600
                  focus:border-rose-500 focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowEliminarLoteModal(false)}
                  disabled={eliminandoLote}
                  className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarSeleccionados}
                  disabled={(motivoEliminarLote || '').trim().length < 3 || eliminandoLote}
                  className="flex-1 py-2.5 bg-rose-700 text-white rounded-lg text-sm hover:bg-rose-600 transition-colors font-medium
                    disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {eliminandoLote ? 'Quitando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModalTicketCocina && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => !imprimiendoTicketCocina && setShowModalTicketCocina(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-5 max-w-md w-full border border-gray-600 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-white font-bold text-lg mb-1">Ticket de cocina 🍳</h4>
              <p className="text-gray-400 text-xs mb-3">Elige la comanda a imprimir (cuadrados para marcar platos).</p>
              <input
                type="search"
                value={busquedaTicketCocina}
                onChange={(e) => setBusquedaTicketCocina(e.target.value)}
                placeholder="Buscar #, mesa o mozo"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-violet-500 focus:outline-none mb-3"
              />
              <div className="overflow-y-auto space-y-1 flex-1 min-h-0">
                {opcionesTicketCocinaFiltradas.length === 0 && (
                  <p className="text-gray-500 text-sm py-4 text-center">Sin coincidencias.</p>
                )}
                {opcionesTicketCocinaFiltradas.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    disabled={imprimiendoTicketCocina}
                    onClick={() => handleImprimirTicketCocina(o)}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-700/80 hover:bg-violet-700 text-white text-sm flex items-center justify-between gap-2 disabled:opacity-50"
                  >
                    <span className="font-bold tabular-nums">{o.label}</span>
                    <span className="text-xs text-gray-300 truncate">
                      Mesa {o.mesa || '—'} · {o.mozo || '—'}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowModalTicketCocina(false)}
                disabled={imprimiendoTicketCocina}
                className="mt-4 w-full py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
              >
                {imprimiendoTicketCocina ? 'Imprimiendo...' : 'Cerrar'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTablaConfig && (
          <TicketsTablaConfigModal
            prefs={tablaPrefs}
            onChange={handleTablaPrefs}
            onClose={() => setShowTablaConfig(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}