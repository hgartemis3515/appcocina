/**
 * Normaliza el filtro de cocinero(s) de Ver Cocina / Distribuir monitores.
 * Acepta un id, varios ids en array, o "id1,id2" en querystring.
 * null/vacío = vista General (todos).
 */
export function parseCocineroIdsFiltro(valor) {
  if (valor == null || valor === '') return null;
  if (Array.isArray(valor)) {
    const ids = valor.map(String).map((s) => s.trim()).filter(Boolean);
    return ids.length ? ids : null;
  }
  const ids = String(valor).split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : null;
}

export function platoCoincideCocineroFiltro(cocineroId, filtro) {
  const ids = parseCocineroIdsFiltro(filtro);
  if (!ids) return true;
  if (cocineroId == null || cocineroId === '') return false;
  return ids.includes(String(cocineroId));
}

export function primerCocineroIdFiltro(valor) {
  const ids = parseCocineroIdsFiltro(valor);
  return ids ? ids[0] : null;
}

export function esUnSoloCocineroFiltro(valor) {
  const ids = parseCocineroIdsFiltro(valor);
  return !!(ids && ids.length === 1);
}
