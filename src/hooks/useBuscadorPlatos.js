/**
 * useBuscadorPlatos - Hook compartido para filtrado de platos
 * 
 * Filtra platos dentro de comandas por texto de búsqueda.
 * Usado por las tres variantes de ComandaStyle (General, Personalizada, Supervisor).
 * 
 * @module useBuscadorPlatos
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Normaliza texto para comparación (quita tildes, pasa a minúsculas)
 * @param {string} texto - Texto a normalizar
 * @returns {string} Texto normalizado
 */
const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Hook para filtrar platos dentro de comandas
 * 
 * @param {Array} comandas - Lista de comandas a filtrar
 * @returns {Object} Estado y funciones del buscador
 */
const useBuscadorPlatos = (comandas) => {
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Filtra comandas y sus platos según término de búsqueda
   * 
   * Lógica:
   * - Si searchTerm está vacío, retorna todas las comandas sin modificar
   * - Si hay término, filtra platos dentro de cada comanda
   * - Solo muestra comandas que tienen al menos un plato que coincide
   */
  const resultadoFiltrado = useMemo(() => {
    // Sin término de búsqueda, retornar todo
    if (!searchTerm || searchTerm.trim() === '') {
      return {
        comandasFiltradas: comandas,
        totalPlatosEncontrados: 0,
        hayFiltroActivo: false
      };
    }

    const terminoNormalizado = normalizarTexto(searchTerm.trim());
    let totalPlatos = 0;

    // Filtrar cada comanda, conservando solo platos que coinciden
    const comandasConFiltro = comandas.map(comanda => {
      if (!comanda.platos || comanda.platos.length === 0) {
        return { ...comanda, platosFiltrados: [], tieneCoincidencias: false };
      }

      // Filtrar platos de esta comanda
      const platosFiltrados = comanda.platos.filter(plato => {
        const nombrePlato = plato.plato?.nombre || plato.nombre || '';
        const nombreNormalizado = normalizarTexto(nombrePlato);
        return nombreNormalizado.includes(terminoNormalizado);
      });

      totalPlatos += platosFiltrados.length;

      return {
        ...comanda,
        platosFiltrados,
        tieneCoincidencias: platosFiltrados.length > 0
      };
    }).filter(comanda => comanda.tieneCoincidencias);

    return {
      comandasFiltradas: comandasConFiltro,
      totalPlatosEncontrados: totalPlatos,
      hayFiltroActivo: true
    };
  }, [comandas, searchTerm]);

  /**
   * Obtiene los platos a mostrar para una comanda específica
   * Si hay filtro activo, usa platosFiltrados; si no, usa platos originales
   * 
   * @param {Object} comanda - Comanda a procesar
   * @returns {Array} Lista de platos a mostrar
   */
  const getPlatosVisibles = useCallback((comanda) => {
    if (!resultadoFiltrado.hayFiltroActivo) {
      return comanda.platos || [];
    }
    return comanda.platosFiltrados || [];
  }, [resultadoFiltrado.hayFiltroActivo]);

  /**
   * Limpia el término de búsqueda
   */
  const limpiarBusqueda = useCallback(() => {
    setSearchTerm('');
  }, []);

  /**
   * Actualiza el término de búsqueda
   * @param {string} termino - Nuevo término
   */
  const actualizarBusqueda = useCallback((termino) => {
    setSearchTerm(termino);
  }, []);

  return {
    searchTerm,
    actualizarBusqueda,
    limpiarBusqueda,
    comandasFiltradas: resultadoFiltrado.comandasFiltradas,
    totalPlatosEncontrados: resultadoFiltrado.totalPlatosEncontrados,
    hayFiltroActivo: resultadoFiltrado.hayFiltroActivo,
    getPlatosVisibles
  };
};

export default useBuscadorPlatos;
