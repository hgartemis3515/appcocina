/**
 * ordenColaCocinero.js
 *
 * PLAN: OBLIGAR_ORDEN_ASIGNACION_KDS_SUPERVISOR
 *
 * Cálculo del número de orden (#1, #2, ...) de cada plato en proceso,
 * por cocinero, siguiendo FIFO por `procesandoPor.timestamp` (más antiguo = #1).
 *
 * Se usa la MISMA lógica que la numeración de la vista de cocineros
 * (Ver Cocina Completo / timers) para mantener consistencia visual.
 *
 * Reglas de negocio (ver plan):
 * - Cada cocinero tiene su propia cola (varios cocineros pueden tener su #1 a la vez).
 * - De un cocinero SOLO se puede finalizar el #1 (salvo admin / solicitud OFF / override).
 * - La cantidad viaja con la línea: marcar el #1 con ×N finaliza las N unidades.
 */

/**
 * Estados considerados "en proceso" / finalizable (no recoger/salio/entregado).
 * Se alinea con el ciclo del KDS (pedido, en_espera, ingresante...).
 */
const ESTADOS_EN_PROCESO = new Set([
    'pendiente',
    'pedido',
    'en_espera',
    'ingresante',
    'preparando',
    'en_preparacion'
]);

/**
 * Devuelve true si un plato está en proceso (asignado a un cocinero y aún no finalizado).
 */
export function platoEnProceso(plato) {
    if (!plato) return false;
    if (!plato.procesandoPor || !plato.procesandoPor.cocineroId) return false;
    if (plato.eliminado) return false;
    return ESTADOS_EN_PROCESO.has(plato.estado);
}

/**
 * Calcula el número de cola (1..N) para cada plato en proceso, agrupado por cocinero.
 *
 * @param {Array} comandas - Lista de comandas (cada una con .platos[]).
 * @returns {Map<string, number>} Clave `${comandaId}-${platoIndex}` => número de cola (1..N por cocinero).
 *         Ejemplo: plato #1 de Juan => 1, plato #2 de Juan => 2, plato #1 de Martha => 1.
 */
export function calcularNumerosColaPorCocinero(comandas) {
    const mapa = new Map();

    if (!Array.isArray(comandas) || comandas.length === 0) return mapa;

    // 1) Recolectar todos los platos en proceso, agrupados por cocineroId.
    const porCocinero = new Map(); // cocineroId -> [{ comandaId, platoIndex, timestamp, plato }]

    for (const comanda of comandas) {
        if (!comanda || !Array.isArray(comanda.platos)) continue;
        const comandaId = comanda._id || comanda.id;
        comanda.platos.forEach((plato, platoIndex) => {
            if (!platoEnProceso(plato)) return;
            const cocineroId = String(plato.procesandoPor.cocineroId);
            const timestamp = plato.procesandoPor.timestamp
                ? new Date(plato.procesandoPor.timestamp).getTime()
                : 0;
            if (!porCocinero.has(cocineroId)) porCocinero.set(cocineroId, []);
            porCocinero.get(cocineroId).push({ comandaId, platoIndex, timestamp, plato });
        });
    }

    // 2) Por cada cocinero, ordenar por timestamp ASC (más antiguo primero) y asignar #1..#N.
    for (const [cocineroId, lista] of porCocinero.entries()) {
        lista.sort((a, b) => {
            if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
            // Desempate estable: comandaId + índice
            const ca = String(a.comandaId);
            const cb = String(b.comandaId);
            if (ca !== cb) return ca.localeCompare(cb);
            return a.platoIndex - b.platoIndex;
        });
        lista.forEach((item, i) => {
            mapa.set(`${item.comandaId}-${item.platoIndex}`, i + 1);
        });
    }

    return mapa;
}

/**
 * Devuelve el número de cola de un plato concreto (1..N) o null si no está en cola.
 *
 * @param {Object} plato
 * @param {Array} comandas
 * @returns {number|null}
 */
export function numeroColaDePlato(plato, comandas) {
    if (!plato || !Array.isArray(comandas)) return null;
    const mapa = calcularNumerosColaPorCocinero(comandas);
    for (const comanda of comandas) {
        if (!comanda || !Array.isArray(comanda.platos)) continue;
        const comandaId = comanda._id || comanda.id;
        const idx = comanda.platos.findIndex(p => p === plato || p._id === plato._id);
        if (idx >= 0) {
            return mapa.get(`${comandaId}-${idx}`) ?? null;
        }
    }
    return null;
}

/**
 * Devuelve true si el plato es el #1 de su cocinero (es decir, se puede finalizar directo
 * con obligarOrdenAsignacion activo).
 *
 * @param {Object} plato
 * @param {Array} comandas
 * @returns {boolean}
 */
export function esPrimeroEnCola(plato, comandas) {
    const n = numeroColaDePlato(plato, comandas);
    return n === 1;
}

/**
 * Filtra un lote de platos marcados para finalizar, respetando el orden #1 por cocinero.
 *
 * Devuelve:
 *   {
 *     finalizables: [...],   // líneas que son #1 de su cocinero (o del admin)
 *     bloqueados:   [...]    // líneas #2+ que requieren Solicitar Orden o no se pueden cerrar
 *   }
 *
 * El llamador (handleFinalizarPlatosGlobal) decide qué hacer con `bloqueados`:
 * - Si admin => finalizar todo (no usar esta función, o ignorar bloqueados).
 * - Si supervisor + solicitud ON => crear Solicitar Orden para cada bloqueado.
 * - Si supervisor + solicitud OFF => incluir bloqueados en finalizables (bypass).
 *
 * @param {Array} platosMarcados - [{ comandaId, platoId, platoIndex, plato }]
 * @param {Array} comandas
 * @returns {{ finalizables: Array, bloqueados: Array }}
 */
export function filtrarLoteRespetandoOrden(platosMarcados, comandas) {
    const mapa = calcularNumerosColaPorCocinero(comandas);
    const finalizables = [];
    const bloqueados = [];

    if (!Array.isArray(platosMarcados)) return { finalizables, bloqueados };

    for (const item of platosMarcados) {
        const key = `${item.comandaId}-${item.platoIndex}`;
        const numero = mapa.get(key);
        if (numero == null) {
            // No está en cola (no debería pasar si está marcado); incluir como finalizable
            finalizables.push(item);
        } else if (numero === 1) {
            finalizables.push(item);
        } else {
            bloqueados.push({ ...item, numeroColaActual: numero });
        }
    }

    return { finalizables, bloqueados };
}

/**
 * Devuelve el número de cola para un par (comandaId, platoIndex) dado el mapa precalculado.
 * Útil para renderizar el badge #N sin recalcular por cada plato.
 *
 * @param {Map} mapa - Resultado de calcularNumerosColaPorCocinero
 * @param {string} comandaId
 * @param {number} platoIndex
 * @returns {number|null}
 */
export function numeroColaDesdeMapa(mapa, comandaId, platoIndex) {
    if (!mapa) return null;
    return mapa.get(`${comandaId}-${platoIndex}`) ?? null;
}

export { ESTADOS_EN_PROCESO };
