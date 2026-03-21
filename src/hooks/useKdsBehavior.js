import { useCallback, useEffect, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { MODO_VISTA, ORDENAMIENTO } from '../config/kdsConfigConstants';

/**
 * useKdsBehavior - Hook que conecta la configuración con el comportamiento del KDS
 * 
 * Este hook:
 * - Expone funciones de ordenamiento basadas en configuración
 * - Gestiona el comportamiento de notificaciones según configuración
 * - Aplica filtros de visualización según preferencias
 */
const useKdsBehavior = () => {
  const { config } = useConfig();
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

    return classes.join(' ');
  }, [getAlertLevel, config.modoVista]);

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
    
    // Ordenamiento
    sortComandas,
    
    // Alertas
    getAlertLevel,
    shouldShowCriticalAlert,
    
    // UI
    getCardClasses,
    getFontSizeStyle,
    getGridConfig,
    shouldUseTableView,
    
    // Constantes útiles
    isNightMode: config.nightMode,
    soundEnabled: config.soundEnabled,
  };
};

export default useKdsBehavior;
