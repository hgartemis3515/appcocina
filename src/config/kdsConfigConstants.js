/**
 * Constantes de Configuración KDS - App de Cocina
 *
 * @version 7.4.1
 * @updated Agosto 2026
 * @changelog
 *  7.3.0 — F2: presets, densidad, espaciado (parcial).
 *  7.4.0 — Vista ampliada (altura auto / gaps) — revertido por UX.
 *  7.4.1 — Restaura tarjetas fijas 300×500 + grid auto-fit para zoom del navegador.
 *          Config Vista solo tipografía + paginación; no altera tamaño de tarjeta.
 */

// ============================================
// VERSIÓN DE CONFIGURACIÓN
// ============================================
export const KDS_CONFIG_VERSION = '7.4.1';

export const TIEMPOS_ALERTA = {
  AMARILLA_DEFAULT: 15,
  AMARILLA_MIN: 5,
  AMARILLA_MAX: 60,
  ROJA_DEFAULT: 20,
  ROJA_MIN: 10,
  ROJA_MAX: 120,
  CRITICA_DEFAULT: 25,
  CRITICA_MIN: 15,
  CRITICA_MAX: 180,
};

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
  ANCHO_TARJETA_MIN_DEFAULT: 280,
  ANCHO_TARJETA_MIN_MIN: 220,
  ANCHO_TARJETA_MIN_MAX: 400,
};

export const MODO_VISTA = {
  TARJETAS: 'tarjetas',
  TABLA: 'tabla',
};

export const TAMANO_TARJETA = {
  COMPACTO: 'compacto',
  MEDIANO: 'mediano',
  EXPANDIDO: 'expandido',
};

/** Cómo se aplica la altura de la tarjeta en el grid */
export const ALTURA_TARJETA_MODO = {
  AUTO: 'auto',
  FIJA: 'fija',
  MINIMA: 'minima',
};

/** Columnas del grid: fijas (usa columnasGrid) o auto-fill fluido */
export const LAYOUT_COLUMNAS = {
  FIJAS: 'fijas',
  AUTO: 'auto',
};

export const DENSIDAD_PLATOS = {
  COMPACTA: 'compacta',
  NORMAL: 'normal',
  HOLGADA: 'holgada',
};

export const ESPACIADO_GRID = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
};

export const PADDING_TARJETA = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
};

export const RADIO_TARJETA = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
};

export const ALINEACION_GRID = {
  START: 'start',
  CENTER: 'center',
  STRETCH: 'stretch',
};

export const ALTURA_TARJETA_PX = {
  [TAMANO_TARJETA.COMPACTO]: 380,
  [TAMANO_TARJETA.MEDIANO]: 520,
  [TAMANO_TARJETA.EXPANDIDO]: 640,
};

export const GAP_GRID_PX = {
  [ESPACIADO_GRID.XS]: 8,
  [ESPACIADO_GRID.SM]: 12,
  [ESPACIADO_GRID.MD]: 20,
  [ESPACIADO_GRID.LG]: 28,
  [ESPACIADO_GRID.XL]: 40,
};

export const PADDING_TARJETA_PX = {
  [PADDING_TARJETA.SM]: 8,
  [PADDING_TARJETA.MD]: 12,
  [PADDING_TARJETA.LG]: 16,
};

export const RADIO_TARJETA_PX = {
  [RADIO_TARJETA.SM]: 8,
  [RADIO_TARJETA.MD]: 12,
  [RADIO_TARJETA.LG]: 16,
};

export const DENSIDAD_PLATOS_CSS = {
  [DENSIDAD_PLATOS.COMPACTA]: { fontScale: 0.9, lineHeight: 1.1 },
  [DENSIDAD_PLATOS.NORMAL]: { fontScale: 1.0, lineHeight: 1.3 },
  [DENSIDAD_PLATOS.HOLGADA]: { fontScale: 1.05, lineHeight: 1.45 },
};

export const ORDENAMIENTO = {
  TIEMPO: 'tiempo',
  MESA: 'mesa',
  PRIORIDAD: 'prioridad',
  CREACION: 'creacion',
};

export const PERFILES_PREDEFINIDOS = {
  monitor_cocina: {
    id: 'monitor_cocina',
    nombre: 'Monitor cocina',
    descripcion: 'Pantalla grande: 5 cols fijas, altura auto, gap cómodo',
    config: {
      tamanoFuente: 15,
      tamanoFuentePlatos: 15,
      tamanoTarjeta: TAMANO_TARJETA.MEDIANO,
      alturaTarjetaModo: ALTURA_TARJETA_MODO.AUTO,
      layoutColumnas: LAYOUT_COLUMNAS.FIJAS,
      columnasGrid: 5,
      filasGrid: 1,
      espaciadoGrid: ESPACIADO_GRID.MD,
      gapVertical: ESPACIADO_GRID.MD,
      gapHorizontal: ESPACIADO_GRID.MD,
      anchoTarjetaMin: 280,
      paddingTarjeta: PADDING_TARJETA.MD,
      radioTarjeta: RADIO_TARJETA.MD,
      densidadPlatos: DENSIDAD_PLATOS.NORMAL,
      alineacionGrid: ALINEACION_GRID.START,
      forzarUnaColumnaMovil: true,
      compactarBarraSuperior: false,
      mostrarTituloBarra: true,
      scrollInternoTarjeta: false,
    },
  },
  tablet: {
    id: 'tablet',
    nombre: 'Tablet',
    descripcion: 'Tablet: 3 cols, altura auto, gap medio',
    config: {
      tamanoFuente: 16,
      tamanoFuentePlatos: 16,
      tamanoTarjeta: TAMANO_TARJETA.COMPACTO,
      alturaTarjetaModo: ALTURA_TARJETA_MODO.AUTO,
      layoutColumnas: LAYOUT_COLUMNAS.FIJAS,
      columnasGrid: 3,
      filasGrid: 1,
      espaciadoGrid: ESPACIADO_GRID.MD,
      gapVertical: ESPACIADO_GRID.MD,
      gapHorizontal: ESPACIADO_GRID.SM,
      anchoTarjetaMin: 260,
      paddingTarjeta: PADDING_TARJETA.MD,
      radioTarjeta: RADIO_TARJETA.MD,
      densidadPlatos: DENSIDAD_PLATOS.NORMAL,
      alineacionGrid: ALINEACION_GRID.START,
      forzarUnaColumnaMovil: true,
      compactarBarraSuperior: false,
      mostrarTituloBarra: true,
      scrollInternoTarjeta: false,
    },
  },
  telefono: {
    id: 'telefono',
    nombre: 'Teléfono',
    descripcion: 'Móvil: 1 col, altura auto, fuente legible',
    config: {
      tamanoFuente: 16,
      tamanoFuentePlatos: 16,
      tamanoTarjeta: TAMANO_TARJETA.COMPACTO,
      alturaTarjetaModo: ALTURA_TARJETA_MODO.AUTO,
      layoutColumnas: LAYOUT_COLUMNAS.FIJAS,
      columnasGrid: 1,
      filasGrid: 3,
      espaciadoGrid: ESPACIADO_GRID.SM,
      gapVertical: ESPACIADO_GRID.SM,
      gapHorizontal: ESPACIADO_GRID.SM,
      anchoTarjetaMin: 280,
      paddingTarjeta: PADDING_TARJETA.SM,
      radioTarjeta: RADIO_TARJETA.MD,
      densidadPlatos: DENSIDAD_PLATOS.COMPACTA,
      alineacionGrid: ALINEACION_GRID.STRETCH,
      forzarUnaColumnaMovil: true,
      compactarBarraSuperior: true,
      mostrarTituloBarra: false,
      scrollInternoTarjeta: false,
    },
  },
  denso: {
    id: 'denso',
    nombre: 'Denso (muchas comandas)',
    descripcion: 'Más columnas, altura fija con scroll interno, gap pequeño',
    config: {
      tamanoFuente: 13,
      tamanoFuentePlatos: 13,
      tamanoTarjeta: TAMANO_TARJETA.COMPACTO,
      alturaTarjetaModo: ALTURA_TARJETA_MODO.FIJA,
      layoutColumnas: LAYOUT_COLUMNAS.FIJAS,
      columnasGrid: 6,
      filasGrid: 2,
      espaciadoGrid: ESPACIADO_GRID.SM,
      gapVertical: ESPACIADO_GRID.SM,
      gapHorizontal: ESPACIADO_GRID.SM,
      anchoTarjetaMin: 240,
      paddingTarjeta: PADDING_TARJETA.SM,
      radioTarjeta: RADIO_TARJETA.SM,
      densidadPlatos: DENSIDAD_PLATOS.COMPACTA,
      alineacionGrid: ALINEACION_GRID.STRETCH,
      forzarUnaColumnaMovil: true,
      compactarBarraSuperior: true,
      mostrarTituloBarra: false,
      scrollInternoTarjeta: true,
    },
  },
};

/**
 * Default KDS: tarjetas fijas 300×500 en el grid (no controladas por estos campos).
 * columnasGrid/filasGrid solo afectan paginación (comandas por página).
 */
export const DEFAULT_KDS_CONFIG = {
  version: KDS_CONFIG_VERSION,
  perfilActivo: null,
  ultimaModificacion: null,

  alertYellowMinutes: TIEMPOS_ALERTA.AMARILLA_DEFAULT,
  alertRedMinutes: TIEMPOS_ALERTA.ROJA_DEFAULT,
  alertCriticalMinutes: TIEMPOS_ALERTA.CRITICA_DEFAULT,

  modoVista: MODO_VISTA.TARJETAS,
  tamanoTarjeta: TAMANO_TARJETA.MEDIANO,
  tamanoFuente: DISENO_GRID.FUENTE_DEFAULT,
  columnasGrid: DISENO_GRID.COLUMNAS_DEFAULT,
  filasGrid: DISENO_GRID.FILAS_DEFAULT,
  mostrarImagenes: false,
  agruparPorMesa: false,
  mostrarBadgeGuarnicion: true,
  juntarGuarnicionesVisualKds: true,
  usarNombreCocinaEnTablaKds: true,
  nombrePlatoFuente: 'arial',
  nombrePlatoColor: '#ffffff',
  ordenColaFuente: 'inter',
  ordenColaTamano: 10,
  ordenColaColor: '#a7f3d0',
  ordenColaMostrarHash: true,
  ordenColaCuadroColor: '#065f46',
  ordenColaCuadroTamano: 20,
  cantidadPlatoColor: '#ffffff',
  cantidadPlatoFondo: '#b45309',
  cantidadPlatoTamano: 14,
  mozoNombreFuente: 'arial',
  mozoNombreTamano: 12,
  mozoNombreColor: '#ffffff',
  mozoNombreFondo: '#1e3a8a',
  ordenamientoDefault: ORDENAMIENTO.TIEMPO,

  // Campos legacy (v7.3/7.4) — conservados para no romper localStorage; NO alteran el grid fijo 300×500
  tamanoFuentePlatos: 18,
  espaciadoGrid: ESPACIADO_GRID.MD,
  densidadPlatos: DENSIDAD_PLATOS.NORMAL,
  forzarUnaColumnaMovil: true,
  compactarBarraSuperior: false,
  mostrarTituloBarra: true,
  mostrarMozoEnTarjeta: true,
  mostrarCocineroEnTarjeta: true,

  cacheDatos: true,
  limiteComandasMemoria: 100,
  soundEnabled: true,
  timbreClave: 'beep_clasico',
  timbreVolumen: 70,
  sonidoNuevaComanda: true,
  sonidoFinalizar: false,
  sonidoEntregar: false,
  timbreFinalizarClave: 'beep_clasico',
  timbreEntregarClave: 'beep_clasico',
  repetirSonido: false,
  nightMode: true,
  fondoConjuntoTarjetas: '#030712',
  fondoConjuntoTarjetasClaro: '#f3f4f6',
  autoPrint: false,

  design: {
    fontSize: DISENO_GRID.FUENTE_DEFAULT,
    cols: DISENO_GRID.COLUMNAS_DEFAULT,
    rows: DISENO_GRID.FILAS_DEFAULT,
  },
};

/**
 * Style del contenedor grid KDS.
 */
export const buildKdsGridStyle = (config = {}) => {
  const cols = Math.max(1, Math.min(8, config.columnasGrid || 5));
  const minW = Math.max(
    DISENO_GRID.ANCHO_TARJETA_MIN_MIN,
    Math.min(DISENO_GRID.ANCHO_TARJETA_MIN_MAX, config.anchoTarjetaMin || 280)
  );
  const gapX = GAP_GRID_PX[config.gapHorizontal || config.espaciadoGrid] || 20;
  const gapY = GAP_GRID_PX[config.gapVertical || config.espaciadoGrid] || 20;
  const alturaModo = config.alturaTarjetaModo || ALTURA_TARJETA_MODO.AUTO;
  const alturaPx = ALTURA_TARJETA_PX[config.tamanoTarjeta] || 520;
  const layout = config.layoutColumnas || LAYOUT_COLUMNAS.FIJAS;
  const align = config.alineacionGrid || ALINEACION_GRID.START;

  let gridTemplateColumns;
  if (layout === LAYOUT_COLUMNAS.AUTO) {
    gridTemplateColumns = `repeat(auto-fill, minmax(min(100%, ${minW}px), 1fr))`;
  } else {
    gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  }

  let gridAutoRows = 'auto';
  if (alturaModo === ALTURA_TARJETA_MODO.FIJA) {
    gridAutoRows = `${alturaPx}px`;
  } else if (alturaModo === ALTURA_TARJETA_MODO.MINIMA) {
    gridAutoRows = `minmax(${alturaPx}px, auto)`;
  }

  return {
    display: 'grid',
    gridTemplateColumns,
    gridAutoRows,
    columnGap: `${gapX}px`,
    rowGap: `${gapY}px`,
    justifyContent: align === ALINEACION_GRID.CENTER ? 'center' : 'start',
    alignContent: 'start',
    alignItems: align === ALINEACION_GRID.STRETCH ? 'stretch' : 'start',
  };
};

/**
 * Style de cada tarjeta (reemplaza hardcode 300×500).
 */
export const buildKdsCardStyle = (config = {}) => {
  const alturaModo = config.alturaTarjetaModo || ALTURA_TARJETA_MODO.AUTO;
  const alturaPx = ALTURA_TARJETA_PX[config.tamanoTarjeta] || 520;
  const radius = RADIO_TARJETA_PX[config.radioTarjeta] || 12;
  const scroll = config.scrollInternoTarjeta === true || alturaModo === ALTURA_TARJETA_MODO.FIJA;

  const style = {
    fontFamily: 'Arial, sans-serif',
    width: '100%',
    maxWidth: '100%',
    borderRadius: `${radius}px`,
    minWidth: 0,
  };

  if (alturaModo === ALTURA_TARJETA_MODO.FIJA) {
    style.height = `${alturaPx}px`;
    style.maxHeight = `${alturaPx}px`;
    style.overflowY = scroll ? 'auto' : 'hidden';
  } else if (alturaModo === ALTURA_TARJETA_MODO.MINIMA) {
    style.minHeight = `${alturaPx}px`;
    style.height = 'auto';
    style.overflowY = 'visible';
  } else {
    style.height = 'auto';
    style.minHeight = `${Math.round(alturaPx * 0.55)}px`;
    style.overflowY = 'visible';
  }

  return style;
};

export const validarConfiguracion = (config) => {
  const errors = [];
  if (config.alertYellowMinutes < TIEMPOS_ALERTA.AMARILLA_MIN ||
      config.alertYellowMinutes > TIEMPOS_ALERTA.AMARILLA_MAX) {
    errors.push(`Alerta amarilla debe estar entre ${TIEMPOS_ALERTA.AMARILLA_MIN} y ${TIEMPOS_ALERTA.AMARILLA_MAX} minutos`);
  }
  if (config.alertRedMinutes < TIEMPOS_ALERTA.ROJA_MIN ||
      config.alertRedMinutes > TIEMPOS_ALERTA.ROJA_MAX) {
    errors.push(`Alerta roja debe estar entre ${TIEMPOS_ALERTA.ROJA_MIN} y ${TIEMPOS_ALERTA.ROJA_MAX} minutos`);
  }
  if (config.alertRedMinutes <= config.alertYellowMinutes) {
    errors.push('Alerta roja debe ser mayor que alerta amarilla');
  }
  if (config.columnasGrid < DISENO_GRID.COLUMNAS_MIN ||
      config.columnasGrid > DISENO_GRID.COLUMNAS_MAX) {
    errors.push(`Columnas debe estar entre ${DISENO_GRID.COLUMNAS_MIN} y ${DISENO_GRID.COLUMNAS_MAX}`);
  }
  return { valid: errors.length === 0, errors };
};

export const normalizarConfiguracion = (partialConfig = {}) => {
  const config = { ...DEFAULT_KDS_CONFIG };
  Object.keys(partialConfig).forEach(key => {
    if (key === 'design') {
      config.design = { ...config.design, ...partialConfig.design };
      if (partialConfig.design.fontSize) config.tamanoFuente = partialConfig.design.fontSize;
      if (partialConfig.design.cols) config.columnasGrid = partialConfig.design.cols;
      if (partialConfig.design.rows) config.filasGrid = partialConfig.design.rows;
    } else if (partialConfig[key] !== undefined) {
      config[key] = partialConfig[key];
    }
  });

  if (!partialConfig.tamanoFuentePlatos) config.tamanoFuentePlatos = 18;

  config.design = {
    fontSize: config.tamanoFuente,
    cols: config.columnasGrid,
    rows: config.filasGrid,
  };
  config.version = KDS_CONFIG_VERSION;
  config.ultimaModificacion = new Date().toISOString();
  return config;
};

export const aplicarPerfil = (perfilId, currentConfig = {}) => {
  const perfil = Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilId);
  if (!perfil) {
    console.warn(`Perfil no encontrado: ${perfilId}`);
    return normalizarConfiguracion(currentConfig);
  }
  const newConfig = {
    ...normalizarConfiguracion({ ...currentConfig, ...perfil.config }),
    perfilActivo: perfilId,
  };
  if (currentConfig.soundEnabled !== undefined) newConfig.soundEnabled = currentConfig.soundEnabled;
  if (currentConfig.timbreClave !== undefined) newConfig.timbreClave = currentConfig.timbreClave;
  if (currentConfig.timbreVolumen !== undefined) newConfig.timbreVolumen = currentConfig.timbreVolumen;
  if (currentConfig.sonidoNuevaComanda !== undefined) newConfig.sonidoNuevaComanda = currentConfig.sonidoNuevaComanda;
  if (currentConfig.sonidoFinalizar !== undefined) newConfig.sonidoFinalizar = currentConfig.sonidoFinalizar;
  if (currentConfig.sonidoEntregar !== undefined) newConfig.sonidoEntregar = currentConfig.sonidoEntregar;
  if (currentConfig.timbreFinalizarClave !== undefined) newConfig.timbreFinalizarClave = currentConfig.timbreFinalizarClave;
  if (currentConfig.timbreEntregarClave !== undefined) newConfig.timbreEntregarClave = currentConfig.timbreEntregarClave;
  if (currentConfig.nightMode !== undefined) newConfig.nightMode = currentConfig.nightMode;
  if (currentConfig.fondoConjuntoTarjetas !== undefined) {
    newConfig.fondoConjuntoTarjetas = currentConfig.fondoConjuntoTarjetas;
  }
  if (currentConfig.fondoConjuntoTarjetasClaro !== undefined) {
    newConfig.fondoConjuntoTarjetasClaro = currentConfig.fondoConjuntoTarjetasClaro;
  }
  return newConfig;
};

const HEX_FONDO_TABLERO = /^#([0-9a-fA-F]{6})$/;

export const FONDO_CONJUNTO_TARJETAS_NOCHE = '#030712';
export const FONDO_CONJUNTO_TARJETAS_CLARO = '#f3f4f6';

export const PRESETS_FONDO_CONJUNTO_TARJETAS = [
  { id: 'negro', label: 'Negro', noche: '#030712', claro: '#f3f4f6' },
  { id: 'grafito', label: 'Grafito', noche: '#111827', claro: '#e5e7eb' },
  { id: 'pizarra', label: 'Pizarra', noche: '#1e293b', claro: '#f1f5f9' },
  { id: 'azul', label: 'Azul noche', noche: '#0b1220', claro: '#e0e7ff' },
  { id: 'verde', label: 'Verde cocina', noche: '#052e16', claro: '#ecfdf5' },
  { id: 'cafe', label: 'Café', noche: '#1c1410', claro: '#f5f0e8' },
];

/** Fondo del área donde viven las tarjetas KDS (no el de cada tarjeta). */
export function colorFondoConjuntoTarjetas(config = {}, nightMode = true) {
  const custom = nightMode ? config.fondoConjuntoTarjetas : config.fondoConjuntoTarjetasClaro;
  if (HEX_FONDO_TABLERO.test(String(custom || ''))) return custom;
  return nightMode ? FONDO_CONJUNTO_TARJETAS_NOCHE : FONDO_CONJUNTO_TARJETAS_CLARO;
}

export const getResumenConfiguracion = (config) => {
  const perfil = config.perfilActivo
    ? Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === config.perfilActivo)
    : null;
  return `
Configuración KDS v${config.version || 'N/A'}
${perfil ? `Perfil: ${perfil.nombre}` : 'Perfil: Personalizado'}
---
Tiempos: Amarillo ${config.alertYellowMinutes}min | Rojo ${config.alertRedMinutes}min
Vista: ${config.columnasGrid}x${config.filasGrid}/página | Fuente ${config.tamanoFuente}px | tarjetas fijas 300×500
  `.trim();
};

export const STORAGE_KEYS = {
  CONFIG: 'kdsConfig',
  CONFIG_VERSION: 'kdsConfigVersion',
  PLATO_STATES: 'platoStates',
  PLATOS_CHECKED: 'platosChecked',
  ZONA_ACTIVA: 'cocinaZonaActiva',
  VIEW_MODE: 'cocinaViewMode',
  LAST_CLEANUP: 'kdsLastCleanup',
  PERFILES_VISTA: 'kdsPerfilesVista',
};

export const LIMPIEZA_CONFIG = {
  KEYS_POR_VERSION: [STORAGE_KEYS.PLATO_STATES, STORAGE_KEYS.PLATOS_CHECKED],
  KEYS_POR_DIA: [STORAGE_KEYS.PLATO_STATES, STORAGE_KEYS.PLATOS_CHECKED],
  KEYS_POR_LOGOUT: [
    STORAGE_KEYS.CONFIG,
    STORAGE_KEYS.PLATO_STATES,
    STORAGE_KEYS.PLATOS_CHECKED,
    STORAGE_KEYS.ZONA_ACTIVA,
    STORAGE_KEYS.LAST_CLEANUP,
  ],
  INTERVALO_VERIFICACION_HORAS: 1,
};

export const ejecutarLimpieza = (tipo = 'manual') => {
  const resultado = { tipo, limpiado: [], timestamp: new Date().toISOString() };
  let keysALimpiar = [];
  switch (tipo) {
    case 'version': keysALimpiar = LIMPIEZA_CONFIG.KEYS_POR_VERSION; break;
    case 'dia': keysALimpiar = LIMPIEZA_CONFIG.KEYS_POR_DIA; break;
    case 'logout': keysALimpiar = LIMPIEZA_CONFIG.KEYS_POR_LOGOUT; break;
    case 'manual': keysALimpiar = [...LIMPIEZA_CONFIG.KEYS_POR_VERSION, ...LIMPIEZA_CONFIG.KEYS_POR_DIA]; break;
    default: return resultado;
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
  localStorage.setItem(STORAGE_KEYS.LAST_CLEANUP, resultado.timestamp);
  return resultado;
};

export const verificarNecesidadLimpieza = () => {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.CONFIG_VERSION);
  const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
  const lastCleanup = localStorage.getItem(STORAGE_KEYS.LAST_CLEANUP);

  if (storedVersion && storedVersion !== KDS_CONFIG_VERSION) {
    return { necesitaLimpieza: true, razon: `Versión cambió de ${storedVersion} a ${KDS_CONFIG_VERSION}`, tipo: 'version' };
  }
  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig);
      if (config.version && config.version !== KDS_CONFIG_VERSION) {
        return { necesitaLimpieza: true, razon: `Config versión ${config.version} obsoleta`, tipo: 'version' };
      }
    } catch (e) {
      return { necesitaLimpieza: true, razon: 'Configuración corrupta', tipo: 'version' };
    }
  }
  const platoStates = localStorage.getItem(STORAGE_KEYS.PLATO_STATES);
  if (platoStates && lastCleanup) {
    const cleanupDate = new Date(lastCleanup).toDateString();
    const today = new Date().toDateString();
    if (cleanupDate !== today) {
      return { necesitaLimpieza: true, razon: 'Cambio de día detectado', tipo: 'dia' };
    }
  }
  return { necesitaLimpieza: false, razon: null, tipo: null };
};

export default {
  KDS_CONFIG_VERSION,
  TIEMPOS_ALERTA,
  DISENO_GRID,
  MODO_VISTA,
  TAMANO_TARJETA,
  ALTURA_TARJETA_MODO,
  LAYOUT_COLUMNAS,
  DENSIDAD_PLATOS,
  ESPACIADO_GRID,
  PADDING_TARJETA,
  RADIO_TARJETA,
  ALINEACION_GRID,
  ALTURA_TARJETA_PX,
  GAP_GRID_PX,
  PADDING_TARJETA_PX,
  RADIO_TARJETA_PX,
  DENSIDAD_PLATOS_CSS,
  ORDENAMIENTO,
  PERFILES_PREDEFINIDOS,
  DEFAULT_KDS_CONFIG,
  STORAGE_KEYS,
  LIMPIEZA_CONFIG,
  buildKdsGridStyle,
  buildKdsCardStyle,
  validarConfiguracion,
  normalizarConfiguracion,
  aplicarPerfil,
  colorFondoConjuntoTarjetas,
  FONDO_CONJUNTO_TARJETAS_NOCHE,
  FONDO_CONJUNTO_TARJETAS_CLARO,
  PRESETS_FONDO_CONJUNTO_TARJETAS,
  getResumenConfiguracion,
  ejecutarLimpieza,
  verificarNecesidadLimpieza,
};
