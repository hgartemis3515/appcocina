/**
 * ReservaSidebar — bandeja de reservas aprobadas esperando fechaCocina.
 * A la derecha de PPA en las tablas KDS. "Atender ya" activa la comanda antes de hora.
 */
import React, { useState } from 'react';
import { FaTimes, FaClock, FaUser, FaUtensils, FaCalendarAlt, FaRocket, FaSyncAlt } from 'react-icons/fa';
import useReservasProgramadas from '../../hooks/useReservasProgramadas';
import SocketConnectionBadge from '../common/SocketConnectionBadge';
import { apiPost } from '../../config/apiClient';

const formatTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

const countdown = (fechaCocina) => {
  if (!fechaCocina) return '';
  const diff = new Date(fechaCocina).getTime() - Date.now();
  if (diff <= 0) return 'ya';
  const min = Math.round(diff / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};

export default function ReservaSidebar({ socket, onClose }) {
  const { reservas, loading, error, fetchReservas } = useReservasProgramadas(socket);
  const [motivo, setMotivo] = useState({});
  const [modalId, setModalId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAtenderYa = async (reserva) => {
    const reservaId = reserva._id;
    const texto = String(motivo[reservaId] || '').trim();
    if (texto.length < 3) {
      alert('El motivo es obligatorio (mínimo 3 caracteres) para auditoría.');
      return;
    }
    if (loadingId) return;
    setLoadingId(reservaId);
    try {
      const usuarioId = localStorage.getItem('userId') || localStorage.getItem('cocineroId') || '';
      await apiPost(`/api/reservas/${reservaId}/activar-anticipada`, {
        motivo: texto,
        usuarioId,
        usuarioNombre: localStorage.getItem('userName') || localStorage.getItem('cocineroName') || 'Cocina',
      });
      setModalId(null);
      setMotivo((prev) => ({ ...prev, [reservaId]: '' }));
      await fetchReservas();
    } catch (err) {
      alert(err?.response?.data?.error || err?.userMessage || err.message || 'No se pudo activar la reserva');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <FaCalendarAlt className="text-pink-400" />
          <h3 className="text-white font-bold text-sm">Reserva</h3>
          {reservas.length > 0 && (
            <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
              {reservas.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReservas} className="text-gray-400 hover:text-white p-1" title="Actualizar">
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
          </button>
          <SocketConnectionBadge connectionStatus={socket?.connected ? 'conectado' : 'desconectado'} />
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-2 text-red-300 text-xs">
            {error}
          </div>
        )}
        {loading && reservas.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <FaClock className="text-2xl mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Cargando reservas...</p>
          </div>
        )}
        {!loading && reservas.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <FaCalendarAlt className="text-2xl mx-auto mb-2 text-pink-500" />
            <p className="text-sm">Sin reservas programadas</p>
            <p className="text-xs mt-1 text-gray-600">Aparecen aquí al aprobar el ticket de reserva.</p>
          </div>
        )}

        {reservas.map((r) => {
          const cd = countdown(r.fechaCocina);
          const platos = r.platos || [];
          return (
            <div key={r._id} className="bg-gray-800 rounded-xl border border-pink-500/30 overflow-hidden">
              <div className="p-3 bg-pink-600/20 border-b border-pink-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-pink-200 text-sm font-mono font-bold">
                    Mesa {r.mesa?.nummesa ?? '?'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-pink-500/30 text-pink-200 border border-pink-500/40">
                    RESERVA
                  </span>
                </div>
                {(r.comandaGenerada?.comandaNumber || r.comanda?.comandaNumber) ? (
                  <div className="text-pink-100 text-xs font-mono mt-1">
                    Comanda #{r.comandaGenerada?.comandaNumber || r.comanda?.comandaNumber}
                  </div>
                ) : null}
                <div className="flex items-center gap-1 mt-1 text-gray-300 text-xs">
                  <FaUser className="text-gray-400" />
                  <span>{r.clienteNombre || 'Cliente'}</span>
                </div>
              </div>

              <div className="p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-gray-300">
                  <span className="flex items-center gap-1">
                    <FaClock className="text-gray-400" />
                    Atención <strong className="text-white">{formatTime(r.fechaReserva)}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between text-pink-200">
                  <span className="flex items-center gap-1">
                    <FaRocket className="text-[10px]" />
                    Entra a KDS <strong>{formatTime(r.fechaCocina)}</strong>
                  </span>
                  <span className="text-pink-300 font-medium">({cd})</span>
                </div>
                <p className="text-gray-500 text-[10px]">{formatDateTime(r.fechaReserva)}</p>
                <div className="flex items-center gap-1 text-gray-400 pt-1">
                  <FaUtensils className="text-[10px]" />
                  <span>{platos.length} plato{platos.length !== 1 ? 's' : ''}</span>
                </div>
                {platos.slice(0, 4).map((p, i) => (
                  <div key={i} className="text-gray-200 text-xs pl-3">
                    {p.cantidad || 1}× {p.plato?.nombre || p.nombre || 'Plato'}
                  </div>
                ))}
                {platos.length > 4 && (
                  <div className="text-gray-500 text-[10px] pl-3">+{platos.length - 4} más</div>
                )}
              </div>

              <div className="p-3 pt-0">
                {modalId === r._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={motivo[r._id] || ''}
                      onChange={(e) => setMotivo((prev) => ({ ...prev, [r._id]: e.target.value }))}
                      placeholder="Motivo (auditoría)…"
                      className="w-full bg-gray-900 border border-pink-500/40 rounded-lg p-2 text-xs text-white min-h-[64px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAtenderYa(r)}
                        disabled={loadingId === r._id}
                        className="flex-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
                      >
                        {loadingId === r._id ? 'Activando…' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setModalId(null)}
                        className="px-3 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setModalId(r._id)}
                    className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold py-2 rounded-lg"
                  >
                    Atender ya
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
