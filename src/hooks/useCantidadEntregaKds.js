import { useMemo, useState } from 'react';
import { cantidadEntregaMostrada, clampCantidadEntrega, recolectarLineaCantidadUnica } from '../utils/cantidadEntregaKds';

export default function useCantidadEntregaKds(platoStates, comandas) {
  const linea = useMemo(
    () => recolectarLineaCantidadUnica(platoStates, comandas),
    [platoStates, comandas]
  );
  const [ajuste, setAjuste] = useState({ key: null, value: null });

  const max = linea?.max || 1;
  const key = linea?.key || null;
  const value = cantidadEntregaMostrada(linea, ajuste);

  const setFromUi = (n) => {
    if (!key) return;
    setAjuste({ key, value: clampCantidadEntrega(n, max) });
  };

  return {
    visible: !!linea,
    nombre: linea?.nombre || '',
    max,
    value,
    key,
    setValue: setFromUi,
    minus: () => setFromUi(value - 1),
    plus: () => setFromUi(value + 1),
    maxAll: () => setFromUi(max)
  };
}
