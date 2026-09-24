/**
 * Ver Cocina, lista de complementos con "Cambiar a G guarnicion".
 * Una fila por unidad de plato. El cambio de preselección se empareja por nombre.
 */
import { esComplementoVariantePlato, nombreGuarnicionSolo } from './guarnicionesKds';

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function nombreOpcionCatalogo(op) {
  if (!op) return '';
  if (typeof op === 'string') return op.trim();
  return String(op.nombre || op.opcion || op.label || '').trim();
}

function opcionPreseleccionada(op) {
  if (!op || typeof op !== 'object') return false;
  return op.preseleccionada === true || op.preseleccionada === 1 || op.preseleccionada === 'true';
}

function catalogoDelPlato(plato) {
  if (plato?.plato && typeof plato.plato === 'object') return plato.plato;
  return plato;
}

/** Nombres marcados en platos.html (preseleccionada). Sin MIX / variante. Vacío si no hay marcas. */
function nombresPreseleccion(plato) {
  const grupos = catalogoDelPlato(plato)?.complementos || [];
  const out = [];
  for (const grupo of grupos) {
    if (!grupo || grupo.esVariantePlato === true || grupo.anexarVarianteAlNombre === true) continue;
    const ops = Array.isArray(grupo.opciones) ? grupo.opciones : [];
    for (const op of ops) {
      if (!opcionPreseleccionada(op)) continue;
      const nombre = nombreOpcionCatalogo(op);
      if (!nombre) continue;
      let cant = Number(op.cantidadPreseleccion);
      if (!Number.isFinite(cant) || cant < 1) cant = 1;
      cant = Math.floor(cant);
      for (let i = 0; i < cant; i++) out.push(nombre);
    }
  }
  return out;
}

function nombresPedido(plato) {
  const comps = plato?.complementosSeleccionados || plato?.complementos || [];
  const out = [];
  if (!Array.isArray(comps)) return out;
  for (const comp of comps) {
    if (!comp || comp.eliminado || comp.anulado) continue;
    if (esComplementoVariantePlato(comp, plato)) continue;
    const nombre = nombreGuarnicionSolo(comp) || String(comp.nombre || '').trim();
    if (!nombre) continue;
    let cant = Number(comp.cantidad);
    if (!Number.isFinite(cant) || cant < 1) cant = 1;
    cant = Math.floor(cant);
    for (let i = 0; i < cant; i++) out.push(nombre);
  }
  return out;
}

/**
 * Empareja lo marcado en catálogo con lo pedido.
 * Sin marcas de catálogo: [].
 * Lo que coincide no se lista. Lo que sale y lo que entra se zipean por orden.
 */
export function cambiosGuarnicionVista(plato) {
  const marcas = nombresPreseleccion(plato);
  if (!marcas.length) return [];
  const pedido = nombresPedido(plato);
  const usados = new Array(pedido.length).fill(false);
  const salieron = [];
  for (const marca of marcas) {
    const i = pedido.findIndex((p, idx) => !usados[idx] && norm(p) === norm(marca));
    if (i >= 0) usados[i] = true;
    else salieron.push(marca);
  }
  const entraron = pedido.filter((_, idx) => !usados[idx]);
  const n = Math.max(salieron.length, entraron.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const salio = salieron[i] || '';
    const entro = entraron[i] || '';
    if (salio || entro) out.push({ salio, entro });
  }
  return out;
}

export function tituloFilaVistaG(nombrePlato, numero) {
  const base = `G ${String(nombrePlato || 'Plato').trim() || 'Plato'} x (1)`;
  if (numero == null || numero === '') return base;
  return `${base} --- ${numero}`;
}

/**
 * Una fila por unidad del plato (cantidad de la línea), no por nombre de guarnición.
 * items: salida de recolectarGuarnicionesMonitor.
 */
export function agruparItemsVistaG(items, { cantidadLinea, nombrePlato, tiempoDeComp }) {
  const por = new Map();
  for (const item of items || []) {
    if (!item?.plato || !item?.comanda) continue;
    const comandaId = String(item.comanda._id || item.comanda.id || item.comanda.numero || '');
    const key = `${comandaId}:${item.platoIndex}`;
    if (!por.has(key)) {
      por.set(key, { ...item, comandaId, comps: [] });
    }
    if (item.comp) por.get(key).comps.push(item.comp);
  }
  const filas = [];
  for (const [key, g] of por) {
    const nRaw = cantidadLinea(g.comanda, g.plato, g.platoIndex);
    const n = Number.isFinite(nRaw) && nRaw > 0 ? Math.floor(nRaw) : 1;
    const cambiosG = cambiosGuarnicionVista(g.plato);
    const nombre = nombrePlato(g.plato) || 'Plato';
    let tiempoInicio = null;
    for (const comp of g.comps) {
      const t = tiempoDeComp(comp);
      if (!t) continue;
      const ms = new Date(t).getTime();
      if (!Number.isFinite(ms)) continue;
      if (tiempoInicio == null || ms < new Date(tiempoInicio).getTime()) tiempoInicio = t;
    }
    for (let u = 0; u < n; u++) {
      filas.push({
        claveUnidad: `${key}:${u}`,
        comandaId: g.comandaId,
        platoIndex: g.platoIndex,
        comanda: g.comanda,
        plato: g.plato,
        comp: g.comps[0] || null,
        comps: g.comps,
        unidadIndex: u,
        nombrePlato: nombre,
        cambiosG,
        tiempoInicio,
        modoG: true,
      });
    }
  }
  return filas;
}
