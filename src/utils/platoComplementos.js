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

/**
 * Calcula totales para el resumen de complementos (v3.0).
 * @param {Array} complementos - lista de complementos de un plato (con cantidad, precio)
 * @returns {{ totalUnidades: number, extraComplementos: number }}
 */
export function calcularResumenComplementos(complementos = []) {
  if (!Array.isArray(complementos)) return { totalUnidades: 0, extraComplementos: 0 };
  let totalUnidades = 0;
  let extra = 0;
  for (const c of complementos) {
    const cantidad = Math.max(1, Number(c.cantidad) || 1);
    totalUnidades += cantidad;
    extra += (Number(c.precio) || 0) * cantidad;
  }
  return { totalUnidades, extraComplementos: extra };
}

/**
 * Devuelve el texto compacto del resumen de impresión para un plato.
 * Respeta las flags `mostrarCantidad` y `mostrarMontoExtra` (defaults true).
 *
 * Ej: "4 uds." o "4 uds. (+S/. 12.00)"
 *
 * @param {Array} complementos
 * @param {Object} [flags] - { mostrarCantidad, mostrarMontoExtra }
 * @param {string} [simbolo='S/.']
 */
export function textoResumenComplementos(complementos = [], flags = {}, simbolo = 'S/.') {
  const mostrarCantidad = flags.mostrarCantidad !== false;
  const mostrarMontoExtra = flags.mostrarMontoExtra !== false;
  const { totalUnidades, extraComplementos } = calcularResumenComplementos(complementos);
  if (totalUnidades === 0) return '';
  const partes = [];
  if (mostrarCantidad) {
    partes.push(`${totalUnidades} ${totalUnidades === 1 ? 'ud.' : 'uds.'}`);
  }
  if (mostrarMontoExtra && extraComplementos > 0) {
    partes.push(`(+${simbolo}${extraComplementos.toFixed(2)})`);
  }
  return partes.join(' ').trim();
}
