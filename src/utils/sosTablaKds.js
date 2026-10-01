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

export function claveFamiliaSos(texto) {
  return String(texto || '').trim().toUpperCase();
}

function opDeLinea(plato) {
  const v = plato?.variantePlato;
  if (!v || v.anexaNombre !== true) return '';
  return String(v.pronombre || v.opcion || '').trim();
}

function baseSinOp(nombre, op) {
  const n = String(nombre || '').trim();
  const s = String(op || '').trim();
  if (!n || !s) return n;
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cut = n.replace(new RegExp(`\\s+${esc}$`, 'i'), '').trim();
  return cut || n;
}

function fundirOpsSos(grupos) {
  const cubetas = new Map();
  const sueltos = [];
  for (const g of grupos) {
    if (!g.op) {
      sueltos.push(g);
      continue;
    }
    const k = `${claveNombreSos(g.baseNombre)}|${g.familiaClave || ''}|${g.prioridad ? 'P' : ''}`;
    if (!cubetas.has(k)) cubetas.set(k, []);
    cubetas.get(k).push(g);
  }
  const salida = [...sueltos];
  for (const [k, lista] of cubetas) {
    const ops = new Set(lista.map((g) => claveFamiliaSos(g.op)));
    if (ops.size < 2) {
      salida.push(...lista);
      continue;
    }
    const tipos = [...lista].sort((a, b) => a.tsMin - b.tsMin || a.nombre.localeCompare(b.nombre, 'es'));
    const primero = tipos[0];
    const categorias = [];
    for (const g of tipos) {
      for (const c of g.categorias || []) {
        if (!categorias.includes(c)) categorias.push(c);
      }
    }
    salida.push({
      clave: `OP|${k}`,
      nombre: primero.baseNombre || primero.nombre,
      familia: true,
      tipos,
      items: tipos.flatMap((g) => g.items || []).sort((a, b) => a.ts - b.ts || a.platoIndex - b.platoIndex),
      cantidad: tipos.reduce((s, g) => s + g.cantidad, 0),
      prioridad: primero.prioridad,
      primero: tipos.some((g) => g.primero),
      prioMax: tipos.reduce((m, g) => Math.max(m, g.prioMax || 0), 0),
      tsMin: primero.tsMin,
      categorias,
      familiaClave: primero.familiaClave || '',
      familiaLabel: primero.familiaLabel || '',
      comandaIdMasAntigua: primero.comandaIdMasAntigua,
      platoIndexMasAntigua: primero.platoIndexMasAntigua,
    });
  }
  return salida;
}

function sinMarcaFamilia(grupo) {
  if (!grupo) return grupo;
  const { familiaClave, familiaLabel, ...resto } = grupo;
  return resto;
}

function fundirFamiliasSos(grupos) {
  const cubetas = new Map();
  const sueltos = [];
  for (const g of grupos) {
    if (!g.familiaClave) {
      sueltos.push(sinMarcaFamilia(g));
      continue;
    }
    const k = `${g.familiaClave}${g.prioridad ? '|P' : ''}`;
    if (!cubetas.has(k)) cubetas.set(k, []);
    cubetas.get(k).push(g);
  }
  const salida = [...sueltos];
  for (const [k, lista] of cubetas) {
    if (lista.length < 2) {
      salida.push(sinMarcaFamilia(lista[0]));
      continue;
    }
    const tipos = [...lista].sort((a, b) => a.tsMin - b.tsMin || a.nombre.localeCompare(b.nombre, 'es'));
    const tiposLimpios = tipos.map(sinMarcaFamilia);
    const items = tipos
      .flatMap((g) => g.items || [])
      .sort((a, b) => a.ts - b.ts || a.platoIndex - b.platoIndex);
    const primero = tipos[0];
    const categorias = [];
    for (const g of tipos) {
      for (const c of g.categorias || []) {
        if (!categorias.includes(c)) categorias.push(c);
      }
    }
    salida.push({
      clave: `FAM|${k}`,
      nombre: primero.familiaLabel || primero.nombre,
      familia: true,
      tipos: tiposLimpios,
      items,
      cantidad: tipos.reduce((s, g) => s + g.cantidad, 0),
      prioridad: primero.prioridad,
      primero: tipos.some((g) => g.primero),
      prioMax: tipos.reduce((m, g) => Math.max(m, g.prioMax || 0), 0),
      tsMin: primero.tsMin,
      categorias,
      comandaIdMasAntigua: primero.comandaIdMasAntigua,
      platoIndexMasAntigua: primero.platoIndexMasAntigua,
    });
  }
  return salida;
}

/** Cantidad > 1: la fila se abre con flecha, una línea por unidad, como las familias. */
function envolverCantidadSos(g) {
  if (!g || g.familia || !(Number(g.cantidad) > 1)) return g;
  const lineas = (g.items || []).length
    ? g.items
    : [{
      comandaId: g.comandaIdMasAntigua,
      platoIndex: g.platoIndexMasAntigua,
      ts: g.tsMin,
      nombre: g.nombre,
      cantidad: g.cantidad,
    }];
  const tipos = [];
  lineas.forEach((it, idx) => {
    const n = Math.max(1, Math.floor(Number(it.cantidad) || 1));
    for (let u = 0; u < n; u += 1) {
      tipos.push({
        clave: `${g.clave}|Q${idx}-${u}`,
        nombre: it.nombre || g.nombre,
        cantidad: 1,
        prioridad: g.prioridad,
        primero: false,
        prioMax: g.prioMax || 0,
        tsMin: it.ts ?? g.tsMin,
        categorias: g.categorias || [],
        comandaIdMasAntigua: it.comandaId,
        platoIndexMasAntigua: it.platoIndex,
        items: [{ ...it, cantidad: 1 }],
      });
    }
  });
  return { ...g, familia: true, tipos };
}

function envolverCantidadesSos(grupos) {
  return (grupos || []).map((g) => {
    const tipos = g?.tipos ? envolverCantidadesSos(g.tipos) : g?.tipos;
    const base = tipos ? { ...g, tipos } : g;
    return envolverCantidadSos(base);
  });
}

/**
 * Comandas del modal: solo platos de la familia, de la más antigua a la más nueva.
 */
export function comandasDeFamiliaSos(grupo, comandas) {
  if (!grupo?.familia || !Array.isArray(grupo.items)) return [];
  const porId = new Map();
  for (const it of grupo.items) {
    const id = String(it.comandaId || '');
    if (!id) continue;
    if (!porId.has(id)) porId.set(id, []);
    porId.get(id).push(it);
  }
  const filas = [];
  for (const [id, items] of porId) {
    const ordenados = [...items].sort((a, b) => a.ts - b.ts || a.platoIndex - b.platoIndex);
    const comanda = (comandas || []).find((c) => String(c?._id || c?.id) === id);
    if (!comanda) continue;
    const platos = ordenados
      .map((it) => comanda.platos?.[it.platoIndex])
      .filter(Boolean);
    if (!platos.length) continue;
    filas.push({ comanda, platos, ts: ordenados[0].ts });
  }
  filas.sort((a, b) => a.ts - b.ts);
  return filas;
}

export function buscarGrupoSos(grupos, clave) {
  for (const g of grupos || []) {
    if (g.clave === clave) return g;
    const anidado = buscarGrupoSos(g.tipos, clave);
    if (anidado) return anidado;
  }
  return null;
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
  const grupoDe = typeof opts.grupoSosDePlato === 'function' ? opts.grupoSosDePlato : null;
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
      const op = opDeLinea(plato);
      const baseNombre = op ? baseSinOp(nombre, op) : nombre;
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
      const item = { comandaId, platoIndex, ts, nombre, cantidad };
      const familiaLabel = grupoDe ? String(grupoDe(plato) || '').trim() : '';
      const familiaClave = claveFamiliaSos(familiaLabel);
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
          familiaClave,
          familiaLabel,
          op,
          baseNombre,
          items: [item],
        });
        return;
      }
      if (verde) prev.primero = true;
      prev.cantidad += cantidad;
      prev.items.push(item);
      if (!prev.familiaClave && familiaClave) {
        prev.familiaClave = familiaClave;
        prev.familiaLabel = familiaLabel;
      }
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

  const ordenados = fundirFamiliasSos(fundirOpsSos([...groups.values()])).sort((a, b) => {
    const alFinal = categoriasAlFinalDe(opts.categoriasAlFinal);
    const fa = grupoCategoriaAlFinal(a, alFinal) ? 1 : 0;
    const fb = grupoCategoriaAlFinal(b, alFinal) ? 1 : 0;
    if (fa !== fb) return fa - fb;
    if (a.prioridad !== b.prioridad) return a.prioridad ? -1 : 1;
    if (a.prioridad && b.prioridad && a.prioMax !== b.prioMax) return b.prioMax - a.prioMax;
    if (a.tsMin !== b.tsMin) return a.tsMin - b.tsMin;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
  return envolverCantidadesSos(ordenados);
}
