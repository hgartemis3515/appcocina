/**
 * Revertir en KDS: recoger, salió o entregado → pedido.
 * No incluye pagado ni platos anulados/eliminados.
 */

export const ESTADOS_PLATO_REVERSIBLES = ['recoger', 'salio', 'entregado'];
export const ESTADO_DESTINO_REVERTIR_KDS = 'pedido';

export function esPlatoReversibleKds(plato) {
  if (!plato || plato.eliminado === true || plato.anulado === true) return false;
  const estado = String(plato.estado || '').toLowerCase();
  if (estado === 'pagado') return false;
  return ESTADOS_PLATO_REVERSIBLES.includes(estado);
}

export function todosPlatosActivosReversiblesKds(comanda) {
  const activos = (comanda?.platos || []).filter((p) => p && p.eliminado !== true && p.anulado !== true);
  if (!activos.length) return false;
  return activos.every(esPlatoReversibleKds);
}

export function filtrarComandasReversiblesKds(comandas) {
  return (comandas || [])
    .filter((c) => {
      if (!c || c.status === 'pagado' || c.status === 'cancelado') return false;
      if (!c.platos || c.platos.length === 0) return false;
      return c.platos.some(esPlatoReversibleKds);
    })
    .sort((a, b) => {
      const fechaA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const fechaB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return fechaB - fechaA;
    });
}

export function contarPlatosReversiblesKds(comandas) {
  return (comandas || []).reduce((acc, c) => {
    if (!c || c.status === 'pagado' || c.status === 'cancelado') return acc;
    return acc + (c.platos || []).filter(esPlatoReversibleKds).length;
  }, 0);
}
