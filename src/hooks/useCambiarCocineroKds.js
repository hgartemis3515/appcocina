/**
 * Modal CAMBIAR PLATO: reasigna el plato tomado a otro cocinero (forzar).
 * El socket plato-procesando actualiza KDS y Ver Cocina completo.
 *
 * Click en un cocinero = todos los seleccionados (comportamiento original).
 * Extensión: { allocations: [{ cocineroId, cantidad }] } reparte unidades
 * (una línea de 10 puede ir 5 y 5; el backend parte la línea).
 */
import { useCallback, useState } from 'react';
import useAsignacionCocinero from './useAsignacionCocinero';
import { esTipoGuarnicionKds } from '../utils/guarnicionesKds';

function cantidadUnidadesSeleccion(p) {
  const n = Number(p?.cantidad);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default function useCambiarCocineroKds({
  getToken,
  userId,
  userName,
  alias,
  tomarPlato,
  tomarGuarnicion,
  showToast,
  onDone
}) {
  const { cocineros, loadingCocineros, cargarCocineros } = useAsignacionCocinero({
    getToken,
    showToast
  });
  const [abierto, setAbierto] = useState(false);
  const [platos, setPlatos] = useState([]);
  const [procesando, setProcesando] = useState(false);

  const usuarioActual = userId
    ? { _id: String(userId), nombre: userName || 'Yo', alias: alias || userName || 'Yo' }
    : null;

  const abrir = useCallback((lista) => {
    if (!lista || lista.length === 0) return;
    setPlatos(lista);
    setAbierto(true);
    cargarCocineros();
  }, [cargarCocineros]);

  const cerrar = useCallback(() => {
    if (procesando) return;
    setAbierto(false);
    setPlatos([]);
  }, [procesando]);

  const confirmar = useCallback(async (cocineroIdOReparto) => {
    const esAlloc = cocineroIdOReparto && typeof cocineroIdOReparto === 'object'
      && Array.isArray(cocineroIdOReparto.allocations);
    const esReparto = cocineroIdOReparto && typeof cocineroIdOReparto === 'object'
      && Array.isArray(cocineroIdOReparto.reparto);
    if (!esAlloc && !esReparto && (!cocineroIdOReparto || platos.length === 0)) return;
    if (esAlloc && cocineroIdOReparto.allocations.length === 0) return;
    if (esReparto && cocineroIdOReparto.reparto.length === 0) return;
    setProcesando(true);

    const asignarUno = async (p, cocineroId, cantidad = null) => {
      if (esTipoGuarnicionKds(p.tipo)) {
        return tomarGuarnicion(
          p.comandaId || p.comanda?._id,
          p.platoId,
          p.compId,
          cocineroId,
          true
        );
      }
      return tomarPlato(
        p.comandaId || p.comanda?._id,
        p.liveId || p.platoId || p._id,
        cocineroId,
        true,
        true,
        cantidad
      );
    };

    let exitosos = 0;
    try {
      if (esAlloc) {
        const pool = platos.map((p) => ({
          ...p,
          remaining: cantidadUnidadesSeleccion(p),
          liveId: p.platoId || p._id
        }));
        for (const alloc of cocineroIdOReparto.allocations) {
          let need = Math.max(0, Math.floor(Number(alloc.cantidad) || 0));
          const cocineroId = alloc.cocineroId;
          if (!cocineroId || need < 1) continue;
          for (const item of pool) {
            if (need <= 0) break;
            if (item.remaining <= 0) continue;
            if (esTipoGuarnicionKds(item.tipo)) {
              const result = await asignarUno(item, cocineroId);
              if (result?.success) {
                exitosos += 1;
                item.remaining = 0;
                need -= 1;
              }
              continue;
            }
            const take = Math.min(need, item.remaining);
            const result = await asignarUno(item, cocineroId, take);
            if (result?.success) {
              exitosos += 1;
              item.remaining -= take;
              need -= take;
            }
          }
        }
      } else if (esReparto) {
        for (const item of cocineroIdOReparto.reparto) {
          const result = await asignarUno(item.plato, item.cocineroId, item.cantidad || null);
          if (result?.success) exitosos += 1;
        }
      } else {
        for (const p of platos) {
          const result = await asignarUno(p, cocineroIdOReparto);
          if (result?.success) exitosos += 1;
        }
      }
      if (exitosos > 0) {
        showToast?.({
          type: 'success',
          message: `Plato${exitosos > 1 ? 's' : ''} asignado${exitosos > 1 ? 's' : ''} a otro cocinero`,
          duration: 3000
        });
        onDone?.(platos, exitosos);
        setAbierto(false);
        setPlatos([]);
      }
    } finally {
      setProcesando(false);
    }
  }, [platos, tomarPlato, tomarGuarnicion, showToast, onDone]);

  return {
    abierto,
    platos,
    cocineros,
    loadingCocineros,
    procesando,
    usuarioActual,
    abrir,
    cerrar,
    confirmar
  };
}
