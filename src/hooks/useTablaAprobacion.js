/**
 * useTablaAprobacion - Hook unificado para bandeja de aprobación en App Cocina.
 *
 * Combina tickets de comanda completa (TicketAprobacion) y pagos adelantados (TicketPagoAdelantado)
 * en una sola bandeja. Provee acciones de Aprobar, Reportar e Imprimir comanda.
 *
 * Endpoints:
 *   GET  /api/aprobacion/pendientes       → lista unificada
 *   PUT  /api/aprobacion/:id/aprobar      → aprueba comanda o PPA
 *   PUT  /api/aprobacion/:id/reportar      → reporta comanda con motivo obligatorio
 *   GET  /api/pago-adelantado/pendientes   → PPA pendientes (fallback)
 *
 * Socket events:
 *   ticket-aprobacion-nuevo  → refrescar lista
 *   comanda-aprobada         → quitar de lista
 *   mesa-reportada           → actualizar estado
 *   ticket-reportado         → actualizar lista
 *   ticket-ppa-nuevo         → refrescar PPA
 *   ticket-ppa-actualizado   → actualizar PPA
 *
 * PLAN_BUG_CONEXION_APROBACION_TICKETS_COCINA:
 * El hook ahora admite un `socket` externo (ej. el de useSocketCocina cuando el KDS
 * está abierto) para EVITAR abrir una segunda conexión /cocina. Si no se provee,
 * crea su propio socket (caso TicketsPpaPage standalone).
 * Además se aplica debounce a fetchItems para evitar la tormenta de peticiones HTTP
 * cuando llegan varios eventos de socket en ráfaga.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import moment from 'moment-timezone';
import { getServerBaseUrl } from '../config/apiConfig';
import { apiGet, apiPut } from '../config/apiClient';
import { io } from 'socket.io-client';
import { imprimirComandaDesdeTicket } from '../utils/comandaPrint/comandaPrintWeb';

const TICKETS_REFRESH_INTERVAL = 30000;
const TICKETS_FAST_POLLING_INTERVAL = 10000; // cuando socket cae, refrescar más seguido
const FETCH_DEBOUNCE_MS = 400;
const ZONA = 'America/Lima';

/** Fecha operativa del restaurante (misma lógica que KDS y backend). */
const getFechaOperativa = () => moment().tz(ZONA).format('YYYY-MM-DD');

/** Normaliza tipo devuelto por API (COMANDA/ADELANTADO/PAGO_PARCIAL) al formato de la UI. */
const normalizeTicket = (ticket) => {
  if (!ticket) return ticket;
  const tipo = String(ticket.tipo || '').toUpperCase();
  if (tipo === 'COMANDA' || tipo === 'COMANDA_COMPLETA') {
    return { ...ticket, tipo: 'comanda_completa' };
  }
  if (tipo === 'PAGO_PARCIAL') {
    return { ...ticket, tipo: 'pago_parcial' };
  }
  if (tipo === 'ADELANTADO' || tipo === 'PAGO_ADELANTADO') {
    return { ...ticket, tipo: 'pago_adelantado' };
  }
  return ticket;
};

/**
 * @param {Object} [options]
 * @param {import('socket.io-client').Socket} [options.socket] Socket /cocina externo.
 *        Si se provee, se reutiliza y NO se crea una segunda conexión (evita duplicados).
 */
export default function useTablaAprobacion({ socket: externalSocket } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('desconectado');
  const [authError, setAuthError] = useState(null);
  const socketRef = useRef(null);
  const ownsSocketRef = useRef(true); // true si el hook creó el socket y debe destruirlo
  const approvingRef = useRef(new Set());
  const fetchDebounceRef = useRef(null);
  const lastFetchAtRef = useRef(0);
  const pollingAdjustRef = useRef(null);

  const isAlreadyApprovedError = (err) => {
    const backendMsg = String(err?.response?.data?.message || '').toLowerCase();
    return err?.response?.status === 400 && backendMsg.includes('ya fue aprobado');
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    lastFetchAtRef.current = Date.now();
    try {
      // Fetch aprobación tickets pendientes (comandas + adelantados unificados)
      const fechaHoy = getFechaOperativa();

      // Cargar tickets pendientes
      const data = await apiGet(`/api/aprobacion/pendientes?fecha=${fechaHoy}`);
      let pendientes = [];
      if (data?.success && Array.isArray(data.tickets)) {
        pendientes = data.tickets.map(normalizeTicket);
      } else if (Array.isArray(data)) {
        pendientes = data.map(normalizeTicket);
      }

      // PLAN: también cargar tickets aprobados/rechazados del día
      // para que la pestaña "Aprobados" funcione.
      let todos = [];
      try {
        const todosData = await apiGet(`/api/aprobacion/fecha/${fechaHoy}`);
        if (todosData?.success && Array.isArray(todosData.tickets)) {
          todos = todosData.tickets.map(normalizeTicket);
        }
      } catch (todosErr) {
        // Non-critical: si falla, solo tendremos pendientes
        console.warn('[TablaAprobacion] Error cargando todos los tickets:', todosErr.message);
      }

      // Merge: pendientes (por si el endpoint de todos no trae los PPA) + todos
      // Evitar duplicados por _id
      const pendientesMap = new Map(pendientes.map(t => [String(t._id), t]));
      for (const t of todos) {
        if (!pendientesMap.has(String(t._id))) {
          pendientes.push(t);
          pendientesMap.set(String(t._id), t);
        }
      }

      setItems(pendientes);
      setError(null);

      // Also fetch PPA tickets for backwards compatibility (legacy endpoint)
      try {
        const ppaData = await apiGet(`/api/pago-adelantado/pendientes?fecha=${fechaHoy}`);
        if (ppaData?.success && Array.isArray(ppaData.tickets)) {
          setItems(prev => {
            const existingIds = new Set(prev.map(t => t._id));
            const newPpaTickets = ppaData.tickets
              .map(normalizeTicket)
              .filter(t => !existingIds.has(t._id));
            return [...prev, ...newPpaTickets];
          });
        }
      } catch (ppaErr) {
        // PPA endpoint may not be available; non-critical
        console.warn('[TablaAprobacion] PPA fallback fetch failed:', ppaErr.message);
      }
    } catch (err) {
      console.error('Error fetching aprobación items:', err.message);
      setError(err.userMessage || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * fetchItems con debounce: agrupa múltiples disparos de socket en una sola petición.
   * Si la última petición fue hace menos de FETCH_DEBOUNCE_MS, reprograma.
   */
  const fetchItemsDebounced = useCallback(() => {
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      fetchDebounceRef.current = null;
      fetchItems();
    }, FETCH_DEBOUNCE_MS);
  }, [fetchItems]);

  // Limpieza del debounce al desmontar
  useEffect(() => {
    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
        fetchDebounceRef.current = null;
      }
    };
  }, []);

  // Initial load + polling. El intervalo depende del estado de conexión:
  // si el socket está caído, refresca más rápido (fallback).
  useEffect(() => {
    fetchItems();
    let intervalId = setInterval(fetchItems, TICKETS_REFRESH_INTERVAL);

    // Reaccionar al estado de conexión para ajustar el polling
    const adjustPolling = (conectado) => {
      clearInterval(intervalId);
      const intervalMs = conectado ? TICKETS_REFRESH_INTERVAL : TICKETS_FAST_POLLING_INTERVAL;
      intervalId = setInterval(fetchItems, intervalMs);
    };

    // Exponer para que el effect de socket lo use (bind directo)
    pollingAdjustRef.current = adjustPolling;

    return () => clearInterval(intervalId);
  }, [fetchItems]);

  // ---------------------------------------------------------------------------
  // Socket setup: usa externalSocket si se proveyó; si no, crea el propio.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let activeSocket = null;

    const handleConnect = () => {
      console.log('[TablaAprobacion] Socket conectado');
      setSocketConnected(true);
      setConnectionStatus('conectado');
      setAuthError(null);
      const fechaHoy = getFechaOperativa();
      activeSocket.emit('join-fecha', fechaHoy);
      if (pollingAdjustRef.current) pollingAdjustRef.current(true);
    };

    const handleDisconnect = () => {
      console.log('[TablaAprobacion] Socket desconectado');
      setSocketConnected(false);
      setConnectionStatus('desconectado');
      if (pollingAdjustRef.current) pollingAdjustRef.current(false);
    };

    const handleConnectError = (err) => {
      const msg = String(err?.message || '').toLowerCase();
      console.warn('[TablaAprobacion] Socket error:', err?.message);
      setSocketConnected(false);
      if (msg.includes('auth') || msg.includes('token') || msg.includes('jwt') || msg.includes('unauthorized')) {
        setConnectionStatus('auth_error');
        setAuthError(err?.message || 'Error de autenticación');
      } else {
        setConnectionStatus('desconectado');
      }
      if (pollingAdjustRef.current) pollingAdjustRef.current(false);
    };

    // Handlers de eventos — todos usan fetchItemsDebounced para evitar ráfagas
    const handleNuevoTicket = () => {
      console.log('[TablaAprobacion] Nuevo ticket de aprobación');
      fetchItemsDebounced();
    };

    const handleComandaAprobada = (data) => {
      console.log('[TablaAprobacion] Comanda aprobada:', data?.ticketNumber);
      setItems(prev => prev.map(t =>
        t._id === data?.ticketId
          ? { ...t, estado: 'aprobado', aprobadoPorNombre: data?.aprobadoPorNombre, fechaAprobacion: data?.fechaAprobacion || new Date().toISOString() }
          : t
      ));
      fetchItemsDebounced();
    };

    const handleMesaReportada = () => {
      console.log('[TablaAprobacion] Mesa reportada');
      fetchItemsDebounced();
    };

    const handleTicketReportado = (data) => {
      console.log('[TablaAprobacion] Ticket reportado:', data?.ticketId);
      setItems(prev => prev.map(t =>
        t._id === data?.ticketId ? { ...t, estado: 'reportado', motivoReporte: data?.motivo } : t
      ));
      fetchItemsDebounced();
    };

    const handlePpaNuevo = () => {
      console.log('[TablaAprobacion] Nuevo ticket PPA');
      fetchItemsDebounced();
    };

    const handlePpaActualizado = (data) => {
      console.log('[TablaAprobacion] Ticket PPA actualizado:', data?.ticketId, data?.estado);
      if (data?.estado === 'aprobado' || data?.estado === 'rechazado') {
        setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      }
      fetchItemsDebounced();
    };

    const handlePpaAprobado = (data) => {
      console.log('[TablaAprobacion] Ticket PPA aprobado:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItemsDebounced();
    };

    const handlePpaRechazado = (data) => {
      console.log('[TablaAprobacion] Ticket PPA rechazado:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItemsDebounced();
    };

    if (externalSocket) {
      // Reutilizar socket externo (ej. del KDS). No lo creamos ni lo destruimos.
      activeSocket = externalSocket;
      ownsSocketRef.current = false;

      // Si ya estaba conectado, sincronizar estado inicial
      if (activeSocket.connected) {
        setSocketConnected(true);
        setConnectionStatus('conectado');
      } else {
        setSocketConnected(false);
        setConnectionStatus('desconectado');
      }

      activeSocket.on('connect', handleConnect);
      activeSocket.on('disconnect', handleDisconnect);
      activeSocket.on('connect_error', handleConnectError);
      activeSocket.on('ticket-aprobacion-nuevo', handleNuevoTicket);
      activeSocket.on('comanda-aprobada', handleComandaAprobada);
      activeSocket.on('mesa-reportada', handleMesaReportada);
      activeSocket.on('ticket-reportado', handleTicketReportado);
      activeSocket.on('ticket-ppa-nuevo', handlePpaNuevo);
      activeSocket.on('ticket-ppa-actualizado', handlePpaActualizado);
      activeSocket.on('ticket-ppa-aprobado', handlePpaAprobado);
      activeSocket.on('ticket-ppa-rechazado', handlePpaRechazado);
    } else {
      // Sin socket externo: crear uno propio (caso TicketsPpaPage standalone)
      const getStoredToken = () => {
        try {
          const storedAuth = localStorage.getItem('cocinaAuth');
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            return authData.token || null;
          }
        } catch (e) {
          console.warn('[TablaAprobacion] Error parsing auth token:', e);
        }
        return null;
      };

      const authToken = getStoredToken();
      if (!authToken) {
        // Sin token: no podemos conectar; el polling sigue como fallback.
        return;
      }

      const serverUrl = getServerBaseUrl();
      const newSocket = io(`${serverUrl}/cocina`, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
      });

      activeSocket = newSocket;
      ownsSocketRef.current = true;

      newSocket.on('connect', handleConnect);
      newSocket.on('disconnect', handleDisconnect);
      newSocket.on('connect_error', handleConnectError);
      newSocket.on('ticket-aprobacion-nuevo', handleNuevoTicket);
      newSocket.on('comanda-aprobada', handleComandaAprobada);
      newSocket.on('mesa-reportada', handleMesaReportada);
      newSocket.on('ticket-reportado', handleTicketReportado);
      newSocket.on('ticket-ppa-nuevo', handlePpaNuevo);
      newSocket.on('ticket-ppa-actualizado', handlePpaActualizado);
      newSocket.on('ticket-ppa-aprobado', handlePpaAprobado);
      newSocket.on('ticket-ppa-rechazado', handlePpaRechazado);
    }

    socketRef.current = activeSocket;

    return () => {
      const s = socketRef.current;
      if (!s) return;
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('connect_error', handleConnectError);
      s.off('ticket-aprobacion-nuevo', handleNuevoTicket);
      s.off('comanda-aprobada', handleComandaAprobada);
      s.off('mesa-reportada', handleMesaReportada);
      s.off('ticket-reportado', handleTicketReportado);
      s.off('ticket-ppa-nuevo', handlePpaNuevo);
      s.off('ticket-ppa-actualizado', handlePpaActualizado);
      s.off('ticket-ppa-aprobado', handlePpaAprobado);
      s.off('ticket-ppa-rechazado', handlePpaRechazado);

      if (ownsSocketRef.current) {
        console.log('[TablaAprobacion] Desconectando socket propio');
        s.disconnect();
      }
      socketRef.current = null;
      ownsSocketRef.current = false;
    };
  }, [externalSocket, fetchItems, fetchItemsDebounced]);

  // Aprobar item (comanda o PPA)
  const aprobarItem = useCallback(async (ticketId, tipo, usuarioId, usuarioNombre) => {
    const id = String(ticketId);
    if (approvingRef.current.has(id)) {
      return { success: true, skipped: true };
    }

    approvingRef.current.add(id);
    try {
      const data = await apiPut(`/api/aprobacion/${ticketId}/aprobar`, {
        tipo: tipo || 'COMANDA',
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        // Optimista: quitar de pendientes. El socket confirmará.
        setItems(prev => prev.filter(t => String(t._id) !== id));
        return data;
      }
      throw new Error(data?.error || data?.message || 'Error al aprobar');
    } catch (err) {
      if (isAlreadyApprovedError(err)) {
        setItems(prev => prev.filter(t => String(t._id) !== id));
        return { success: true, alreadyApproved: true };
      }
      console.error('Error al aprobar item:', err.message);
      throw err;
    } finally {
      approvingRef.current.delete(id);
    }
  }, []);

  // Reportar item (comanda con motivo obligatorio)
  const reportarItem = useCallback(async (ticketId, motivo, usuarioId, usuarioNombre) => {
    if (!motivo || motivo.trim().length < 3) {
      throw new Error('El motivo es obligatorio y debe tener al menos 3 caracteres.');
    }
    try {
      const data = await apiPut(`/api/aprobacion/${ticketId}/reportar`, {
        motivo: motivo.trim(),
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setItems(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || 'Error al reportar');
    } catch (err) {
      console.error('Error al reportar item:', err.message);
      throw err;
    }
  }, []);

  // Rechazar item (PPA - backwards compatibility)
  const rechazarItem = useCallback(async (ticketId, motivo, usuarioId, usuarioNombre) => {
    if (!motivo || motivo.trim().length < 3) {
      throw new Error('El motivo es obligatorio y debe tener al menos 3 caracteres.');
    }
    try {
      const data = await apiPut(`/api/pago-adelantado/${ticketId}/rechazar`, {
        motivo: motivo.trim(),
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setItems(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || 'Error al rechazar');
    } catch (err) {
      console.error('Error al rechazar item:', err.message);
      throw err;
    }
  }, []);

  // Imprimir comanda: delega en módulo compartido comandaPrintWeb
  const imprimirComanda = useCallback(async (ticket) => {
    try {
      await imprimirComandaDesdeTicket(ticket, {
        serverOrigin: getServerBaseUrl(),
        fetchJson: (url) => apiGet(url),
      });
    } catch (err) {
      console.error('Error al imprimir comanda:', err.message);
      throw err;
    }
  }, []);

  const isPendiente = (t) => t.estado === 'pendiente_aprobacion';
  const cantidadPendientes = items.filter(isPendiente).length;
  const cantidadComandas = items.filter(t => t.tipo === 'comanda_completa' && isPendiente(t)).length;
  // BUG_PAGOS_PARCIALES_APROBACION_COCINA (Fase 6): contar parciales (viven en TicketAprobacion)
  const cantidadParciales = items.filter(t => t.tipo === 'pago_parcial' && isPendiente(t)).length;
  const cantidadPPA = items.filter(t => t.tipo === 'pago_adelantado' && isPendiente(t)).length;

  return {
    items,
    loading,
    error,
    socketConnected,
    connectionStatus,
    authError,
    fetchItems,
    aprobarItem,
    reportarItem,
    rechazarItem,
    imprimirComanda,
    cantidadPendientes,
    cantidadComandas,
    cantidadParciales,
    cantidadPPA,
  };
}
