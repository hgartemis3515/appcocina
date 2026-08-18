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
export const obtenerNombreDisplayCocina = (plato, opts = {}) => {
  const oficial = obtenerNombrePlato(plato);
  const alias = String(
    plato?.plato?.nombreCocina || plato?.nombreCocina || ''
  ).trim();
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
