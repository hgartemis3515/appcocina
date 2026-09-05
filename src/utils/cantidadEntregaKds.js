/**
 * Selector KDS: cuántas unidades entregar de una línea con cantidad > 1.
 */

import { esClaveGuarnicion } from './guarnicionesKds';
import { obtenerNombrePlato, obtenerNombreDisplayCocina } from './platoHelpers';

function parseClavePlatoPrincipal(key) {
  if (esClaveGuarnicion(key)) return null;
  const lastDashIndex = String(key).lastIndexOf('-');
  if (lastDashIndex === -1) return null;
  const comandaId = key.substring(0, lastDashIndex);
  const platoIndex = parseInt(key.substring(lastDashIndex + 1), 10);
  if (!comandaId || Number.isNaN(platoIndex)) return null;
  return { comandaId, platoIndex };
}

function maxLinea(comanda, plato, platoIndex) {
  const n = Number(comanda?.cantidades?.[platoIndex]);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const f = Number(plato?.cantidad);
  return Number.isFinite(f) && f > 0 ? Math.floor(f) : 1;
}

/**
 * Solo si hay exactamente una línea de plato (no guarnición) seleccionada y qty > 1.
 */
export function recolectarLineaCantidadUnica(platoStates, comandas = []) {
  const entries = platoStates instanceof Map ? platoStates : new Map(platoStates || []);
  const uniq = [];
  const seen = new Set();
  entries.forEach((estado, key) => {
    if (estado !== 'seleccionado' && estado !== 'entregando') return;
    const parsed = parseClavePlatoPrincipal(key);
    if (!parsed) return;
    const id = `${parsed.comandaId}-${parsed.platoIndex}`;
    if (seen.has(id)) return;
    seen.add(id);
    uniq.push({ key: id, ...parsed });
  });
  if (uniq.length !== 1) return null;
  const line = uniq[0];
  const comanda = comandas.find((c) => String(c._id) === String(line.comandaId));
  const plato = comanda?.platos?.[line.platoIndex];
  if (!plato) return null;
  const max = maxLinea(comanda, plato, line.platoIndex);
  if (max <= 1) return null;
  const nombre = obtenerNombreDisplayCocina(plato, { forzar: true }) || obtenerNombrePlato(plato) || 'Plato';
  return {
    key: line.key,
    comandaId: line.comandaId,
    platoIndex: line.platoIndex,
    plato,
    nombre,
    max
  };
}

export function clampCantidadEntrega(n, max) {
  const m = Math.max(1, Math.floor(Number(max) || 1));
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return m;
  return Math.min(m, Math.max(1, v));
}

/**
 * Al seleccionar, la cantidad es el máximo de la línea (p. ej. 5 panes → 5).
 * Solo baja si el operador restó en esa misma línea.
 */
export function cantidadEntregaMostrada(linea, ajuste) {
  if (!linea) return 1;
  if (ajuste && ajuste.key === linea.key && ajuste.value != null) {
    return clampCantidadEntrega(ajuste.value, linea.max);
  }
  return linea.max;
}

/** Adjunta cantidadEntregar solo si el operador bajó de la cantidad máxima. */
export function anexarCantidadEntrega(lote, info) {
  if (!info || !info.visible || info.key == null) return lote;
  const max = Number(info.max);
  if (!Number.isFinite(max) || max <= 1) return lote;
  const value = info.value == null ? max : clampCantidadEntrega(info.value, max);
  if (value >= max) return lote;
  if (!Array.isArray(lote) || lote.length === 0) return lote;
  return lote.map((p) => {
    const key = `${p.comandaId}-${p.platoIndex}`;
    if (key !== info.key) return p;
    return { ...p, cantidadEntregar: value };
  });
}
