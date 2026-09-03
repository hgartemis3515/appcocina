/**
 * KDS: platos/guarniciones en proceso seleccionados (verde) para pasar a backup.
 */

import { esClaveGuarnicion } from './guarnicionesKds';
import { unidadTieneSiguienteBackup } from './asignacionBackupMatch';

const ESTADOS_PROCESO = new Set(['en_espera', 'ingresante', 'pedido']);

export function esUnidadEnProceso(item) {
  if (!item) return false;
  if (item.tipo === 'guarnicion' || item.comp) {
    const proc = item.procesandoPor || item.comp?.procesandoPor;
    if (!proc?.cocineroId) return false;
    const e = String(item.estadoBackend || item.comp?.estadoCocina || 'en_espera').toLowerCase();
    return e !== 'recoger' && e !== 'salio' && e !== 'entregado' && e !== 'pagado';
  }
  const proc = item.procesandoPor || item.plato?.procesandoPor;
  if (!proc?.cocineroId) return false;
  const e = String(item.plato?.estado || item.estadoBackend || '').toLowerCase();
  return ESTADOS_PROCESO.has(e);
}

function parseClavePlato(key) {
  const lastDashIndex = String(key).lastIndexOf('-');
  if (lastDashIndex === -1) return null;
  const comandaId = key.substring(0, lastDashIndex);
  const platoIndex = parseInt(key.substring(lastDashIndex + 1), 10);
  if (!comandaId || Number.isNaN(platoIndex)) return null;
  return { comandaId, platoIndex };
}

function idPlato(plato) {
  return plato?._id?.toString() || plato?.plato?._id?.toString() || plato?.platoId?.toString() || null;
}

/**
 * Solo platos/guarniciones en verde (`seleccionado`) y realmente en proceso.
 * No usa el auto-listado de platos tomados (amarillo) para no mandar todo el KDS.
 */
export function recolectarSeleccionPasarABackup(input) {
  if (Array.isArray(input)) {
    return input.filter((item) => {
      if (item.estadoVisual && item.estadoVisual !== 'seleccionado') return false;
      return esUnidadEnProceso(item);
    });
  }

  const { platoStates, comandas = [] } = input || {};
  const entries = platoStates instanceof Map ? platoStates : new Map(platoStates || []);
  const out = [];

  entries.forEach((estado, key) => {
    if (estado !== 'seleccionado') return;

    if (esClaveGuarnicion(key)) {
      const parts = String(key).split('-g-');
      if (parts.length !== 2) return;
      const base = parseClavePlato(parts[0]);
      if (!base) return;
      const comanda = comandas.find((c) => String(c._id) === String(base.comandaId));
      const plato = comanda?.platos?.[base.platoIndex];
      if (!plato) return;
      const comp = (plato.complementosSeleccionados || []).find(
        (c) => c._id && String(c._id) === String(parts[1])
      );
      if (!comp) return;
      const platoId = idPlato(plato);
      if (!platoId) return;
      const item = {
        tipo: 'guarnicion',
        comandaId: base.comandaId,
        platoId,
        platoIndex: base.platoIndex,
        plato,
        comp,
        compId: parts[1],
        nombre: Array.isArray(comp.opcion) ? comp.opcion.join(', ') : (comp.opcion || 'Guarnición'),
        procesandoPor: comp.procesandoPor,
        estadoBackend: comp.estadoCocina || 'pedido',
        estadoVisual: estado
      };
      if (esUnidadEnProceso(item)) out.push(item);
      return;
    }

    const parsed = parseClavePlato(key);
    if (!parsed) return;
    const comanda = comandas.find((c) => String(c._id) === String(parsed.comandaId));
    const plato = comanda?.platos?.[parsed.platoIndex];
    if (!plato) return;
    const platoId = idPlato(plato);
    if (!platoId) return;
    const item = {
      comandaId: parsed.comandaId,
      platoId,
      platoIndex: parsed.platoIndex,
      plato,
      nombre: plato.plato?.nombre || plato.nombre || 'Plato',
      procesandoPor: plato.procesandoPor,
      estadoBackend: plato.estado,
      estadoVisual: estado
    };
    if (esUnidadEnProceso(item)) out.push(item);
  });

  return out;
}

export function recolectarSeleccionConSiguienteBackup(input, snapshot) {
  if (!snapshot) return [];
  return recolectarSeleccionPasarABackup(input).filter((u) => unidadTieneSiguienteBackup(u, snapshot));
}

export function botonPasarABackupHabilitado(input) {
  return recolectarSeleccionPasarABackup(input).length > 0;
}

export function botonPasarABackupVisible(input, snapshot) {
  return recolectarSeleccionConSiguienteBackup(input, snapshot).length > 0;
}
