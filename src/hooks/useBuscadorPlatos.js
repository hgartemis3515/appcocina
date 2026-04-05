/**
 * useBuscadorPlatos - Hook compartido para filtrado de platos
 * 
 * Filtra platos dentro de comandas por texto de búsqueda.
 * Usado por las tres variantes de ComandaStyle (General, Personalizada, Supervisor).
 * 
 * Mejoras v2.1:
 * - Muestra SOLO los platos que coinciden, no toda la comanda
 * - Sistema de puntuación de relevancia (coincidencias exactas primero)
 * - Sugerencias inteligentes con nombres de platos completos
 * - Corrección ortográfica con distancia de Levenshtein
 * - Contador preciso de platos encontrados
 * - Acepta término externo para sincronización con componente padre
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
 * Calcula distancia de Levenshtein entre dos strings
 * @param {string} a - Primer string
 * @param {string} b - Segundo string
 * @returns {number} Distancia de edición
 */
const levenshteinDistance = (a, b) => {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
};

/**
 * Calcula similitud entre dos strings (0-1)
 * @param {string} a - Primer string
 * @param {string} b - Segundo string
 * @returns {number} Similitud entre 0 y 1
 */
const calcularSimilitud = (a, b) => {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
};

/**
 * Calcula puntuación de relevancia para un plato
 * @param {string} nombrePlato - Nombre del plato
 * @param {string} termino - Término de búsqueda normalizado
 * @returns {Object} { puntuacion, tipoCoincidencia }
 */
const calcularPuntuacion = (nombrePlato, termino) => {
  const nombreNormalizado = normalizarTexto(nombrePlato);
  
  // Coincidencia exacta (mayor puntuación)
  if (nombreNormalizado === termino) return { puntuacion: 100, tipo: 'exacta' };
  
  // Empieza con el término
  if (nombreNormalizado.startsWith(termino)) return { puntuacion: 85, tipo: 'empieza' };
  
  // El término es una palabra completa en el nombre
  const palabras = nombreNormalizado.split(/\s+/);
  if (palabras.some(p => p === termino)) return { puntuacion: 75, tipo: 'palabra_completa' };
  
  // El término está al inicio de una palabra
  if (palabras.some(p => p.startsWith(termino))) return { puntuacion: 65, tipo: 'inicio_palabra' };
  
  // Coincidencia parcial (contiene el término)
  if (nombreNormalizado.includes(termino)) return { puntuacion: 55, tipo: 'contiene' };
  
  // Coincidencia fuzzy (caracteres en orden)
  let idx = 0;
  for (const char of nombreNormalizado) {
    if (idx < termino.length && char === termino[idx]) idx++;
  }
  if (idx === termino.length) return { puntuacion: 40, tipo: 'fuzzy' };
  
  // Coincidencia con corrección ortográfica (Levenshtein)
  const similitud = calcularSimilitud(nombreNormalizado, termino);
  if (similitud >= 0.7) {
    return { puntuacion: Math.round(similitud * 35), tipo: 'similar' };
  }
  
  // Verificar si alguna palabra es similar
  for (const palabra of palabras) {
    const simPalabra = calcularSimilitud(palabra, termino);
    if (simPalabra >= 0.7) {
      return { puntuacion: Math.round(simPalabra * 35), tipo: 'similar' };
    }
  }
  
  return { puntuacion: 0, tipo: 'ninguna' };
};

/**
 * Extrae nombres completos de platos para sugerencias
 * @param {Array} comandas - Lista de comandas
 * @returns {Array} Lista de nombres únicos de platos
 */
const extraerNombresPlatos = (comandas) => {
  const nombres = new Map(); // nombre normalizado -> nombre original
  
  comandas.forEach(comanda => {
    comanda.platos?.forEach(plato => {
      const nombre = plato.plato?.nombre || plato.nombre || '';
      if (nombre && nombre.trim().length >= 2) {
        const norm = normalizarTexto(nombre.trim());
        if (!nombres.has(norm)) {
          nombres.set(norm, nombre.trim());
        }
      }
    });
  });
  
  return nombres;
};

/**
 * Extrae palabras clave de los platos para sugerencias
 * @param {Array} comandas - Lista de comandas
 * @returns {Set} Conjunto de palabras únicas
 */
const extraerPalabrasClave = (comandas) => {
  const palabras = new Set();
  
  comandas.forEach(comanda => {
    comanda.platos?.forEach(plato => {
      const nombre = plato.plato?.nombre || plato.nombre || '';
      nombre.split(/\s+/).forEach(palabra => {
        const p = normalizarTexto(palabra);
        if (p.length >= 2) palabras.add(p);
      });
    });
  });
  
  return palabras;
};

/**
 * Genera sugerencias inteligentes basadas en el término de búsqueda
 * @param {string} termino - Término de búsqueda
 * @param {Map} nombresPlatos - Mapa de nombres de platos
 * @param {Set} palabrasClave - Conjunto de palabras clave
 * @returns {Array} Lista de sugerencias ordenadas por relevancia
 */
const generarSugerencias = (termino, nombresPlatos, palabrasClave) => {
  if (!termino || termino.length < 1) return [];
  
  const terminoNorm = normalizarTexto(termino.trim());
  const sugerencias = [];
  const yaAgregados = new Set();
  
  // 1. Nombres de platos que empiezan con el término (más relevantes)
  for (const [norm, original] of nombresPlatos) {
    if (norm.startsWith(terminoNorm) && !yaAgregados.has(original)) {
      sugerencias.push({ 
        texto: original, 
        tipo: 'nombre_completo',
        relevancia: 90 + (original.length <= 15 ? 10 : 0) // Priorizar nombres cortos
      });
      yaAgregados.add(original);
    }
  }
  
  // 2. Nombres de platos que contienen el término como palabra
  for (const [norm, original] of nombresPlatos) {
    const palabras = norm.split(/\s+/);
    if (palabras.some(p => p === terminoNorm) && !yaAgregados.has(original)) {
      sugerencias.push({ 
        texto: original, 
        tipo: 'nombre_completo',
        relevancia: 80
      });
      yaAgregados.add(original);
    }
  }
  
  // 3. Nombres de platos con palabras que empiezan con el término
  for (const [norm, original] of nombresPlatos) {
    const palabras = norm.split(/\s+/);
    if (palabras.some(p => p.startsWith(terminoNorm)) && !yaAgregados.has(original)) {
      sugerencias.push({ 
        texto: original, 
        tipo: 'nombre_completo',
        relevancia: 70
      });
      yaAgregados.add(original);
    }
  }
  
  // 4. Nombres de platos similares (corrección ortográfica)
  if (terminoNorm.length >= 3) {
    for (const [norm, original] of nombresPlatos) {
      if (yaAgregados.has(original)) continue;
      
      const similitud = calcularSimilitud(norm, terminoNorm);
      if (similitud >= 0.6) {
        sugerencias.push({ 
          texto: original, 
          tipo: 'similar',
          relevancia: Math.round(similitud * 60)
        });
        yaAgregados.add(original);
      }
    }
  }
  
  // 5. Palabras clave individuales que empiezan con el término
  for (const palabra of palabrasClave) {
    if (palabra.startsWith(terminoNorm) && !yaAgregados.has(palabra) && sugerencias.length < 10) {
      sugerencias.push({ 
        texto: palabra, 
        tipo: 'palabra',
        relevancia: 50
      });
      yaAgregados.add(palabra);
    }
  }
  
  // Ordenar por relevancia y limitar a 8 sugerencias
  return sugerencias
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, 8);
};

/**
 * Hook para filtrar platos dentro de comandas
 * 
 * @param {Array} comandas - Lista de comandas a filtrar
 * @param {string} terminoExterno - Término de búsqueda externo (opcional)
 * @returns {Object} Estado y funciones del buscador
 */
const useBuscadorPlatos = (comandas, terminoExterno = null) => {
  // Estado interno solo si no se proporciona término externo
  const [searchTermInterno, setSearchTermInterno] = useState('');
  
  // Usar término externo si se proporciona, sino usar interno
  const searchTerm = terminoExterno !== null ? terminoExterno : searchTermInterno;

  /**
   * Extrae nombres de platos y palabras clave para sugerencias
   */
  const nombresPlatos = useMemo(() => extraerNombresPlatos(comandas), [comandas]);
  const palabrasClave = useMemo(() => extraerPalabrasClave(comandas), [comandas]);

  /**
   * Filtra comandas y sus platos según término de búsqueda
   */
  const resultadoFiltrado = useMemo(() => {
    // Sin término de búsqueda, retornar todo SIN MODIFICAR
    if (!searchTerm || searchTerm.trim() === '') {
      return {
        comandasFiltradas: comandas,
        totalPlatosEncontrados: 0,
        hayFiltroActivo: false,
        sugerencias: []
      };
    }

    const terminoNormalizado = normalizarTexto(searchTerm.trim());
    let totalPlatos = 0;
    const comandasConResultados = [];

    // Procesar cada comanda
    for (const comanda of comandas) {
      if (!comanda.platos || comanda.platos.length === 0) continue;

      // Filtrar y puntuar platos de esta comanda
      const platosConPuntuacion = comanda.platos
        .map(plato => {
          const nombrePlato = plato.plato?.nombre || plato.nombre || '';
          const { puntuacion, tipo } = calcularPuntuacion(nombrePlato, terminoNormalizado);
          return { ...plato, _puntuacion: puntuacion, _tipoCoincidencia: tipo };
        })
        .filter(plato => plato._puntuacion > 0)
        .sort((a, b) => b._puntuacion - a._puntuacion);

      if (platosConPuntuacion.length > 0) {
        totalPlatos += platosConPuntuacion.length;
        comandasConResultados.push({
          ...comanda,
          platosFiltrados: platosConPuntuacion,
          tieneCoincidencias: true,
          _totalPlatosFiltrados: platosConPuntuacion.length
        });
      }
    }

    // Generar sugerencias siempre (para mostrar alternativas)
    const sugerencias = generarSugerencias(searchTerm.trim(), nombresPlatos, palabrasClave);

    return {
      comandasFiltradas: comandasConResultados,
      totalPlatosEncontrados: totalPlatos,
      hayFiltroActivo: true,
      sugerencias
    };
  }, [comandas, searchTerm, nombresPlatos, palabrasClave]);

  /**
   * Obtiene los platos a mostrar para una comanda específica
   */
  const getPlatosVisibles = useCallback((comanda) => {
    if (!resultadoFiltrado.hayFiltroActivo) {
      return comanda.platos || [];
    }
    return comanda.platosFiltrados || [];
  }, [resultadoFiltrado.hayFiltroActivo]);

  /**
   * Verifica si un plato específico coincide con la búsqueda
   */
  const platoCoincide = useCallback((plato) => {
    if (!resultadoFiltrado.hayFiltroActivo) return true;
    return plato._puntuacion > 0;
  }, [resultadoFiltrado.hayFiltroActivo]);

  /**
   * Limpia el término de búsqueda (solo si usa estado interno)
   */
  const limpiarBusqueda = useCallback(() => {
    setSearchTermInterno('');
  }, []);

  /**
   * Actualiza el término de búsqueda (solo si usa estado interno)
   */
  const actualizarBusqueda = useCallback((termino) => {
    setSearchTermInterno(termino);
  }, []);

  /**
   * Aplica una sugerencia como término de búsqueda (solo si usa estado interno)
   */
  const aplicarSugerencia = useCallback((sugerencia) => {
    setSearchTermInterno(sugerencia);
  }, []);

  return {
    searchTerm,
    actualizarBusqueda,
    limpiarBusqueda,
    aplicarSugerencia,
    comandasFiltradas: resultadoFiltrado.comandasFiltradas,
    totalPlatosEncontrados: resultadoFiltrado.totalPlatosEncontrados,
    hayFiltroActivo: resultadoFiltrado.hayFiltroActivo,
    sugerencias: resultadoFiltrado.sugerencias,
    getPlatosVisibles,
    platoCoincide
  };
};

export default useBuscadorPlatos;
