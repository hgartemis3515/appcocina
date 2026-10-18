import { useEffect, useRef } from 'react';
import { INTERVALO_AVISO_RESERVA_MS, reservasParaAvisar } from '../utils/avisoReservasKds';

const REVISION_MS = 15 * 1000;

/**
 * Mientras la reserva siga en Reservadas (no enviada a cocina), avisa al entrar
 * y otra vez cada 30 minutos.
 */
export default function useAvisoReservasKds(reservas, onAviso) {
  const ultimoAviso = useRef(new Map());
  const onAvisoRef = useRef(onAviso);
  const reservasRef = useRef(reservas);
  onAvisoRef.current = onAviso;
  reservasRef.current = reservas;

  const firma = (Array.isArray(reservas) ? reservas : [])
    .map((r) => String(r?._id || ''))
    .filter(Boolean)
    .sort()
    .join('|');

  useEffect(() => {
    const revisar = () => {
      const lista = Array.isArray(reservasRef.current) ? reservasRef.current : [];
      const ids = new Set(lista.map((r) => String(r?._id || '')).filter(Boolean));
      for (const id of ultimoAviso.current.keys()) {
        if (!ids.has(id)) ultimoAviso.current.delete(id);
      }
      const ahora = Date.now();
      const pendientes = reservasParaAvisar(lista, ultimoAviso.current, ahora, INTERVALO_AVISO_RESERVA_MS);
      if (!pendientes.length) return;
      pendientes.forEach((r) => ultimoAviso.current.set(String(r._id), ahora));
      if (typeof onAvisoRef.current === 'function') onAvisoRef.current(pendientes);
    };

    revisar();
    const id = setInterval(revisar, REVISION_MS);
    return () => clearInterval(id);
  }, [firma]);
}
