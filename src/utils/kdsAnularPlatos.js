/**
 * Claves de plato en KDS: `${comandaId}-${platoIndex}` o `${comandaId}-${platoIndex}-g-${compId}`.
 * No usar split('-'): el índice va al final.
 */

export function parseClavePlatoKds(key) {
  if (key == null || key === '') return null;
  const raw = String(key);
  const base = raw.includes('-g-') ? raw.split('-g-')[0] : raw;
  const lastDash = base.lastIndexOf('-');
  if (lastDash <= 0) return null;
  const comandaId = base.substring(0, lastDash);
  const platoIndex = parseInt(base.substring(lastDash + 1), 10);
  if (!comandaId || Number.isNaN(platoIndex) || platoIndex < 0) return null;
  return { comandaId, platoIndex };
}

function recorrerClavesMarcadas(platosChecked, platoStates, visit) {
  (platosChecked || new Map()).forEach((checked, key) => {
    if (checked) visit(key);
  });
  (platoStates || new Map()).forEach((estado, key) => {
    if (estado === 'seleccionado' || estado === 'procesando' || estado === 'entregando' || estado === 'dejar') {
      visit(key);
    }
  });
}

export function indicesPlatosMarcadosKds(platosChecked, platoStates, comandaId) {
  const indices = new Set();
  recorrerClavesMarcadas(platosChecked, platoStates, (key) => {
    const parsed = parseClavePlatoKds(key);
    if (!parsed) return;
    if (comandaId != null && String(parsed.comandaId) !== String(comandaId)) return;
    indices.add(parsed.platoIndex);
  });
  return [...indices].sort((a, b) => a - b);
}

export function comandaIdDesdePlatosMarcados(platosChecked, platoStates) {
  const ids = new Set();
  recorrerClavesMarcadas(platosChecked, platoStates, (key) => {
    const parsed = parseClavePlatoKds(key);
    if (parsed) ids.add(String(parsed.comandaId));
  });
  if (ids.size === 1) return [...ids][0];
  return null;
}

/** Permiso de rol: Eliminar plato en KDS (roles.html → App Cocina). */
export const PERMISO_ELIMINAR_PLATOS_COCINA = 'eliminar-platos-cocina';

function platoDeClave(comandas, parsed) {
  if (!parsed) return null;
  const comanda = (comandas || []).find((c) => String(c._id) === String(parsed.comandaId));
  return comanda?.platos?.[parsed.platoIndex] || null;
}

/**
 * Visible solo con selección explícita:
 * - verde `seleccionado`
 * - recoger `entregando` (primer click en preparados)
 * - amarillo `procesando` solo si el plato NO está tomado (primer click libre)
 * No cuenta platos ya tomados en amarillo ni `dejar`.
 */
export function esEstadoSeleccionEliminarPlato(estado, plato) {
  if (estado === 'seleccionado' || estado === 'entregando') return true;
  if (estado === 'procesando' && !plato?.procesandoPor?.cocineroId) return true;
  return false;
}

function recorrerClavesSeleccionadas(platosChecked, platoStates, comandas, visit) {
  (platoStates || new Map()).forEach((estado, key) => {
    const parsed = parseClavePlatoKds(key);
    if (!parsed) return;
    if (esEstadoSeleccionEliminarPlato(estado, platoDeClave(comandas, parsed))) visit(key);
  });
  (platosChecked || new Map()).forEach((checked, key) => {
    if (!checked) return;
    const parsed = parseClavePlatoKds(key);
    if (!parsed) return;
    const estado = (platoStates || new Map()).get(key);
    if (estado && estado !== 'seleccionado') return;
    visit(key);
  });
}

export function indicesPlatosSeleccionadosKds(platosChecked, platoStates, comandaId, comandas) {
  const indices = new Set();
  recorrerClavesSeleccionadas(platosChecked, platoStates, comandas, (key) => {
    const parsed = parseClavePlatoKds(key);
    if (!parsed) return;
    if (comandaId != null && String(parsed.comandaId) !== String(comandaId)) return;
    indices.add(parsed.platoIndex);
  });
  return [...indices].sort((a, b) => a - b);
}

export function comandaIdDesdePlatosSeleccionados(platosChecked, platoStates, comandas) {
  const ids = new Set();
  recorrerClavesSeleccionadas(platosChecked, platoStates, comandas, (key) => {
    const parsed = parseClavePlatoKds(key);
    if (parsed) ids.add(String(parsed.comandaId));
  });
  if (ids.size === 1) return [...ids][0];
  return null;
}

export function haySeleccionEliminarPlatoKds(platosChecked, platoStates, comandas) {
  return indicesPlatosSeleccionadosKds(platosChecked, platoStates, null, comandas).length > 0;
}

export function resolverEliminarPlatosKds(platosChecked, platoStates, comandas) {
  const comandaId = comandaIdDesdePlatosSeleccionados(platosChecked, platoStates, comandas);
  if (!comandaId) {
    return { ok: false, error: 'Marque el plato a eliminar (un solo pedido).' };
  }
  const indices = indicesPlatosSeleccionadosKds(platosChecked, platoStates, comandaId, comandas);
  if (!indices.length) {
    return { ok: false, error: 'Marque el plato a eliminar.' };
  }
  return { ok: true, comandaId, indices };
}

export function resumenPlatosSeleccionadosKds(platosChecked, platoStates, comandas) {
  const r = resolverEliminarPlatosKds(platosChecked, platoStates, comandas);
  if (!r.ok) return [];
  const comanda = (comandas || []).find((c) => String(c._id) === String(r.comandaId));
  if (!comanda) return [];
  return r.indices.map((i) => {
    const p = comanda.platos?.[i];
    if (!p) return null;
    return {
      index: i,
      plato: p,
      cantidad: comanda.cantidades?.[i] || 1,
      comandaNumber: comanda.comandaNumber
    };
  }).filter(Boolean);
}
