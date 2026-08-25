/**
 * useCocinaMonitorData - Hook de datos para Ver Cocina (solo lectura)
 *
 * Carga comandas del día vía GET /api/comanda/cocina/:fecha y se mantiene
 * actualizado en tiempo real vía Socket.io namespace /cocina.
 *
 * Al finalizar (recoger) NO se reemplaza la comanda entera: un payload mongoose
 * o un GET cacheado volvía a dejar el plato en pedido+procesandoPor.
 *
 * @module useCocinaMonitorData
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { getApiUrl } from '../config/apiConfig';
import useSocketCocina from './useSocketCocina';
import { esEventoGuarnicion, aplicarEventoGuarnicion } from '../utils/guarnicionesKds';
import { platoCoincideId, normalizarId } from '../utils/platoHelpers';

const ESTADOS_LISTOS = new Set(['recoger', 'salio', 'entregado', 'pagado']);

function idsIguales(a, b) {
  const na = normalizarId(a);
  const nb = normalizarId(b);
  return !!(na && nb && na === nb);
}

function comandaReemplazoValida(comanda) {
  return !!(comanda && Array.isArray(comanda.platos));
}

function aplicarEstadoEnPlatos(platos, platoId, nuevoEstado) {
  if (!Array.isArray(platos) || !platoId || !nuevoEstado) return { platos, hits: 0 };
  let hits = 0;
  const next = platos.map((p) => {
    if (!platoCoincideId(p, platoId)) return p;
    hits += 1;
    const updated = { ...p, estado: nuevoEstado };
    if (ESTADOS_LISTOS.has(nuevoEstado)) updated.procesandoPor = null;
    return updated;
  });
  return { platos: next, hits };
}

function aplicarFinalizacionEnComandas(comandas, comandaId, platoId, nuevoEstado) {
  const tryPass = (exigirComanda) => {
    let hits = 0;
    const next = comandas.map((comanda) => {
      if (exigirComanda && comandaId && !idsIguales(comanda._id || comanda.id, comandaId)) {
        return comanda;
      }
      const r = aplicarEstadoEnPlatos(comanda.platos, platoId, nuevoEstado);
      hits += r.hits;
      return r.hits ? { ...comanda, platos: r.platos } : comanda;
    });
    return { next, hits };
  };

  const conComanda = tryPass(true);
  if (conComanda.hits > 0) return conComanda.next;
  return tryPass(false).next;
}

function fusionarComandaSinRegresarListo(local, incoming) {
  const incomingPlatos = incoming.platos || [];
  const localPlatos = local?.platos || [];
  const platos = incomingPlatos.map((inc) => {
    if (ESTADOS_LISTOS.has(inc.estado)) return { ...inc, procesandoPor: null };
    const loc = localPlatos.find((lp) => platoCoincideId(lp, inc._id) || platoCoincideId(inc, lp._id));
    if (loc && ESTADOS_LISTOS.has(loc.estado)) {
      return { ...inc, estado: loc.estado, procesandoPor: null };
    }
    return inc;
  });
  return { ...incoming, platos };
}

const useCocinaMonitorData = ({ getToken, cocineroId = null }) => {
  const [comandas, setComandas] = useState([]);
  const [remoteMonitorDesign, setRemoteMonitorDesign] = useState(null);

  const onMonitorConfigVisual = useCallback((data) => {
    if (!data) return;
    setRemoteMonitorDesign(data);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refetchTimerRef = useRef(null);
  const obtenerComandasRef = useRef(null);

  // Obtener comandas del día
  const obtenerComandas = useCallback(async (opts = {}) => {
    const silent = opts === true || opts.silent === true;
    try {
      if (!silent) setLoading(true);
      const fechaActual = moment().tz('America/Lima').format('YYYY-MM-DD');
      const apiUrl = `${getApiUrl()}/cocina/${fechaActual}`;
      const response = await axios.get(apiUrl, {
        timeout: 5000,
        params: { _t: Date.now() },
      });

      const comandasValidas = (response.data || []).filter(c => {
        if (c.IsActive === false || c.IsActive === null || c.eliminada === true) return false;
        if (!c.platos || c.platos.length === 0) return false;
        return true;
      });

      setComandas(prev => {
        if (!silent) return comandasValidas;
        const byId = new Map(prev.map(c => [normalizarId(c._id || c.id), c]));
        return comandasValidas.map((inc) => {
          const loc = byId.get(normalizarId(inc._id || inc.id));
          return loc ? fusionarComandaSinRegresarListo(loc, inc) : inc;
        });
      });
      setLastRefresh(moment().tz('America/Lima').format('HH:mm:ss'));
      setError(null);
    } catch (err) {
      console.warn('[useCocinaMonitorData] Error obteniendo comandas:', err.message);
      if (!silent) setError(err.message || 'Error al obtener comandas');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  obtenerComandasRef.current = obtenerComandas;

  const programarRefrescoSilencioso = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      obtenerComandasRef.current?.({ silent: true });
    }, 500);
  }, []);

  useEffect(() => () => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
  }, []);

  const onNuevaComanda = useCallback((payload) => {
    setComandas(prev => {
      const comanda = payload.comanda || payload;
      const id = comanda._id || comanda.id;
      const exists = prev.some(c => idsIguales(c._id || c.id, id));
      if (exists) return prev;
      return [...prev, comanda];
    });
  }, []);

  /**
   * comanda-actualizada: fusionar sin devolver a pedido un plato ya en recoger.
   */
  const onComandaActualizada = useCallback((payload) => {
    const comandaReplacement = payload.comanda || payload;
    const id = comandaReplacement._id || comandaReplacement.id || payload._id || payload.id || payload.comandaId;

    setComandas(prev => {
      if (comandaReplacement.IsActive === false || comandaReplacement.IsActive === null ||
          comandaReplacement.eliminada === true || comandaReplacement.status === 'cancelado') {
        return prev.filter(c => idsIguales(c._id || c.id, id) === false);
      }

      if (!comandaReemplazoValida(comandaReplacement)) return prev;

      return prev.map(c => {
        if (!idsIguales(c._id || c.id, id)) return c;
        return fusionarComandaSinRegresarListo(c, comandaReplacement);
      });
    });
  }, []);

  /**
   * plato-actualizado / plato-procesando / plato-liberado.
   * En recoger/salio solo parche granular: reemplazar la comanda reponía el plato.
   */
  const onPlatoActualizado = useCallback((payload) => {
    if (!payload) return;
    const comandaId = payload.comandaId;
    const platoId = payload.platoId;
    const tipo = payload.tipo;

    if (esEventoGuarnicion(payload)) {
      setComandas(prev => aplicarEventoGuarnicion(prev, payload));
      return;
    }

    const nuevoEstado = payload.nuevoEstado || payload.estado;
    const esListo = !!(nuevoEstado && ESTADOS_LISTOS.has(nuevoEstado));

    if (platoId && nuevoEstado) {
      setComandas(prev => aplicarFinalizacionEnComandas(prev, comandaId, platoId, nuevoEstado));
      if (esListo) {
        programarRefrescoSilencioso();
        return;
      }
    } else if (esListo) {
      programarRefrescoSilencioso();
      return;
    }

    if (payload.comanda && comandaReemplazoValida(payload.comanda)) {
      const id = payload.comanda._id || payload.comanda.id || comandaId;
      setComandas(prev => {
        if (payload.comanda.IsActive === false || payload.comanda.IsActive === null ||
            payload.comanda.eliminada === true) {
          return prev.filter(c => !idsIguales(c._id || c.id, id));
        }
        const exists = prev.some(c => idsIguales(c._id || c.id, id));
        if (exists) {
          return prev.map(c => (
            idsIguales(c._id || c.id, id)
              ? fusionarComandaSinRegresarListo(c, payload.comanda)
              : c
          ));
        }
        return [...prev, payload.comanda];
      });
      return;
    }

    if (tipo === 'PLATO_TOMADO' && payload.procesandoPor) {
      const procesandoPor = {
        ...payload.procesandoPor,
        timestamp: payload.procesandoPor.timestamp || payload.timestamp || new Date().toISOString(),
      };
      setComandas(prev => prev.map(comanda => {
        if (!idsIguales(comanda._id || comanda.id, comandaId)) return comanda;
        const platosActualizados = (comanda.platos || []).map(p => {
          if (!platoCoincideId(p, platoId)) return p;
          return { ...p, procesandoPor };
        });
        return { ...comanda, platos: platosActualizados };
      }));
      return;
    }

    if (tipo === 'PLATO_LIBERADO') {
      setComandas(prev => prev.map(comanda => {
        if (!idsIguales(comanda._id || comanda.id, comandaId)) return comanda;
        const platosActualizados = (comanda.platos || []).map(p => {
          if (!platoCoincideId(p, platoId)) return p;
          return { ...p, procesandoPor: null };
        });
        return { ...comanda, platos: platosActualizados };
      }));
    }
  }, [programarRefrescoSilencioso]);

  // Socket subscription (solo lectura)
  const { connected, connectionStatus } = useSocketCocina({
    onNuevaComanda,
    onComandaActualizada,
    onPlatoActualizado,
    onPlatoCanceladoUrgente: onPlatoActualizado,
    onPlatoAnulado: onComandaActualizada,
    onComandaAnulada: onComandaActualizada,
    obtenerComandas,
    token: getToken() || null,
    cocineroId,
    onMonitorConfigVisual,
  });

  useEffect(() => {
    obtenerComandas();
  }, [obtenerComandas]);

  // Re-obtener comandas cada 30s como respaldo si el socket falla
  useEffect(() => {
    const interval = setInterval(() => {
      if (!connected) {
        obtenerComandas();
      }
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [connected, obtenerComandas]);

  return {
    comandas,
    loading,
    error,
    lastRefresh,
    connected,
    connectionStatus,
    refrescar: obtenerComandas,
    remoteMonitorDesign,
  };
};

export default useCocinaMonitorData;