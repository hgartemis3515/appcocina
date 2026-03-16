/**
 * Utilidades de filtrado para el tablero KDS
 * Aplica la configuración personal del cocinero a las comandas y platos
 */

/**
 * Aplica filtros de platos según la configuración del cocinero
 * @param {Array} platos - Array de platos de una comanda
 * @param {Object} filtrosPlatos - Configuración de filtros de platos
 * @returns {Array} Platos filtrados
 */
export const filtrarPlatos = (platos, filtrosPlatos) => {
  if (!filtrosPlatos || !platos || platos.length === 0) {
    return platos;
  }

  const {
    modoInclusion = true,
    platosPermitidos = [],
    categoriasPermitidas = [],
    tiposPermitidos = []
  } = filtrosPlatos;

  // Si no hay filtros configurados, mostrar todo
  if (platosPermitidos.length === 0 && categoriasPermitidas.length === 0 && tiposPermitidos.length === 0) {
    return platos;
  }

  return platos.filter(plato => {
    // Ignorar platos eliminados o anulados
    if (plato.eliminado || plato.anulado) {
      return true; // Siempre mostrar para auditoría
    }

    const platoId = plato.platoId || plato.plato?.id;
    const categoria = plato.plato?.categoria || plato.categoria;
    const tipo = plato.plato?.tipo || plato.tipo;

    let coincide = false;

    // Verificar por ID de plato
    if (platosPermitidos.length > 0 && platosPermitidos.includes(platoId)) {
      coincide = true;
    }

    // Verificar por categoría
    if (!coincide && categoriasPermitidos.length > 0 && categoriasPermitidas.includes(categoria)) {
      coincide = true;
    }

    // Verificar por tipo
    if (!coincide && tiposPermitidos.length > 0 && tiposPermitidos.includes(tipo)) {
      coincide = true;
    }

    // Si modoInclusion es true, solo mostrar los que coinciden
    // Si modoInclusion es false, mostrar los que NO coinciden
    return modoInclusion ? coincide : !coincide;
  });
};

/**
 * Aplica filtros de comandas según la configuración del cocinero
 * @param {Object} comanda - Comanda a filtrar
 * @param {Object} filtrosComandas - Configuración de filtros de comandas
 * @returns {boolean} true si la comanda debe mostrarse
 */
export const debeMostrarComanda = (comanda, filtrosComandas) => {
  if (!filtrosComandas) {
    return true;
  }

  const {
    areasPermitidas = [],
    mesasEspecificas = [],
    rangoHorario = { inicio: null, fin: null },
    soloPrioritarias = false
  } = filtrosComandas;

  // Verificar filtro de áreas
  if (areasPermitidas.length > 0) {
    const areaComanda = comanda.areaNombre || comanda.mesas?.areaNombre;
    if (!areasPermitidas.includes(areaComanda)) {
      return false;
    }
  }

  // Verificar filtro de mesas específicas
  if (mesasEspecificas.length > 0) {
    const mesaNumero = comanda.mesaNumero || comanda.mesas?.nummesa;
    if (!mesasEspecificas.includes(mesaNumero)) {
      return false;
    }
  }

  // Verificar filtro de horario
  if (rangoHorario.inicio && rangoHorario.fin) {
    const horaComanda = new Date(comanda.createdAt);
    const horaInicio = parseTimeString(rangoHorario.inicio);
    const horaFin = parseTimeString(rangoHorario.fin);
    
    if (horaInicio && horaFin) {
      const horaActual = horaComanda.getHours() * 60 + horaComanda.getMinutes();
      const inicioMin = horaInicio.hours * 60 + horaInicio.minutes;
      const finMin = horaFin.hours * 60 + horaFin.minutes;
      
      if (horaActual < inicioMin || horaActual > finMin) {
        return false;
      }
    }
  }

  // Verificar filtro de prioridad
  if (soloPrioritarias && !comanda.prioridadOrden) {
    return false;
  }

  return true;
};

/**
 * Parsea una cadena de tiempo en formato HH:mm
 * @param {string} timeStr - Cadena de tiempo
 * @returns {{hours: number, minutes: number}|null}
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  return { hours, minutes };
};

/**
 * Aplica todos los filtros a una lista de comandas
 * @param {Array} comandas - Lista de comandas
 * @param {Object} config - Configuración completa del cocinero
 * @returns {Array} Comandas filtradas
 */
export const aplicarFiltrosCompletos = (comandas, config) => {
  if (!config || !comandas || comandas.length === 0) {
    return comandas;
  }

  const { filtrosPlatos, filtrosComandas } = config;

  return comandas
    .filter(comanda => debeMostrarComanda(comanda, filtrosComandas))
    .map(comanda => {
      // Filtrar platos dentro de cada comanda
      const platosFiltrados = filtrarPlatos(comanda.platos, filtrosPlatos);
      
      return {
        ...comanda,
        platos: platosFiltrados,
        _platosOriginales: comanda.platos, // Guardar originales para referencia
        _filtrosAplicados: true
      };
    })
    .filter(comanda => {
      // Eliminar comandas que quedaron sin platos visibles
      const platosVisibles = comanda.platos.filter(p => !p.eliminado && !p.anulado);
      return platosVisibles.length > 0;
    });
};

/**
 * Cuenta platos ocultos por filtros
 * @param {Array} comandasOriginales - Comandas sin filtrar
 * @param {Array} comandasFiltradas - Comandas después de filtrar
 * @returns {Object} Estadísticas de filtrado
 */
export const calcularEstadisticasFiltrado = (comandasOriginales, comandasFiltradas) => {
  const platosOriginales = comandasOriginales.reduce((sum, c) => {
    return sum + c.platos.filter(p => !p.eliminado && !p.anulado).length;
  }, 0);

  const platosVisibles = comandasFiltradas.reduce((sum, c) => {
    return sum + c.platos.filter(p => !p.eliminado && !p.anulado).length;
  }, 0);

  return {
    comandasOriginales: comandasOriginales.length,
    comandasVisibles: comandasFiltradas.length,
    platosOriginales,
    platosVisibles,
    platosOcultos: platosOriginales - platosVisibles,
    comandasOcultas: comandasOriginales.length - comandasFiltradas.length
  };
};

/**
 * Obtiene la configuración por defecto del KDS
 * @returns {Object}
 */
export const getConfiguracionPorDefecto = () => ({
  aliasCocinero: null,
  filtrosPlatos: {
    modoInclusion: true,
    platosPermitidos: [],
    categoriasPermitidas: [],
    tiposPermitidos: []
  },
  filtrosComandas: {
    areasPermitidas: [],
    mesasEspecificas: [],
    rangoHorario: { inicio: null, fin: null },
    soloPrioritarias: false
  },
  configTableroKDS: {
    tiempoAmarillo: 15,
    tiempoRojo: 20,
    maxTarjetasVisibles: 20,
    modoAltoVolumen: false,
    sonidoNotificacion: true,
    modoNocturno: true,
    columnasGrid: 5,
    filasGrid: 1,
    tamanioFuente: 15
  }
});

export default {
  filtrarPlatos,
  debeMostrarComanda,
  aplicarFiltrosCompletos,
  calcularEstadisticasFiltrado,
  getConfiguracionPorDefecto
};
