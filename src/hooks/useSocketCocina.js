import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import moment from 'moment-timezone';
import { getServerBaseUrl } from '../config/apiConfig';

/**
 * Decodifica el payload de un JWT sin validar la firma
 * Solo para lectura de claims (exp, rol, userId, etc.)
 * @param {string} token - JWT
 * @returns {Object|null} Payload decodificado o null si es inválido
 */
const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

/**
 * Verifica si un token está expirado o próximo a expirar
 * @param {string} token - JWT
 * @returns {Object} { isExpired, willExpireSoon, expiresAt, remainingMs }
 */
const checkTokenExpiry = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return { isExpired: true, willExpireSoon: true, expiresAt: null, remainingMs: 0 };
  }
  
  const expiresAt = payload.exp * 1000; // Convertir a milisegundos
  const now = Date.now();
  const remainingMs = expiresAt - now;
  
  return {
    isExpired: remainingMs <= 0,
    willExpireSoon: remainingMs <= 5 * 60 * 1000, // 5 minutos antes
    expiresAt,
    remainingMs
  };
};

/**
 * Hook personalizado para manejar conexión Socket.io con namespace /cocina
 * 
 * Características de seguridad:
 * - Handshake autenticado con token JWT
 * - No reconecta en bucle si auth falla
 * - Valida conexión autenticada antes de operar
 * - Valida expiración del token ANTES de intentar conectar
 * 
 * TEMA 1: Ahora soporta rooms personales por cocinero para recibir
 * actualizaciones de configuración específicas
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
 * @param {string} params.cocineroId - ID del cocinero para room personal (opcional, TEMA 1)
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
  token, // Token obligatorio para autenticación
  cocineroId // TEMA 1: ID del cocinero para room personal
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
  const lastTokenRef = useRef(null); // Trackear el token anterior para detectar cambios
  const isUnmountedRef = useRef(false); // Trackear si el componente se ha desmontado
  const currentTokenRef = useRef(token); // Token actual para verificar en callbacks

  /**
   * Maneja errores de autenticación
   * Incluye protección contra actualizaciones después del desmontaje
   */
  const handleAuthError = useCallback((errorMessage) => {
    // No actualizar estado si el componente ya se desmontó
    if (isUnmountedRef.current) {
      console.log('[useSocketCocina] Componente desmontado, ignorando error de auth');
      return;
    }
    
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
    // Resetear flag de desmontaje al inicio
    isUnmountedRef.current = false;
    
    // Actualizar referencia al token actual
    currentTokenRef.current = token;
    
    // VALIDACIÓN: Token es obligatorio
    if (!token) {
      console.warn('[useSocketCocina] No hay token, no se puede conectar');
      
      // IMPORTANTE: Desconectar cualquier socket existente cuando el token desaparece
      // (ej: al cerrar sesión)
      if (socketRef.current) {
        console.log('[useSocketCocina] Desconectando socket existente por falta de token');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Limpiar referencia al token
      currentTokenRef.current = null;
      
      setConnectionStatus('desconectado');
      setAuthError(null);
      authFailedRef.current = false; // Resetear para el próximo login
      return;
    }

    // VALIDACIÓN: Verificar si el token está expirado ANTES de conectar
    const tokenExpiry = checkTokenExpiry(token);
    if (tokenExpiry.isExpired) {
      console.warn('[useSocketCocina] Token expirado, no se intentará conectar');
      handleAuthError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      return;
    }

    // Si el token expira pronto, loguear advertencia
    if (tokenExpiry.willExpireSoon) {
      console.warn(`[useSocketCocina] Token expira pronto: ${Math.round(tokenExpiry.remainingMs / 60000)} minutos restantes`);
    }

    // Si ya falló la auth pero tenemos un token nuevo (diferente), resetear el flag
    // Esto permite reconectar cuando el usuario hace login nuevamente
    if (authFailedRef.current && lastTokenRef.current !== token) {
      console.log('[useSocketCocina] Nuevo token detectado, reseteando flag de auth fallida');
      authFailedRef.current = false;
      setAuthError(null);
      setConnectionStatus('desconectado');
    }

    // Si ya falló la auth con este mismo token, no reintentar
    if (authFailedRef.current) {
      console.warn('[useSocketCocina] Auth previamente fallida con este token, no reintentando');
      return;
    }

    // Guardar el token actual para comparaciones futuras
    lastTokenRef.current = token;

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
      // Verificar que este socket sigue siendo el actual
      if (socketRef.current !== socket) {
        console.log('[useSocketCocina] Ignorando connect de socket obsoleto');
        return;
      }
      
      console.log('[useSocketCocina] Socket conectado:', socket.id);
      setConnected(true);
      setConnectionStatus('conectado');
      setAuthError(null);
      authFailedRef.current = false; // Resetear flag en conexión exitosa
      ultimoPingRef.current = Date.now();

      // Unirse a room por fecha
      socket.emit('join-fecha', fechaActual);
      console.log(`[useSocketCocina] Unido a room: fecha-${fechaActual}`);

      // TEMA 1: Unirse a room personal del cocinero para recibir actualizaciones de configuración
      if (cocineroId) {
        socket.emit('join-cocinero', cocineroId);
        console.log(`[useSocketCocina] Unido a room personal: cocinero-${cocineroId}`);
      }

      // Obtener comandas iniciales una vez conectado
      if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Error de conexión (incluye errores de auth)
    socket.on('connect_error', (error) => {
      // Verificar que este socket sigue siendo el actual
      if (socketRef.current !== socket) {
        console.log('[useSocketCocina] Ignorando error de socket obsoleto');
        return;
      }
      
      // Si ya no hay token o el componente se desmontó, ignorar silenciosamente
      // Usar ref en lugar del valor de closure
      if (!currentTokenRef.current || isUnmountedRef.current) {
        console.log('[useSocketCocina] Token removido o componente desmontado, ignorando error');
        return;
      }
      
      // Si ya falló la auth previamente, no mostrar más errores
      if (authFailedRef.current) {
        console.log('[useSocketCocina] Auth ya falló previamente, ignorando error adicional');
        return;
      }
      
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
      
      // Re-unirse a room por fecha
      socket.emit('join-fecha', fechaActual);
      
      // TEMA 1: Re-unirse a room personal del cocinero
      if (cocineroId) {
        socket.emit('join-cocinero', cocineroId);
        console.log(`[useSocketCocina] Re-unido a room personal: cocinero-${cocineroId}`);
      }
      
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

    // ============================================================
    // EVENTOS DE PROCESAMIENTO MULTI-COCINERO v7.2
    // ============================================================

    // Evento: Plato tomado por un cocinero
    socket.on('plato-procesando', (data) => {
      console.log('[useSocketCocina] Plato tomado por:', data.cocinero?.alias || data.cocinero?.nombre);
      ultimoPingRef.current = Date.now();
      
      // Actualizar el estado de las comandas para reflejar quien esta procesando
      if (onPlatoActualizado) {
        onPlatoActualizado({
          comandaId: data.comandaId,
          platoId: data.platoId,
          tipo: 'PLATO_TOMADO',
          procesandoPor: data.cocinero,
          timestamp: data.timestamp
        });
      }
    });

    // Evento: Plato liberado por un cocinero
    socket.on('plato-liberado', (data) => {
      console.log('[useSocketCocina] Plato liberado:', data.platoId, 'por', data.cocineroId);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoActualizado) {
        onPlatoActualizado({
          comandaId: data.comandaId,
          platoId: data.platoId,
          tipo: 'PLATO_LIBERADO',
          cocineroId: data.cocineroId,
          timestamp: data.timestamp
        });
      }
    });

    // Evento: Conflicto al intentar tomar un plato
    socket.on('conflicto-procesamiento', (data) => {
      console.warn('[useSocketCocina] Conflicto de procesamiento:', data.mensaje);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoActualizado) {
        onPlatoActualizado({
          comandaId: data.comandaId,
          platoId: data.platoId,
          tipo: 'CONFLICTO',
          procesandoPor: data.procesadoPor,
          mensaje: data.mensaje,
          timestamp: data.timestamp
        });
      }
    });

    // Evento: Liberacion automatica por desconexion de cocinero
    socket.on('liberacion-automatica', (data) => {
      console.log('[useSocketCocina] Liberacion automatica por desconexion:', data.cocineroId);
      ultimoPingRef.current = Date.now();
      
      // Refrescar comandas para obtener estado actualizado
      if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Configuración de cocinero actualizada
    // TEMA 1: Este evento ahora se recibe solo en la room personal del cocinero
    socket.on('config-cocinero-actualizada', (data) => {
      console.log('[useSocketCocina] Configuración de cocinero actualizada:', data.cocineroId || data.config?.cocineroId);
      ultimoPingRef.current = Date.now();

      // TEMA 1: Validar que el evento es para este cocinero (seguridad adicional)
      if (data.cocineroId && cocineroId && data.cocineroId !== cocineroId) {
        console.warn('[useSocketCocina] Evento de configuración ignorado: no corresponde a este cocinero', {
          receivedCocineroId: data.cocineroId,
          currentCocineroId: cocineroId
        });
        return;
      }

      if (onConfigCocineroActualizada) {
        onConfigCocineroActualizada(data);
      }
    });

    // Evento: Nueva zona asignada
    socket.on('zona-asignada', (data) => {
      console.log('[useSocketCocina] Nueva zona asignada:', data.zona?.nombre);
      ultimoPingRef.current = Date.now();

      // Recargar configuración completa
      if (obtenerComandas && onConfigCocineroActualizada) {
        onConfigCocineroActualizada({ refresh: true });
      }
    });

    // Evento: Zona removida
    socket.on('zona-removida', (data) => {
      console.log('[useSocketCocina] Zona removida:', data.zonaId);
      ultimoPingRef.current = Date.now();

      // Recargar configuración completa
      if (onConfigCocineroActualizada) {
        onConfigCocineroActualizada({ refresh: true });
      }
    });

    // ============================================================
    // EVENTOS DE COMANDAS v7.4: Dejar/Finalizar Comanda (3 estados)
    // ============================================================

    // Evento: Comanda liberada (Dejar Comanda)
    socket.on('comanda-liberada', (data) => {
      console.log('[useSocketCocina] Comanda liberada:', data.comandaNumber || data.comandaId);
      ultimoPingRef.current = Date.now();

      if (onPlatoActualizado) {
        onPlatoActualizado({
          tipo: 'COMANDA_LIBERADA',
          comandaId: data.comandaId,
          comanda: data.comanda,
          cocineroId: data.cocineroId,
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Comanda finalizada (Finalizar Comanda)
    socket.on('comanda-finalizada', (data) => {
      console.log('[useSocketCocina] Comanda finalizada:', data.comandaNumber || data.comandaId);
      ultimoPingRef.current = Date.now();

      if (onPlatoActualizado) {
        onPlatoActualizado({
          tipo: 'COMANDA_FINALIZADA',
          comandaId: data.comandaId,
          comanda: data.comanda,
          cocinero: data.cocinero,
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Comanda tomada (Tomar Comanda)
    socket.on('comanda-procesando', (data) => {
      console.log('[useSocketCocina] Comanda tomada:', data.comandaNumber || data.comandaId);
      ultimoPingRef.current = Date.now();

      if (onPlatoActualizado) {
        onPlatoActualizado({
          tipo: 'COMANDA_TOMADA',
          comandaId: data.comandaId,
          comanda: data.comanda,
          procesandoPor: data.cocinero,
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        obtenerComandas();
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
      isUnmountedRef.current = true;
      currentTokenRef.current = null;
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (pollingFallbackIntervalRef.current) {
        clearInterval(pollingFallbackIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Desconectar y limpiar listeners
      if (socketRef.current) {
        socketRef.current.off('*');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, handleAuthError, onNuevaComanda, onComandaActualizada, onPlatoActualizado, onPlatoCanceladoUrgente, onPlatoAnulado, onComandaAnulada, onConfigCocineroActualizada, obtenerComandas, cocineroId]);

  return {
    socket: socketRef.current,
    connected,
    connectionStatus,
    authError
  };
};

export default useSocketCocina;
