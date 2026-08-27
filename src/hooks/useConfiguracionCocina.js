/**
 * useConfiguracionCocina.js
 *
 * PLAN OBLIGAR_ORDEN_ASIGNACION_KDS_SUPERVISOR
 *
 * Hook ligero para leer los flags de configuración del sistema relacionados
 * con cocina (obligarOrdenAsignacion, solicitudOrdenFueraDeCola).
 *
 * Defaults: ambos true (si el backend no responde o no envía el bloque).
 */
import { useState, useEffect } from 'react';

const DEFAULT = {
    obligarOrdenAsignacion: true,
    solicitudOrdenFueraDeCola: true,
    // PLAN NOMBRE_PLATO_COCINA: alias corto en tabla KDS (escape hatch).
    usarNombreCocinaEnTablaKds: true,
    // PLAN GUARNICIONES_SEPARADAS v1.1: separar principal y guarniciones.
    permitirGuarnicionesSeparadas: true,
    deshabilitarOrdenSecuencialGuarniciones: true,
    deshabilitarAgrupacionGuarniciones: false,
    primerToqueFinalizarAsignado: false,
    tiemposGuarnicion: {
        umbralAlertaMultiplo: 1.5,
        umbralCriticaMultiplo: 2,
        tiemposDefault: { rapido: 180, medio: 420, lento: 900 }
    }
};

let cache = null; // cache en módulo (misma sesión)
let inflight = null;

export async function fetchConfiguracionCocina(getToken) {
    if (cache) return cache;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const headers = {};
            const token = typeof getToken === 'function' ? await getToken() : null;
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/configuracion', { headers });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const cfg = data?.configuracion?.cocina || {};
            cache = {
                obligarOrdenAsignacion: cfg.obligarOrdenAsignacion !== false,
                solicitudOrdenFueraDeCola: cfg.solicitudOrdenFueraDeCola !== false,
                usarNombreCocinaEnTablaKds: cfg.usarNombreCocinaEnTablaKds !== false,
                // PLAN GUARNICIONES_SEPARADAS v1.1
                permitirGuarnicionesSeparadas: cfg.permitirGuarnicionesSeparadas !== false,
                deshabilitarOrdenSecuencialGuarniciones: cfg.deshabilitarOrdenSecuencialGuarniciones !== false,
                deshabilitarAgrupacionGuarniciones: cfg.deshabilitarAgrupacionGuarniciones === true,
                primerToqueFinalizarAsignado: cfg.primerToqueFinalizarAsignado === true,
                tiemposGuarnicion: {
                    umbralAlertaMultiplo: cfg.tiemposGuarnicion?.umbralAlertaMultiplo ?? 1.5,
                    umbralCriticaMultiplo: cfg.tiemposGuarnicion?.umbralCriticaMultiplo ?? 2,
                    tiemposDefault: {
                        rapido: cfg.tiemposGuarnicion?.tiemposDefault?.rapido ?? 180,
                        medio: cfg.tiemposGuarnicion?.tiemposDefault?.medio ?? 420,
                        lento: cfg.tiemposGuarnicion?.tiemposDefault?.lento ?? 900
                    }
                }
            };
            return cache;
        } catch (e) {
            console.warn('[useConfiguracionCocina] uso default por error:', e.message);
            cache = { ...DEFAULT };
            return cache;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}

export function useConfiguracionCocina(getToken) {
    const [config, setConfig] = useState(cache || { ...DEFAULT });
    const [loading, setLoading] = useState(!cache);

    useEffect(() => {
        let alive = true;
        fetchConfiguracionCocina(getToken).then((c) => {
            if (alive) {
                setConfig(c);
                setLoading(false);
            }
        });
        return () => { alive = false; };
    }, [getToken]);

    return { ...config, loading };
}

export default useConfiguracionCocina;
