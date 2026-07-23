/**
 * Numeración global de temporizadores del monitor Ver Cocina Completo.
 * Un solo sistema de números: #1 = unidad más antigua visible.
 */

const PALETA_LINEA = [
  '#60a5fa',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#22d3ee',
  '#facc15',
  '#ff4fa3',
  '#2dd4bf',
  '#e879f9',
];

/**
 * Color estable de contorno para timers de la misma línea de comanda.
 * @param {string} lineaId
 * @returns {string} hex
 */
export function colorLineaDesdeId(lineaId) {
  if (!lineaId) return PALETA_LINEA[0];
  let h = 0;
  for (let i = 0; i < lineaId.length; i++) {
    h = (h * 31 + lineaId.charCodeAt(i)) >>> 0;
  }
  return PALETA_LINEA[h % PALETA_LINEA.length];
}

/**
 * Asigna numeroGlobal 1..N a todos los timers de los grupos (más viejo = 1).
 * No muta los grupos originales; devuelve copias superficiales.
 *
 * @param {Array} grupos - grupos con timers[]
 * @returns {Array}
 */
export function asignarNumeroGlobal(grupos) {
  if (!Array.isArray(grupos) || grupos.length === 0) return grupos || [];

  const next = grupos.map((g) => ({
    ...g,
    timers: (g.timers || []).map((t) => ({ ...t })),
  }));

  const flat = [];
  for (const g of next) {
    for (const t of g.timers) flat.push(t);
  }

  flat.sort((a, b) => {
    const ta = a.tiempoInicio ? new Date(a.tiempoInicio).getTime() : 0;
    const tb = b.tiempoInicio ? new Date(b.tiempoInicio).getTime() : 0;
    if (ta !== tb) return ta - tb;
    const la = a.lineaId || '';
    const lb = b.lineaId || '';
    if (la !== lb) return la.localeCompare(lb);
    return (a.unidadIndex || 0) - (b.unidadIndex || 0);
  });

  flat.forEach((t, i) => {
    t.numeroGlobal = i + 1;
  });

  return next;
}

/**
 * Cantidad de unidades de una línea de comanda.
 * Fuente de verdad: comanda.cantidades[platoIndex].
 */
export function obtenerCantidadLinea(comanda, plato, platoIndex) {
  if (
    platoIndex >= 0 &&
    Array.isArray(comanda?.cantidades) &&
    comanda.cantidades[platoIndex] != null
  ) {
    const n = Number(comanda.cantidades[platoIndex]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }
  const fallback = Number(plato?.cantidad);
  return Number.isFinite(fallback) && fallback > 0 ? Math.floor(fallback) : 1;
}

export { PALETA_LINEA };
