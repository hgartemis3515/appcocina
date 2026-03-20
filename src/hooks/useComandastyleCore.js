/**
 * useComandastyleCore - Hook compartido para vistas KDS
 * 
 * TEMA 3: Extrae la lógica común entre Comandastyle.jsx (Vista General)
 * y ComandastylePerso.jsx (Vista Personalizada) para evitar duplicación.
 * 
 * Responsabilidades:
 * - Suscripción a Socket.io y manejo de eventos de comandas
 * - Obtención y estado base de comandas
 * - Ordenamiento por prioridadOrden y createdAt
 * - Paginación y estados visuales
 * - Callbacks para actualizar estado
 * - Filtrado opcional inyectable
 * 
 * @module useComandastyleCore
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { getApiUrl } from '../config/apiConfig';
import useSocketCocina from './useSocketCocina';

/**
 * Sonido de notificación para nuevas comandas
 */
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('[useComandastyleCore] No se pudo reproducir el sonido:', error);
  }
};

/**
 * Hook compartido para la lógica base del tablero KDS
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.getToken - Función para obtener el token JWT
 * @param {Function} options.customFilter - Función de filtrado personalizada (opcional)
 * @param {Object} options.cocineroConfig - Configuración del cocinero (opcional, para Vista Personalizada)
 * @param {string} options.cocineroId - ID del cocinero (opcional, para room personal)
 * @param {Object} options.config - Configuración del tablero (sonido, tiempos, etc.)
 * @param {Function} options.onConfigCocineroActualizada - Callback para actualizaciones de config (opcional)
 * @returns {Object} Estado y funciones para el tablero KDS
 */
const useComandastyleCore = ({
  getToken,
  customFilter = null,
  cocineroConfig = null,
  cocineroId = null,
  config = {},
  onConfigCocineroActualizada = null
}) => {
  // ==================== ESTADO BASE ====================
  const [comandas, setComandas] = useState([]);
  const [comandasOriginales, setComandasOriginales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Estados visuales
  const [expandedComandas, setExpandedComandas] = useState(new Set());
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  
  // Refs para control
  const previousComandasRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const lastSuccessTimeRef = useRef(Date.now());
  const newComandasRef = useRef(new Set());
  
  // Configuración con defaults
  const {
    soundEnabled = true,
    alertYellowMinutes = 15,
    alertRedMinutes = 20
  } = config;

  // ==================== OBTENER COMANDAS ====================
  const obtenerComandas = useCallback(async () => {
    try {
      setLoading(true);
      const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
      const apiUrl = `${getApiUrl()}/cocina/${fechaActual}`;
      
      const startTime = Date.now();
      const response = await axios.get(apiUrl, { timeout: 5000 });
      const elapsedMs = Date.now() - startTime;
      
      console.log(`[useComandastyleCore] Comandas obtenidas en ${elapsedMs}ms`);
      
      // Filtrar comandas válidas
      const comandasValidas = response.data.filter(c => {
        // Filtrar comandas eliminadas
        if (c.IsActive === false || c.IsActive === null || c.eliminada === true) {
          return false;
        }
        
        // Verificar que tiene platos
        if (!c.platos || c.platos.length === 0) return false;
        
        // Verificar que todos los platos tienen nombre
        return c.platos.every(plato => {
          const nombre = plato.plato?.nombre || plato.nombre;
          return nombre && nombre.trim().length > 0;
        });
      });
      
      // Detectar nuevas comandas para sonido y animación
      if (soundEnabled && previousComandasRef.current.length > 0) {
        const nuevasComandas = comandasValidas.filter(
          nueva => !previousComandasRef.current.some(anterior => anterior._id === nueva._id)
        );
        
        const nuevasIngresantes = nuevasComandas.filter(
          c => c.platos?.some(p => p.estado === "en_espera" || p.estado === "ingresante")
        );
        
        if (nuevasIngresantes.length > 0) {
          playNotificationSound();
          nuevasIngresantes.forEach(c => {
            newComandasRef.current.add(c._id);
            setTimeout(() => newComandasRef.current.delete(c._id), 2000);
          });
        }
      }
      
      previousComandasRef.current = comandasValidas;
      setComandasOriginales(comandasValidas);
      setLastRefresh(new Date());
      setError(null);
      lastSuccessTimeRef.current = Date.now();
      
    } catch (err) {
      console.error("[useComandastyleCore] Error al obtener comandas:", err);
      setError(err.message || 'Error al obtener comandas');
      
      // Reintento con backoff
      const timeSinceLastSuccess = Date.now() - lastSuccessTimeRef.current;
      if (timeSinceLastSuccess > 10000 && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          obtenerComandas();
          reconnectTimeoutRef.current = null;
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  // ==================== FILTRADO Y ORDENAMIENTO ====================
  
  // Aplicar filtro personalizado si existe
  const comandasFiltradas = useMemo(() => {
    if (!customFilter) {
      return comandasOriginales;
    }
    return customFilter(comandasOriginales);
  }, [comandasOriginales, customFilter]);
  
  // Ordenar por prioridad y tiempo
  const comandasOrdenadas = useMemo(() => {
    return [...comandasFiltradas].sort((a, b) => {
      // Primero por prioridad (mayor primero)
      const prioridadA = a.prioridadOrden || 0;
      const prioridadB = b.prioridadOrden || 0;
      
      if (prioridadA !== prioridadB) {
        return prioridadB - prioridadA;
      }
      
      // Luego por tiempo de creación (más antiguo primero)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }, [comandasFiltradas]);

  // ==================== HANDLERS DE EVENTOS SOCKET ====================
  
  const handleNuevaComanda = useCallback((nuevaComanda) => {
    console.log('[useComandastyleCore] Nueva comanda:', nuevaComanda?.comandaNumber);
    
    if (!nuevaComanda || !nuevaComanda._id) {
      console.warn('[useComandastyleCore] Comanda inválida recibida');
      return;
    }
    
    // Verificar que los platos tienen nombre
    if (nuevaComanda.platos?.length > 0) {
      const todosConNombre = nuevaComanda.platos.every(p => 
        p.plato?.nombre || p.nombre
      );
      if (!todosConNombre) {
        console.warn('[useComandastyleCore] Comanda con platos sin nombre, esperando...');
        return;
      }
    }
    
    setComandasOriginales(prev => {
      const existe = prev.find(c => c._id === nuevaComanda._id);
      if (existe) {
        return prev.map(c => c._id === nuevaComanda._id ? nuevaComanda : c);
      }
      return [nuevaComanda, ...prev];
    });
  }, []);

  const handleComandaActualizada = useCallback((data) => {
    console.log('[useComandastyleCore] Comanda actualizada:', data?.comandaId);
    
    if (!data) return;
    
    // Manejar eliminación
    if (data.eliminada === true) {
      const comandaId = data.comandaId || data.comanda?._id;
      setComandasOriginales(prev => prev.filter(c => c._id !== comandaId));
      return;
    }
    
    const comandaActualizada = data.comanda || data;
    if (!comandaActualizada._id) return;
    
    setComandasOriginales(prev => {
      const index = prev.findIndex(c => c._id === comandaActualizada._id);
      if (index !== -1) {
        const actualizadas = [...prev];
        actualizadas[index] = comandaActualizada;
        return actualizadas;
      }
      return [comandaActualizada, ...prev];
    });
  }, []);

  const handlePlatoActualizado = useCallback((data) => {
    console.log('[useComandastyleCore] Plato actualizado:', data?.platoId);
    
    if (!data?.comandaId || !data?.platoId) return;
    
    setComandasOriginales(prev => {
      return prev.map(comanda => {
        if (comanda._id !== data.comandaId) return comanda;
        
        return {
          ...comanda,
          platos: comanda.platos.map(plato => {
            const platoId = plato._id || plato.platoId;
            if (platoId?.toString() === data.platoId?.toString()) {
              return { ...plato, estado: data.nuevoEstado };
            }
            return plato;
          })
        };
      });
    });
  }, []);

  // ==================== SOCKET.IO ====================
  
  const { connected, connectionStatus, authError } = useSocketCocina({
    onNuevaComanda: handleNuevaComanda,
    onComandaActualizada: handleComandaActualizada,
    onPlatoActualizado: handlePlatoActualizado,
    onConfigCocineroActualizada,
    obtenerComandas,
    token: getToken ? getToken() : null,
    cocineroId
  });

  // ==================== EFECTOS ====================
  
  // Cargar comandas al montar
  useEffect(() => {
    obtenerComandas();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // ==================== ACCIONES ====================
  
  const toggleExpand = useCallback((comandaId) => {
    setExpandedComandas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(comandaId)) {
        nuevo.delete(comandaId);
      } else {
        nuevo.add(comandaId);
      }
      return nuevo;
    });
  }, []);

  const toggleSelect = useCallback((comandaId) => {
    setSelectedOrders(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(comandaId)) {
        nuevo.delete(comandaId);
      } else {
        nuevo.add(comandaId);
      }
      return nuevo;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedOrders(new Set());
  }, []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    if (message?.duration) {
      setTimeout(() => setToastMessage(null), message.duration);
    }
  }, []);

  // Calcular tiempo transcurrido por comanda
  const calcularTiempos = useCallback(() => {
    const tiempos = new Map();
    const ahora = moment().tz("America/Lima");
    
    comandasOrdenadas.forEach(comanda => {
      const creado = moment(comanda.createdAt).tz("America/Lima");
      const diff = moment.duration(ahora.diff(creado));
      const minutos = Math.floor(diff.asMinutes());
      const segundos = diff.seconds();
      tiempos.set(comanda._id, `${minutos}:${segundos.toString().padStart(2, '0')}`);
    });
    
    return tiempos;
  }, [comandasOrdenadas]);

  // Determinar color de alerta por tiempo
  const getAlertColor = useCallback((comanda) => {
    const creado = moment(comanda.createdAt).tz("America/Lima");
    const ahora = moment().tz("America/Lima");
    const minutos = ahora.diff(creado, 'minutes');
    
    if (minutos >= alertRedMinutes) return 'red';
    if (minutos >= alertYellowMinutes) return 'yellow';
    return 'normal';
  }, [alertYellowMinutes, alertRedMinutes]);

  // ==================== RETORNO ====================
  
  return {
    // Estado
    comandas: comandasOrdenadas,
    comandasOriginales,
    loading,
    error,
    lastRefresh,
    
    // Estados visuales
    expandedComandas,
    selectedOrders,
    currentPage,
    toastMessage,
    newComandasRef,
    
    // Conexión
    connected,
    connectionStatus,
    authError,
    
    // Acciones
    obtenerComandas,
    toggleExpand,
    toggleSelect,
    clearSelection,
    showToast,
    setToastMessage,
    setCurrentPage,
    
    // Utilidades
    calcularTiempos,
    getAlertColor,
    playNotificationSound,
    
    // Stats
    totalComandas: comandasOrdenadas.length,
    comandasOriginalesCount: comandasOriginales.length
  };
};

export default useComandastyleCore;
