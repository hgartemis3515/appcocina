import { useCallback, useEffect, useRef } from 'react';
import { useConfig, useMultiCocineroConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { MODO_VISTA, ORDENAMIENTO } from '../config/kdsConfigConstants';

/**
 * useKdsBehavior - Hook que conecta la configuración con el comportamiento del KDS
 * 
 * Este hook:
 * - Expone funciones de ordenamiento basadas en configuración
 * - Gestiona el comportamiento de notificaciones según configuración
 * - Aplica filtros de visualización según preferencias
 * - Coordina la lógica multi-cocinero
 */
const useKdsBehavior = ({
  onNotifyAssignment,
  onSoundPlay,
} = {}) => {
  const { config } = useConfig();
  const multiCocinero = useMultiCocineroConfig();
  const { userId, userName, cocineroConfig, zonaActivaId, viewMode } = useAuth();

  // Refs para debounce de notificaciones
  const lastNotificationRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  /**
   * Ordena comandas según la configuración actual
   */
  const sortComandas = useCallback((comandas) => {
    if (!comandas || comandas.length === 0) return comandas;

    const sorted = [...comandas];
    const ordenamiento = config.ordenamientoDefault || ORDENAMIENTO.TIEMPO;

    switch (ordenamiento) {
      case ORDENAMIENTO.PRIORIDAD:
        // Primero prioritarias, luego por tiempo
        sorted.sort((a, b) => {
          const prioA = a.prioridadOrden || 0;
          const prioB = b.prioridadOrden || 0;
          if (prioA !== prioB) return prioB - prioA;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        break;

      case ORDENAMIENTO.MESA:
        // Por número de mesa
        sorted.sort((a, b) => {
          const mesaA = a.mesas?.nummesa || 0;
          const mesaB = b.mesas?.nummesa || 0;
          return mesaA - mesaB;
        });
        break;

      case ORDENAMIENTO.CREACION:
        // Por fecha de creación (más reciente primero)
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;

      case ORDENAMIENTO.TIEMPO:
      default:
        // Por tiempo en cocina (más antiguo primero)
        sorted.sort((a, b) => {
          // Primero por prioridad si existe
          const prioA = a.prioridadOrden || 0;
          const prioB = b.prioridadOrden || 0;
          if (prioA !== prioB) return prioB - prioA;
          // Luego por tiempo
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        break;
    }

    return sorted;
  }, [config.ordenamientoDefault]);

  /**
   * Determina el color de alerta basado en tiempo transcurrido
   */
  const getAlertLevel = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const minutesElapsed = (now - created) / (1000 * 60);

    if (minutesElapsed >= config.alertRedMinutes) {
      return 'red'; // Urgente
    }
    if (minutesElapsed >= config.alertYellowMinutes) {
      return 'yellow'; // Precaución
    }
    return 'normal';
  }, [config.alertYellowMinutes, config.alertRedMinutes]);

  /**
   * Determina si debe mostrarse alerta crítica
   */
  const shouldShowCriticalAlert = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const minutesElapsed = (now - created) / (1000 * 60);
    return minutesElapsed >= (config.alertCriticalMinutes || 25);
  }, [config.alertCriticalMinutes]);

  /**
   * Maneja la notificación cuando otro cocinero toma un plato
   */
  const handleCocineroTookPlato = useCallback((data) => {
    // Solo notificar si la opción está activa
    if (!multiCocinero.notificarAsignaciones) return;
    
    // No notificar si soy yo quien tomó el plato
    if (data.cocineroId === userId) return;

    // Debounce para evitar spam de notificaciones
    const now = Date.now();
    if (lastNotificationRef.current && (now - lastNotificationRef.current) < 2000) {
      return;
    }
    lastNotificationRef.current = now;

    // Reproducir sonido si está activo
    if (multiCocinero.sonidoAsignacion && onSoundPlay) {
      playAsignacionSound();
    }

    // Callback de notificación
    if (onNotifyAssignment) {
      onNotifyAssignment({
        type: 'took',
        cocineroNombre: data.cocineroNombre || 'Otro cocinero',
        platoNombre: data.platoNombre,
        comandaNumber: data.comandaNumber,
      });
    }
  }, [multiCocinero, userId, onNotifyAssignment, onSoundPlay]);

  /**
   * Maneja la notificación cuando otro cocinero libera un plato
   */
  const handleCocineroReleasedPlato = useCallback((data) => {
    if (!multiCocinero.notificarAsignaciones) return;
    if (data.cocineroId === userId) return;

    if (onNotifyAssignment) {
      onNotifyAssignment({
        type: 'released',
        cocineroNombre: data.cocineroNombre || 'Otro cocinero',
        platoNombre: data.platoNombre,
        comandaNumber: data.comandaNumber,
      });
    }
  }, [multiCocinero, userId, onNotifyAssignment]);

  /**
   * Verifica si un plato puede ser tomado por el cocinero actual
   */
  const canTakePlato = useCallback((plato) => {
    // Si el plato no tiene procesandoPor, siempre se puede tomar
    if (!plato.procesandoPor) return true;

    // Si modo colaborativo está activo, se puede tomar si nadie lo está procesando
    // o si el que lo está procesando soy yo
    if (multiCocinero.modoColaborativo) {
      return !plato.procesandoPor || plato.procesandoPor.cocineroId === userId;
    }

    // Si modo colaborativo está desactivado y bloqueo automático activo,
    // verificar si la comanda está bloqueada
    if (multiCocinero.bloqueoAutomatico) {
      // No se puede tomar si otro cocinero lo está procesando
      return plato.procesandoPor.cocineroId === userId;
    }

    // Por defecto, se puede tomar
    return true;
  }, [multiCocinero, userId]);

  /**
   * Verifica si un plato está siendo procesado por otro cocinero
   */
  const isPlatoTakenByOther = useCallback((plato) => {
    if (!plato.procesandoPor) return false;
    return plato.procesandoPor.cocineroId !== userId;
  }, [userId]);

  /**
   * Obtiene información del cocinero que procesa un plato
   */
  const getPlatoProcessorInfo = useCallback((plato) => {
    if (!plato.procesandoPor || !multiCocinero.mostrarCocineroAsignado) {
      return null;
    }

    return {
      id: plato.procesandoPor.cocineroId,
      nombre: plato.procesandoPor.nombre || plato.procesandoPor.alias || 'Cocinero',
      timestamp: plato.procesandoPor.timestamp,
    };
  }, [multiCocinero.mostrarCocineroAsignado]);

  /**
   * Determina si debe mostrarse el badge de cocinero
   */
  const shouldShowCocineroBadge = useCallback(() => {
    return multiCocinero.mostrarCocineroAsignado;
  }, [multiCocinero.mostrarCocineroAsignado]);

  /**
   * Obtiene las clases CSS para una tarjeta basadas en su estado
   */
  const getCardClasses = useCallback((comanda, isExpanded = false) => {
    const alertLevel = getAlertLevel(comanda.createdAt);
    const classes = ['comanda-card'];

    // Clase de alerta
    if (alertLevel === 'red') {
      classes.push('alert-urgent');
    } else if (alertLevel === 'yellow') {
      classes.push('alert-warning');
    }

    // Clase de prioridad
    if (comanda.prioridadOrden > 0) {
      classes.push('priority-high');
    }

    // Clase de expandido
    if (isExpanded) {
      classes.push('expanded');
    }

    // Clase según modo de vista
    if (config.modoVista === MODO_VISTA.TABLA) {
      classes.push('table-mode');
    }

    // Animaciones
    if (!config.animaciones) {
      classes.push('no-animations');
    }

    return classes.join(' ');
  }, [getAlertLevel, config.modoVista, config.animaciones]);

  /**
   * Obtiene el estilo inline para el tamaño de fuente
   */
  const getFontSizeStyle = useCallback(() => {
    return {
      fontSize: `${config.tamanoFuente}px`,
    };
  }, [config.tamanoFuente]);

  /**
   * Obtiene la configuración del grid
   */
  const getGridConfig = useCallback(() => {
    return {
      cols: config.columnasGrid,
      rows: config.filasGrid,
      totalSlots: config.columnasGrid * config.filasGrid,
    };
  }, [config.columnasGrid, config.filasGrid]);

  /**
   * Verifica si debe usarse vista de tabla
   */
  const shouldUseTableView = useCallback(() => {
    return config.modoVista === MODO_VISTA.TABLA;
  }, [config.modoVista]);

  /**
   * Verifica si las animaciones están habilitadas
   */
  const areAnimationsEnabled = useCallback(() => {
    return config.animaciones;
  }, [config.animaciones]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Configuración
    config,
    multiCocinero,
    
    // Ordenamiento
    sortComandas,
    
    // Alertas
    getAlertLevel,
    shouldShowCriticalAlert,
    
    // Multi-cocinero
    handleCocineroTookPlato,
    handleCocineroReleasedPlato,
    canTakePlato,
    isPlatoTakenByOther,
    getPlatoProcessorInfo,
    shouldShowCocineroBadge,
    
    // UI
    getCardClasses,
    getFontSizeStyle,
    getGridConfig,
    shouldUseTableView,
    areAnimationsEnabled,
    
    // Constantes útiles
    isNightMode: config.nightMode,
    soundEnabled: config.soundEnabled,
  };
};

/**
 * Reproduce sonido de asignación (diferente al de nueva comanda)
 */
const playAsignacionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Frecuencia más baja para diferenciar del sonido de nueva comanda
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (error) {
    console.log('No se pudo reproducir sonido de asignación:', error);
  }
};

export default useKdsBehavior;
