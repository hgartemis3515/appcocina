import { obtenerNombreDisplayCocina, resolverIndicePlato } from './platoHelpers';
import { platoRetenidoFueraDeCocina } from './kdsFilters';

export const SOS_TABLA_STORAGE_KEY = 'kdsSosTabla';

export function leerSosTablaLocal() {
  try {
    return localStorage.getItem(SOS_TABLA_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function guardarSosTablaLocal(activo) {
  try {
    if (activo) localStorage.setItem(SOS_TABLA_STORAGE_KEY, '1');
    else localStorage.removeItem(SOS_TABLA_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function platoVisibleSos(plato) {
  if (!plato || typeof plato !== 'object') return false;
  if (plato.eliminado === true || plato.anulado === true) return false;
  return true;
}

/** Lo que la tarjeta KDS pinta: preparación (pedido/en_espera) y listos (recoger). */
const ESTADOS_EN_TARJETA = new Set(['en_espera', 'ingresante', 'pedido', 'recoger']);

export function platoVisibleEnTablaKds(plato) {
  if (!platoVisibleSos(plato)) return false;
  if (platoRetenidoFueraDeCocina(plato)) return false;
  const estado = String(plato.estado || 'en_espera').toLowerCase();
  return ESTADOS_EN_TARJETA.has(estado);
}

/** La tarjeta solo existe si hay algo que pintar. Entregado + un pendiente de cobro no entra. */
export function comandaTienePlatoEnTarjetaKds(comanda) {
  return (comanda?.platos || []).some((p) => platoVisibleEnTablaKds(p));
}

export function qtyLineaSos(comanda, platoIndex, plato) {
  const n = Number(comanda?.cantidades?.[platoIndex]);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const p = Number(plato?.cantidad);
  if (Number.isFinite(p) && p > 0) return Math.floor(p);
  return 1;
}

export function claveNombreSos(nombre) {
  const s = String(nombre || '').trim().toUpperCase();
  return s || 'SIN NOMBRE';
}

/** Pedido a cocina: tiempos.pedido; reserva usa lanzamiento, no createdAt de armado. */
export function instantePedidoSos(plato, comanda) {
  const pedido = plato?.tiempos?.pedido;
  if (pedido) {
    const t = new Date(pedido).getTime();
    if (Number.isFinite(t)) return t;
  }
  const esReserva = comanda?.origenCreacion === 'reserva' || !!comanda?.origenReserva;
  if (esReserva && comanda?.prioridadOrden) {
    const t = new Date(comanda.prioridadOrden).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (!esReserva && comanda?.createdAt) {
    const t = new Date(comanda.createdAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  return Number.POSITIVE_INFINITY;
}

export function paginaDeComanda(comandas, comandaId, porPagina) {
  const n = Math.max(1, Number(porPagina) || 1);
  const id = String(comandaId || '');
  const idx = (comandas || []).findIndex((c) => String(c?._id || c?.id) === id);
  if (idx < 0) return 0;
  return Math.floor(idx / n);
}

function categoriasAlFinalDe(lista) {
  return new Set(
    (Array.isArray(lista) ? lista : [])
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean)
  );
}

function nombresCategoriaPlato(plato) {
  const cat = plato?.plato && typeof plato.plato === 'object' ? plato.plato : plato;
  const out = [];
  if (cat?.categoria) out.push(cat.categoria);
  if (Array.isArray(cat?.categorias)) out.push(...cat.categorias);
  return out.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean);
}

function grupoCategoriaAlFinal(grupo, alFinal) {
  if (!alFinal.size || !grupo) return false;
  return (grupo.categorias || []).some((c) => alFinal.has(c));
}

/**
 * Agrupa platos visibles del tablero KDS por nombre de cocina.
 * Orden: platos de comandas con prioridad primero (🚀), luego llegada.
 * @returns {{ clave, nombre, cantidad, primero, tsMin, comandaIdMasAntigua, platoIndexMasAntigua }[]}
 */
export function agruparPlatosSosTabla(comandas, opts = {}) {
  const habilitadoEnKds = opts.habilitadoEnKds === true;
  const platosDeComanda = typeof opts.platosDeComanda === 'function' ? opts.platosDeComanda : null;
  const esColaUno = typeof opts.esColaUno === 'function' ? opts.esColaUno : null;
  const esTablaUnoODos = typeof opts.esTablaUnoODos === 'function' ? opts.esTablaUnoODos : null;
  const groups = new Map();

  for (const comanda of comandas || []) {
    const comandaId = String(comanda?._id || comanda?.id || '');
    if (!comandaId) continue;
    const lista = platosDeComanda ? platosDeComanda(comanda) : (comanda.platos || []);
    (lista || []).forEach((plato, i) => {
      if (!platoVisibleEnTablaKds(plato)) return;
      const idx = resolverIndicePlato(comanda, plato);
      const platoIndex = Number.isInteger(idx) && idx >= 0 ? idx : i;
      const nombre = obtenerNombreDisplayCocina(plato, { habilitadoEnKds }) || 'Sin nombre';
      const prio = Number(comanda?.prioridadOrden) || 0;
      const prioridad = prio > 0;
      const clave = `${claveNombreSos(nombre)}${prioridad ? '|P' : ''}`;
      const cantidad = qtyLineaSos(comanda, platoIndex, plato);
      const ts = instantePedidoSos(plato, comanda);
      const colaUno = esColaUno ? esColaUno(comandaId, platoIndex) === true : false;
      const tablaUnoDos = esTablaUnoODos ? esTablaUnoODos(comandaId) === true : false;
      const verde = colaUno || tablaUnoDos;
      const categorias = nombresCategoriaPlato(plato);
      const prev = groups.get(clave);
      if (!prev) {
        groups.set(clave, {
          clave,
          nombre,
          cantidad,
          prioridad,
          primero: verde,
          prioMax: prio,
          tsMin: ts,
          categorias,
          comandaIdMasAntigua: comandaId,
          platoIndexMasAntigua: platoIndex,
        });
        return;
      }
      if (verde) prev.primero = true;
      prev.cantidad += cantidad;
      for (const c of categorias) {
        if (!prev.categorias.includes(c)) prev.categorias.push(c);
      }
      if (prio > prev.prioMax) prev.prioMax = prio;
      if (ts < prev.tsMin) {
        prev.tsMin = ts;
        prev.comandaIdMasAntigua = comandaId;
        prev.platoIndexMasAntigua = platoIndex;
      }
    });
  }

  return [...groups.values()].sort((a, b) => {
    const alFinal = categoriasAlFinalDe(opts.categoriasAlFinal);
    const fa = grupoCategoriaAlFinal(a, alFinal) ? 1 : 0;
    const fb = grupoCategoriaAlFinal(b, alFinal) ? 1 : 0;
    if (fa !== fb) return fa - fb;
    if (a.prioridad !== b.prioridad) return a.prioridad ? -1 : 1;
    if (a.prioridad && b.prioridad && a.prioMax !== b.prioMax) return b.prioMax - a.prioMax;
    if (a.tsMin !== b.tsMin) return a.tsMin - b.tsMin;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}
