/**
 * useReservasProgramadas — hook para el tab KDS "Reservadas" y el sidebar Reserva.
 * Carga reservas programadas pendientes desde /api/vista-cocina/reservadas
 * con el JWT de App Cocina (mismo cliente que PPA / aprobación).
 */
import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../config/apiClient';

export default function useReservasProgramadas(socket, cocineroId = null) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = cocineroId ? { cocineroId } : {};
      const data = await apiGet('/api/vista-cocina/reservadas', params);
      setReservas(Array.isArray(data) ? data : (data?.reservas || []));
    } catch (e) {
      setError(e?.response?.data?.error || e?.userMessage || e?.message || 'Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  }, [cocineroId]);

  useEffect(() => {
    fetchReservas();
  }, [fetchReservas]);

  useEffect(() => {
    if (!socket) return undefined;

    const onProgramada = () => {
      fetchReservas();
    };
    const onComandaActualizada = () => {
      fetchReservas();
    };

    socket.on('reserva-programada', onProgramada);
    socket.on('reserva-alerta-activacion', onProgramada);
    socket.on('comanda-actualizada', onComandaActualizada);
    socket.on('reserva-actualizada', onProgramada);
    socket.on('reserva-creada', onProgramada);
    socket.on('ticket-ppa-aprobado', onProgramada);
    socket.on('reserva-cancelada', onProgramada);

    return () => {
      socket.off('reserva-programada', onProgramada);
      socket.off('reserva-alerta-activacion', onProgramada);
      socket.off('comanda-actualizada', onComandaActualizada);
      socket.off('reserva-actualizada', onProgramada);
      socket.off('reserva-creada', onProgramada);
      socket.off('ticket-ppa-aprobado', onProgramada);
      socket.off('reserva-cancelada', onProgramada);
    };
  }, [socket, fetchReservas]);

  return { reservas, loading, error, fetchReservas };
}
