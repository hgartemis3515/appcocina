import { useCallback, useEffect, useMemo, useRef } from 'react';

export const MS_DESELECCION_PLATO_KDS = 20000;

export function segundosDeseleccionPlatoKds(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 20;
  return Math.min(180, Math.max(5, Math.round(n)));
}

export function msDeseleccionPlatoKds(valor) {
  return segundosDeseleccionPlatoKds(valor) * 1000;
}

export function segundosParpadeoSos(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 15;
  return Math.min(180, Math.max(1, Math.round(n)));
}

export function quitarSeleccionPlato(prev, key) {
  const est = prev?.get?.(key);
  if (est !== 'seleccionado' && est !== 'entregando') return prev;
  const next = new Map(prev);
  next.delete(key);
  return next;
}

/** Quita la selección local de un plato. Cada clave tiene su propio temporizador. */
export default function useDeseleccionPlatoKds(setPlatoStates, setPlatosChecked, segundos = 20) {
  const timers = useRef(new Map());
  const msRef = useRef(msDeseleccionPlatoKds(segundos));
  msRef.current = msDeseleccionPlatoKds(segundos);

  const cancelar = useCallback((key) => {
    const prev = timers.current.get(key);
    if (prev) clearTimeout(prev);
    timers.current.delete(key);
  }, []);

  const programar = useCallback((key) => {
    cancelar(key);
    const id = setTimeout(() => {
      timers.current.delete(key);
      setPlatoStates((prev) => quitarSeleccionPlato(prev, key));
      if (typeof setPlatosChecked === 'function') {
        setPlatosChecked((prev) => {
          if (!prev?.has?.(key)) return prev;
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    }, msRef.current);
    timers.current.set(key, id);
  }, [cancelar, setPlatoStates, setPlatosChecked]);

  useEffect(() => () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current.clear();
  }, []);

  return useMemo(() => ({ programar, cancelar }), [programar, cancelar]);
}
