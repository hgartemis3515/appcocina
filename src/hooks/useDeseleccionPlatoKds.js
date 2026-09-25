import { useCallback, useEffect, useMemo, useRef } from 'react';

const MS = 15000;

/** Quita la selección local de un plato a los 15 s. */
export default function useDeseleccionPlatoKds(setPlatoStates, setPlatosChecked) {
  const timers = useRef(new Map());

  const cancelar = useCallback((key) => {
    const prev = timers.current.get(key);
    if (prev) clearTimeout(prev);
    timers.current.delete(key);
  }, []);

  const programar = useCallback((key) => {
    cancelar(key);
    const id = setTimeout(() => {
      timers.current.delete(key);
      setPlatoStates((prev) => {
        const est = prev.get(key);
        if (est !== 'seleccionado' && est !== 'entregando') return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      if (typeof setPlatosChecked === 'function') {
        setPlatosChecked((prev) => {
          if (!prev?.has?.(key)) return prev;
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    }, MS);
    timers.current.set(key, id);
  }, [cancelar, setPlatoStates, setPlatosChecked]);

  useEffect(() => () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current.clear();
  }, []);

  return useMemo(() => ({ programar, cancelar }), [programar, cancelar]);
}
