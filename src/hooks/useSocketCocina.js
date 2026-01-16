import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import moment from 'moment-timezone';
import axios from 'axios';

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
  const [connectionStatus, setConnectionStatus] = useState('desconectado'); // 'conectado', 'polling', 'desconectado'
  const socketRef = useRef(null);
  const ultimoPingRef = useRef(Date.now());
  const fallbackIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Obtener URL del servidor desde variable de entorno o usar default
  const getServerUrl = () => {
    const apiUrl = process.env.REACT_APP_API_COMANDA || 'http://192.168.18.11:3000/api/comanda';
    // Extraer base URL (sin /api/comanda)
    const baseUrl = apiUrl.replace('/api/comanda', '');
    return baseUrl;
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
      
      // Limpiar fallback polling si existe
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

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
      
      // Si la desconexión es por error del servidor, activar fallback
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setConnectionStatus('desconectado');
        
        // Activar fallback polling después de 2 minutos sin conexión
        if (!fallbackIntervalRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!socket.connected && Date.now() - ultimoPingRef.current > 120000) {
              console.warn('⚠️ Socket desconectado > 2min, activando fallback polling');
              setConnectionStatus('polling');
              
              // Fallback polling cada 30 segundos
              fallbackIntervalRef.current = setInterval(() => {
                if (obtenerComandas) {
                  obtenerComandas();
                }
              }, 30000);
            }
          }, 120000);
        }
      }
    });

    // Evento: Reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconectado después de ${attemptNumber} intentos`);
      setConnected(true);
      setConnectionStatus('conectado');
      ultimoPingRef.current = Date.now();
      
      // Limpiar fallback
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
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
      console.log('📥 Comanda actualizada recibida:', data.comandaId);
      ultimoPingRef.current = Date.now();
      
      if (onComandaActualizada) {
        // Si viene la comanda completa, usarla; sino, hacer fetch
        if (data.comanda) {
          onComandaActualizada(data.comanda);
        } else if (data.comandaId && obtenerComandas) {
          // Refrescar todas las comandas si no viene la comanda completa
          obtenerComandas();
        }
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
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
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

