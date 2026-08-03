/**
 * historialComandaRules — Reglas de inclusión y clasificación de comandas/platos
 * para el Historial de cocina (PLAN KDS v1.1, Fase F1).
 *
 * Regla de oro:
 *  - Una comanda entra al Historial si tiene ≥ 1 plato ACTIVO en estado `salio` o `entregado`.
 *  - Platos `eliminado: true` o `anulado: true` NO cuentan (se ignoran en el cómputo).
 *  - Comandas full-pendientes (ningún `salio`/`entregado`) NO entran.
 *  - `recoger` NO cuenta como entregado por defecto (solo `salio`/`entregado`).
 */

const ESTADOS_ENTREGADO = ["salio", "entregado", "pagado"];
const ESTADOS_PENDIENTES = ["pendiente", "pedido", "en_espera"];
const ESTADO_EN_PASS = "recoger";
const STATUS_COMANDA_HISTORIAL = ["salio", "entregado", "pagado", "completado"];

/**
 * Indica si un plato de comanda está "activo" (no eliminado ni anulado).
 * @param {Object} plato
 * @returns {boolean}
 */
export const esPlatoActivo = (plato) => {
  if (!plato) return false;
  if (plato.eliminado) return false;
  if (plato.anulado) return false;
  return true;
};

/**
 * Devuelve el estado normalizado del plato (lowercase).
 * @param {Object} plato
 * @returns {string}
 */
export const estadoPlato = (plato) => {
  if (!plato || !plato.estado) return "";
  return String(plato.estado).toLowerCase();
};

/**
 * Clasifica un plato para el Historial.
 * @param {Object} plato
 * @returns {{categoria: 'entregado'|'en_pass'|'pendiente'|'anulado', etiqueta: string, cuentaParaInclusion: boolean}}
 */
export const classifyPlatoHistorial = (plato) => {
  if (!esPlatoActivo(plato)) {
    return { categoria: "anulado", etiqueta: "Anulado", cuentaParaInclusion: false };
  }
  const estado = estadoPlato(plato);
  if (ESTADOS_ENTREGADO.includes(estado)) {
    return {
      categoria: "entregado",
      etiqueta:
        estado === "salio" ? "Entregó" : estado === "pagado" ? "Pagado" : "Entregado",
      cuentaParaInclusion: true,
    };
  }
  if (estado === ESTADO_EN_PASS) {
    return { categoria: "en_pass", etiqueta: "En pass", cuentaParaInclusion: false };
  }
  return { categoria: "pendiente", etiqueta: "Pendiente", cuentaParaInclusion: false };
};

/**
 * Cuenta platos activos por categoría en una comanda.
 * @param {Object} comanda
 * @returns {{entregados: number, enPass: number, pendientes: number, anulados: number, totalActivos: number}}
 */
export const contarPlatosComanda = (comanda) => {
  const platos = Array.isArray(comanda?.platos) ? comanda.platos : [];
  let entregados = 0;
  let enPass = 0;
  let pendientes = 0;
  let anulados = 0;
  for (const p of platos) {
    const c = classifyPlatoHistorial(p);
    if (c.categoria === "entregado") entregados += 1;
    else if (c.categoria === "en_pass") enPass += 1;
    else if (c.categoria === "pendiente") pendientes += 1;
    else if (c.categoria === "anulado") anulados += 1;
  }
  return {
    entregados,
    enPass,
    pendientes,
    anulados,
    totalActivos: entregados + enPass + pendientes,
  };
};

/**
 * Determina si una comanda es elegible para el Historial.
 * Regla: ≥ 1 plato activo en `salio` | `entregado` | `pagado`,
 * o status de comanda ya cerrado para cocina (legacy).
 * @param {Object} comanda
 * @returns {boolean}
 */
export const isComandaElegibleHistorial = (comanda) => {
  if (!comanda || !Array.isArray(comanda.platos)) return false;
  const { entregados } = contarPlatosComanda(comanda);
  if (entregados > 0) return true;
  // Fallback legacy: comanda ya cerrada aunque platos viejos no tengan estado fino
  const st = String(comanda.status || "").toLowerCase();
  return STATUS_COMANDA_HISTORIAL.includes(st);
};

/**
 * Clasifica la comanda como parcial o finalizada.
 * @param {Object} comanda
 * @returns {{tipo: 'parcial'|'finalizada', entregados: number, total: number}}
 */
export const classifyComandaHistorial = (comanda) => {
  const { entregados, enPass, pendientes, totalActivos } = contarPlatosComanda(comanda);
  const finalizada = entregados > 0 && enPass === 0 && pendientes === 0;
  return {
    tipo: finalizada ? "finalizada" : "parcial",
    entregados,
    total: totalActivos,
  };
};

/**
 * Filtra un array de comandas del día dejando solo las elegibles para Historial.
 * @param {Array<Object>} comandas
 * @returns {Array<Object>}
 */
export const filtrarComandasElegiblesHistorial = (comandas) => {
  if (!Array.isArray(comandas)) return [];
  return comandas.filter(isComandaElegibleHistorial);
};

/**
 * Devuelve la hora del último plato entregado (para ordenar / mostrar "último salió").
 * @param {Object} comanda
 * @returns {Date|null}
 */
export const ultimaHoraEntregado = (comanda) => {
  if (!comanda || !Array.isArray(comanda.platos)) return null;
  let ultima = null;
  for (const p of comanda.platos) {
    if (!esPlatoActivo(p)) continue;
    const estado = estadoPlato(p);
    if (!ESTADOS_ENTREGADO.includes(estado)) continue;
    const t = p?.tiempos?.salio || p?.tiempos?.entregado;
    if (t) {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) {
        if (!ultima || d > ultima) ultima = d;
      }
    }
  }
  return ultima;
};
