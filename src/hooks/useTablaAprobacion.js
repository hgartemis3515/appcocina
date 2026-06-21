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
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import moment from 'moment-timezone';
import { getServerBaseUrl } from '../config/apiConfig';
import { apiGet, apiPut } from '../config/apiClient';
import { io } from 'socket.io-client';
import { imprimirComandaDesdeTicket } from '../utils/comandaPrint/comandaPrintWeb';

const TICKETS_REFRESH_INTERVAL = 30000;
const ZONA = 'America/Lima';

/** Fecha operativa del restaurante (misma lógica que KDS y backend). */
const getFechaOperativa = () => moment().tz(ZONA).format('YYYY-MM-DD');

/** Normaliza tipo devuelto por API (COMANDA/ADELANTADO) al formato de la UI. */
const normalizeTicket = (ticket) => {
  if (!ticket) return ticket;
  const tipo = String(ticket.tipo || '').toUpperCase();
  if (tipo === 'COMANDA' || tipo === 'COMANDA_COMPLETA') {
    return { ...ticket, tipo: 'comanda_completa' };
  }
  if (tipo === 'ADELANTADO' || tipo === 'PAGO_ADELANTADO') {
    return { ...ticket, tipo: 'pago_adelantado' };
  }
  return ticket;
};

export default function useTablaAprobacion() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
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

  // Initial load + polling
  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, TICKETS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchItems]);

  // Socket.io connection for real-time updates
  useEffect(() => {
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
    if (!authToken) return;

    const serverUrl = getServerBaseUrl();
    const newSocket = io(`${serverUrl}/cocina`, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('[TablaAprobacion] Socket conectado');
      setSocketConnected(true);
      const fechaHoy = getFechaOperativa();
      newSocket.emit('join-fecha', fechaHoy);
    });

    newSocket.on('disconnect', () => {
      console.log('[TablaAprobacion] Socket desconectado');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[TablaAprobacion] Socket error:', err?.message);
      setSocketConnected(false);
    });

    // Aprobación events
    newSocket.on('ticket-aprobacion-nuevo', () => {
      console.log('[TablaAprobacion] Nuevo ticket de aprobación');
      fetchItems();
    });

    newSocket.on('comanda-aprobada', (data) => {
      console.log('[TablaAprobacion] Comanda aprobada:', data?.ticketNumber);
      // PLAN: Instead of removing the ticket, update its state to 'aprobado'
      // so it appears in the "Aprobados" filter tab immediately.
      setItems(prev => prev.map(t =>
        t._id === data?.ticketId ? { ...t, estado: 'aprobado', aprobadoPorNombre: data?.aprobadoPorNombre, fechaAprobacion: data?.fechaAprobacion || new Date().toISOString() } : t
      ));
      fetchItems();
    });

    newSocket.on('mesa-reportada', () => {
      console.log('[TablaAprobacion] Mesa reportada');
      fetchItems();
    });

    newSocket.on('ticket-reportado', (data) => {
      console.log('[TablaAprobacion] Ticket reportado:', data?.ticketId);
      setItems(prev => prev.map(t =>
        t._id === data?.ticketId ? { ...t, estado: 'reportado', motivoReporte: data?.motivo } : t
      ));
      fetchItems();
    });

    // PPA events (backwards compatibility)
    newSocket.on('ticket-ppa-nuevo', () => {
      console.log('[TablaAprobacion] Nuevo ticket PPA');
      fetchItems();
    });

    newSocket.on('ticket-ppa-actualizado', (data) => {
      console.log('[TablaAprobacion] Ticket PPA actualizado:', data?.ticketId, data?.estado);
      if (data?.estado === 'aprobado' || data?.estado === 'rechazado') {
        setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      }
      fetchItems();
    });

    newSocket.on('ticket-ppa-aprobado', (data) => {
      console.log('[TablaAprobacion] Ticket PPA aprobado:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItems();
    });

    newSocket.on('ticket-ppa-rechazado', (data) => {
      console.log('[TablaAprobacion] Ticket PPA rechazado:', data?.ticketNumber);
      setItems(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchItems();
    });

    socketRef.current = newSocket;

    return () => {
      console.log('[TablaAprobacion] Desconectando socket');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [fetchItems]);

  // Aprobar item (comanda o PPA)
  const aprobarItem = useCallback(async (ticketId, tipo, usuarioId, usuarioNombre) => {
    try {
      const data = await apiPut(`/api/aprobacion/${ticketId}/aprobar`, {
        tipo: tipo || 'COMANDA',
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setItems(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || data?.message || 'Error al aprobar');
    } catch (err) {
      console.error('Error al aprobar item:', err.message);
      throw err;
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

  const cantidadPendientes = items.filter(t => t.estado === 'pendiente_aprobacion').length;
  const cantidadComandas = items.filter(t => t.tipo === 'comanda_completa').length;
  const cantidadPPA = items.filter(t => t.tipo === 'pago_adelantado').length;

  return {
    items,
    loading,
    error,
    socketConnected,
    fetchItems,
    aprobarItem,
    reportarItem,
    rechazarItem,
    imprimirComanda,
    cantidadPendientes,
    cantidadComandas,
    cantidadPPA,
  };
}