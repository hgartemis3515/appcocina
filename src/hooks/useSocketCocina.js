import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import moment from 'moment-timezone';
import axios from 'axios';
import { getServerBaseUrl } from '../config/apiConfig';

/**
 * Hook personalizado para manejar conexión Socket.io con namespace /cocina
 * @param {Function} onNuevaComanda - Callback cuando llega nueva comanda
 * @param {Function} onComandaActualizada - Callback cuando se actualiza una comanda
 * @param {Function} onPlatoActualizado - Callback cuando se actualiza un plato
 * @param {Function} obtenerComandas - Función para obtener comandas iniciales
 * @returns {Object} { socket, connected, connectionStatus }
 */
const useSocketCocina = ({
  onNuevaComanda,
  onComandaActualizada,
  onPlatoActualizado,
  obtenerComandas
}) => {
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('desconectado'); // 'conectado', 'desconectado'
  const socketRef = useRef(null);
  const ultimoPingRef = useRef(Date.now());
  const reconnectTimeoutRef = useRef(null);

  // Obtener URL del servidor desde configuración dinámica
  const getServerUrl = () => {
    return getServerBaseUrl();
  };

  useEffect(() => {
    const serverUrl = getServerUrl();
    const fechaActual = moment().tz("America/Lima").format('YYYY-MM-DD');
    
    console.log('🔌 Conectando a Socket.io:', `${serverUrl}/cocina`);

    // Crear conexión Socket.io al namespace /cocina
    const socket = io(`${serverUrl}/cocina`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    socketRef.current = socket;

    // Evento: Conexión establecida
    socket.on('connect', () => {
      console.log('✅ Socket cocina conectado:', socket.id);
      setConnected(true);
      setConnectionStatus('conectado');
      ultimoPingRef.current = Date.now();

      // Unirse a room por fecha
      socket.emit('join-fecha', fechaActual);
      console.log(`📅 Unido a room: fecha-${fechaActual}`);

      // Obtener comandas iniciales una vez conectado
      if (obtenerComandas) {
        obtenerComandas();
      }
    });

    // Evento: Desconexión
    socket.on('disconnect', (reason) => {
      console.warn('❌ Socket cocina desconectado:', reason);
      setConnected(false);
      setConnectionStatus('desconectado');
      
      // Si desconexión > 30 segundos, mostrar warning
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!socket.connected && Date.now() - ultimoPingRef.current > 30000) {
          console.warn('⚠️ Conexión perdida > 30s. Redis Adapter garantiza estabilidad. Reconectando...');
        }
      }, 30000);
    });

    // Evento: Reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconectado después de ${attemptNumber} intentos`);
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

    // Evento: Error de conexión
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.io:', error.message);
      setConnectionStatus('desconectado');
    });

    // Evento: Nueva comanda
    socket.on('nueva-comanda', (data) => {
      console.log('📥 Nueva comanda recibida:', data.comanda?.comandaNumber);
      ultimoPingRef.current = Date.now();
      
      if (onNuevaComanda && data.comanda) {
        onNuevaComanda(data.comanda);
      }
    });

    // Evento: Comanda actualizada
    socket.on('comanda-actualizada', async (data) => {
      console.log('📥 Comanda actualizada recibida:', data.comandaId || data.comanda?._id);
      ultimoPingRef.current = Date.now();
      
      if (onComandaActualizada) {
        // Si viene la comanda completa, pasar el objeto completo con platosEliminados
        if (data.comanda) {
          onComandaActualizada(data); // Pasar el objeto completo, no solo la comanda
        } else if (data.comandaId && obtenerComandas) {
          // Refrescar todas las comandas si no viene la comanda completa
          obtenerComandas();
        }
      }
    });
    
    // 🔥 AUDITORÍA: Evento específico para plato eliminado
    socket.on('comanda:plato-eliminado', async (data) => {
      console.log('🗑️ Plato eliminado recibido:', data.platoEliminado?.nombre, 'Comanda:', data.comandaId);
      ultimoPingRef.current = Date.now();
      
      if (onComandaActualizada && data.comanda) {
        // Pasar la comanda actualizada con el plato marcado como eliminado
        onComandaActualizada({
          comanda: data.comanda,
          platosEliminados: data.comanda.historialPlatos?.filter(h => h.estado === 'eliminado') || [],
          auditoria: data.auditoria
        });
      }
    });

    // Evento: Plato actualizado
    socket.on('plato-actualizado', (data) => {
      console.log('📥 Plato actualizado recibido:', data.platoId, data.nuevoEstado);
      ultimoPingRef.current = Date.now();
      
      if (onPlatoActualizado) {
        onPlatoActualizado(data);
      } else if (obtenerComandas) {
        // Si no hay callback específico, refrescar todas las comandas
        obtenerComandas();
      }
    });

    // ✅ Evento: Comanda eliminada - Remover tarjeta en tiempo real
    socket.on('comanda-eliminada', (data) => {
      console.log('🗑️ Comanda eliminada recibida:', data.comandaId || data.comanda?._id, 'Comanda #:', data.comanda?.comandaNumber);
      ultimoPingRef.current = Date.now();
      
      // Llamar callback si existe, o refrescar comandas
      if (onComandaActualizada) {
        // Pasar información de eliminación para que el handler pueda remover la comanda
        onComandaActualizada({
          comandaId: data.comandaId || data.comanda?._id,
          comanda: data.comanda,
          eliminada: true, // Marcar como eliminada
          timestamp: data.timestamp
        });
      } else if (obtenerComandas) {
        // Si no hay callback específico, refrescar todas las comandas
        obtenerComandas();
      }
    });

    // Heartbeat para mantener conexión activa
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
        socket.once('heartbeat-ack', () => {
          ultimoPingRef.current = Date.now();
        });
      }
    }, 30000); // Cada 30 segundos

    // Cleanup
    return () => {
      console.log('🧹 Limpiando conexión Socket.io');
      clearInterval(heartbeatInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Solo ejecutar una vez al montar

  return {
    socket: socketRef.current,
    connected,
    connectionStatus
  };
};

export default useSocketCocina;

