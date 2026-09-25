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
import { getServerBaseUrl } from '../config/apiConfig';

const DEFAULT = {
    obligarOrdenAsignacion: true,
    solicitudOrdenFueraDeCola: true,
    // PLAN NOMBRE_PLATO_COCINA: alias corto en tabla KDS (escape hatch).
    usarNombreCocinaEnTablaKds: true,
    // PLAN GUARNICIONES_SEPARADAS v1.1: separar principal y guarniciones.
    permitirGuarnicionesSeparadas: true,
    deshabilitarOrdenSecuencialGuarniciones: true,
    deshabilitarAgrupacionGuarniciones: false,
    vistaCocinaGuarnicionComoPlato: true,
    sosCategoriasAlFinal: [],
    ordenSinAutorizacionCategorias: [],
    ordenSinAutorizacionPlatos: [],
    primerToqueFinalizarAsignado: true,
    entregarPlatoEnteroAbsoluto: true,
    cobroPorCantidad: true,
    forzarColorMozoUnico: false,
    colorMozoForzado: '#1e3a8a',
    ignorarFondoVistaMozo: false,
    ocultarAnularEnTablasKds: true,
    ocultarTablasKdsMenosSupervisor: true,
    tiemposGuarnicion: {
        umbralAlertaMultiplo: 1.5,
        umbralCriticaMultiplo: 2,
        tiemposDefault: { rapido: 180, medio: 420, lento: 900 }
    }
};

let cache = null; // cache en módulo (misma sesión)
let inflight = null;

const construirConfigDesdeBackend = (cfg) => ({
    obligarOrdenAsignacion: cfg.obligarOrdenAsignacion !== false,
    solicitudOrdenFueraDeCola: cfg.solicitudOrdenFueraDeCola !== false,
    usarNombreCocinaEnTablaKds: cfg.usarNombreCocinaEnTablaKds !== false,
    // PLAN GUARNICIONES_SEPARADAS v1.1
    permitirGuarnicionesSeparadas: cfg.permitirGuarnicionesSeparadas !== false,
    deshabilitarOrdenSecuencialGuarniciones: cfg.deshabilitarOrdenSecuencialGuarniciones !== false,
    deshabilitarAgrupacionGuarniciones: cfg.deshabilitarAgrupacionGuarniciones === true,
    vistaCocinaGuarnicionComoPlato: cfg.vistaCocinaGuarnicionComoPlato !== false,
    sosCategoriasAlFinal: Array.isArray(cfg.sosCategoriasAlFinal) ? cfg.sosCategoriasAlFinal : [],
    ordenSinAutorizacionCategorias: Array.isArray(cfg.ordenSinAutorizacionCategorias) ? cfg.ordenSinAutorizacionCategorias : [],
    ordenSinAutorizacionPlatos: Array.isArray(cfg.ordenSinAutorizacionPlatos) ? cfg.ordenSinAutorizacionPlatos : [],
    primerToqueFinalizarAsignado: cfg.primerToqueFinalizarAsignado !== false,
    entregarPlatoEnteroAbsoluto: cfg.entregarPlatoEnteroAbsoluto !== false,
    forzarColorMozoUnico: cfg.forzarColorMozoUnico === true,
    colorMozoForzado: (typeof cfg.colorMozoForzado === 'string'
        && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cfg.colorMozoForzado))
        ? cfg.colorMozoForzado
        : '#1e3a8a',
    ignorarFondoVistaMozo: cfg.ignorarFondoVistaMozo === true,
    ocultarAnularEnTablasKds: cfg.ocultarAnularEnTablasKds !== false,
    ocultarTablasKdsMenosSupervisor: cfg.ocultarTablasKdsMenosSupervisor !== false,
    tiemposGuarnicion: {
        umbralAlertaMultiplo: cfg.tiemposGuarnicion?.umbralAlertaMultiplo ?? 1.5,
        umbralCriticaMultiplo: cfg.tiemposGuarnicion?.umbralCriticaMultiplo ?? 2,
        tiemposDefault: {
            rapido: cfg.tiemposGuarnicion?.tiemposDefault?.rapido ?? 180,
            medio: cfg.tiemposGuarnicion?.tiemposDefault?.medio ?? 420,
            lento: cfg.tiemposGuarnicion?.tiemposDefault?.lento ?? 900
        }
    }
});

export async function fetchConfiguracionCocina(getToken) {
    if (cache && !cache._fallback) return cache;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const headers = {};
            const token = typeof getToken === 'function' ? await getToken() : null;
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // FIX: usar URL absoluta del backend (getServerBaseUrl). Antes se usaba
            // '/api/configuracion' relativa, que en dev apunta al puerto de la app
            // (3001) y no al backend (3000): el fetch fallaba y se cacheaban los
            // DEFAULT para toda la sesión (vistaG 'G' de guarniciones pegada).
            const base = getServerBaseUrl();
            const url = base ? `${base}/api/configuracion` : '/api/configuracion';
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const cfg = data?.configuracion?.cocina || {};
            cache = {
                ...construirConfigDesdeBackend(cfg),
                cobroPorCantidad: data?.configuracion?.cobroPorCantidad !== false,
            };
            return cache;
        } catch (e) {
            console.warn('[useConfiguracionCocina] uso default por error:', e.message);
            // No dejar el default (vista G encendida) pegado: el próximo intento
            // con token vuelve a leer la configuración guardada.
            cache = null;
            return { ...DEFAULT, _fallback: true };
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}

/**
 * Reintenta la carga si el último fetch fue un fallback (backend caído/401).
 * Si el backend ya respondió bien, no hay refetch (misma sesión = cache).
 */
export async function refrescarConfiguracionCocinaSiFallback(getToken) {
    if (cache && cache._fallback) {
        cache = null;
        return fetchConfiguracionCocina(getToken);
    }
    return cache;
}

export function invalidarCacheConfiguracionCocina() {
    cache = null;
    inflight = null;
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

    // FIX: si el fetch inicial falló (fallback), reintentar cuando la pestaña
    // recupere foco/visibilidad (ej. backend reiniciado, login recién hecho).
    useEffect(() => {
        let alive = true;
        const reintentar = () => {
            refrescarConfiguracionCocinaSiFallback(getToken).then((c) => {
                if (c && alive) setConfig(c);
            });
        };
        const onVisible = () => { if (document.visibilityState === 'visible') reintentar(); };
        window.addEventListener('focus', reintentar);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            alive = false;
            window.removeEventListener('focus', reintentar);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [getToken]);

    return { ...config, loading };
}

export default useConfiguracionCocina;
