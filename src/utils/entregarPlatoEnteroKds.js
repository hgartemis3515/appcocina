/**
 * Atajo KDS "Entregar plato entero".
 * Con config.cocina.entregarPlatoEnteroAbsoluto (default ON): recoger → salio → entregado.
 * Permiso de rol: entregar-plato-entero-kds.
 */

import { esClaveGuarnicion } from './guarnicionesKds';
import {
  comandasVisiblesTablaKds,
  esComandaTablaUnoODos,
  filtrarLoteRespetandoOrden,
  mapaIndiceTablaKds,
} from './ordenColaCocinero';

export const PERMISO_ENTREGAR_PLATO_ENTERO_KDS = 'entregar-plato-entero-kds';

const ESTADOS_A_FINALIZAR = new Set(['en_espera', 'ingresante', 'pedido', 'pendiente']);

export function botonEntregarPlatoEnteroHabilitado(modo, opts = {}) {
  if (modo === 'FINALIZAR_PLATO' || modo === 'ENTREGAR_PLATO') return true;
  if (opts.absoluto && opts.haySeleccion) {
    return modo === 'SIN_ACCION' || modo === 'SOLICITAR_ORDEN';
  }
  return false;
}

/** Puestos 1 y 2 de la tabla KDS: se puede entregar cualquier plato sin autorización. */
export function comandaPermiteEntregarTodos(comanda, comandas) {
  const mapa = mapaIndiceTablaKds(comandasVisiblesTablaKds(comandas));
  return esComandaTablaUnoODos(comanda, mapa);
}

export function puedeEntregarPlatoEnteroPorOrden(item, comandas, opts = {}) {
  const { bloqueados } = filtrarLoteRespetandoOrden(item ? [item] : [], comandas, opts);
  return bloqueados.length === 0;
}

/**
 * Prefijo contiguo #1..#N por cocinero (ej. 1+2 o 1..7) se entrega sin autorización.
 * Un salto (solo #2, o #1+#3 sin #2) queda bloqueado. Puestos 1 y 2 de la tabla KDS, libres.
 */
export function partirEntregaEnteraPorOrden(items, comandas, opts = {}) {
  const { finalizables, bloqueados } = filtrarLoteRespetandoOrden(items, comandas, opts);
  return { permitidos: finalizables, bloqueados };
}

function parseClavePlato(key) {
  const lastDashIndex = String(key).lastIndexOf('-');
  if (lastDashIndex === -1) return null;
  const comandaId = key.substring(0, lastDashIndex);
  const platoIndex = parseInt(key.substring(lastDashIndex + 1), 10);
  if (!comandaId || Number.isNaN(platoIndex)) return null;
  return { comandaId, platoIndex };
}

function parseClaveGuarnicion(key) {
  const parts = String(key).split('-g-');
  if (parts.length !== 2) return null;
  const base = parseClavePlato(parts[0]);
  if (!base) return null;
  return { ...base, compId: parts[1] };
}

function idPlato(plato) {
  return plato?._id?.toString() || plato?.plato?._id?.toString() || plato?.platoId?.toString() || null;
}

function tomadoPorOtro(plato, userId) {
  const mio = userId?.toString();
  const dueno = plato?.procesandoPor?.cocineroId?.toString();
  return !!(dueno && mio && dueno !== mio);
}

/**
 * @param {Map<string, string>|Iterable<[string, string]>} platoStates
 * @returns {{ aFinalizar: Array, aEntregar: Array, guarniciones: Array }}
 */
export function recolectarSeleccionEntregarEntero({
  platoStates,
  comandas = [],
  userId,
  isSupervisorView = false,
  permitirOtroCocinero = false
}) {
  const aFinalizar = [];
  const aEntregar = [];
  const guarniciones = [];
  const vistos = new Set();
  const entries = platoStates instanceof Map ? platoStates : new Map(platoStates || []);

  entries.forEach((estado, key) => {
    if (esClaveGuarnicion(key)) {
    if (estado !== 'seleccionado' && estado !== 'procesando') return;
      const parsed = parseClaveGuarnicion(key);
      if (!parsed) return;
      const comanda = comandas.find((c) => String(c._id) === String(parsed.comandaId));
      const plato = comanda?.platos?.[parsed.platoIndex];
      if (!plato) return;
      if (tomadoPorOtro(plato, userId) && !isSupervisorView && !permitirOtroCocinero) return;
      const platoId = idPlato(plato);
      if (!platoId) return;
      const comp = (plato.complementosSeleccionados || []).find(
        (c) => c._id && String(c._id) === String(parsed.compId)
      );
      if (!comp || comp.estadoCocina === 'recoger') return;
      guarniciones.push({
        comandaId: parsed.comandaId,
        platoId,
        platoIndex: parsed.platoIndex,
        compId: parsed.compId,
        plato
      });
      return;
    }

    const marcado = estado === 'seleccionado' || estado === 'entregando' || estado === 'procesando';
    if (!marcado) return;
    const parsed = parseClavePlato(key);
    if (!parsed) return;
    const uniqueKey = `${parsed.comandaId}-${parsed.platoIndex}`;
    if (vistos.has(uniqueKey)) return;
    const comanda = comandas.find((c) => String(c._id) === String(parsed.comandaId));
    const plato = comanda?.platos?.[parsed.platoIndex];
    if (!plato) return;
    if (tomadoPorOtro(plato, userId) && !isSupervisorView && !permitirOtroCocinero) return;
    const platoId = idPlato(plato);
    if (!platoId) return;
    vistos.add(uniqueKey);

    const item = {
      comandaId: parsed.comandaId,
      platoId,
      platoIndex: parsed.platoIndex,
      plato
    };

    if (ESTADOS_A_FINALIZAR.has(plato.estado)) {
      aFinalizar.push(item);
      return;
    }
    if (plato.estado === 'recoger') {
      aEntregar.push(item);
    }
  });

  return { aFinalizar, aEntregar, guarniciones };
}

function claveLimpieza(p) {
  return `${p.comandaId}-${p.platoIndex}`;
}

/**
 * Guarniciones → finalizar platos → salio (pass).
 */
export async function ejecutarEntregarPlatoEntero({
  aFinalizar = [],
  aEntregar = [],
  guarniciones = [],
  userId,
  finalizarGuarnicion,
  batchFinalizarPlatos,
  entregarPlato,
  filtrarLote,
  absoluto = false
}) {
  const omitidos = [];
  let lote = aFinalizar;
  if (typeof filtrarLote === 'function' && aFinalizar.length > 0) {
    const r = await filtrarLote(aFinalizar);
    lote = r?.lote || r?.finalizables || [];
    omitidos.push(...(r?.omitidos || r?.bloqueados || []));
  }

  if (typeof finalizarGuarnicion === 'function') {
    for (const g of guarniciones) {
      await finalizarGuarnicion(g);
    }
  }

  const paraSalio = [];
  const seen = new Set();
  const pushSalio = (p) => {
    const k = `${p.comandaId}-${p.platoId}`;
    if (seen.has(k)) return;
    seen.add(k);
    paraSalio.push(p);
  };
  aEntregar.forEach(pushSalio);

  const keysLimpiar = [];
  guarniciones.forEach((g) => keysLimpiar.push(`${g.comandaId}-${g.platoIndex}-g-${g.compId}`));

  if (absoluto) {
    const loteAbs = [];
    const seenAbs = new Set();
    const pushAbs = (p) => {
      const k = `${p.comandaId}-${p.platoId}`;
      if (seenAbs.has(k)) return;
      seenAbs.add(k);
      loteAbs.push(p);
    };
    lote.forEach(pushAbs);
    aEntregar.forEach(pushAbs);
    if (loteAbs.length > 0 && typeof batchFinalizarPlatos === 'function') {
      const { resultados = [] } = await batchFinalizarPlatos(loteAbs, { entregarEnteroAbsoluto: true });
      let exitosos = 0;
      let fallidos = 0;
      resultados.forEach((result) => {
        const value = result?.value || result;
        if (result?.status === 'rejected' || value?.exito === false) {
          fallidos += 1;
          return;
        }
        if (value?.exito) {
          exitosos += 1;
          keysLimpiar.push(claveLimpieza(value));
        }
      });
      return { exitosos, fallidos, omitidos, keysLimpiar: [...new Set(keysLimpiar)] };
    }
    return { exitosos: 0, fallidos: 0, omitidos, keysLimpiar: [...new Set(keysLimpiar)] };
  }

  if (lote.length > 0 && typeof batchFinalizarPlatos === 'function') {
    const { resultados = [] } = await batchFinalizarPlatos(lote);
    resultados.forEach((result) => {
      const value = result?.value || result;
      if (result?.status === 'rejected') return;
      if (value?.exito) {
        pushSalio({
          comandaId: value.comandaId,
          platoId: value.platoId,
          platoIndex: value.platoIndex
        });
        keysLimpiar.push(claveLimpieza(value));
      }
    });
  }

  let exitosos = 0;
  let fallidos = 0;
  if (typeof entregarPlato === 'function') {
    for (const p of paraSalio) {
          const r = await entregarPlato(p.comandaId, p.platoId, userId, p.cantidadEntregar);
      if (r?.success) {
        exitosos += 1;
        keysLimpiar.push(claveLimpieza(p));
      } else {
        fallidos += 1;
      }
    }
  }

  return { exitosos, fallidos, omitidos, keysLimpiar: [...new Set(keysLimpiar)] };
}
