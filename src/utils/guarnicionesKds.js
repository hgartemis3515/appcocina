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
  comps.forEach((comp, index) => {
    if (!comp || comp.eliminado) return;
    // Guarnición ya lista: desaparece de la tabla KDS / Ver Cocina como unidad
    // independiente. El principal se mantiene hasta que él también se finalice
    // (entonces expandir fusiona todo en una sola tarjeta).
    if (comp.estadoCocina === 'recoger') return;
    unidades.push({
      tipo: 'guarnicion',
      plato,            // el plato padre (para mesa, comanda, timers)
      comp,             // el subdoc del complemento
      // Fallback idx:N si el subdoc aún no tiene _id (legacy / socket incompleto).
      // Evita que el click de la tarjeta caiga al toggle del plato principal.
      compId: comp._id ? String(comp._id) : `idx:${index}`,
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
 * ¿La clave de estado KDS pertenece a una guarnición? (`${comandaId}-${idx}-g-${compId}`)
 */
export function esClaveGuarnicion(key) {
  return typeof key === 'string' && key.includes('-g-');
}

/** ISO usable por `calcularSegundos` (string, Date o {$date}). */
export function normalizarTimestampGuarnicion(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : v;
  }
  if (typeof v === 'object') {
    if (v.$date) return normalizarTimestampGuarnicion(v.$date);
    if (typeof v.toISOString === 'function') {
      try { return v.toISOString(); } catch (_) { /* noop */ }
    }
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Inicio del cronómetro de la guarnición (propia). Nunca hereda el del plato padre:
 * son tiempos de trabajo distintos.
 */
export function tiempoInicioGuarnicion(comp) {
  if (!comp) return null;
  return normalizarTimestampGuarnicion(
    comp.procesandoPor?.timestamp
    || comp.asignacionMeta?.timestamp
    || comp.procesadoPor?.tomadoEn
  );
}

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
      ...c,
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

/**
 * ¿El payload de socket es de una guarnición (no del plato padre)?
 * El backend manda complementoId + tipo:'guarnicion' en plato-procesando / plato-liberado.
 */
export function esEventoGuarnicion(payload) {
  if (!payload) return false;
  if (payload.complementoId) return true;
  const t = payload.tipo;
  return t === 'guarnicion'
    || t === 'GUARNICION_ACTUALIZADA'
    || t === 'GUARNICION_LIBERADA'
    || t === 'GUARNICION_TOMADA'
    || t === 'GUARNICION_FINALIZADA';
}

function coincideComplemento(comp, idx, complementoId) {
  const want = String(complementoId);
  if (comp._id && String(comp._id) === want) return true;
  const fallback = `idx:${idx}`;
  return fallback === want;
}

/**
 * Parchea SOLO el subdoc de guarnición. No toca platos[].estado ni
 * procesandoPor del padre (si lo hiciera, Ver Cocina Completo puede
 * vaciarse o marcar el principal como listo).
 */
/**
 * Guarniciones para el panel derecho de Ver Cocina.
 * Incluye las TOMADAS/ASIGNADAS aunque el plato padre no esté en la lista
 * de principales (el padre puede ser de otro cocinero o aún no tomado).
 * Si hay padresVisibles, también incluye extras pendientes de esos padres.
 */
export function recolectarGuarnicionesMonitor(comandas, opts = {}) {
  const { cocineroIdFiltrado = null, padresVisibles = null } = opts;
  const seen = new Set();
  const out = [];
  if (!Array.isArray(comandas)) return out;

  for (const comanda of comandas) {
    const platos = comanda.platos || [];
    for (let platoIndex = 0; platoIndex < platos.length; platoIndex++) {
      const plato = platos[platoIndex];
      if (!plato || plato.anulado || plato.eliminado || plato.eliminar) continue;
      const estado = plato.estado || '';
      if (estado && !['pedido', 'en_espera'].includes(estado)) continue;
      const comps = guarnicionesPendientes(plato);
      if (!comps.length) continue;
      const comandaId = String(comanda._id || comanda.id || '');
      const padreKey = `${comandaId}:${platoIndex}`;
      const padreVisible = padresVisibles instanceof Set && padresVisibles.has(padreKey);

      for (const comp of comps) {
        const tomada = !!(comp.procesandoPor && comp.procesandoPor.cocineroId);
        if (!tomada && !padreVisible) continue;
        if (cocineroIdFiltrado) {
          const gid = comp.procesandoPor && comp.procesandoPor.cocineroId;
          if (!gid || String(gid) !== String(cocineroIdFiltrado)) continue;
        }
        const cid = comp.compId || (comp._id ? String(comp._id) : `idx:${platoIndex}`);
        const key = `${comandaId}:${platoIndex}:${cid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ comanda, plato, platoIndex, comp });
      }
    }
  }
  return out;
}

export function aplicarEventoGuarnicion(comandas, payload) {
  if (!Array.isArray(comandas) || !payload) return comandas;
  const { comandaId, platoId, complementoId } = payload;
  if (!comandaId || !platoId || !complementoId) return comandas;

  const esLiberacion = payload.tipo === 'GUARNICION_LIBERADA'
    || payload.tipo === 'PLATO_LIBERADO';
  const estadoCocina = payload.estadoCocina
    || (esLiberacion ? 'pedido' : null);

  let changed = false;
  const next = comandas.map((comanda) => {
    if (String(comanda._id || comanda.id) !== String(comandaId)) return comanda;
    const platos = (comanda.platos || []).map((p) => {
      if (String(p._id || p.id) !== String(platoId)) return p;
      const comps = p.complementosSeleccionados || p.complementos;
      if (!Array.isArray(comps) || comps.length === 0) return p;
      const compsNext = comps.map((c, idx) => {
        if (!coincideComplemento(c, idx, complementoId)) return c;
        changed = true;
        if (esLiberacion) {
          return {
            ...c,
            estadoCocina: 'pedido',
            procesandoPor: { cocineroId: null, nombre: null, alias: null, timestamp: null }
          };
        }
        if (estadoCocina === 'recoger') {
          const tomadoEn = normalizarTimestampGuarnicion(
            c.procesandoPor?.timestamp || c.asignacionMeta?.timestamp || c.procesadoPor?.tomadoEn
          );
          return {
            ...c,
            estadoCocina: 'recoger',
            procesadoPor: payload.procesandoPor
              ? {
                  ...payload.procesandoPor,
                  timestamp: payload.timestamp || payload.procesandoPor.timestamp,
                  tomadoEn: tomadoEn || payload.procesandoPor.tomadoEn
                }
              : c.procesadoPor,
            procesandoPor: { cocineroId: null, nombre: null, alias: null, timestamp: null }
          };
        }
        const tsToma = normalizarTimestampGuarnicion(
          payload.procesandoPor?.timestamp
          || payload.timestamp
          || c.procesandoPor?.timestamp
          || c.asignacionMeta?.timestamp
        ) || new Date().toISOString();
        const pp = payload.procesandoPor || c.procesandoPor || {};
        return {
          ...c,
          estadoCocina: estadoCocina || 'en_espera',
          procesandoPor: { ...pp, timestamp: tsToma },
          asignacionMeta: {
            ...(c.asignacionMeta || {}),
            timestamp: c.asignacionMeta?.timestamp || tsToma
          }
        };
      });
      return { ...p, complementosSeleccionados: compsNext };
    });
    return { ...comanda, platos };
  });
  return changed ? next : comandas;
}
