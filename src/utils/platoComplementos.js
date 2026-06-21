/**
 * Normaliza complementos de un plato en ticket/comanda.
 * Acepta complementosSeleccionados (modelo) o complementos (impresión/API).
 */
export function getComplementosDePlato(plato) {
  if (!plato) return [];
  const raw = plato.complementosSeleccionados ?? plato.complementos ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((comp) => {
      const opcion = Array.isArray(comp.opcion) ? comp.opcion.join(', ') : (comp.opcion || '');
      const grupo = comp.grupo || '';
      const cantidad = comp.cantidad || 1;
      const precio = comp.precio != null ? Number(comp.precio) : null;

      return {
        grupo,
        opcion,
        cantidad,
        precio,
        key: `${grupo}|${opcion}|${cantidad}`,
      };
    })
    .filter((c) => c.opcion || c.grupo);
}

/** Texto legible: "Proteína: Pollo x2" o "Pollo x2" si no hay grupo */
export function formatComplementoTexto(comp, { siempreCantidad = true } = {}) {
  const opcion = comp.opcion || '';
  const cantidad = comp.cantidad || 1;
  const cantidadTexto = siempreCantidad ? ` x${cantidad}` : (cantidad > 1 ? ` x${cantidad}` : '');

  if (comp.grupo) {
    return `${comp.grupo}: ${opcion}${cantidadTexto}`;
  }
  return `${opcion}${cantidadTexto}`;
}
