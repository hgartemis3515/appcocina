/**
 * ReservadasPage — Tab KDS de comandas reservadas programadas.
 * PLAN_RESERVAS_MOZOS_CAJA_KDS v1.1
 *
 * Lista reservas pendientes (comanda programada) ordenadas por fechaCocina.
 * Toggle Todas / Mías (encargado). No permite Tomar/Listo (aún no están en cola).
 * Al activarse (job fechaCocina) desaparecen de aquí y entran a la cola con 🚀.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaClock, FaUser, FaUtensils, FaArrowLeft, FaSyncAlt, FaUserCog, FaRocket,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import useReservasProgramadas from '../../hooks/useReservasProgramadas';
import useSocketCocina from '../../hooks/useSocketCocina';
import SocketConnectionBadge from '../common/SocketConnectionBadge';

const formatDateTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const formatTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
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

export default function ReservadasPage({ onGoToMenu }) {
  const { user, getToken } = useAuth();
  const [soloMias, setSoloMias] = useState(false);
  const cocineroId = soloMias ? (user?._id || user?.id || null) : null;
  const { socket: cocinaSocket, connectionStatus, authError: socketAuthError } = useSocketCocina({ getToken });
  const { reservas, loading, error, fetchReservas } = useReservasProgramadas(cocinaSocket, cocineroId);

  const ordenadas = useMemo(() => {
    return [...reservas].sort((a, b) => new Date(a.fechaCocina) - new Date(b.fechaCocina));
  }, [reservas]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onGoToMenu} className="text-gray-400 hover:text-white transition-colors p-2">
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaCalendarAlt className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Reservadas</h1>
              <p className="text-gray-400 text-xs">Comandas reservadas programadas (activación automática T−20)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              onClick={() => setSoloMias((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${soloMias ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              title="Filtrar por encargado"
            >
              <FaUserCog className="text-xs" />
              {soloMias ? 'Mías' : 'Todas'}
            </button>
            {ordenadas.length > 0 && (
              <span className="bg-indigo-500/80 text-white text-xs px-2 py-1 rounded-full">
                {ordenadas.length} reservada{ordenadas.length > 1 ? 's' : ''}
              </span>
            )}
            <SocketConnectionBadge connectionStatus={connectionStatus || 'desconectado'} authError={socketAuthError} />
            <button onClick={fetchReservas} className="text-gray-400 hover:text-white p-2 transition-colors" title="Actualizar">
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm mb-4">
              {error}
            </div>
          )}
          {loading && ordenadas.length === 0 ? (
            <div className="text-center py-16">
              <FaSyncAlt className="text-4xl text-indigo-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Cargando reservas...</p>
            </div>
          ) : ordenadas.length === 0 ? (
            <div className="text-center py-16">
              <FaCalendarAlt className="text-4xl text-indigo-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No hay comandas reservadas programadas</p>
              <p className="text-gray-500 text-sm mt-1">Las reservas creadas desde App Mozos aparecerán aquí hasta su hora de cocina.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {ordenadas.map((r) => {
                  const tienePPA = !!(r.pagoAdelantado && r.pagoAdelantado.activo);
                  const encargado = r.cocineroEncargado?.name || r.cocineroEncargado?.alias || 'Auto';
                  const cd = countdown(r.fechaCocina);
                  return (
                    <motion.div
                      key={r._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg"
                    >
                      <div className="p-3 bg-indigo-600/20 border-b border-indigo-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-300 text-sm font-mono font-bold">
                            Mesa {r.mesa?.nummesa ?? '?'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                            RESERVA
                          </span>
                        </div>
                        {(r.comandaGenerada?.comandaNumber || r.comanda?.comandaNumber) ? (
                          <div className="text-indigo-100 text-xs font-mono mt-1">
                            Comanda #{r.comandaGenerada?.comandaNumber || r.comanda?.comandaNumber}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-gray-300 text-xs">
                            <FaUser className="text-gray-400" />
                            <span>{r.clienteNombre || 'Cliente'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <FaUserCog className="text-gray-500" />
                            <span>{encargado}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border-b border-gray-700">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-gray-300">
                            <FaClock className="text-gray-400" />
                            <span>Atención: <strong className="text-white">{formatTime(r.fechaReserva)}</strong></span>
                          </div>
                          <div className="flex items-center gap-1 text-indigo-300">
                            <FaRocket className="text-xs" />
                            <span>Cocina: <strong>{formatTime(r.fechaCocina)}</strong> ({cd})</span>
                          </div>
                        </div>
                        <div className="text-gray-500 text-[10px] mt-1">
                          {formatDateTime(r.fechaReserva)} · {r.numPersonas || 1} pax
                          {r.clienteTelefono ? ` · ${r.clienteTelefono}` : ''}
                        </div>
                      </div>

                      <div className="p-3 max-h-40 overflow-y-auto border-b border-gray-700">
                        <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                          <FaUtensils className="text-xs" />
                          <span>{r.platos?.length || 0} plato{(r.platos?.length || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        {(r.platos || []).map((p, i) => (
                          <div key={i} className="text-sm text-gray-200 py-0.5">
                            <span className="font-medium">{p.cantidad || 1}×</span> {p.plato?.nombre || 'Plato'}
                            {p.tipoServicio === 'para_llevar' ? (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🥡 Llevar
                              </span>
                            ) : null}
                            {p.notaEspecial ? <span className="text-gray-500 text-xs"> · {p.notaEspecial}</span> : null}
                          </div>
                        ))}
                      </div>

                      <div className="p-3">
                        {tienePPA ? (
                          <div className="text-xs px-2 py-1 bg-violet-500/20 border border-violet-500/30 rounded text-violet-300">
                            Adelanto: S/ {Number(r.pagoAdelantado?.montoPagado || 0).toFixed(2)} · Saldo S/ {Number(r.pagoAdelantado?.montoPendiente || 0).toFixed(2)}
                            {r.pagoAdelantado?.estadoTicket === 'pendiente_aprobacion' && (
                              <span className="block text-amber-300 mt-0.5">PPA pendiente de aprobación</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Sin adelanto · se cobra al servir</div>
                        )}
                        {r.notas && (
                          <div className="text-[10px] text-gray-500 mt-2 truncate" title={r.notas}>Notas: {r.notas}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
