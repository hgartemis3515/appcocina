/**
 * useCocinaMonitorData - Hook de datos para Ver Cocina (solo lectura)
 *
 * Carga comandas del día vía GET /api/comanda/cocina/:fecha y se mantiene
 * actualizado en tiempo real vía Socket.io namespace /cocina.
 *
 * v2.3: Refleja TODAS las acciones de los 3 tableros KDS en tiempo real:
 *   - Tomar plato (plato-procesando): setea procesandoPor -> el plato aparece
 *   - Liberar plato (plato-liberado): quita procesandoPor -> el plato desaparece
 *   - Finalizar plato (plato-actualizado, nuevoEstado='recoger'): comanda completa -> el grupo se reduce al recalcular
 *   - Entregar plato (plato-actualizado, nuevoEstado='salio'): comanda completa -> igual
 *   - Nueva comanda / comanda actualizada: reemplaza comanda completa
 *
 * El backend SIEMPRE envía la `comanda` completa populatada en plato-actualizado
 * y comanda-actualizada, así que reemplazamos la comanda entera en el estado.
 * Esto garantiza que cualquier acción en cualquier tablero (General, Personal, Supervisor)
 * se refleje inmediatamente en Ver Cocina.
 *
 * @module useCocinaMonitorData
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { getApiUrl } from '../config/apiConfig';
import useSocketCocina from './useSocketCocina';

const useCocinaMonitorData = ({ getToken, cocineroId = null }) => {
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Obtener comandas del día
  const obtenerComandas = useCallback(async () => {
    try {
      setLoading(true);
      const fechaActual = moment().tz('America/Lima').format('YYYY-MM-DD');
      const apiUrl = `${getApiUrl()}/cocina/${fechaActual}`;
      const response = await axios.get(apiUrl, { timeout: 5000 });

      const comandasValidas = (response.data || []).filter(c => {
        if (c.IsActive === false || c.IsActive === null || c.eliminada === true) return false;
        if (!c.platos || c.platos.length === 0) return false;
        return true;
      });

      setComandas(comandasValidas);
      setLastRefresh(moment().tz('America/Lima').format('HH:mm:ss'));
      setError(null);
    } catch (err) {
      console.warn('[useCocinaMonitorData] Error obteniendo comandas:', err.message);
      setError(err.message || 'Error al obtener comandas');
    } finally {
      setLoading(false);
    }
  }, []);

  const onNuevaComanda = useCallback((payload) => {
    setComandas(prev => {
      const comanda = payload.comanda || payload;
      const id = comanda._id || comanda.id;
      const exists = prev.some(c => (c._id || c.id) === id);
      if (exists) return prev;
      return [...prev, comanda];
    });
  }, []);

  /**
   * Maneja comanda-actualizada y comanda-anulada.
   * El backend envía la comanda completa en payload.comanda (o el payload mismo).
   * Reemplazamos la comanda entera en el estado.
   */
  const onComandaActualizada = useCallback((payload) => {
    const comandaReplacement = payload.comanda || payload;
    const id = comandaReplacement._id || comandaReplacement.id || payload._id || payload.id || payload.comandaId;

    setComandas(prev => {
      // Si la comanda está eliminada/anulada, removerla
      if (comandaReplacement.IsActive === false || comandaReplacement.IsActive === null ||
          comandaReplacement.eliminada === true || comandaReplacement.status === 'cancelado') {
        return prev.filter(c => (c._id || c.id) !== id);
      }

      // Reemplazar la comanda completa (datos frescos del backend)
      return prev.map(c => {
        if ((c._id || c.id) === id) {
          return { ...comandaReplacement };
        }
        return c;
      });
    });
  }, []);

  /**
   * v2.3: Maneja plato-actualizado, plato-procesando y plato-liberado.
   *
   * El backend emite `plato-actualizado` con:
   *   { comandaId, platoId, nuevoEstado, comanda (completa populatada), timestamp }
   *
   * El backend emite `plato-procesando` con:
   *   { comandaId, platoId, cocinero, procesandoPor: cocinero, timestamp }
   *
   * `useSocketCocina` enruta los tres eventos a este callback. Detectamos
   * el caso y reaccionamos de la forma más robusta posible:
   *   - Si viene `comanda` (plato-actualizado), reemplazamos toda la comanda.
   *   - Si viene `procesandoPor` con `tipo:'PLATO_TOMADO'`, seteamos procesandoPor.
   *   - Si viene `tipo:'PLATO_LIBERADO'`, quitamos procesandoPor.
   * En todos los casos, el hook `useCocinaMonitorFilter` recalcula los grupos,
   * lo que hace que el plato aparezca/desaparezca y la cantidad se sume/reduzca.
   */
  const onPlatoActualizado = useCallback((payload) => {
    if (!payload) return;
    const comandaId = payload.comandaId;
    const platoId = payload.platoId;
    const tipo = payload.tipo; // 'PLATO_TOMADO' | 'PLATO_LIBERADO' | undefined (plato-actualizado)

    // Caso A: El backend envía la comanda completa (plato-actualizado / plato-actualizado-batch)
    // Reemplazamos toda la comanda - garantiza que el estado del plato sea el correcto
    // y que cualquier acción (tomar, finalizar, entregar) se refleje.
    if (payload.comanda) {
      const comandaReplacement = payload.comanda;
      const id = comandaReplacement._id || comandaReplacement.id || comandaId;
      setComandas(prev => {
        // Si está eliminada, quitarla
        if (comandaReplacement.IsActive === false || comandaReplacement.IsActive === null ||
            comandaReplacement.eliminada === true) {
          return prev.filter(c => (c._id || c.id) !== id);
        }
        // Reemplazar o agregar
        const exists = prev.some(c => (c._id || c.id) === id);
        if (exists) {
          return prev.map(c => ((c._id || c.id) === id) ? { ...comandaReplacement } : c);
        }
        return [...prev, { ...comandaReplacement }];
      });
      return;
    }

    // Caso B: Plato tomado por un cocinero (plato-procesando sin comanda completa)
    if (tipo === 'PLATO_TOMADO' && payload.procesandoPor) {
      const procesandoPor = {
        ...payload.procesandoPor,
        timestamp: payload.procesandoPor.timestamp || payload.timestamp || new Date().toISOString(),
      };
      setComandas(prev => prev.map(comanda => {
        const matchesComanda = (comanda._id || comanda.id) === comandaId;
        if (!matchesComanda) return comanda;
        const platosActualizados = (comanda.platos || []).map(p => {
          const idA = String(p._id || p.id || '');
          const idB = String(platoId || '');
          if (idA !== idB) return p;
          return { ...p, procesandoPor };
        });
        return { ...comanda, platos: platosActualizados };
      }));
      return;
    }

    // Caso C: Plato liberado (plato-liberado, sin comanda completa)
    // Quitar el `procesandoPor` del plato
    if (tipo === 'PLATO_LIBERADO') {
      setComandas(prev => prev.map(comanda => {
        const matchesComanda = (comanda._id || comanda.id) === comandaId;
        if (!matchesComanda) return comanda;
        const platosActualizados = (comanda.platos || []).map(p => {
          const idA = String(p._id || p.id || '');
          const idB = String(platoId || '');
          if (idA !== idB) return p;
          return { ...p, procesandoPor: null };
        });
        return { ...comanda, platos: platosActualizados };
      }));
      return;
    }

    // Caso D: plato-actualizado SIN comanda completa (edge case)
    // Parchar el estado del plato individual usando `nuevoEstado` o `estado`
    if (!payload.comanda && (payload.nuevoEstado || payload.estado)) {
      const nuevoEstado = payload.nuevoEstado || payload.estado;
      setComandas(prev => prev.map(comanda => {
        const matchesComanda = (comanda._id || comanda.id) === comandaId;
        if (!matchesComanda) return comanda;
        const platosActualizados = (comanda.platos || []).map(p => {
          const idA = String(p._id || p.id || '');
          const idB = String(platoId || '');
          if (idA !== idB) return p;
          const updated = { ...p, estado: nuevoEstado };
          if (payload.procesandoPor !== undefined) updated.procesandoPor = payload.procesandoPor;
          return updated;
        });
        return { ...comanda, platos: platosActualizados };
      }));
      return;
    }
  }, []);

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
  };
};

export default useCocinaMonitorData;