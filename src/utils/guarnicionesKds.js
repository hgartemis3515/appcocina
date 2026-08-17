/**
 * guarnicionesKds.js — PLAN GUARNICIONES_SEPARADAS v1.1 §8
 *
 * Helper canónico para expandir un plato en unidades de trabajo de cocina:
 *   - { tipo: 'principal', plato }            → el plato padre (sin extras anidados si flag ON)
 *   - { tipo: 'guarnicion', plato, comp, compId, nombrePadre } → cada complemento
 *
 * Con flag OFF: devuelve solo el principal (la UI sigue pintando extras dentro de la tarjeta).
 * Con flag ON: el principal NO lista complementosSeleccionados; cada guarnición va
 * en su propia tarjeta con referencia al plato padre.
 */

/**
 * Normaliza `grupo::opcion` a clave canónica (trim + lowercase).
 * Debe coincidir con el backend (asignacionAutomaticaGuarnicionesService.normalizarGuarnicionKey).
 */
export function normalizarGuarnicionKey(grupo, opcion) {
  const g = (grupo || '').toString().trim().toLowerCase();
  const o = (opcion || '').toString().trim().toLowerCase();
  return `${g}::${o}`;
}

/**
 * ¿El plato tiene guarniciones separables? (flag ON + complementosSeleccionados no vacío)
 */
export function esGuarnicionSeparable(plato, flagOn) {
  if (!flagOn) return false;
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  return Array.isArray(comps) && comps.length > 0;
}

/**
 * Devuelve el nombre a mostrar del plato padre (alias de cocina si existe, si no nombre).
 */
export function nombrePlatoPadre(plato, usarAlias = true) {
  if (!plato) return '';
  if (usarAlias && plato.nombreCocina) return plato.nombreCocina;
  return plato.nombre || plato.plato?.nombre || '';
}

/**
 * Devuelve el nombre de la guarnición con referencia al padre.
 * Ej: "Papas fritas (Lomo Saltado)".
 */
export function nombreGuarnicionConPadre(comp, nombrePadre) {
  const opcion = Array.isArray(comp.opcion) ? comp.opcion.join(', ') : (comp.opcion || '');
  const cant = Number(comp.cantidad) || 1;
  const base = cant > 1 ? `${opcion} x${cant}` : opcion;
  if (!nombrePadre) return base;
  return `${base} (${nombrePadre})`;
}

/**
 * Devuelve SOLO el nombre de la guarnición (sin referencia al padre).
 * Ej: "Arroz". La cantidad la muestra la tarjeta principal vía props.cantidad.
 */
export function nombreGuarnicionSolo(comp) {
  const opcion = Array.isArray(comp.opcion) ? comp.opcion.join(', ') : (comp.opcion || '');
  return opcion || '';
}

/**
 * Expande un plato en unidades de trabajo.
 * @param {Object} plato - item de comanda.platos[i]
 * @param {Object} opts - { flagOn: bool, usarAlias: bool }
 * @returns {Array<{tipo, plato, comp?, compId?, nombrePadre?}>}
 *
 * PLAN v1.1.1 §9.3.3 — Fusión al cerrar:
 *   Mientras el plato está en preparación (estado pedido|en_espera), se parte en
 *   principal + guarniciones. Cuando el principal llega a recoger (o salio/
 *   entregado/pagado), NO se parte: se devuelve una sola tarjeta fusionada
 *   (el principal con sus extras visibles) para que el flujo de entrega lo
 *   gobierne el plato padre, igual que sin guarniciones separadas.
 */
export function expandirUnidadesTrabajo(plato, opts = {}) {
  if (!plato) return [];
  const { flagOn = false, usarAlias = true } = opts;
  const nombrePadre = nombrePlatoPadre(plato, usarAlias);

  if (!esGuarnicionSeparable(plato, flagOn)) {
    return [{ tipo: 'principal', plato, nombrePadre }];
  }

  // §9.3.3: si el principal ya está en recoger/salio/entregado/pagado, fusionar.
  // El plato padre es la fuente de verdad para mozos y caja.
  const estadoPlato = plato.estado || plato.plato?.estado;
  const ESTADOS_FUSION = ['recoger', 'salio', 'entregado', 'pagado'];
  if (estadoPlato && ESTADOS_FUSION.includes(estadoPlato)) {
    return [{ tipo: 'principal', plato, nombrePadre, fusionado: true }];
  }

  const unidades = [{ tipo: 'principal', plato, nombrePadre, ocultarComplementos: true }];
  const comps = plato.complementosSeleccionados || plato.complementos || [];
  comps.forEach((comp) => {
    if (!comp || comp.eliminado) return;
    unidades.push({
      tipo: 'guarnicion',
      plato,            // el plato padre (para mesa, comanda, timers)
      comp,             // el subdoc del complemento
      compId: comp._id ? String(comp._id) : null,
      nombrePadre,
      // §9.3: la tarjeta muestra solo el nombre de la guarnición (sin padre);
      // la relación visual la da la posición (debajo del principal) + el badge.
      nombreGuarnicion: nombreGuarnicionSolo(comp)
    });
  });
  return unidades;
}

/**
 * Clave de agrupación para KDS. Con flag ON, el principal se agrupa SIN extras
 * (no fusionar guarniciones de platos distintos). Cada guarnición se agrupa por
 * guarnicionKey + nombrePadre.
 */
export function claveAgrupacionUnidad(unidad, flagOn) {
  if (!unidad) return '';
  if (unidad.tipo === 'principal') {
    // Con flag ON, el principal se agrupa solo por nombre (sin extras en la clave).
    const p = unidad.plato;
    const base = (p?.nombreCocina || p?.nombre || p?.plato?.nombre || '') + (p?.notaEspecial || '');
    return flagOn ? `principal::${base}` : `principal::${base}::${(p?.complementosSeleccionados || []).map(c => c.grupo + c.opcion).join(',')}`;
  }
  if (unidad.tipo === 'guarnicion') {
    const key = normalizarGuarnicionKey(unidad.comp?.grupo, unidad.comp?.opcion);
    return `guarnicion::${key}::${unidad.nombrePadre}`;
  }
  return '';
}

/**
 * ¿La guarnición está atrasada respecto a su tiempo medio?
 * @returns {null|'alerta'|'critica'} null si no aplica
 */
export function estadoAlertaGuarnicion(comp, tiemposConfig) {
  if (!comp || !comp.procesandoPor?.timestamp) return null;
  const tiempoMedio = Number(comp.tiempoMedioPreparacion) || 0;
  if (!tiempoMedio) return null;
  const transcurrido = (Date.now() - new Date(comp.procesandoPor.timestamp).getTime()) / 1000;
  const umbralAlerta = (tiemposConfig?.umbralAlertaMultiplo || 1.5) * tiempoMedio;
  const umbralCritica = (tiemposConfig?.umbralCriticaMultiplo || 2) * tiempoMedio;
  if (transcurrido >= umbralCritica) return 'critica';
  if (transcurrido >= umbralAlerta) return 'alerta';
  return null;
}

/**
 * ¿Todas las guarniciones del plato están en `recoger`?
 * Si el plato no tiene complementos, devuelve true (no hay nada que esperar).
 */
export function todasGuarnicionesListas(plato) {
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  if (!Array.isArray(comps) || comps.length === 0) return true;
  return comps.every(c => !c || c.eliminado || c.estadoCocina === 'recoger');
}

/**
 * Devuelve las guarniciones pendientes (no recoger, no eliminadas).
 */
export function guarnicionesPendientes(plato) {
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  if (!Array.isArray(comps)) return [];
  return comps
    .filter(c => c && !c.eliminado && c.estadoCocina !== 'recoger')
    .map(c => ({
      compId: c._id ? String(c._id) : null,
      grupo: c.grupo,
      opcion: Array.isArray(c.opcion) ? c.opcion.join(', ') : c.opcion,
      estadoCocina: c.estadoCocina || 'pedido'
    }));
}

/**
 * Prioridad de la unidad de trabajo (VIP/refire/tiempoLimitado).
 * Reutilizable para platos principales y guarniciones.
 */
export function prioridadUnidad(comanda) {
  const et = comanda?.etiquetasPrioridad || {};
  if (et.refire) return 3;
  if (et.vip) return 2;
  if (et.tiempoLimitado) return 1;
  return 0;
}

export const TIPOS_UNIDAD = { PRINCIPAL: 'principal', GUARNICION: 'guarnicion' };
