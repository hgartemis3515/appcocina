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
 * - Se puede finalizar el prefijo contiguo desde #1 (ej. #1+#2) sin Solicitar Orden.
 * - Si se salta el orden (solo #2, o #4 sin #1..#3) → Solicitar Orden / bloqueo.
 * - La cantidad viaja con la línea: marcar el #1 con ×N finaliza las N unidades.
 * - Al complementar con platos de otros cocineros, la regla aplica por cola de cada cocinero.
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
 * ¿El número `n` forma parte de un prefijo contiguo 1..n dentro del set seleccionado?
 * Ej: seleccionados {1,2,3} → 1,2,3 OK. {1,2,4} → 4 NO (falta 3). {2,3} → ninguno (falta 1).
 */
export function esPrefijoContiguoDesdeUno(numero, numerosSeleccionadosSet) {
    if (numero == null || numero < 1) return false;
    if (!numerosSeleccionadosSet || typeof numerosSeleccionadosSet.has !== 'function') return false;
    for (let i = 1; i <= numero; i++) {
        if (!numerosSeleccionadosSet.has(i)) return false;
    }
    return true;
}

/**
 * Filtra un lote de platos marcados para finalizar, respetando el orden de cola por cocinero.
 *
 * Regla:
 * - Por cada cocinero (incluida selección de platos ajenos / supervisor), se puede
 *   finalizar el prefijo contiguo desde #1 (ej. #1+#2+#3) sin Solicitar Orden.
 * - Si se salta el orden (ej. solo #2, o #1+#2+#4 sin #3), esos platos van a `bloqueados`.
 *
 * @param {Array} platosMarcados - [{ comandaId, platoId, platoIndex, plato }]
 * @param {Array} comandas
 * @param {Object} [opts]
 * @param {Function} [opts.tieneOverride] - (item) => boolean — override one-shot aprobado
 * @returns {{ finalizables: Array, bloqueados: Array }}
 */
export function filtrarLoteRespetandoOrden(platosMarcados, comandas, opts = {}) {
    const mapa = calcularNumerosColaPorCocinero(comandas);
    const finalizables = [];
    const bloqueados = [];
    const tieneOverride = typeof opts.tieneOverride === 'function' ? opts.tieneOverride : () => false;

    if (!Array.isArray(platosMarcados) || platosMarcados.length === 0) {
        return { finalizables, bloqueados };
    }

    // Agrupar selección por cocinero dueño de la cola (procesandoPor), no por quien pulsa.
    const porCocinero = new Map(); // cocineroId -> [{ item, numero, key }]
    const sinCola = [];

    for (const item of platosMarcados) {
        if (tieneOverride(item)) {
            finalizables.push(item);
            continue;
        }
        const key = `${item.comandaId}-${item.platoIndex}`;
        const numero = mapa.get(key);
        if (numero == null) {
            sinCola.push(item);
            continue;
        }
        const cocineroId = String(
            item.plato?.procesandoPor?.cocineroId ||
            item.cocineroId ||
            '_sin_cocinero'
        );
        if (!porCocinero.has(cocineroId)) porCocinero.set(cocineroId, []);
        porCocinero.get(cocineroId).push({ item, numero, key });
    }

    // Sin número de cola: no aplicar bloqueo de secuencia
    for (const item of sinCola) {
        finalizables.push(item);
    }

    for (const entradas of porCocinero.values()) {
        const seleccionados = new Set(entradas.map((e) => e.numero));
        for (const { item, numero } of entradas) {
            if (esPrefijoContiguoDesdeUno(numero, seleccionados)) {
                finalizables.push({ ...item, numeroColaActual: numero });
            } else {
                bloqueados.push({ ...item, numeroColaActual: numero });
            }
        }
    }

    // Estabilidad: finalizables en orden de cola ASC (luego batch secuencial respeta FIFO)
    finalizables.sort((a, b) => {
        const na = a.numeroColaActual ?? 0;
        const nb = b.numeroColaActual ?? 0;
        if (na !== nb) return na - nb;
        return String(a.comandaId).localeCompare(String(b.comandaId));
    });

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
