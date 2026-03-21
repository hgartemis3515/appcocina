/**
 * Constantes de Configuración KDS - App de Cocina
 * 
 * Este archivo define todas las opciones de configuración disponibles,
 * sus valores por defecto y la lógica de negocio.
 * 
 * @version 7.2
 * @updated Marzo 2026
 */

// ============================================
// VERSIÓN DE CONFIGURACIÓN
// ============================================
// Incrementar cuando cambie la estructura de datos para
// forzar limpieza de configuraciones antiguas en localStorage
export const KDS_CONFIG_VERSION = '7.2.0';

// ============================================
// OPCIONES DE CONFIGURACIÓN BASE
// ============================================

/**
 * Configuración de tiempos y alertas
 * Define los umbrales para alertas visuales y sonoras
 */
export const TIEMPOS_ALERTA = {
  // Tiempo en minutos para alerta amarilla (precaución)
  AMARILLA_DEFAULT: 15,
  AMARILLA_MIN: 5,
  AMARILLA_MAX: 60,
  
  // Tiempo en minutos para alerta roja (urgente)
  ROJA_DEFAULT: 20,
  ROJA_MIN: 10,
  ROJA_MAX: 120,
  
  // Tiempo en minutos para alerta crítica (sonido adicional)
  CRITICA_DEFAULT: 25,
  CRITICA_MIN: 15,
  CRITICA_MAX: 180,
};

/**
 * Configuración de diseño del grid
 */
export const DISENO_GRID = {
  COLUMNAS_DEFAULT: 5,
  COLUMNAS_MIN: 1,
  COLUMNAS_MAX: 8,
  
  FILAS_DEFAULT: 1,
  FILAS_MIN: 1,
  FILAS_MAX: 4,
  
  FUENTE_DEFAULT: 15,
  FUENTE_MIN: 12,
  FUENTE_MAX: 24,
};

/**
 * Configuración de modo de vista
 */
export const MODO_VISTA = {
  TARJETAS: 'tarjetas',    // Vista Kanban tradicional
  TABLA: 'tabla',          // Vista compacta de tabla
};

/**
 * Tamaño de tarjetas
 */
export const TAMANO_TARJETA = {
  COMPACTO: 'compacto',
  MEDIANO: 'mediano',
  EXPANDIDO: 'expandido',
};

/**
 * Criterios de ordenamiento
 */
export const ORDENAMIENTO = {
  TIEMPO: 'tiempo',           // Por tiempo en cocina (más antiguo primero)
  MESA: 'mesa',               // Por número de mesa
  PRIORIDAD: 'prioridad',     // Por prioridad (VIP primero)
  CREACION: 'creacion',       // Por fecha de creación
};

// ============================================
// PERFILES PREDEFINIDOS
// ============================================

/**
 * Perfiles de configuración predefinidos.
 * Espacio disponible para agregar perfiles personalizados.
 */
export const PERFILES_PREDEFINIDOS = {};

// ============================================
// CONFIGURACIÓN POR DEFECTO
// ============================================

/**
 * Configuración por defecto del sistema KDS
 * Se usa cuando no hay configuración guardada o al resetear
 */
export const DEFAULT_KDS_CONFIG = {
  // Metadatos
  version: KDS_CONFIG_VERSION,
  perfilActivo: null,
  ultimaModificacion: null,
  
  // Tiempos y alertas
  alertYellowMinutes: TIEMPOS_ALERTA.AMARILLA_DEFAULT,
  alertRedMinutes: TIEMPOS_ALERTA.ROJA_DEFAULT,
  alertCriticalMinutes: TIEMPOS_ALERTA.CRITICA_DEFAULT,
  
  // Vista
  modoVista: MODO_VISTA.TARJETAS,
  tamanoTarjeta: TAMANO_TARJETA.MEDIANO,
  tamanoFuente: DISENO_GRID.FUENTE_DEFAULT,
  columnasGrid: DISENO_GRID.COLUMNAS_DEFAULT,
  filasGrid: DISENO_GRID.FILAS_DEFAULT,
  mostrarImagenes: false,
  agruparPorMesa: false,
  ordenamientoDefault: ORDENAMIENTO.TIEMPO,
  
  // Rendimiento
  cacheDatos: true,
  limiteComandasMemoria: 100,
  
  // Sonidos y notificaciones
  soundEnabled: true,
  repetirSonido: false,
  
  // Misc
  nightMode: true,
  autoPrint: false,
  
  // Design (compatibilidad con versión anterior)
  design: {
    fontSize: DISENO_GRID.FUENTE_DEFAULT,
    cols: DISENO_GRID.COLUMNAS_DEFAULT,
    rows: DISENO_GRID.FILAS_DEFAULT,
  }
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Valida que una configuración sea válida
 * @param {Object} config - Configuración a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validarConfiguracion = (config) => {
  const errors = [];
  
  // Validar tiempos
  if (config.alertYellowMinutes < TIEMPOS_ALERTA.AMARILLA_MIN || 
      config.alertYellowMinutes > TIEMPOS_ALERTA.AMARILLA_MAX) {
    errors.push(`Alerta amarilla debe estar entre ${TIEMPOS_ALERTA.AMARILLA_MIN} y ${TIEMPOS_ALERTA.AMARILLA_MAX} minutos`);
  }
  
  if (config.alertRedMinutes < TIEMPOS_ALERTA.ROJA_MIN || 
      config.alertRedMinutes > TIEMPOS_ALERTA.ROJA_MAX) {
    errors.push(`Alerta roja debe estar entre ${TIEMPOS_ALERTA.ROJA_MIN} y ${TIEMPOS_ALERTA.ROJA_MAX} minutos`);
  }
  
  // Alerta roja debe ser mayor que amarilla
  if (config.alertRedMinutes <= config.alertYellowMinutes) {
    errors.push('Alerta roja debe ser mayor que alerta amarilla');
  }
  
  // Validar diseño
  if (config.columnasGrid < DISENO_GRID.COLUMNAS_MIN ||
      config.columnasGrid > DISENO_GRID.COLUMNAS_MAX) {
    errors.push(`Columnas debe estar entre ${DISENO_GRID.COLUMNAS_MIN} y ${DISENO_GRID.COLUMNAS_MAX}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Normaliza una configuración parcial con los valores por defecto
 * @param {Object} partialConfig - Configuración parcial
 * @returns {Object} Configuración completa
 */
export const normalizarConfiguracion = (partialConfig = {}) => {
  const config = { ...DEFAULT_KDS_CONFIG };
  
  // Mergear valores proporcionados
  Object.keys(partialConfig).forEach(key => {
    if (key === 'design') {
      // Compatibilidad con versión anterior
      config.design = { ...config.design, ...partialConfig.design };
      // También actualizar los campos nuevos
      if (partialConfig.design.fontSize) config.tamanoFuente = partialConfig.design.fontSize;
      if (partialConfig.design.cols) config.columnasGrid = partialConfig.design.cols;
      if (partialConfig.design.rows) config.filasGrid = partialConfig.design.rows;
    } else if (partialConfig[key] !== undefined) {
      config[key] = partialConfig[key];
    }
  });
  
  // Asegurar que design esté sincronizado
  config.design = {
    fontSize: config.tamanoFuente,
    cols: config.columnasGrid,
    rows: config.filasGrid,
  };
  
  // Agregar timestamp de modificación
  config.ultimaModificacion = new Date().toISOString();
  
  return config;
};

/**
 * Aplica un perfil predefinido a la configuración
 * @param {string} perfilId - ID del perfil a aplicar
 * @param {Object} currentConfig - Configuración actual (para mantener personalizaciones)
 * @returns {Object} Nueva configuración con el perfil aplicado
 */
export const aplicarPerfil = (perfilId, currentConfig = {}) => {
  const perfil = Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilId);
  
  if (!perfil) {
    console.warn(`Perfil no encontrado: ${perfilId}`);
    return normalizarConfiguracion(currentConfig);
  }
  
  const newConfig = {
    ...normalizarConfiguracion(perfil.config),
    perfilActivo: perfilId,
  };
  
  // Mantener algunas preferencias personales del usuario
  if (currentConfig.soundEnabled !== undefined) {
    newConfig.soundEnabled = currentConfig.soundEnabled;
  }
  if (currentConfig.nightMode !== undefined) {
    newConfig.nightMode = currentConfig.nightMode;
  }
  
  return newConfig;
};

/**
 * Genera un resumen legible de la configuración
 * @param {Object} config - Configuración
 * @returns {string} Resumen en texto
 */
export const getResumenConfiguracion = (config) => {
  const perfil = config.perfilActivo 
    ? Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === config.perfilActivo)
    : null;
  
  return `
Configuración KDS v${config.version || 'N/A'}
${perfil ? `Perfil: ${perfil.nombre}` : 'Perfil: Personalizado'}
---
Tiempos: Amarillo ${config.alertYellowMinutes}min | Rojo ${config.alertRedMinutes}min
Vista: ${config.modoVista} | ${config.columnasGrid}x${config.filasGrid} | Fuente ${config.tamanoFuente}px
  `.trim();
};

// ============================================
// CLAVES DE LOCALSTORAGE
// ============================================

export const STORAGE_KEYS = {
  CONFIG: 'kdsConfig',
  CONFIG_VERSION: 'kdsConfigVersion',
  PLATO_STATES: 'platoStates',
  PLATOS_CHECKED: 'platosChecked',
  ZONA_ACTIVA: 'cocinaZonaActiva',
  VIEW_MODE: 'cocinaViewMode',
  LAST_CLEANUP: 'kdsLastCleanup',
};

// ============================================
// ESTRATEGIA DE LIMPIEZA
// ============================================

/**
 * Estrategia para limpieza de estados locales
 * 
 * Se ejecuta cuando:
 * 1. La versión de configuración cambia
 * 2. Cambia el día (fecha de servicio)
 * 3. El usuario cierra sesión
 * 4. Se detectan datos obsoletos
 */
export const LIMPIEZA_CONFIG = {
  // Keys a limpiar cuando cambia la versión
  KEYS_POR_VERSION: [
    STORAGE_KEYS.PLATO_STATES,
    STORAGE_KEYS.PLATOS_CHECKED,
  ],
  
  // Keys a limpiar cuando cambia el día
  KEYS_POR_DIA: [
    STORAGE_KEYS.PLATO_STATES,
    STORAGE_KEYS.PLATOS_CHECKED,
  ],
  
  // Keys a limpiar al cerrar sesión
  KEYS_POR_LOGOUT: [
    STORAGE_KEYS.CONFIG,
    STORAGE_KEYS.PLATO_STATES,
    STORAGE_KEYS.PLATOS_CHECKED,
    STORAGE_KEYS.ZONA_ACTIVA,
    STORAGE_KEYS.LAST_CLEANUP,
  ],
  
  // Intervalo en horas para verificar limpieza automática
  INTERVALO_VERIFICACION_HORAS: 1,
};

/**
 * Ejecuta la limpieza de estados locales según corresponda
 * @param {string} tipo - 'version' | 'dia' | 'logout' | 'manual'
 * @returns {Object} Resultado de la limpieza
 */
export const ejecutarLimpieza = (tipo = 'manual') => {
  const resultado = {
    tipo,
    limpiado: [],
    timestamp: new Date().toISOString(),
  };
  
  let keysALimpiar = [];
  
  switch (tipo) {
    case 'version':
      keysALimpiar = LIMPIEZA_CONFIG.KEYS_POR_VERSION;
      break;
    case 'dia':
      keysALimpiar = LIMPIEZA_CONFIG.KEYS_POR_DIA;
      break;
    case 'logout':
      keysALimpiar = LIMPIEZA_CONFIG.KEYS_POR_LOGOUT;
      break;
    case 'manual':
      keysALimpiar = [...LIMPIEZA_CONFIG.KEYS_POR_VERSION, ...LIMPIEZA_CONFIG.KEYS_POR_DIA];
      break;
    default:
      return resultado;
  }
  
  keysALimpiar.forEach(key => {
    try {
      const existed = localStorage.getItem(key) !== null;
      localStorage.removeItem(key);
      if (existed) {
        resultado.limpiado.push(key);
        console.log(`[KDS Cleanup] Eliminado: ${key}`);
      }
    } catch (e) {
      console.warn(`[KDS Cleanup] Error eliminando ${key}:`, e);
    }
  });
  
  // Guardar timestamp de última limpieza
  localStorage.setItem(STORAGE_KEYS.LAST_CLEANUP, resultado.timestamp);
  
  return resultado;
};

/**
 * Verifica si se necesita limpieza automática
 * @returns {Object} { necesitaLimpieza: boolean, razon: string }
 */
export const verificarNecesidadLimpieza = () => {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.CONFIG_VERSION);
  const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
  const lastCleanup = localStorage.getItem(STORAGE_KEYS.LAST_CLEANUP);
  
  // Verificar cambio de versión
  if (storedVersion && storedVersion !== KDS_CONFIG_VERSION) {
    return {
      necesitaLimpieza: true,
      razon: `Versión cambió de ${storedVersion} a ${KDS_CONFIG_VERSION}`,
      tipo: 'version',
    };
  }
  
  // Verificar si la configuración guardada tiene versión antigua
  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig);
      if (config.version && config.version !== KDS_CONFIG_VERSION) {
        return {
          necesitaLimpieza: true,
          razon: `Config versión ${config.version} obsoleta`,
          tipo: 'version',
        };
      }
    } catch (e) {
      // Config corrupta, necesita limpieza
      return {
        necesitaLimpieza: true,
        razon: 'Configuración corrupta',
        tipo: 'version',
      };
    }
  }
  
  // Verificar cambio de día (solo si hay datos de estados de platos)
  const platoStates = localStorage.getItem(STORAGE_KEYS.PLATO_STATES);
  if (platoStates && lastCleanup) {
    const cleanupDate = new Date(lastCleanup).toDateString();
    const today = new Date().toDateString();
    if (cleanupDate !== today) {
      return {
        necesitaLimpieza: true,
        razon: 'Cambio de día detectado',
        tipo: 'dia',
      };
    }
  }
  
  return {
    necesitaLimpieza: false,
    razon: null,
    tipo: null,
  };
};

export default {
  KDS_CONFIG_VERSION,
  TIEMPOS_ALERTA,
  DISENO_GRID,
  MODO_VISTA,
  TAMANO_TARJETA,
  ORDENAMIENTO,
  PERFILES_PREDEFINIDOS,
  DEFAULT_KDS_CONFIG,
  STORAGE_KEYS,
  LIMPIEZA_CONFIG,
  validarConfiguracion,
  normalizarConfiguracion,
  aplicarPerfil,
  getResumenConfiguracion,
  ejecutarLimpieza,
  verificarNecesidadLimpieza,
};
