/**
 * Estilo KDS compacto (p. ej. comanda solo DCH) y número de serie en header.
 */

export function platoKdsEstiloCompacto(plato) {
  if (!plato) return false;
  if (plato.kdsEstiloCompacto === true) return true;
  const cat = plato.plato;
  return !!(cat && typeof cat === 'object' && !Array.isArray(cat) && cat.kdsEstiloCompacto === true);
}

/** True si todos los platos activos de la comanda piden tarjeta compacta. */
export function comandaKdsEstiloCompacto(comanda) {
  const activos = (comanda?.platos || []).filter((p) => p && !p.eliminado && !p.anulado);
  return activos.length > 0 && activos.every(platoKdsEstiloCompacto);
}

export function textoNumeroSerieKds(comanda) {
  const s = String(comanda?.numeroSerie || '').replace(/\D/g, '').slice(0, 4);
  return /^\d{2,4}$/.test(s) ? s : '';
}
