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
  // Priorizar _id del subdocumento (único por línea de comanda)
  if (plato._id) return String(plato._id);
  // Fallback al _id del plato referenciado (NO es único, pero mejor que nada)
  if (plato.plato && typeof plato.plato === 'object' && plato.plato._id) {
    return String(plato.plato._id);
  }
  return '';
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
