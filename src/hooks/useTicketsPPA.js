/**
 * useTicketsPPA - Hook para gestionar Tickets de Pago Adelantado en App Cocina.
 * Consulta el endpoint de tickets pendientes y se suscribe a eventos Socket.io
 * para actualizar en tiempo real.
 *
 * NOTA: Este hook gestiona su propia conexión Socket.io internamente
 * usando getServerBaseUrl() y el token JWT, sin depender de useSocketCocina.
 * Usa apiClient para las peticiones REST (inyección automática de token).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import moment from 'moment-timezone';
import { getServerBaseUrl } from '../config/apiConfig';
import { apiGet, apiPut } from '../config/apiClient';
import { io } from 'socket.io-client';

const TICKETS_REFRESH_INTERVAL = 30000; // 30 segundos de polling de respaldo

export default function useTicketsPPA() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const fechaHoy = moment().tz('America/Lima').format('YYYY-MM-DD');
      const data = await apiGet(`/api/pago-adelantado/pendientes?fecha=${fechaHoy}`);
      if (data?.success) {
        setTickets(data.tickets || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching tickets PPA:', err.message);
      setError(err.userMessage || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, TICKETS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  // Conexión Socket.io propia para eventos PPA
  useEffect(() => {
    const getStoredToken = () => {
      try {
        const storedAuth = localStorage.getItem('cocinaAuth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          return authData.token || null;
        }
      } catch (e) {
        console.warn('⚠️ [PPA] Error parsing auth token:', e);
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
      console.log('🔌 [PPA] Socket conectado');
      setSocketConnected(true);
      const fechaHoy = moment().tz('America/Lima').format('YYYY-MM-DD');
      newSocket.emit('join-fecha', fechaHoy);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 [PPA] Socket desconectado');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('⚠️ [PPA] Socket error:', err?.message);
      setSocketConnected(false);
    });

    newSocket.on('ticket-ppa-nuevo', (data) => {
      console.log('🎫 [PPA] Nuevo ticket recibido:', data?.ticket?.ticketNumber);
      setTickets(prev => {
        const exists = prev.some(t => t._id === data?.ticket?._id);
        if (exists) return prev;
        return [data?.ticket, ...prev].filter(Boolean);
      });
      fetchTickets();
    });

    newSocket.on('ticket-ppa-actualizado', (data) => {
      console.log('🎫 [PPA] Ticket actualizado:', data?.ticketId, data?.estado);
      if (data?.estado === 'aprobado' || data?.estado === 'rechazado') {
        setTickets(prev => prev.filter(t => t._id !== data?.ticketId));
      }
      fetchTickets();
    });

    newSocket.on('ticket-ppa-aprobado', (data) => {
      console.log('✅ [PPA] Ticket aprobado:', data?.ticketNumber);
      setTickets(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchTickets();
    });

    newSocket.on('ticket-ppa-rechazado', (data) => {
      console.log('❌ [PPA] Ticket rechazado:', data?.ticketNumber);
      setTickets(prev => prev.filter(t => t._id !== data?.ticketId));
      fetchTickets();
    });

    socketRef.current = newSocket;

    return () => {
      console.log('🔌 [PPA] Desconectando socket');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [fetchTickets]);

  const aprobarTicket = useCallback(async (ticketId, usuarioId, usuarioNombre) => {
    try {
      const data = await apiPut(`/api/pago-adelantado/${ticketId}/aprobar`, {
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setTickets(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || 'Error al aprobar ticket');
    } catch (err) {
      console.error('Error al aprobar ticket PPA:', err.message);
      throw err;
    }
  }, []);

  const rechazarTicket = useCallback(async (ticketId, motivo, usuarioId, usuarioNombre) => {
    try {
      const data = await apiPut(`/api/pago-adelantado/${ticketId}/rechazar`, {
        motivo,
        usuarioId,
        usuarioNombre,
      });
      if (data?.success) {
        setTickets(prev => prev.filter(t => t._id !== ticketId));
        return data;
      }
      throw new Error(data?.error || 'Error al rechazar ticket');
    } catch (err) {
      console.error('Error al rechazar ticket PPA:', err.message);
      throw err;
    }
  }, []);

  return {
    tickets,
    loading,
    error,
    socketConnected,
    fetchTickets,
    aprobarTicket,
    rechazarTicket,
    cantidadPendientes: tickets.filter(t => t.estado === 'pendiente_aprobacion').length,
  };
}