import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import moment from 'moment-timezone';
import { getServerBaseUrl } from '../config/apiConfig';

/**
 * Hook personalizado para manejar conexión Socket.io con namespace /cocina
 * 
 * Características de seguridad:
 * - Handshake autenticado con token JWT
 * - No reconecta en bucle si auth falla
 * - Valida conexión autenticada antes de operar
 * 
 * @param {Object} params - Parámetros del hook
 * @param {Function} params.onNuevaComanda - Callback cuando llega nueva comanda
 * @param {Function} params.onComandaActualizada - Callback cuando se actualiza una comanda
 * @param {Function} params.onPlatoActualizado - Callback cuando se actualiza un plato
 * @param {Function} params.onPlatoCanceladoUrgente - Callback cuando mozos eliminan plato ya listo
 * @param {Function} params.onPlatoAnulado - Callback cuando cocina anula un plato
 * @param {Function} params.onComandaAnulada - Callback cuando cocina anula toda la comanda
 * @param {Function} params.obtenerComandas - Función para obtener comandas iniciales
 * @param {string} params.token - Token JWT para autenticación (obligatorio)
 * @returns {Object} { socket, connected, connectionStatus, authError }
 */
const useSocketCocina = ({
  onNuevaComanda,
  onComandaActualizada,
  onPlatoActualizado,
  onPlatoCanceladoUrgente,
  onPlatoAnulado,
  onComandaAnulada,
  onConfigCocineroActualizada,
  obtenerComandas,
  token // Token obligatorio para autenticación
}) => {
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('desconectado'); // 'conectado', 'desconectado', 'auth_error'
  const [authError, setAuthError] = useState(null);
  
  const socketRef = useRef(null);
  const ultimoPingRef = useRef(Date.now());
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const pollingFallbackIntervalRef = useRef(null);
  const authFailedRef = useRef(false); // Flag para no reintentar tras error de auth

  /**
   * Maneja errores de autenticación
   */
  const handleAuthError = useCallback((errorMessage) => {
    console.error('[useSocketCocina] Error de autenticación:', errorMessage);
    setAuthError(errorMessage);
    setConnectionStatus('auth_error');
    setConnected(false);
    authFailedRef.current = true;
    
    // Desconectar socket y no reintentar
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  useEffect(() => {
    // VALIDACIÓN: Token es obligatorio
    if (!token) {
      console.warn('[useSocketCocina] No hay token, no se puede conectar');
      setConnectionStatus('desconectado');
      return;
    }

    // Si ya falló la auth, no reintentar
    if (authFailedRef.current) {
      console.warn('[useSocketCocina] Auth previamente fallida, no reintentando');
      return;
    }

    const serverUrl = getServerBaseUrl();
    const fechaActual = moment().tz("America/Lima").format('YYYY-MM-DD');

    console.log('[useSocketCocina] Conectando a Socket.io:', `${serverUrl}/cocina`);

    // Crear conexión Socket.io al namespace /cocina CON AUTENTICACIÓN
    const socket = io(`${serverUrl}/cocina`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      // AUTENTICACIÓN EN HANDSHAKE
      auth: {
        token: token
      }
    });

    socketRef.current = socket;

    // Evento: Conexión establecida
    socket.on('connect', () => {
      console.log('[useSocketCocina] Socket conectado:', socket.id);
      setConnected(true);
      setConnectionStatus('conectado');
      setAuthError(null);
      ultimoPingRef.current = Date.now();

      // Unirse a room por fecha
      socket.emit('join-fecha', fechaActual);
      console.log(`[useSocketCocina] Unido a room: fecha-${fechaActual}`);

      // Obtener comandas iniciales una vez conectado
      if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Error de conexión (incluye errores de auth)
    socket.on('connect_error', (error) => {
      console.error('[useSocketCocina] Error de conexión:', error.message);
      
      // Detectar error de autenticación
      if (error.message?.toLowerCase().includes('auth') || 
          error.message?.toLowerCase().includes('token') ||
          error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('forbidden')) {
        handleAuthError('Error de autenticación. Por favor, inicie sesión nuevamente.');
      } else {
        setConnectionStatus('desconectado');
      }
    });

    // Evento: Desconexión
    socket.on('disconnect', (reason) => {
      console.warn('[useSocketCocina] Socket desconectado:', reason);
      setConnected(false);
      setConnectionStatus('desconectado');
      
      // Si desconexión > 30 segundos, mostrar warning
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!socket.connected && Date.now() - ultimoPingRef.current > 30000) {
          console.warn('[useSocketCocina] Conexión perdida > 30s. Reconectando...');
        }
      }, 30000);
    });

    // Evento: Reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log(`[useSocketCocina] Socket reconectado después de ${attemptNumber} intentos`);
      setConnected(true);
      setConnectionStatus('conectado');
      ultimoPingRef.current = Date.now();
      
      // Limpiar timeout de warning
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Re-unirse a room
      socket.emit('join-fecha', fechaActual);
      
      // Refrescar comandas
      if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Error de reconexión (agotó intentos)
    socket.on('reconnect_failed', () => {
      console.error('[useSocketCocina] Reconexión fallida después de todos los intentos');
      setConnectionStatus('desconectado');
    });

    // =====================
    // EVENTOS DE NEGOCIO
    // =====================

    // Evento: Nueva comanda
    socket.on('nueva-comanda', (data) => {
      console.log('[useSocketCocina] Nueva comanda recibida:', data.comanda?.comandaNumber);
      ultimoPingRef.current = Date.now();
      
      if (onNuevaComanda && data.comanda) {
        onNuevaComanda(data.comanda);
      }
    });

    // Evento: Comanda actualizada
    socket.on('comanda-actualizada', async (data) => {
      console.log('[useSocketCocina] Comanda actualizada:', data.comandaId || data.comanda?._id);
      ultimoPingRef.current = Date.now();
      
      if (onComandaActualizada) {
        if (data.comanda) {
          onComandaActualizada(data);
        } else if (data.comandaId && obtenerComandas) {
          obtenerComandas();
        }
      }
    });
    
    // Evento: Plato eliminado
    socket.on('comanda:plato-eliminado', async (data) => {
      console.log('[useSocketCocina] Plato eliminado:', data.platoEliminado?.nombre);
      ultimoPingRef.current = Date.now();
      
      if (onComandaActualizada && data.comanda) {
        onComandaActualizada({
          comanda: data.comanda,
          platosEliminados: data.comanda.historialPlatos?.filter(h => h.estado === 'eliminado') || [],
          auditoria: data.auditoria
        });
      }
    });

    // Evento: Plato actualizado
    socket.on('plato-actualizado', (data) => {
      console.log('[useSocketCocina] Plato actualizado:', data.platoId, data.nuevoEstado);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoActualizado) {
        onPlatoActualizado(data);
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Plato entregado por mozo
    socket.on('plato-entregado', (data) => {
      console.log('[useSocketCocina] Plato entregado (mozo):', data.platoId);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoActualizado) {
        onPlatoActualizado({
          comandaId: data.comandaId,
          platoId: data.platoId,
          nuevoEstado: 'entregado',
          estadoAnterior: data.estadoAnterior || 'recoger',
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Plato cancelado por mozo (urgente)
    socket.on('plato-cancelado-urgente', (data) => {
      console.log('[useSocketCocina] Plato cancelado (urgente):', data.comandaNumber);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoCanceladoUrgente) {
        onPlatoCanceladoUrgente(data);
      }
      if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Comanda eliminada
    socket.on('comanda-eliminada', (data) => {
      console.log('[useSocketCocina] Comanda eliminada:', data.comandaId || data.comanda?._id);
      ultimoPingRef.current = Date.now();
      
      if (onComandaActualizada) {
        onComandaActualizada({
          comandaId: data.comandaId || data.comanda?._id,
          comanda: data.comanda,
          eliminada: true,
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Plato anulado por cocina
    socket.on('plato-anulado', (data) => {
      console.log('[useSocketCocina] Plato anulado:', data.platoAnulado?.nombre);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoAnulado && data.comanda) {
        onPlatoAnulado(data);
      } else if (onComandaActualizada && data.comanda) {
        onComandaActualizada({
          comanda: data.comanda,
          platoAnulado: data.platoAnulado,
          auditoria: data.auditoria,
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Comanda anulada completamente
    socket.on('comanda-anulada', (data) => {
      console.log('[useSocketCocina] Comanda anulada:', data.comandaNumber);
      ultimoPingRef.current = Date.now();
      
      if (onComandaAnulada && data.comanda) {
        onComandaAnulada(data);
      } else if (onComandaActualizada && data.comanda) {
        onComandaActualizada({
          comanda: data.comanda,
          anulada: true,
          platosAnulados: data.platosAnulados,
          totalAnulado: data.totalAnulado,
          motivoGeneral: data.motivoGeneral,
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Configuración de cocinero actualizada
    socket.on('config-cocinero-actualizada', (data) => {
      console.log('[useSocketCocina] Configuración de cocinero actualizada:', data.cocineroId);
      ultimoPingRef.current = Date.now();
      
      if (onConfigCocineroActualizada) {
        onConfigCocineroActualizada(data);
      }
    });

    // Heartbeat para mantener conexión activa
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
        // Usar .on en lugar de .once para evitar acumulación
        socket.off('heartbeat-ack').once('heartbeat-ack', () => {
          ultimoPingRef.current = Date.now();
        });
      }
    }, 30000);

    // Polling fallback: si está desconectado, refrescar comandas cada 30s vía HTTP
    pollingFallbackIntervalRef.current = setInterval(() => {
      if (!socket.connected && obtenerComandas && !authFailedRef.current) {
        console.log('[useSocketCocina] Desconectado — polling fallback');
        obtenerComandas();
      }
    }, 30000);

    // Cleanup
    return () => {
      console.log('[useSocketCocina] Limpiando conexión');
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (pollingFallbackIntervalRef.current) {
        clearInterval(pollingFallbackIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      socket.off('*'); // Remover todos los listeners
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, handleAuthError, onNuevaComanda, onComandaActualizada, onPlatoActualizado, onPlatoCanceladoUrgente, onPlatoAnulado, onComandaAnulada, onConfigCocineroActualizada, obtenerComandas]);

  return {
    socket: socketRef.current,
    connected,
    connectionStatus,
    authError
  };
};

export default useSocketCocina;
