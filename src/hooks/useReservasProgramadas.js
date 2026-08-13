/**
 * useReservasProgramadas — hook para el tab KDS "Reservadas".
 * PLAN_RESERVAS_MOZOS_CAJA_KDS v1.1
 *
 * Carga reservas programadas pendientes desde /api/vista-cocina/reservadas
 * y escucha el socket 'reserva-programada' para actualizar en tiempo real.
 * Opcionalmente filtra por cocinero encargado (soloMias).
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getServerBaseUrl } from '../config/apiConfig';

const buildUrl = (cocineroId) => {
  const base = getServerBaseUrl();
  const qs = cocineroId ? `?cocineroId=${cocineroId}` : '';
  return `${base}/api/vista-cocina/reservadas${qs}`;
};

export default function useReservasProgramadas(socket, cocineroId = null) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(buildUrl(cocineroId), { timeout: 6000 });
      setReservas(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  }, [cocineroId]);

  // Carga inicial
  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  // Socket: actualizar cuando llegue una reserva programada o se active una comanda
  useEffect(() => {
    if (!socket) return undefined;

    const onProgramada = () => {
      // Recargar para reflejar la nueva reserva (o la que salió al activarse)
      fetchReservas();
    };
    const onComandaActualizada = () => {
      // Una comanda actualizada puede ser la activación de una reserva (sale de Reservadas)
      fetchReservas();
    };

    socket.on('reserva-programada', onProgramada);
    socket.on('reserva-alerta-activacion', onProgramada);
    socket.on('comanda-actualizada', onComandaActualizada);
    socket.on('reserva-actualizada', onProgramada);

    return () => {
      socket.off('reserva-programada', onProgramada);
      socket.off('reserva-alerta-activacion', onProgramada);
      socket.off('comanda-actualizada', onComandaActualizada);
      socket.off('reserva-actualizada', onProgramada);
    };
  }, [socket, fetchReservas]);

  return { reservas, loading, error, fetchReservas };
}
