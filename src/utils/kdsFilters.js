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
  // Validación defensiva: si no hay plato, no mostrar
  if (!plato || typeof plato !== 'object') {
    return false;
  }

  // Si no hay configuración ni zonas, mostrar todo
  if (!configCocinero && (!zonasAsignadas || zonasAsignadas.length === 0)) {
    return true;
  }

  // Ignorar platos eliminados (se muestran con estilo diferente)
  if (plato.eliminado === true || plato.estado === 'eliminado') {
    return true;
  }

  // Normalizar zonas a array
  const zonas = Array.isArray(zonasAsignadas) ? zonasAsignadas : [];

  // 1. Si hay zona activa específica, usar solo filtros de esa zona
  if (zonaActivaId) {
    const zonaActiva = zonas.find(z => 
      z && (z._id === zonaActivaId || z.id === zonaActivaId) && z.activo !== false
    );
    
    if (zonaActiva?.filtrosPlatos && Object.keys(zonaActiva.filtrosPlatos).length > 0) {
      return pasaFiltrosZonaPlato(plato, zonaActiva.filtrosPlatos);
    }
    // Si la zona activa no existe o está inactiva, continuar con lógica normal
  }

  // 2. Si hay zonas asignadas, verificar si pasa alguna zona (UNIÓN)
  if (zonas.length > 0) {
    const zonasActivas = zonas.filter(z => z && z.activo !== false);

    // Si hay zonas activas con filtros de platos, el plato debe pasar AL MENOS UNA
    const zonasConFiltros = zonasActivas.filter(z => 
      z.filtrosPlatos && typeof z.filtrosPlatos === 'object' && Object.keys(z.filtrosPlatos).length > 0
    );

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
  if (configCocinero?.filtrosPlatos && typeof configCocinero.filtrosPlatos === 'object' && Object.keys(configCocinero.filtrosPlatos).length > 0) {
    return pasaFiltrosZonaPlato(plato, configCocinero.filtrosPlatos);
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
  // Validación defensiva: si no hay comanda, no mostrar
  if (!comanda || typeof comanda !== 'object') {
    return false;
  }

  // Si no hay configuración ni zonas, mostrar todo
  if (!configCocinero && (!zonasAsignadas || zonasAsignadas.length === 0)) {
    return true;
  }

  // Normalizar zonas a array
  const zonas = Array.isArray(zonasAsignadas) ? zonasAsignadas : [];

  // 1. Si hay zona activa específica
  if (zonaActivaId) {
    const zonaActiva = zonas.find(z => 
      z && (z._id === zonaActivaId || z.id === zonaActivaId) && z.activo !== false
    );
    
    if (zonaActiva?.filtrosComandas && typeof zonaActiva.filtrosComandas === 'object' && Object.keys(zonaActiva.filtrosComandas).length > 0) {
      if (!pasaFiltrosZonaComanda(comanda, zonaActiva.filtrosComandas)) {
        return false;
      }
    }
  }

  // 2. Verificar zonas asignadas (UNIÓN)
  if (zonas.length > 0) {
    const zonasActivas = zonas.filter(z => z && z.activo !== false);
    const zonasConFiltros = zonasActivas.filter(z => 
      z.filtrosComandas && typeof z.filtrosComandas === 'object' && Object.keys(z.filtrosComandas).length > 0
    );

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
  if (configCocinero?.filtrosComandas && typeof configCocinero.filtrosComandas === 'object' && Object.keys(configCocinero.filtrosComandas).length > 0) {
    return pasaFiltrosZonaComanda(comanda, configCocinero.filtrosComandas);
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
  // Validación defensiva: si no hay comandas, retornar array vacío
  if (!Array.isArray(comandas)) {
    console.warn('[kdsFilters] aplicarFiltrosAComandas: comandas no es un array');
    return [];
  }

  // Si no hay configuración, retornar todas las comandas
  if (!cocineroConfig || typeof cocineroConfig !== 'object') {
    return comandas;
  }

  const { 
    filtrosComandas, 
    filtrosPlatos, 
    zonasAsignadas = [], 
    zonaActivaId = null 
  } = cocineroConfig;

  // Normalizar zonasAsignadas a array
  const zonas = Array.isArray(zonasAsignadas) ? zonasAsignadas : [];

  return comandas
    .filter(comanda => {
      // Validación defensiva: ignorar comandas null/undefined
      if (!comanda || typeof comanda !== 'object') {
        return false;
      }
      return debeMostrarComanda(comanda, { filtrosComandas }, zonas, zonaActivaId);
    })
    .map(comanda => {
      // Validación defensiva
      if (!comanda || !Array.isArray(comanda.platos)) {
        return comanda;
      }
      
      // Filtrar platos dentro de cada comanda
      const platosFiltrados = comanda.platos.filter(plato => {
        // Ignorar platos null/undefined
        if (!plato || typeof plato !== 'object') {
          return false;
        }
        return debeMostrarPlato(plato, { filtrosPlatos }, zonas, zonaActivaId);
      });

      return {
        ...comanda,
        platos: platosFiltrados,
        _platosOcultos: comanda.platos.length - platosFiltrados.length // Metadata para debugging
      };
    })
    .filter(comanda => {
      // Mantener comandas que tengan al menos un plato visible
      // O que estén en estado 'recoger'/'entregado' (para no perderlas de vista)
      if (comanda.platos && comanda.platos.length > 0) return true;
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
  // Validación defensiva
  if (!comanda || typeof comanda !== 'object') {
    return comanda;
  }
  if (!cocineroConfig || typeof cocineroConfig !== 'object') {
    return comanda;
  }
  if (!Array.isArray(comanda.platos)) {
    return comanda;
  }

  const { filtrosPlatos, zonasAsignadas = [], zonaActivaId = null } = cocineroConfig;
  const zonas = Array.isArray(zonasAsignadas) ? zonasAsignadas : [];

  const platosFiltrados = comanda.platos.filter(plato => {
    if (!plato || typeof plato !== 'object') {
      return false;
    }
    return debeMostrarPlato(plato, { filtrosPlatos }, zonas, zonaActivaId);
  });

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
 * @param {Object} plato - El plato a evaluar (puede tener estructura variable)
 * @param {Object} filtros - Filtros a aplicar
 * @returns {boolean} - true si el plato pasa los filtros
 */
function pasaFiltrosZonaPlato(plato, filtros) {
  // Validación defensiva: si no hay filtros o plato, mostrar
  if (!filtros || typeof filtros !== 'object' || Object.keys(filtros).length === 0) return true;
  if (!plato || typeof plato !== 'object') return true;

  const {
    modoInclusion = false,
    modoFiltro = 'todos', // Nuevo campo: 'todos', 'solo', 'no-ver'
    platosPermitidos = [],
    platosExcluidos = [],
    categoriasPermitidas = [],
    categoriasExcluidas = [],
    tiposPermitidos = [],
    tiposExcluidos = []
  } = filtros;

  // Determinar modo de filtro (compatibilidad con versiones anteriores)
  // modoFiltro: 'todos' = mostrar todo, 'solo' = inclusión, 'no-ver' = exclusión
  const esModoInclusion = modoFiltro === 'solo' || (modoFiltro === 'todos' && modoInclusion === true);
  const esModoExclusion = modoFiltro === 'no-ver';

  // Obtener datos del plato de forma segura
  // El plato puede venir en diferentes estructuras:
  // - { platoId, plato: { nombre, categoria, tipo } }
  // - { _id, plato: { _id, nombre, categoria, tipo } }
  // - { plato: { id, nombre, categoria, tipo } }
  const platoObj = plato.plato || {};
  
  // ID del plato (puede ser número o string)
  const platoId = plato.platoId ?? plato.id ?? plato._id ?? platoObj.id ?? platoObj._id ?? null;
  const platoIdStr = platoId != null ? String(platoId) : null;
  const platoIdNum = platoId != null && !isNaN(Number(platoId)) ? Number(platoId) : null;

  // Categoría del plato
  const categoria = (platoObj.categoria ?? plato.categoria ?? '').toString().trim();
  const categoriaLower = categoria.toLowerCase();

  // Tipo del plato
  const tipo = (platoObj.tipo ?? plato.tipo ?? '').toString().trim();
  const tipoLower = tipo.toLowerCase();

  // Nombre para logging
  const nombrePlato = platoObj.nombre ?? plato.nombre ?? 'Sin nombre';

  // Si no hay ningún filtro configurado, mostrar el plato
  const hayFiltrosDePlatos = platosPermitidos.length > 0 || platosExcluidos.length > 0;
  const hayFiltrosDeCategorias = categoriasPermitidas.length > 0 || categoriasExcluidas.length > 0;
  const hayFiltrosDeTipos = tiposPermitidos.length > 0 || tiposExcluidos.length > 0;
  
  if (!hayFiltrosDePlatos && !hayFiltrosDeCategorias && !hayFiltrosDeTipos) {
    return true;
  }

  // ===== MODO INCLUSIÓN (solo mostrar los que coinciden) =====
  if (esModoInclusion) {
    // Verificar coincidencias con cada tipo de filtro
    let coincidePlato = false;
    let coincideCategoria = false;
    let coincideTipo = false;

    // Verificar si coincide con algún plato permitido
    if (platosPermitidos.length > 0 && platoIdStr != null) {
      coincidePlato = platosPermitidos.some(id => {
        const idStr = String(id);
        return idStr === platoIdStr || (platoIdNum != null && id === platoIdNum);
      });
    }

    // Verificar si coincide con alguna categoría permitida
    if (categoriasPermitidas.length > 0 && categoria) {
      coincideCategoria = categoriasPermitidas.some(cat => {
        const catLower = String(cat).toLowerCase().trim();
        return catLower === categoriaLower;
      });
    }

    // Verificar si coincide con algún tipo permitido
    if (tiposPermitidos.length > 0 && tipo) {
      coincideTipo = tiposPermitidos.some(t => {
        const tLower = String(t).toLowerCase().trim();
        return tLower === tipoLower;
      });
    }

    // En modo inclusión: debe coincidir con AL MENOS UN filtro definido
    // Si hay filtros definidos, debe coincidir con alguno
    const hayFiltros = platosPermitidos.length > 0 || categoriasPermitidas.length > 0 || tiposPermitidos.length > 0;
    if (!hayFiltros) return true; // Sin filtros, mostrar todo
    
    const resultado = coincidePlato || coincideCategoria || coincideTipo;
    
    if (!resultado) {
      console.log(`[kdsFilters] Plato "${nombrePlato}" excluido por modo inclusión`, {
        platoId: platoIdStr,
        categoria,
        tipo,
        filtros: { platosPermitidos, categoriasPermitidas, tiposPermitidos }
      });
    }
    
    return resultado;
  }

  // ===== MODO EXCLUSIÓN (ocultar los que coinciden) =====
  if (esModoExclusion) {
    // Verificar si está excluido por plato
    let excluidoPorPlato = false;
    if (platosExcluidos.length > 0 && platoIdStr != null) {
      excluidoPorPlato = platosExcluidos.some(id => {
        const idStr = String(id);
        return idStr === platoIdStr || (platoIdNum != null && id === platoIdNum);
      });
    }
    // También verificar platosPermitidos para compatibilidad (en modo exclusión antiguo)
    if (!excluidoPorPlato && platosPermitidos.length > 0 && platoIdStr != null) {
      excluidoPorPlato = platosPermitidos.some(id => {
        const idStr = String(id);
        return idStr === platoIdStr || (platoIdNum != null && id === platoIdNum);
      });
    }

    // Verificar si está excluido por categoría
    let excluidoPorCategoria = false;
    if (categoriasExcluidas.length > 0 && categoria) {
      excluidoPorCategoria = categoriasExcluidas.some(cat => {
        const catLower = String(cat).toLowerCase().trim();
        return catLower === categoriaLower;
      });
    }
    // También verificar categoriasPermitidas para compatibilidad
    if (!excluidoPorCategoria && categoriasPermitidas.length > 0 && categoria) {
      excluidoPorCategoria = categoriasPermitidas.some(cat => {
        const catLower = String(cat).toLowerCase().trim();
        return catLower === categoriaLower;
      });
    }

    // Verificar si está excluido por tipo
    let excluidoPorTipo = false;
    if (tiposExcluidos.length > 0 && tipo) {
      excluidoPorTipo = tiposExcluidos.some(t => {
        const tLower = String(t).toLowerCase().trim();
        return tLower === tipoLower;
      });
    }
    // También verificar tiposPermitidos para compatibilidad
    if (!excluidoPorTipo && tiposPermitidos.length > 0 && tipo) {
      excluidoPorTipo = tiposPermitidos.some(t => {
        const tLower = String(t).toLowerCase().trim();
        return tLower === tipoLower;
      });
    }

    // Si coincide con cualquier exclusión, no mostrar
    if (excluidoPorPlato || excluidoPorCategoria || excluidoPorTipo) {
      console.log(`[kdsFilters] Plato "${nombrePlato}" excluido por modo exclusión`);
      return false;
    }

    return true;
  }

  // ===== MODO TODOS (mostrar todo, comportamiento por defecto) =====
  return true;
}

/**
 * Evalúa si una comanda pasa los filtros de una zona específica
 * @param {Object} comanda - La comanda a evaluar
 * @param {Object} filtros - Filtros a aplicar
 * @returns {boolean} - true si la comanda pasa los filtros
 */
function pasaFiltrosZonaComanda(comanda, filtros) {
  // Validación defensiva: si no hay filtros o comanda, mostrar
  if (!filtros || typeof filtros !== 'object' || Object.keys(filtros).length === 0) return true;
  if (!comanda || typeof comanda !== 'object') return true;

  const {
    areasPermitidas = [],
    areasExcluidas = [],
    mesasEspecificas = [],
    mesasExcluidas = [],
    soloPrioritarias = false,
    rangoHorario = null,
    modoAreas = 'todas', // 'todas', 'solo', 'excluir'
    mesaInicio = null,
    mesaFin = null,
    estadosPermitidos = [],
    minimoPlatos = null,
    maximoPlatos = null,
    tiempoMinimoCocina = null,
    tiempoMaximoCocina = null
  } = filtros;

  // ===== FILTRO POR ÁREA =====
  // Determinar el modo de filtro de áreas
  const usarFiltroAreas = modoAreas === 'solo' || modoAreas === 'excluir' || areasPermitidas.length > 0 || areasExcluidas.length > 0;
  
  if (usarFiltroAreas) {
    // Obtener información del área de forma segura
    const mesaInfo = comanda.mesas || {};
    const areaInfo = mesaInfo.area || {};
    
    // ID del área (puede ser string, ObjectId, o número)
    const areaId = areaInfo._id ?? areaInfo.id ?? areaInfo.areaId ?? mesaInfo.area ?? null;
    const areaIdStr = areaId != null ? String(areaId) : null;
    
    // Nombre del área
    const areaNombre = (areaInfo.nombre ?? areaInfo.name ?? '').toString().trim().toLowerCase();

    if (modoAreas === 'solo' || areasPermitidas.length > 0) {
      // Modo inclusión: solo mostrar si coincide con área permitida
      const areasAUsar = areasPermitidas.length > 0 ? areasPermitidas : [];
      if (areasAUsar.length > 0) {
        const pasaArea = areasAUsar.some(area => {
          const areaFiltro = String(area).toLowerCase().trim();
          // Coincidir por nombre o por ID
          if (areaIdStr && String(area).toLowerCase() === areaIdStr.toLowerCase()) return true;
          if (areaNombre && areaFiltro === areaNombre) return true;
          // También comparar con ObjectId si aplica
          if (areaId && area === areaId) return true;
          return false;
        });
        
        if (!pasaArea) {
          console.log(`[kdsFilters] Comanda #${comanda.comandaNumber} excluida por área`);
          return false;
        }
      }
    } else if (modoAreas === 'excluir' || areasExcluidas.length > 0) {
      // Modo exclusión: ocultar si coincide con área excluida
      const areasAExcluir = areasExcluidas.length > 0 ? areasExcluidas : [];
      if (areasAExcluir.length > 0) {
        const excluida = areasAExcluir.some(area => {
          const areaFiltro = String(area).toLowerCase().trim();
          if (areaIdStr && String(area).toLowerCase() === areaIdStr.toLowerCase()) return true;
          if (areaNombre && areaFiltro === areaNombre) return true;
          if (areaId && area === areaId) return true;
          return false;
        });
        
        if (excluida) {
          console.log(`[kdsFilters] Comanda #${comanda.comandaNumber} excluida por área (modo excluir)`);
          return false;
        }
      }
    }
  }

  // ===== FILTRO POR MESAS ESPECÍFICAS =====
  const usarFiltroMesas = mesasEspecificas.length > 0 || mesasExcluidas.length > 0 || mesaInicio != null || mesaFin != null;
  
  if (usarFiltroMesas) {
    const mesaInfo = comanda.mesas || {};
    const numMesa = mesaInfo.nummesa ?? mesaInfo.numero ?? mesaInfo.numMesa ?? null;
    
    // Filtro por rango de mesas (mesaInicio a mesaFin)
    if (mesaInicio != null || mesaFin != null) {
      const mesaNum = Number(numMesa);
      if (!isNaN(mesaNum)) {
        if (mesaInicio != null && mesaNum < Number(mesaInicio)) {
          return false;
        }
        if (mesaFin != null && mesaNum > Number(mesaFin)) {
          return false;
        }
      }
    }
    
    // Filtro por mesas específicas (inclusión)
    if (mesasEspecificas.length > 0) {
      if (numMesa === undefined || numMesa === null) {
        return false;
      }
      const numMesaNum = Number(numMesa);
      const pasaMesa = mesasEspecificas.some(m => {
        const mNum = Number(m);
        return !isNaN(mNum) && mNum === numMesaNum;
      });
      
      if (!pasaMesa) {
        return false;
      }
    }
    
    // Filtro por mesas excluidas
    if (mesasExcluidas.length > 0 && numMesa != null) {
      const numMesaNum = Number(numMesa);
      const excluida = mesasExcluidas.some(m => {
        const mNum = Number(m);
        return !isNaN(mNum) && mNum === numMesaNum;
      });
      
      if (excluida) {
        return false;
      }
    }
  }

  // ===== FILTRO POR PRIORIDAD =====
  if (soloPrioritarias === true) {
    const prioridad = comanda.prioridadOrden ?? comanda.prioridad ?? 0;
    if (prioridad <= 0) {
      return false;
    }
  }

  // ===== FILTRO POR ESTADOS DE COMANDA =====
  if (estadosPermitidos && estadosPermitidos.length > 0) {
    const estadoActual = (comanda.status ?? 'en_espera').toLowerCase();
    const estadoPermitido = estadosPermitidos.some(e => 
      String(e).toLowerCase() === estadoActual
    );
    if (!estadoPermitido) {
      return false;
    }
  }

  // ===== FILTRO POR CANTIDAD DE PLATOS =====
  const cantidadPlatos = (comanda.platos || []).length;
  
  if (minimoPlatos != null && cantidadPlatos < Number(minimoPlatos)) {
    return false;
  }
  if (maximoPlatos != null && cantidadPlatos > Number(maximoPlatos)) {
    return false;
  }

  // ===== FILTRO POR RANGO HORARIO =====
  if (rangoHorario && rangoHorario.inicio && rangoHorario.fin) {
    try {
      const ahora = moment().tz('America/Lima');
      const horaActual = ahora.format('HH:mm');

      // También considerar la hora de creación de la comanda
      const horaCreacion = moment(comanda.createdAt).tz('America/Lima').format('HH:mm');

      const dentroDelRango = horaActual >= rangoHorario.inicio && horaActual <= rangoHorario.fin;

      if (!dentroDelRango) {
        return false;
      }
    } catch (error) {
      console.warn('[kdsFilters] Error al verificar rango horario:', error.message);
      // En caso de error, no filtrar
    }
  }

  // ===== FILTRO POR TIEMPO EN COCINA =====
  if (tiempoMinimoCocina != null || tiempoMaximoCocina != null) {
    try {
      if (comanda.createdAt) {
        const ahora = moment().tz('America/Lima');
        const creacion = moment(comanda.createdAt).tz('America/Lima');
        const minutosEnCocina = ahora.diff(creacion, 'minutes');

        if (tiempoMinimoCocina != null && minutosEnCocina < Number(tiempoMinimoCocina)) {
          return false;
        }
        if (tiempoMaximoCocina != null && minutosEnCocina > Number(tiempoMaximoCocina)) {
          return false;
        }
      }
    } catch (error) {
      console.warn('[kdsFilters] Error al verificar tiempo en cocina:', error.message);
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
  // Validación defensiva
  const originales = Array.isArray(comandasOriginales) ? comandasOriginales : [];
  const filtradas = Array.isArray(comandasFiltradas) ? comandasFiltradas : [];

  const platosOriginales = originales.reduce((acc, c) => {
    const platosCount = Array.isArray(c?.platos) ? c.platos.length : 0;
    return acc + platosCount;
  }, 0);
  
  const platosFiltrados = filtradas.reduce((acc, c) => {
    const platosCount = Array.isArray(c?.platos) ? c.platos.length : 0;
    return acc + platosCount;
  }, 0);

  const comandasOcultas = Math.max(0, originales.length - filtradas.length);
  const platosOcultos = Math.max(0, platosOriginales - platosFiltrados);

  return {
    comandasOriginales: originales.length,
    comandasVisibles: filtradas.length,
    comandasOcultas,
    platosOriginales,
    platosVisibles: platosFiltrados,
    platosOcultos,
    porcentajeVisible: originales.length > 0
      ? Math.round((filtradas.length / originales.length) * 100)
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

  // Validación defensiva: normalizar localConfig
  const local = localConfig && typeof localConfig === 'object' ? localConfig : {};

  // Si no hay configuración del servidor, usar defaults + localStorage
  if (!serverConfig || typeof serverConfig !== 'object') {
    return { ...defaults, ...local };
  }

  // Normalizar arrays y objetos
  const zonasAsignadas = Array.isArray(serverConfig.zonasAsignadas) ? serverConfig.zonasAsignadas : [];
  const filtrosPlatos = serverConfig.filtrosPlatos && typeof serverConfig.filtrosPlatos === 'object' 
    ? serverConfig.filtrosPlatos 
    : {};
  const filtrosComandas = serverConfig.filtrosComandas && typeof serverConfig.filtrosComandas === 'object' 
    ? serverConfig.filtrosComandas 
    : {};
  const configTableroKDS = serverConfig.configTableroKDS && typeof serverConfig.configTableroKDS === 'object'
    ? serverConfig.configTableroKDS
    : {};

  // Combinar: servidor como base, localStorage como override para ciertos campos
  return {
    // Filtros del servidor (no sobrescribibles por usuario)
    filtrosPlatos,
    filtrosComandas,
    zonasAsignadas,

    // Configuración visual con override de localStorage
    alertYellowMinutes: local.alertYellowMinutes ||
      configTableroKDS.tiempoAmarillo ||
      defaults.alertYellowMinutes,

    alertRedMinutes: local.alertRedMinutes ||
      configTableroKDS.tiempoRojo ||
      defaults.alertRedMinutes,

    soundEnabled: local.soundEnabled ??
      configTableroKDS.sonidoNotificacion ??
      defaults.soundEnabled,

    nightMode: local.nightMode ??
      configTableroKDS.modoNocturno ??
      defaults.nightMode,

    maxTarjetasVisibles: configTableroKDS.maxTarjetasVisibles ||
      defaults.maxTarjetasVisibles,

    design: {
      fontSize: local.design?.fontSize ||
        configTableroKDS.tamanioFuente ||
        defaults.design.fontSize,
      cols: local.design?.cols ||
        configTableroKDS.columnasGrid ||
        defaults.design.cols,
      rows: local.design?.rows ||
        configTableroKDS.filasGrid ||
        defaults.design.rows
    },

    // Alias del cocinero
    aliasCocinero: serverConfig.aliasCocinero || '',

    // Estado de zona activa (localStorage)
    zonaActivaId: local.zonaActivaId || null
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
