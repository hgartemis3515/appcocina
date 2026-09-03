/**
 * Modal CAMBIAR PLATO: reasigna el plato tomado a otro cocinero (forzar).
 * El socket plato-procesando actualiza KDS y Ver Cocina completo.
 */
import { useCallback, useState } from 'react';
import useAsignacionCocinero from './useAsignacionCocinero';
import { esTipoGuarnicionKds } from '../utils/guarnicionesKds';

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

  const confirmar = useCallback(async (cocineroId) => {
    if (!cocineroId || platos.length === 0) return;
    setProcesando(true);
    const principales = platos.filter((p) => !esTipoGuarnicionKds(p.tipo));
    const guarniciones = platos.filter((p) => esTipoGuarnicionKds(p.tipo));
    let exitosos = 0;
    try {
      for (const p of principales) {
        const result = await tomarPlato(
          p.comandaId || p.comanda?._id,
          p.platoId || p._id,
          cocineroId,
          true,
          true
        );
        if (result?.success) exitosos += 1;
      }
      for (const g of guarniciones) {
        const result = await tomarGuarnicion(
          g.comandaId || g.comanda?._id,
          g.platoId,
          g.compId,
          cocineroId,
          true
        );
        if (result?.success) exitosos += 1;
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
