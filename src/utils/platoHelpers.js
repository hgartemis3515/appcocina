/**
 * Helpers compartidos para trabajar con platos dentro de comandas.
 *
 * Un "plato de comanda" puede venir en distintas formas:
 *   - { plato: { _id, nombre, precio, codigo }, estado, ... }  (plato populado)
 *   - { plato: <ObjectId>, nombre: "...", ... }                (desnormalizado)
 *   - { nombre: "...", codigo: "...", ... }                    (sin sub-doc)
 *
 * Estos helpers unifican el acceso para que hook de búsqueda, filtros de visibilidad
 * y render de tarjetas usen siempre la misma fuente de verdad.
 */

/**
 * Obtiene el nombre de un plato de comanda, sin importar su forma.
 * @param {Object} plato - Plato de comanda (subdocumento o copia)
 * @returns {string} Nombre del plato o '' si no tiene
 */
export const obtenerNombrePlato = (plato) => {
  if (!plato || typeof plato !== 'object') return '';
  // Caso 1: subdocumento con .plato poblado
  if (plato.plato && typeof plato.plato === 'object' && plato.plato.nombre) {
    return String(plato.plato.nombre).trim();
  }
  // Caso 2: nombre desnormalizado a nivel del subdocumento
  if (plato.nombre) {
    return String(plato.nombre).trim();
  }
  return '';
};

/**
 * Nombre a pintar en pantallas de cocina (tabla KDS / Ver Cocina).
 * Devuelve el alias corto (`nombreCocina`) si existe y corresponde mostrarlo,
 * si no cae al nombre comercial (mismo resultado que `obtenerNombrePlato`).
 *
 * PLAN NOMBRE_PLATO_COCINA:
 *  - Ver Cocina → llamar con `{ forzar: true}` (alias siempre que exista).
 *  - Tabla KDS  → llamar con `{habilitadoEnKds: config.cocina.usarNombreCocinaEnTablaKds}`.
 *
 * @param {Object} plato - línea de comanda (subdoc poblado o desnormalizado)
 * @param {{ forzar?: boolean, habilitadoEnKds?: boolean }} opts
 * @returns {string}
 */
function anexarSufijoNombre(base, extra) {
  const b = String(base || '').trim();
  const e = String(extra || '').trim();
  if (!e) return b;
  if (!b) return e;
  const bLow = b.toLowerCase();
  const eLow = e.toLowerCase();
  if (bLow === eLow || bLow.endsWith(` ${eLow}`)) return b;
  return `${b} ${e}`.trim();
}

export const obtenerNombreDisplayCocina = (plato, opts = {}) => {
  if (!plato || typeof plato !== 'object') return '';
  // Item de Ver Cocina: { plato: linea, comanda } — el alias vive en la línea / catálogo.
  const linea = (plato.comanda != null && plato.plato && typeof plato.plato === 'object')
    ? plato.plato
    : plato;
  const oficial = obtenerNombrePlato(linea);
  const alias = String(
    linea?.plato?.nombreCocina || linea?.nombreCocina || ''
  ).trim();
  const pedido = String(linea?.nombreCocinaPedido || '').trim();
  if (pedido) return pedido;
  const extraVar = String(
    linea?.variantePlato?.pronombre
    || linea?.variantePlato?.opcion
    || ''
  ).trim();
  if (linea?.variantePlato?.anexaNombre === true && extraVar) {
    const usarAlias = opts.forzar === true || opts.habilitadoEnKds === true;
    const base = usarAlias ? (alias || oficial) : (oficial || alias);
    return anexarSufijoNombre(base, extraVar);
  }
  if (extraVar) return extraVar;
  if (!alias) return oficial;
  if (opts.forzar === true || opts.habilitadoEnKds === true) return alias;
  return oficial;
};

/**
 * Obtiene el código de un plato de comanda (ej: "L1", "M23").
 * @param {Object} plato - Plato de comanda
 * @returns {string} Código del plato o '' si no tiene
 */
export const obtenerCodigoPlato = (plato) => {
  if (!plato || typeof plato !== 'object') return '';
  if (plato.plato && typeof plato.plato === 'object' && plato.plato.codigo) {
    return String(plato.plato.codigo).trim();
  }
  if (plato.codigo) {
    return String(plato.codigo).trim();
  }
  return '';
};

/**
 * Obtiene el _id del subdocumento del plato (único incluso para platos duplicados
 * con distintos complementos). Se usa como key/identificador para findIndex.
 * @param {Object} plato - Plato de comanda
 * @returns {string} ID del subdocumento normalizado como string, o ''
 */
export const obtenerPlatoSubdocId = (plato) => {
  if (!plato || typeof plato !== 'object') return '';
  if (plato._id) return normalizarId(plato._id);
  if (plato.plato && typeof plato.plato === 'object' && plato.plato._id) {
    return normalizarId(plato.plato._id);
  }
  return '';
};

export function normalizarId(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'string' || typeof v === 'number') {
    const s = String(v);
    return s === '[object Object]' ? '' : s;
  }
  if (typeof v === 'object') {
    if (v.$oid) return String(v.$oid);
    if (typeof v.toHexString === 'function') return v.toHexString();
    const buf = v.buffer;
    const data = buf?.data || (Array.isArray(buf) ? buf : null);
    if (Array.isArray(data) && data.length >= 12) {
      return data.slice(0, 12).map((b) => Number(b).toString(16).padStart(2, '0')).join('');
    }
    if (typeof v.toString === 'function') {
      const s = v.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  return '';
}

/** ¿La línea de comanda coincide con el platoId del socket (subdoc, id o catálogo)? */
export const platoCoincideId = (plato, platoId) => {
  if (!plato || platoId == null || platoId === '') return false;
  const want = normalizarId(platoId);
  if (!want) return false;
  if (obtenerPlatoSubdocId(plato) === want) return true;
  if (plato.platoId != null && normalizarId(plato.platoId) === want) return true;
  if (plato.id != null && normalizarId(plato.id) === want) return true;
  return false;
};

/**
 * Resuelve el índice real del plato en `comanda.platos`.
 * Necesario cuando el buscador entrega copias `{ ...plato, _puntuacion }`:
 * `indexOf(plato)` falla (-1) y rompe selección / Tomar / Finalizar.
 * @param {Object} comanda
 * @param {Object} plato
 * @returns {number} índice >= 0, o -1 si no se encuentra
 */
export const resolverIndicePlato = (comanda, plato) => {
  if (!comanda?.platos || !Array.isArray(comanda.platos) || !plato) return -1;
  const subdocId = obtenerPlatoSubdocId(plato);
  if (subdocId) {
    const byId = comanda.platos.findIndex((p) => obtenerPlatoSubdocId(p) === subdocId);
    if (byId !== -1) return byId;
  }
  const byRef = comanda.platos.indexOf(plato);
  return byRef;
};

/**
 * Indica si un plato de comanda tiene nombre válido cargado.
 * Útil para filtrar platos pendientes de sincronización.
 * @param {Object} plato - Plato de comanda
 * @returns {boolean}
 */
export const tieneNombrePlato = (plato) => {
  return obtenerNombrePlato(plato).length > 0;
};

/**
 * tipoServicio vive en la línea de plato (`mesa` | `para_llevar` | `extra_llevar`).
 * El item del monitor es `{ plato, comanda }`.
 */
export const tipoServicioDePlato = (item) => {
  if (!item || typeof item !== 'object') return 'mesa';
  const t = item.tipoServicio || item.plato?.tipoServicio || item.comanda?.tipoServicio;
  if (t === 'para_llevar' || t === 'extra_llevar') return t;
  return 'mesa';
};

export const esPlatoParaLlevar = (item) => tipoServicioDePlato(item) === 'para_llevar';
export const esPlatoExtraLlevar = (item) => tipoServicioDePlato(item) === 'extra_llevar';
export const esPlatoLlevarColor = (item) => esPlatoParaLlevar(item) || esPlatoExtraLlevar(item);

export const grupoTieneParaLlevar = (platos = []) => platos.some(esPlatoParaLlevar);
export const grupoTieneExtraLlevar = (platos = []) => platos.some(esPlatoExtraLlevar);
export const grupoTieneLlevarColor = (platos = []) => platos.some(esPlatoLlevarColor);

export const LABEL_PARA_LLEVAR = 'PARA LLEVAR';
export const LABEL_EXTRA_CLIENTE = 'EXTRA CLIENTE';
export const etiquetaTipoServicioKds = (tipo) => {
  if (tipo === 'extra_llevar') return LABEL_EXTRA_CLIENTE;
  if (tipo === 'para_llevar') return LABEL_PARA_LLEVAR;
  return null;
};

function platosActivosComanda(comanda) {
  return (comanda?.platos || []).filter((p) => p && p.eliminado !== true && p.anulado !== true);
}

export function comandaEsSinMesaOParaLlevar(comanda) {
  if (!comanda) return false;
  if (comanda.sinMesa === true) return true;
  const mesa = comanda.mesas || comanda.mesa;
  if (mesa && typeof mesa === 'object' && mesa.sinMesa === true) return true;
  const num = comanda.mesaNumero ?? mesa?.nummesa ?? mesa?.numero ?? (typeof mesa === 'number' ? mesa : null);
  if (num != null && num !== '' && String(num).toUpperCase() !== 'N/A') return false;
  const platos = platosActivosComanda(comanda);
  if (platos.length && platos.every((p) => p.tipoServicio === 'para_llevar' || p.paraLlevar === true)) {
    return true;
  }
  return !mesa || mesa === 'N/A';
}

/**
 * Etiqueta de mesa en tarjetas KDS. Sin mesa / para llevar → PARA LLEVAR (nunca N/A).
 */
export function nombreMesaKds(comanda, mesaOverride) {
  const mesa = mesaOverride !== undefined ? mesaOverride : (comanda?.mesas || comanda?.mesa);
  if (comandaEsSinMesaOParaLlevar(comanda) || (mesa && mesa.sinMesa === true)) {
    return LABEL_PARA_LLEVAR;
  }
  if (mesa && typeof mesa === 'object') {
    if (mesa.nombreCombinado) return mesa.nombreCombinado;
    if (mesa.nummesa != null && mesa.nummesa !== '') return `M${mesa.nummesa}`;
    if (mesa.numero != null && mesa.numero !== '') return `M${mesa.numero}`;
  }
  const num = comanda?.mesaNumero;
  if (num != null && num !== '') return `M${num}`;
  return LABEL_PARA_LLEVAR;
}
