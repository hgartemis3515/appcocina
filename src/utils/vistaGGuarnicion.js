/**
 * Ver Cocina, lista de complementos con "Cambiar a G guarnicion".
 * Una fila por nombre de plato: G Plato (qtyG) → #orden(cant) por comanda de la tabla KDS.
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

export function tituloFilaVistaG(nombrePlato, qtyGuarnicion = 1) {
  const q = Number(qtyGuarnicion);
  const n = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
  return `G ${String(nombrePlato || 'Plato').trim() || 'Plato'} (${n})`;
}

export function chipsOrdenDesdeMapa(porOrden) {
  const entries = porOrden instanceof Map
    ? [...porOrden.entries()]
    : Object.entries(porOrden || {});
  return entries
    .map(([o, q]) => ({ orden: Number(o), cantidad: Number(q) }))
    .filter((x) => Number.isFinite(x.orden) && x.orden >= 1 && Number.isFinite(x.cantidad) && x.cantidad > 0)
    .sort((a, b) => a.orden - b.orden);
}

function mergeCambiosG(a, b) {
  const out = Array.isArray(a) ? [...a] : [];
  const seen = new Set(out.map((c) => `${c.salio}|${c.entro}`));
  for (const c of b || []) {
    const k = `${c.salio || ''}|${c.entro || ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function qtyGDeComp(comp) {
  const n = Number(comp?.cantidad);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 1;
}

/**
 * Una fila por nombre de plato. Misma guarnición / plato en varias comandas se junta.
 * chipsOrden: #ordenTabla(cantidad) por puesto en la tabla KDS.
 * items: salida de recolectarGuarnicionesMonitor.
 */
export function agruparItemsVistaG(items, { cantidadLinea, nombrePlato, tiempoDeComp, indiceTabla }) {
  const por = new Map();
  const lineasVistas = new Map();

  for (const item of items || []) {
    if (!item?.plato || !item?.comanda) continue;
    const comandaId = String(item.comanda._id || item.comanda.id || item.comanda.numero || '');
    const nombre = nombrePlato(item.plato) || 'Plato';
    const clave = norm(nombre) || 'plato';
    if (!por.has(clave)) {
      por.set(clave, {
        clave,
        nombrePlato: nombre,
        comandaId,
        platoIndex: item.platoIndex,
        comanda: item.comanda,
        plato: item.plato,
        comp: item.comp || null,
        comps: [],
        cambiosG: cambiosGuarnicionVista(item.plato),
        tiempoInicio: null,
        qtyGuarnicion: qtyGDeComp(item.comp),
        porOrden: new Map(),
        cantidadTotal: 0,
      });
      lineasVistas.set(clave, new Set());
    }
    const g = por.get(clave);
    if (item.comp) g.comps.push(item.comp);
    g.qtyGuarnicion = Math.max(g.qtyGuarnicion, qtyGDeComp(item.comp));
    g.cambiosG = mergeCambiosG(g.cambiosG, cambiosGuarnicionVista(item.plato));
    const t = tiempoDeComp && item.comp ? tiempoDeComp(item.comp) : null;
    if (t) {
      const ms = new Date(t).getTime();
      if (Number.isFinite(ms) && (g.tiempoInicio == null || ms < new Date(g.tiempoInicio).getTime())) {
        g.tiempoInicio = t;
      }
    }
    const lineaKey = `${comandaId}:${item.platoIndex}`;
    const vistas = lineasVistas.get(clave);
    if (vistas.has(lineaKey)) continue;
    vistas.add(lineaKey);
    const nRaw = typeof cantidadLinea === 'function'
      ? cantidadLinea(item.comanda, item.plato, item.platoIndex)
      : 1;
    const n = Number.isFinite(nRaw) && nRaw > 0 ? Math.floor(nRaw) : 1;
    g.cantidadTotal += n;
    const orden = indiceTabla && typeof indiceTabla.get === 'function'
      ? indiceTabla.get(comandaId)
      : null;
    if (Number.isFinite(orden) && orden >= 1) {
      g.porOrden.set(orden, (g.porOrden.get(orden) || 0) + n);
    }
  }

  const filas = [];
  for (const g of por.values()) {
    filas.push({
      claveUnidad: `g:${g.clave}`,
      comandaId: g.comandaId,
      platoIndex: g.platoIndex,
      comanda: g.comanda,
      plato: g.plato,
      comp: g.comp,
      comps: g.comps,
      unidadIndex: 0,
      nombrePlato: g.nombrePlato,
      cambiosG: g.cambiosG,
      tiempoInicio: g.tiempoInicio,
      modoG: true,
      qtyGuarnicion: g.qtyGuarnicion,
      chipsOrden: chipsOrdenDesdeMapa(g.porOrden),
      cantidadTotal: g.cantidadTotal,
    });
  }
  return filas;
}
