/**
 * useCocinaMonitorFilter - Aplana y AGRUPA comandas en lista de platos pendientes
 *
 * v2.4: Agrupa por nombre + complementos idénticos (complementos distintos = filas separadas).
 *       Cronómetro desde procesandoPor.timestamp (cuando el cocinero toma el plato).
 *       Solo platos TOMADOS por un cocinero. Al finalizar (recoger) se reduce cantidad hasta 0.
 *
 * @module useCocinaMonitorFilter
 */

import { useMemo } from 'react';

// Platos tomados por un cocinero: su estado backend sigue siendo pedido/en_espera
// pero tienen procesandoPor set. Los que pasan a recoger/salio/entregado desaparecen.
const ESTADOS_NO_LISTOS = ['pedido', 'en_espera'];

/**
 * Devuelve timestamp del inicio del cronómetro del plato.
 * Prioriza el momento en que el cocinero tomó el plato (procesandoPor.timestamp).
 */
function obtenerTiempoInicio(plato) {
  if (plato.procesandoPor?.timestamp) return plato.procesandoPor.timestamp;
  const t = plato.tiempos || {};
  if (t.en_espera) return t.en_espera;
  if (t.pedido) return t.pedido;
  return plato.createdAt || plato.timestamp || null;
}

/**
 * Nombre normalizado del plato para agrupar.
 * Usa plato populado, nombre desnormalizado o platoId como respaldo.
 */
function obtenerNombrePlato(plato) {
  const nombre =
    plato.plato?.nombre ||
    plato.nombre ||
    plato.nombreOriginal ||
    (plato.platoId ? `Plato #${plato.platoId}` : null);
  return (nombre || 'Plato sin nombre').trim();
}

/**
 * ID estable del tipo de plato (mismo menú = mismo id).
 */
function obtenerPlatoTipoId(plato) {
  const id = plato.platoId ?? plato.plato?.id ?? plato.plato?._id;
  return id != null ? String(id) : '';
}

/**
 * Clave estable para agrupar complementos idénticos.
 * Solo grupo + opción (ignora precio/cantidad para no separar el mismo plato).
 */
function claveComplementos(plato) {
  const comps = plato.complementosSeleccionados || plato.complementos || [];
  if (!comps.length) return '';
  return comps
    .map(c => {
      if (typeof c === 'string') return c.trim().toLowerCase();
      const grupo = (c.grupo || '').trim().toLowerCase();
      const opcion = (c.opcion || c.nombre || '').trim().toLowerCase();
      return `${grupo}:${opcion}`;
    })
    .filter(Boolean)
    .sort()
    .join('|');
}

/**
 * Clave única de agrupación: tipo de plato + nombre + complementos + observaciones.
 */
function claveGrupoPlato(plato, nombre) {
  const platoTipoId = obtenerPlatoTipoId(plato);
  const nombreNorm = (nombre || '').trim().toLowerCase();
  const obs = (plato.observaciones || plato.nota || plato.notaEspecial || '').trim().toLowerCase();
  return `${platoTipoId}::${nombreNorm}::${claveComplementos(plato)}::${obs}`;
}

/** ID corto y estable para React key (evita colisiones con caracteres especiales). */
function grupoIdEstable(claveGrupo) {
  let h = 0;
  for (let i = 0; i < claveGrupo.length; i++) {
    h = ((h << 5) - h) + claveGrupo.charCodeAt(i);
    h |= 0;
  }
  return `grp-${(h >>> 0).toString(36)}`;
}

function platoCumpleVista(plato, vistaCocina) {
  if (!vistaCocina) return true;
  const f = vistaCocina.filtrosPlatos;
  if (!f) return true;

  const platoId = plato.platoId ?? plato.id ?? plato._id;
  const categorias = plato.categorias || (plato.categoria ? [plato.categoria] : []);
  const tipos = plato.tipos || (plato.tipo ? [plato.tipo] : []);

  const coincidePlato =
    !f.platosPermitidos || f.platosPermitidos.length === 0 ||
    f.platosPermitidos.some(id => Number(id) === Number(platoId));
  const coincideCategoria =
    !f.categoriasPermitidas || f.categoriasPermitidas.length === 0 ||
    categorias.some(c => f.categoriasPermitidas.includes(c));
  const coincideTipo =
    !f.tiposPermitidos || f.tiposPermitidos.length === 0 ||
    tipos.some(t => f.tiposPermitidos.includes(t));

  const cumple = coincidePlato && coincideCategoria && coincideTipo;
  return f.modoInclusion !== false ? cumple : !cumple;
}

function platoTomadoPorCocinero(plato) {
  const id = plato.procesandoPor?.cocineroId;
  return id != null && String(id).length > 0;
}

/**
 * Hook: transforma el array de comandas en una lista AGRUPADA por nombre de plato.
 *
 * Cada item del resultado es:
 *  {
 *    nombre,           // "Lomo Saltado"
 *    cantidadTotal,    // 5 (suma de todas las comandas)
 *    platos,           // array de platos individuales (para info de mesas, cocineros)
 *    tiempoInicio,     // timestamp del plato más antiguo del grupo (cronómetro)
 *    key,              // clave nombre + complementos + observaciones
 *    complementosKey,  // clave de complementos (para UI)
 *  }
 *
 * Platos con el mismo nombre pero complementos distintos quedan en filas separadas.
 *
 * @param {Array} comandas - Comandas del día
 * @param {Object|null} vistaCocina - Vista activa
 * @param {Object} ordenamiento - { criterio, direccion }
 * @returns {Array} Lista AGRUPADA de platos pendientes
 */
const useCocinaMonitorFilter = (comandas, vistaCocina = null, ordenamiento = null) => {
  const platosPendientes = useMemo(() => {
    // 1) Aplano todos los platos tomados y no listos
    const aplanados = [];
    for (const comanda of comandas) {
      if (!comanda.platos) continue;
      for (const plato of comanda.platos) {
        if (!ESTADOS_NO_LISTOS.includes(plato.estado)) continue;
        if (plato.anulado || plato.eliminado || plato.eliminar) continue;
        if (!platoTomadoPorCocinero(plato)) continue;
        if (vistaCocina && !platoCumpleVista(plato, vistaCocina)) continue;

        aplanados.push({
          plato,
          comanda,
          tiempoInicio: obtenerTiempoInicio(plato),
          nombre: obtenerNombrePlato(plato),
        });
      }
    }

    // 2) Agrupar por nombre + complementos idénticos (+ observaciones)
    const gruposMap = new Map();
    for (const item of aplanados) {
      const key = claveGrupoPlato(item.plato, item.nombre);
      const grupoId = grupoIdEstable(key);
      if (!gruposMap.has(key)) {
        gruposMap.set(key, {
          nombre: item.nombre,
          cantidadTotal: 0,
          platos: [],
          tiempoInicio: null,
          complementosKey: claveComplementos(item.plato),
          key,
          grupoId,
        });
      }
      const grupo = gruposMap.get(key);
      grupo.cantidadTotal += item.plato.cantidad || 1;
      grupo.platos.push(item);
      // El tiempo inicio del grupo es el más antiguo (menor timestamp)
      const t = item.tiempoInicio ? new Date(item.tiempoInicio).getTime() : null;
      if (t !== null) {
        if (grupo.tiempoInicio === null || t < new Date(grupo.tiempoInicio).getTime()) {
          grupo.tiempoInicio = item.tiempoInicio;
        }
      }
    }

    const grupos = Array.from(gruposMap.values());
    // v2.3: Safety - filtrar grupos sin platos o cantidad 0 (todos finalizados)
    // Cuando todos los platos de un nombre se finalizaron (recoger) o se liberaron,
    // el grupo desaparece de la lista automáticamente.
    const gruposValidos = grupos.filter(g => g.platos.length > 0 && g.cantidadTotal > 0);

    // 3) Ordenar grupos
    const criterio = ordenamiento?.criterio || 'prioridad';
    const dir = ordenamiento?.direccion === 'asc' ? 1 : -1;

    gruposValidos.sort((a, b) => {
      switch (criterio) {
        case 'tiempo': {
          const ta = a.tiempoInicio ? new Date(a.tiempoInicio).getTime() : 0;
          const tb = b.tiempoInicio ? new Date(b.tiempoInicio).getTime() : 0;
          return (ta - tb) * dir;
        }
        case 'prioridad': {
          // Prioridad = la máxima prioridad de las comandas del grupo
          const pa = Math.max(...a.platos.map(p => p.comanda.prioridadOrden || 0), 0);
          const pb = Math.max(...b.platos.map(p => p.comanda.prioridadOrden || 0), 0);
          const diff = pa - pb;
          if (diff !== 0) return diff * dir;
          const ta = a.tiempoInicio ? new Date(a.tiempoInicio).getTime() : 0;
          const tb = b.tiempoInicio ? new Date(b.tiempoInicio).getTime() : 0;
          return (ta - tb) * dir;
        }
        case 'alfabetico': {
          return a.nombre.localeCompare(b.nombre) * dir;
        }
        default:
          return 0;
      }
    });

    return gruposValidos;
  }, [comandas, vistaCocina, ordenamiento?.criterio, ordenamiento?.direccion]);

  return platosPendientes;
};

export default useCocinaMonitorFilter;
export {
  obtenerTiempoInicio,
  platoCumpleVista,
  platoTomadoPorCocinero,
  obtenerNombrePlato,
  claveComplementos,
  claveGrupoPlato,
  grupoIdEstable,
  obtenerPlatoTipoId,
  ESTADOS_NO_LISTOS,
};