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

import { platoCoincideCocineroFiltro } from './cocineroFiltroIds';
import { platoCoincideId, normalizarId } from './platoHelpers';
import { claveNombreComplemento } from './nombreComplementoCanonico';
import { obtenerCantidadLinea } from './numeracionTimersMonitor';

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
 * Complementos unidos al principal (sabores / detalle), no unidad KDS aparte.
 * True si el snapshot O el catálogo populado lo marca (el menú aplica a tickets abiertos).
 */
export function platoUneComplementos(plato) {
  if (!plato) return false;
  if (plato.complementosUnidosAlPlato === true) return true;
  const cat = plato.plato;
  return !!(cat && typeof cat === 'object' && cat.complementosUnidosAlPlato === true);
}

/**
 * ¿El plato tiene guarniciones separables? (flag ON + complementos + no unidos al plato)
 */
export function esGuarnicionSeparable(plato, flagOn) {
  if (!flagOn) return false;
  if (platoUneComplementos(plato)) return false;
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  return Array.isArray(comps) && comps.length > 0;
}

/**
 * Devuelve el nombre a mostrar del plato padre (alias de cocina si existe, si no nombre).
 */
export function nombrePlatoPadre(plato, usarAlias = true) {
  if (!plato) return '';
  if (usarAlias) {
    const alias = String(plato.plato?.nombreCocina || plato.nombreCocina || '').trim();
    if (alias) return alias;
  }
  return plato.plato?.nombre || plato.nombre || '';
}

/**
 * Devuelve el nombre de la guarnición con referencia al padre.
 * Ej: "Papas fritas (Lomo Saltado)".
 */
/** Guarniciones por unidad de plato × cantidad de la línea (`cantidades[i]` o `plato.cantidad`). */
export function cantidadGuarnicionEfectiva(comp, plato, comanda, platoIndex) {
  const porUnidad = Math.max(1, Number(comp?.cantidad) || 1);
  const nPlatos = comanda
    ? obtenerCantidadLinea(comanda, plato, platoIndex)
    : Math.max(1, Number(plato?.cantidad) || 1);
  return porUnidad * nPlatos;
}

export function platoConCantidadDeLinea(item) {
  const plato = item?.plato;
  if (!plato) return plato;
  const comanda = item?.comanda;
  if (!comanda) return plato;
  let idx = item.platoIndex;
  if ((idx == null || idx < 0) && Array.isArray(comanda.platos)) {
    idx = comanda.platos.indexOf(plato);
    if (idx < 0) {
      const pid = plato._id != null ? String(plato._id) : '';
      if (pid) idx = comanda.platos.findIndex((p) => p && String(p._id) === pid);
    }
  }
  const n = obtenerCantidadLinea(comanda, plato, idx);
  if (Number(plato.cantidad) === n) return plato;
  return { ...plato, cantidad: n };
}

export function nombreGuarnicionConPadre(comp, nombrePadre, plato, comanda, platoIndex) {
  const opcion = Array.isArray(comp.opcion) ? comp.opcion.join(', ') : (comp.opcion || '');
  const cant = cantidadGuarnicionEfectiva(comp, plato, comanda, platoIndex);
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
 * Texto bajo el plato principal (Ver Cocina / Distribuir): solo el nombre
 * de la opción ("Res"), nunca el grupo ("Sabores: Res").
 */
export function textoGuarnicionEnPrincipal(comp, plato, comanda, platoIndex) {
  if (comp == null) return '';
  if (typeof comp === 'string') return comp.trim();
  if (comp.eliminado) return '';
  const opcion = nombreGuarnicionSolo(comp) || String(comp.nombre || '').trim();
  if (!opcion) return '';
  const cant = cantidadGuarnicionEfectiva(comp, plato, comanda, platoIndex);
  return cant > 1 ? `${opcion} ×${cant}` : opcion;
}

/** Suma guarniciones de varias líneas (p. ej. grupo del monitor ×3 platos). */
export function textosGuarnicionesDeGrupo(items) {
  const map = new Map();
  for (const item of items || []) {
    const plato = item?.plato || item;
    const comanda = item?.comanda;
    let idx = item?.platoIndex;
    if ((idx == null || idx < 0) && comanda?.platos) {
      idx = comanda.platos.indexOf(plato);
      if (idx < 0) {
        const pid = plato._id != null ? String(plato._id) : '';
        if (pid) idx = comanda.platos.findIndex((p) => p && String(p._id) === pid);
      }
    }
    const comps = plato?.complementosSeleccionados || plato?.complementos || [];
    for (const c of comps) {
      if (!c || c.eliminado) continue;
      const opcion = nombreGuarnicionSolo(c) || String(c.nombre || '').trim();
      if (!opcion) continue;
      const key = claveNombreComplemento(opcion);
      const add = cantidadGuarnicionEfectiva(c, plato, comanda, idx);
      const prev = map.get(key);
      map.set(key, {
        opcion: (prev && prev.opcion) || opcion,
        cantidad: (prev ? prev.cantidad : 0) + add,
      });
    }
  }
  return [...map.values()].map(({ opcion, cantidad }) => (
    cantidad > 1 ? `${opcion} ×${cantidad}` : opcion
  ));
}

function catalogoComplementosDePlato(platoPadre) {
  if (!platoPadre) return [];
  const catalog = (platoPadre.plato && typeof platoPadre.plato === 'object')
    ? platoPadre.plato
    : platoPadre;
  return Array.isArray(catalog.complementos) ? catalog.complementos : [];
}

/** Pronombre vigente del menú (platos.html), emparejando grupo + opción. */
export function pronombreDesdeCatalogo(platoPadre, comp) {
  if (!comp) return '';
  const grupos = catalogoComplementosDePlato(platoPadre);
  if (!grupos.length) return '';
  const nombreOp = (Array.isArray(comp.opcion) ? (comp.opcion[0] || '') : (comp.opcion || '')).toString().trim().toLowerCase();
  if (!nombreOp) return '';
  const grupoKey = String(comp.grupo || '').trim().toLowerCase();
  const buscarEnGrupo = (grupo) => {
    const ops = Array.isArray(grupo && grupo.opciones) ? grupo.opciones : [];
    for (const op of ops) {
      if (op == null || typeof op === 'string') continue;
      const nom = String(op.nombre ?? op.opcion ?? '').trim().toLowerCase();
      if (nom === nombreOp) return String(op.pronombre || '').trim();
      if (claveNombreComplemento(nom) === claveNombreComplemento(nombreOp)) {
        return String(op.pronombre || '').trim();
      }
    }
    return '';
  };
  const grupoExact = grupos.find((g) => g && String(g.grupo || '').trim().toLowerCase() === grupoKey);
  if (grupoExact) {
    const p = buscarEnGrupo(grupoExact);
    if (p) return p;
  }
  for (const g of grupos) {
    const p = buscarEnGrupo(g);
    if (p) return p;
  }
  return '';
}

export function hidratarPronombreComplemento(comp, platoPadre) {
  if (!comp) return comp;
  const resolved = String(pronombreDesdeCatalogo(platoPadre, comp) || comp.pronombre || '').trim();
  if (resolved === String(comp.pronombre || '').trim()) return comp;
  return { ...comp, pronombre: resolved };
}

export function agrupacionGuarnicionesOn(flags = {}) {
  return flags.permitirGuarnicionesSeparadas !== false
    && flags.deshabilitarAgrupacionGuarniciones !== true;
}

/** Token de Personalizar para guarniciones. null/ausente = heredar del plato. */
export function tokenGuarnicion(config, key, fallback) {
  if (config && config.diferenciarDisenoGuarniciones === true && config[key] != null && config[key] !== '') {
    return config[key];
  }
  return fallback;
}

export function nombreCocinaComplemento(comp, platoPadre) {
  if (!comp) return '';
  const corto = (platoPadre ? pronombreDesdeCatalogo(platoPadre, comp) : '')
    || String(comp.pronombre || '').trim();
  if (corto) return corto;
  return nombreGuarnicionSolo(comp);
}

export function labelComplementoConCantidad(comp, plato, comanda, platoIndex) {
  const base = nombreCocinaComplemento(comp, plato);
  const cant = cantidadGuarnicionEfectiva(comp, plato, comanda, platoIndex);
  return cant > 1 ? `${base} x${cant}` : base;
}

export function tituloGrupoGuarniciones(comps, plato, comanda, platoIndex) {
  const list = (Array.isArray(comps) ? comps : []).filter(c => c && !c.eliminado);
  return list.map((c) => labelComplementoConCantidad(c, plato, comanda, platoIndex)).filter(Boolean).join(' + ');
}

export function formatearReferenciaPadre(nombrePadre, modo = 'de') {
  const n = (nombrePadre || '').toString().trim();
  if (!n || modo === 'ocultar') return '';
  if (modo === 'nuda') return n;
  if (modo === 'parentesis') return `(${n})`;
  return `de ${n}`;
}

export function labelsListaGuarniciones(comps, plato, comanda, platoIndex) {
  const list = (Array.isArray(comps) ? comps : []).filter(c => c && !c.eliminado && c.estadoCocina !== 'recoger');
  return list.map((c) => labelComplementoConCantidad(c, plato, comanda, platoIndex)).filter(Boolean).join(', ');
}

export function nombresListaGuarniciones(comps, plato, comanda, platoIndex) {
  const nombres = labelsListaGuarniciones(comps, plato, comanda, platoIndex);
  return nombres ? `- ${nombres}` : '';
}

export function lineaListaGuarniciones(comps, nombrePadre, modoRef = 'parentesis', plato, comanda, platoIndex) {
  const nombres = labelsListaGuarniciones(comps, plato, comanda, platoIndex);
  const ref = formatearReferenciaPadre(nombrePadre, modoRef);
  const cuerpo = [nombres, ref].filter(Boolean).join(' ');
  return cuerpo ? `- ${cuerpo}` : '';
}

export function esTipoGuarnicionKds(tipo) {
  return tipo === 'guarnicion' || tipo === 'grupo_guarniciones';
}

/** True si la unidad de guarnición está tomada por ese cocinero. */
export function unidadGuarnicionAsignadaA(unidad, cocineroId) {
  if (!unidad || !cocineroId) return false;
  const want = String(cocineroId);
  const ids = [];
  const push = (proc) => {
    const id = proc && proc.cocineroId;
    if (id) ids.push(String(id));
  };
  if (unidad.tipo === 'grupo_guarniciones') {
    (unidad.comps || []).forEach((c) => push(c && c.procesandoPor));
  }
  push(unidad.comp && unidad.comp.procesandoPor);
  return ids.includes(want);
}

/**
 * Vista KDS: juntar plato + guarniciones en una fila (default ON).
 * No toca expandirUnidadesTrabajo ni la asignación: si una cocinera tiene
 * la guarnición, esa fila sigue visible para ella.
 */
export function unidadesParaVistaKds(unidades, opts = {}) {
  const list = Array.isArray(unidades) ? unidades : [];
  if (opts.juntarVisual === false) return list;
  const cocineroId = opts.cocineroId ? String(opts.cocineroId) : '';
  const isSupervisor = opts.isSupervisorView === true;
  return list
    .filter((u) => {
      if (!esTipoGuarnicionKds(u && u.tipo)) return true;
      if (isSupervisor || !cocineroId) return false;
      return unidadGuarnicionAsignadaA(u, cocineroId);
    })
    .map((u) => {
      if (u.tipo === 'principal' && u.ocultarComplementos === true && u.fusionado !== true) {
        return { ...u, ocultarComplementos: false };
      }
      return u;
    });
}

/**
 * Expande un plato en unidades de trabajo.
 * @param {Object} plato - item de comanda.platos[i]
 * @param {Object} opts - { flagOn, agrupacionOn, usarAlias, comanda, platoIndex }
 */
export function expandirUnidadesTrabajo(plato, opts = {}) {
  if (!plato) return [];
  const { flagOn = false, agrupacionOn = false, usarAlias = true, comanda = null, platoIndex = -1 } = opts;
  const nPlatos = comanda
    ? obtenerCantidadLinea(comanda, plato, platoIndex)
    : Math.max(1, Number(plato?.cantidad) || 1);
  plato = plato.cantidad === nPlatos ? plato : { ...plato, cantidad: nPlatos };
  const nombrePadre = nombrePlatoPadre(plato, usarAlias);

  if (!esGuarnicionSeparable(plato, flagOn)) {
    return [{ tipo: 'principal', plato, nombrePadre }];
  }

  const estadoPlato = plato.estado || plato.plato?.estado;
  const ESTADOS_FUSION = ['recoger', 'salio', 'entregado', 'pagado'];
  if (estadoPlato && ESTADOS_FUSION.includes(estadoPlato)) {
    return [{ tipo: 'principal', plato, nombrePadre, fusionado: true }];
  }

  const unidades = [{ tipo: 'principal', plato, nombrePadre, ocultarComplementos: true }];
  const comps = plato.complementosSeleccionados || plato.complementos || [];
  const pendientes = [];
  comps.forEach((comp, index) => {
    if (!comp || comp.eliminado) return;
    if (comp.estadoCocina === 'recoger') return;
    const hidratado = hidratarPronombreComplemento(comp, plato);
    pendientes.push({
      comp: hidratado,
      index,
      compId: hidratado._id ? String(hidratado._id) : `idx:${index}`
    });
  });

  if (agrupacionOn && pendientes.length > 0) {
    const first = pendientes[0];
    unidades.push({
      tipo: 'grupo_guarniciones',
      plato,
      comp: first.comp,
      comps: pendientes.map((p) => p.comp),
      compIds: pendientes.map((p) => p.compId),
      compId: first.compId,
      nombrePadre,
      nombreGuarnicion: tituloGrupoGuarniciones(pendientes.map((p) => p.comp), plato, comanda, platoIndex),
      cantidadEfectiva: pendientes.reduce((s, p) => s + cantidadGuarnicionEfectiva(p.comp, plato, comanda, platoIndex), 0),
      grupoGuarnicionesId: String(plato._id || first.compId)
    });
    return unidades;
  }

  pendientes.forEach(({ comp, compId }) => {
    unidades.push({
      tipo: 'guarnicion',
      plato,
      comp,
      compId,
      nombrePadre,
      nombreGuarnicion: nombreCocinaComplemento(comp, plato),
      cantidadEfectiva: cantidadGuarnicionEfectiva(comp, plato, comanda, platoIndex),
    });
  });
  return unidades;
}

/**
 * Clave de agrupación para KDS. Si el plato se parte (flag ON y no unidos),
 * el principal se agrupa SIN extras. Si van unidos al plato, la clave incluye
 * los complementos (p. ej. sabores de pachamanca no se mezclan).
 */
export function claveAgrupacionUnidad(unidad, flagOn) {
  if (!unidad) return '';
  if (unidad.tipo === 'principal') {
    // Con flag ON, el principal se agrupa solo por nombre (sin extras en la clave).
    const p = unidad.plato;
    const base = (p?.nombreCocina || p?.nombre || p?.plato?.nombre || '') + (p?.notaEspecial || '');
    const splitKey = esGuarnicionSeparable(p, flagOn);
    return splitKey
      ? `principal::${base}`
      : `principal::${base}::${(p?.complementosSeleccionados || []).map(c => c.grupo + c.opcion).join(',')}`;
  }
  if (unidad.tipo === 'guarnicion') {
    const key = normalizarGuarnicionKey(unidad.comp?.grupo, unidad.comp?.opcion);
    return `guarnicion::${key}::${unidad.nombrePadre}`;
  }
  if (unidad.tipo === 'grupo_guarniciones') {
    const pid = unidad.plato?._id || unidad.grupoGuarnicionesId || '';
    return `grupo_guarniciones::${pid}`;
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
export function tiempoInicioGrupo(comps) {
  const list = Array.isArray(comps) ? comps : [];
  let min = null;
  for (const c of list) {
    const t = tiempoInicioGuarnicion(c);
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (!Number.isFinite(ms)) continue;
    if (min == null || ms < min) min = ms;
  }
  return min == null ? null : new Date(min).toISOString();
}

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
  if (platoUneComplementos(plato)) return true;
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  if (!Array.isArray(comps) || comps.length === 0) return true;
  return comps.every(c => !c || c.eliminado || c.estadoCocina === 'recoger');
}

/**
 * Devuelve las guarniciones pendientes (no recoger, no eliminadas).
 */
export function guarnicionesPendientes(plato) {
  if (platoUneComplementos(plato)) return [];
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  if (!Array.isArray(comps)) return [];
  return comps
    .filter(c => c && !c.eliminado && c.estadoCocina !== 'recoger')
    .map(c => {
      const hidratado = hidratarPronombreComplemento(c, plato);
      return {
        ...hidratado,
        compId: hidratado._id ? String(hidratado._id) : null,
        grupo: hidratado.grupo,
        opcion: Array.isArray(hidratado.opcion) ? hidratado.opcion.join(', ') : hidratado.opcion,
        estadoCocina: hidratado.estadoCocina || 'pedido'
      };
    });
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
  if (payload.complementoId || payload.compId) return true;
  if (Array.isArray(payload.complementoIds) && payload.complementoIds.length) return true;
  const t = payload.tipo;
  return t === 'guarnicion'
    || t === 'grupo_guarniciones'
    || t === 'GUARNICION_ACTUALIZADA'
    || t === 'GUARNICION_LIBERADA'
    || t === 'GUARNICION_TOMADA'
    || t === 'GUARNICION_FINALIZADA';
}

function idsComplementoDePayload(payload) {
  if (Array.isArray(payload.complementoIds) && payload.complementoIds.length) {
    return payload.complementoIds;
  }
  const one = payload.complementoId || payload.compId;
  return one ? [one] : [];
}

function coincideComplemento(comp, idx, complementoId) {
  const want = String(complementoId);
  if (comp._id && String(comp._id) === want) return true;
  if (comp.compId && String(comp.compId) === want) return true;
  if (comp.id != null && String(comp.id) === want) return true;
  return `idx:${idx}` === want;
}

/**
 * Guarniciones para el panel derecho de Ver Cocina Completo.
 * Solo extras TOMADAS (igual que el panel izquierdo con el plato).
 * Al Dejar (liberar + motivo) desaparecen; no se re-muestran por el padre visible.
 */
export function recolectarGuarnicionesMonitor(comandas, opts = {}) {
  const { cocineroIdFiltrado = null } = opts;
  const seen = new Set();
  const out = [];
  if (!Array.isArray(comandas)) return out;

  for (const comanda of comandas) {
    const platos = comanda.platos || [];
    for (let platoIndex = 0; platoIndex < platos.length; platoIndex++) {
      const plato = platos[platoIndex];
      if (!plato || plato.anulado || plato.eliminado || plato.eliminar) continue;
      if (platoUneComplementos(plato)) continue;
      const estado = plato.estado || '';
      if (estado && !['pedido', 'en_espera'].includes(estado)) continue;
      const comps = guarnicionesPendientes(plato);
      if (!comps.length) continue;
      const comandaId = String(comanda._id || comanda.id || '');

      for (const comp of comps) {
        const tomada = !!(comp.procesandoPor && comp.procesandoPor.cocineroId);
        if (!tomada) continue;
        if (cocineroIdFiltrado) {
          const gid = comp.procesandoPor && comp.procesandoPor.cocineroId;
          if (!platoCoincideCocineroFiltro(gid, cocineroIdFiltrado)) continue;
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

function idsComandaIguales(a, b) {
  const na = normalizarId(a);
  const nb = normalizarId(b);
  return !!(na && nb && na === nb);
}

function extraEnGrupo(comp) {
  return comp?.asignacionMeta?.regla === 'grupo';
}

/**
 * Parchea SOLO el subdoc de guarnición. No toca platos[].estado ni
 * procesandoPor del padre (si lo hiciera, Ver Cocina Completo puede
 * vaciarse o marcar el principal como listo).
 * Liberación grupal: si el extra tiene regla 'grupo' o el payload trae
 * varios ids / tipo grupo_guarniciones, se limpian TODAS las extras
 * pendientes de ese plato (si no, el grupo sigue visible hasta recargar).
 */
export function aplicarEventoGuarnicion(comandas, payload) {
  if (!Array.isArray(comandas) || !payload) return comandas;
  const { comandaId, platoId } = payload;
  const ids = idsComplementoDePayload(payload);
  if (!comandaId || !platoId || ids.length === 0) return comandas;

  const esLiberacion = payload.tipo === 'GUARNICION_LIBERADA'
    || payload.tipo === 'PLATO_LIBERADO';
  const estadoCocina = payload.estadoCocina
    || (esLiberacion ? 'pedido' : null);
  const esGrupoPayload = payload.tipo === 'grupo_guarniciones'
    || ids.length > 1;

  let changed = false;
  const next = comandas.map((comanda) => {
    if (!idsComandaIguales(comanda._id || comanda.id, comandaId)) return comanda;
    const platos = (comanda.platos || []).map((p) => {
      if (!platoCoincideId(p, platoId)) return p;
      const comps = p.complementosSeleccionados || p.complementos;
      if (!Array.isArray(comps) || comps.length === 0) return p;
      const matched = comps.filter((c, idx) => ids.some((id) => coincideComplemento(c, idx, id)));
      const expandirGrupo = esLiberacion && (esGrupoPayload || matched.some(extraEnGrupo));
      const compsNext = comps.map((c, idx) => {
        const hitId = ids.some((id) => coincideComplemento(c, idx, id));
        const hitGrupo = expandirGrupo && c && !c.eliminado && c.estadoCocina !== 'recoger';
        if (!hitId && !hitGrupo) return c;
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
            regla: (esGrupoPayload || extraEnGrupo(c)) ? 'grupo' : (c.asignacionMeta?.regla || 'guarnicion'),
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
