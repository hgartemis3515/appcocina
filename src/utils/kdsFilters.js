/**
 * kdsFilters.js - Módulo de filtros para KDS (Kitchen Display System)
 * 
 * Este módulo implementa la lógica de filtrado de comandas y platos
 * basándose en la configuración del cocinero y sus zonas asignadas.
 * 
 * @module kdsFilters
 * @version 1.0.0
 * @author Sistema Las Gambusinas
 */

import moment from 'moment-timezone';

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

/**
 * Determina si un plato debe mostrarse según la configuración del cocinero y sus zonas
 * 
 * Lógica de filtrado:
 * 1. Si hay zona activa específica → usar solo filtros de esa zona
 * 2. Si hay zonas asignadas → el plato debe pasar AL MENOS UNA zona (UNIÓN)
 * 3. Aplicar filtros propios del cocinero (restrictivos adicionales)
 * 
 * @param {Object} plato - El plato a evaluar
 * @param {Object} configCocinero - Configuración del cocinero
 * @param {Object} configCocinero.filtrosPlatos - Filtros de platos del cocinero
 * @param {Array} zonasAsignadas - Zonas asignadas al cocinero con sus filtros
 * @param {string|null} zonaActivaId - ID de zona específica seleccionada (opcional)
 * @returns {boolean} - true si el plato debe mostrarse
 */
export function debeMostrarPlato(plato, configCocinero, zonasAsignadas = [], zonaActivaId = null) {
  // Si no hay configuración, mostrar todo
  if (!configCocinero && (!zonasAsignadas || zonasAsignadas.length === 0)) {
    return true;
  }

  // Ignorar platos eliminados
  if (plato.eliminado === true || plato.estado === 'eliminado') {
    return true; // Los eliminados se muestran con estilo diferente, pero se muestran
  }

  const zonas = zonasAsignadas || [];

  // 1. Si hay zona activa específica, usar solo filtros de esa zona
  if (zonaActivaId) {
    const zonaActiva = zonas.find(z => z._id === zonaActivaId && z.activo !== false);
    if (zonaActiva?.filtrosPlatos) {
      return pasaFiltrosZonaPlato(plato, zonaActiva.filtrosPlatos);
    }
    // Si la zona activa no existe o está inactiva, continuar con lógica normal
  }

  // 2. Si hay zonas asignadas, verificar si pasa alguna zona (UNIÓN)
  if (zonas.length > 0) {
    const zonasActivas = zonas.filter(z => z.activo !== false);

    // Si hay zonas activas con filtros de platos, el plato debe pasar AL MENOS UNA
    const zonasConFiltros = zonasActivas.filter(z => z.filtrosPlatos && Object.keys(z.filtrosPlatos).length > 0);

    if (zonasConFiltros.length > 0) {
      const pasaAlgunaZona = zonasConFiltros.some(zona =>
        pasaFiltrosZonaPlato(plato, zona.filtrosPlatos)
      );

      if (!pasaAlgunaZona) {
        return false;
      }
    }
  }

  // 3. Aplicar filtros propios del cocinero (restrictivos adicionales)
  if (configCocinero?.filtrosPlatos && Object.keys(configCocinero.filtrosPlatos).length > 0) {
    return pasaFiltrosCocineroPlato(plato, configCocinero.filtrosPlatos);
  }

  return true;
}

/**
 * Determina si una comanda debe mostrarse según la configuración
 * 
 * @param {Object} comanda - La comanda a evaluar
 * @param {Object} configCocinero - Configuración del cocinero
 * @param {Object} configCocinero.filtrosComandas - Filtros de comandas del cocinero
 * @param {Array} zonasAsignadas - Zonas asignadas al cocinero
 * @param {string|null} zonaActivaId - ID de zona específica seleccionada
 * @returns {boolean} - true si la comanda debe mostrarse
 */
export function debeMostrarComanda(comanda, configCocinero, zonasAsignadas = [], zonaActivaId = null) {
  // Si no hay configuración, mostrar todo
  if (!configCocinero && (!zonasAsignadas || zonasAsignadas.length === 0)) {
    return true;
  }

  const zonas = zonasAsignadas || [];

  // 1. Si hay zona activa específica
  if (zonaActivaId) {
    const zonaActiva = zonas.find(z => z._id === zonaActivaId && z.activo !== false);
    if (zonaActiva?.filtrosComandas && Object.keys(zonaActiva.filtrosComandas).length > 0) {
      if (!pasaFiltrosZonaComanda(comanda, zonaActiva.filtrosComandas)) {
        return false;
      }
    }
  }

  // 2. Verificar zonas asignadas (UNIÓN)
  if (zonas.length > 0) {
    const zonasActivas = zonas.filter(z => z.activo !== false);
    const zonasConFiltros = zonasActivas.filter(z => z.filtrosComandas && Object.keys(z.filtrosComandas).length > 0);

    if (zonasConFiltros.length > 0) {
      const pasaAlgunaZona = zonasConFiltros.some(zona =>
        pasaFiltrosZonaComanda(comanda, zona.filtrosComandas)
      );

      if (!pasaAlgunaZona) {
        return false;
      }
    }
  }

  // 3. Aplicar filtros propios del cocinero
  if (configCocinero?.filtrosComandas && Object.keys(configCocinero.filtrosComandas).length > 0) {
    return pasaFiltrosCocineroComanda(comanda, configCocinero.filtrosComandas);
  }

  return true;
}

/**
 * Filtra una lista de comandas aplicando todos los filtros del cocinero
 * 
 * @param {Array} comandas - Lista de comandas a filtrar
 * @param {Object} cocineroConfig - Configuración completa del cocinero
 * @returns {Array} - Lista de comandas filtradas
 */
export function aplicarFiltrosAComandas(comandas, cocineroConfig) {
  if (!cocineroConfig) {
    return comandas;
  }

  const { filtrosComandas, filtrosPlatos, zonasAsignadas, zonaActivaId } = cocineroConfig;

  return comandas
    .filter(comanda => debeMostrarComanda(comanda, { filtrosComandas }, zonasAsignadas, zonaActivaId))
    .map(comanda => {
      // Filtrar platos dentro de cada comanda
      const platosFiltrados = comanda.platos?.filter(plato =>
        debeMostrarPlato(plato, { filtrosPlatos }, zonasAsignadas, zonaActivaId)
      ) || [];

      return {
        ...comanda,
        platos: platosFiltrados,
        _platosOcultos: (comanda.platos?.length || 0) - platosFiltrados.length // Metadata para debugging
      };
    })
    .filter(comanda => {
      // Mantener comandas que tengan al menos un plato visible
      // O que estén en estado 'recoger'/'entregado' (para no perderlas de vista)
      if (comanda.platos?.length > 0) return true;
      if (comanda.status === 'recoger' || comanda.status === 'entregado') return true;
      return false;
    });
}

/**
 * Filtra solo los platos de una comanda específica
 * Útil para actualizaciones granulares
 * 
 * @param {Object} comanda - La comanda
 * @param {Object} cocineroConfig - Configuración del cocinero
 * @returns {Object} - Comanda con platos filtrados
 */
export function filtrarPlatosDeComanda(comanda, cocineroConfig) {
  if (!cocineroConfig || !comanda.platos) {
    return comanda;
  }

  const { filtrosPlatos, zonasAsignadas, zonaActivaId } = cocineroConfig;

  const platosFiltrados = comanda.platos.filter(plato =>
    debeMostrarPlato(plato, { filtrosPlatos }, zonasAsignadas, zonaActivaId)
  );

  return {
    ...comanda,
    platos: platosFiltrados,
    _platosOcultos: comanda.platos.length - platosFiltrados.length
  };
}

// ============================================================
// FUNCIONES AUXILIARES DE FILTRADO
// ============================================================

/**
 * Evalúa si un plato pasa los filtros de una zona específica
 */
function pasaFiltrosZonaPlato(plato, filtros) {
  if (!filtros || Object.keys(filtros).length === 0) return true;

  const {
    modoInclusion = false,
    platosPermitidos = [],
    categoriasPermitidas = [],
    tiposPermitidos = []
  } = filtros;

  // Obtener datos del plato
  const platoId = plato.platoId || plato.id || plato._id || plato.plato?.id;
  const categoria = plato.plato?.categoria || plato.categoria || '';
  const tipo = plato.plato?.tipo || plato.tipo || '';

  // DEBUG: Mostrar datos del plato y filtros
  if (platosPermitidos.length > 0 || categoriasPermitidas.length > 0 || tiposPermitidos.length > 0) {
    console.log('[kdsFilters] Evaluando plato:', {
      nombre: plato.plato?.nombre || plato.nombre,
      platoId,
      categoria,
      tipo,
      modoInclusion,
      platosPermitidos,
      categoriasPermitidas,
      tiposPermitidos
    });
  }

  // Modo inclusión: solo mostrar los que coinciden con los filtros
  if (modoInclusion) {
    // Si no hay filtros definidos, mostrar todo
    if (platosPermitidos.length === 0 && categoriasPermitidas.length === 0 && tiposPermitidos.length === 0) {
      console.log('[kdsFilters] Modo inclusión sin filtros definidos - mostrando todo');
      return true;
    }

    const coincidePlato = platosPermitidos.length === 0 ||
      platosPermitidos.includes(Number(platoId)) ||
      platosPermitidos.includes(String(platoId));

    const coincideCategoria = categoriasPermitidas.length === 0 ||
      categoriasPermitidas.includes(categoria);

    const coincideTipo = tiposPermitidos.length === 0 ||
      tiposPermitidos.includes(tipo);

    const resultado = coincidePlato || coincideCategoria || coincideTipo;
    
    console.log('[kdsFilters] Modo inclusión - resultado:', resultado, {
      coincidePlato,
      coincideCategoria,
      coincideTipo
    });

    // En modo inclusión, debe coincidir con al menos un criterio si los hay definidos
    return resultado;
  }

  // Modo exclusión: ocultar los que coinciden con los filtros
  const estaEnPlatosExcluidos = platosPermitidos.length > 0 && (
    platosPermitidos.includes(Number(platoId)) ||
    platosPermitidos.includes(String(platoId))
  );

  const estaEnCategoriasExcluidas = categoriasPermitidas.length > 0 &&
    categoriasPermitidas.includes(categoria);

  const estaEnTiposExcluidos = tiposPermitidos.length > 0 &&
    tiposPermitidos.includes(tipo);

  // Si coincide con cualquier exclusión, no mostrar
  if (estaEnPlatosExcluidos || estaEnCategoriasExcluidas || estaEnTiposExcluidos) {
    console.log('[kdsFilters] Modo exclusión - plato excluido');
    return false;
  }

  return true;
}

/**
 * Evalúa si una comanda pasa los filtros de una zona específica
 */
function pasaFiltrosZonaComanda(comanda, filtros) {
  if (!filtros || Object.keys(filtros).length === 0) return true;

  const {
    areasPermitidas = [],
    mesasEspecificas = [],
    soloPrioritarias = false,
    rangoHorario = null
  } = filtros;

  // Filtro por área
  if (areasPermitidas.length > 0) {
    const areaComanda = comanda.mesas?.area?.nombre ||
      comanda.mesas?.area?.name ||
      comanda.mesas?.area ||
      '';
    const areaId = comanda.mesas?.area?._id || comanda.mesas?.area;

    const pasaArea = areasPermitidas.some(area =>
      area === areaComanda ||
      area === areaId ||
      (typeof area === 'string' && area.toLowerCase() === String(areaComanda).toLowerCase())
    );

    if (!pasaArea) {
      return false;
    }
  }

  // Filtro por mesas específicas
  if (mesasEspecificas.length > 0) {
    const numMesa = comanda.mesas?.nummesa || comanda.mesas?.numero;
    if (numMesa === undefined || !mesasEspecificas.includes(Number(numMesa))) {
      return false;
    }
  }

  // Filtro por prioridad
  if (soloPrioritarias === true) {
    if (!comanda.prioridadOrden || comanda.prioridadOrden <= 0) {
      return false;
    }
  }

  // Filtro por rango horario
  if (rangoHorario?.inicio && rangoHorario?.fin) {
    const ahora = moment().tz('America/Lima');
    const horaActual = ahora.format('HH:mm');

    // También considerar la hora de creación de la comanda
    const horaCreacion = moment(comanda.createdAt).tz('America/Lima').format('HH:mm');

    const dentroDelRango = horaActual >= rangoHorario.inicio && horaActual <= rangoHorario.fin;

    if (!dentroDelRango) {
      return false;
    }
  }

  return true;
}

/**
 * Evalúa si un plato pasa los filtros propios del cocinero
 * Mismos criterios que zona pero aplicados por el cocinero
 */
function pasaFiltrosCocineroPlato(plato, filtros) {
  return pasaFiltrosZonaPlato(plato, filtros);
}

/**
 * Evalúa si una comanda pasa los filtros propios del cocinero
 */
function pasaFiltrosCocineroComanda(comanda, filtros) {
  return pasaFiltrosZonaComanda(comanda, filtros);
}

// ============================================================
// ESTADÍSTICAS Y DEBUG
// ============================================================

/**
 * Calcula estadísticas de filtrado para debugging
 * 
 * @param {Array} comandasOriginales - Lista original de comandas
 * @param {Array} comandasFiltradas - Lista filtrada de comandas
 * @returns {Object} - Estadísticas del filtrado
 */
export function calcularEstadisticasFiltrado(comandasOriginales, comandasFiltradas) {
  const platosOriginales = comandasOriginales.reduce((acc, c) => acc + (c.platos?.length || 0), 0);
  const platosFiltrados = comandasFiltradas.reduce((acc, c) => acc + (c.platos?.length || 0), 0);

  const comandasOcultas = Math.max(0, comandasOriginales.length - comandasFiltradas.length);
  const platosOcultos = Math.max(0, platosOriginales - platosFiltrados);

  return {
    comandasOriginales: comandasOriginales.length,
    comandasVisibles: comandasFiltradas.length,
    comandasOcultas,
    platosOriginales,
    platosVisibles: platosFiltrados,
    platosOcultos,
    porcentajeVisible: comandasOriginales.length > 0
      ? Math.round((comandasFiltradas.length / comandasOriginales.length) * 100)
      : 100
  };
}

/**
 * Genera un reporte de filtrado para logging
 * 
 * @param {Object} config - Configuración del cocinero
 * @param {Object} stats - Estadísticas de filtrado
 * @returns {string} - Reporte formateado
 */
export function generarReporteFiltrado(config, stats) {
  const lineas = [
    '📊 REPORTE DE FILTRADO KDS',
    '─'.repeat(40),
    `Cocinero: ${config?.aliasCocinero || 'Sin alias'}`,
    `Zonas asignadas: ${config?.zonasAsignadas?.length || 0}`,
    `Zona activa: ${config?.zonaActivaId || 'Todas'}`,
    '',
    'RESULTADOS:',
    `  Comandas: ${stats.comandasVisibles}/${stats.comandasOriginales} visibles (${stats.porcentajeVisible}%)`,
    `  Platos: ${stats.platosVisibles}/${stats.platosOriginales} visibles`,
    `  Ocultos: ${stats.comandasOcultas} comandas, ${stats.platosOcultos} platos`,
    '─'.repeat(40)
  ];

  return lineas.join('\n');
}

// ============================================================
// UTILIDADES DE CONFIGURACIÓN
// ============================================================

/**
 * Combina configuración del servidor con preferencias locales
 * 
 * @param {Object} serverConfig - Configuración del backend
 * @param {Object} localConfig - Configuración de localStorage
 * @returns {Object} - Configuración efectiva combinada
 */
export function getConfiguracionEfectiva(serverConfig, localConfig = {}) {
  // Valores por defecto
  const defaults = {
    alertYellowMinutes: 15,
    alertRedMinutes: 20,
    soundEnabled: true,
    nightMode: true,
    design: { fontSize: 15, cols: 5, rows: 1 },
    maxTarjetasVisibles: 20
  };

  // Si no hay configuración del servidor, usar defaults + localStorage
  if (!serverConfig) {
    return { ...defaults, ...localConfig };
  }

  // Combinar: servidor como base, localStorage como override para ciertos campos
  return {
    // Filtros del servidor (no sobrescribibles por usuario)
    filtrosPlatos: serverConfig.filtrosPlatos || {},
    filtrosComandas: serverConfig.filtrosComandas || {},
    zonasAsignadas: serverConfig.zonasAsignadas || [],

    // Configuración visual con override de localStorage
    alertYellowMinutes: localConfig.alertYellowMinutes ||
      serverConfig.configTableroKDS?.tiempoAmarillo ||
      defaults.alertYellowMinutes,

    alertRedMinutes: localConfig.alertRedMinutes ||
      serverConfig.configTableroKDS?.tiempoRojo ||
      defaults.alertRedMinutes,

    soundEnabled: localConfig.soundEnabled ??
      serverConfig.configTableroKDS?.sonidoNotificacion ??
      defaults.soundEnabled,

    nightMode: localConfig.nightMode ??
      serverConfig.configTableroKDS?.modoNocturno ??
      defaults.nightMode,

    maxTarjetasVisibles: serverConfig.configTableroKDS?.maxTarjetasVisibles ||
      defaults.maxTarjetasVisibles,

    design: {
      fontSize: localConfig.design?.fontSize ||
        serverConfig.configTableroKDS?.tamanioFuente ||
        defaults.design.fontSize,
      cols: localConfig.design?.cols ||
        serverConfig.configTableroKDS?.columnasGrid ||
        defaults.design.cols,
      rows: localConfig.design?.rows ||
        serverConfig.configTableroKDS?.filasGrid ||
        defaults.design.rows
    },

    // Alias del cocinero
    aliasCocinero: serverConfig.aliasCocinero || '',

    // Estado de zona activa (localStorage)
    zonaActivaId: localConfig.zonaActivaId || null
  };
}

/**
 * Extrae la configuración de tablero KDS para el ConfigModal
 * 
 * @param {Object} configEfectiva - Configuración efectiva combinada
 * @returns {Object} - Configuración para el modal
 */
export function getConfigParaModal(configEfectiva) {
  return {
    alertYellowMinutes: configEfectiva.alertYellowMinutes,
    alertRedMinutes: configEfectiva.alertRedMinutes,
    soundEnabled: configEfectiva.soundEnabled,
    nightMode: configEfectiva.nightMode,
    design: configEfectiva.design,
    // Indicadores de origen
    _tieneConfigServidor: !!(configEfectiva.filtrosPlatos || configEfectiva.zonasAsignadas?.length > 0),
    _zonasAsignadas: configEfectiva.zonasAsignadas || []
  };
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  debeMostrarPlato,
  debeMostrarComanda,
  aplicarFiltrosAComandas,
  filtrarPlatosDeComanda,
  calcularEstadisticasFiltrado,
  generarReporteFiltrado,
  getConfiguracionEfectiva,
  getConfigParaModal
};
