/**
 * TicketsPpaPage - Tablero dedicado de Tickets de Pago Adelantado
 * Accesible desde el menú principal de App Cocina.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShoppingBag, FaCheck, FaTimes, FaClock, FaUtensils, FaUser,
  FaMoneyBill, FaArrowLeft, FaSyncAlt, FaFilter,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import useTicketsPPA from '../../hooks/useTicketsPPA';

const formatCurrency = (amount) => `S/. ${Number(amount || 0).toFixed(2)}`;
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function TicketsPpaPage({ onGoToMenu }) {
  const { user, getToken } = useAuth();
  const { tickets, loading, error, aprobarTicket, rechazarTicket, fetchTickets } = useTicketsPPA();
  const [filtro, setFiltro] = useState('pendientes'); // pendientes, todos, aprobados, rechazados
  const [aprobarLoading, setAprobarLoading] = useState({});
  const [rechazarLoading, setRechazarLoading] = useState({});
  const [rechazarMotivo, setRechazarMotivo] = useState({});
  const [showRechazarModal, setShowRechazarModal] = useState(null);

  const handleAprobar = async (ticketId) => {
    setAprobarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      await aprobarTicket(ticketId, user?._id || user?.id, user?.name || 'Cocina');
    } catch (err) {
      alert('Error al aprobar: ' + err.message);
    } finally {
      setAprobarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleRechazar = async (ticketId) => {
    const motivo = rechazarMotivo[ticketId] || 'Sin motivo';
    setRechazarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      await rechazarTicket(ticketId, motivo, user?._id || user?.id, user?.name || 'Cocina');
      setShowRechazarModal(null);
    } catch (err) {
      alert('Error al rechazar: ' + err.message);
    } finally {
      setRechazarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const ticketsFiltrados = filtro === 'pendientes'
    ? tickets.filter(t => t.estado === 'pendiente_aprobacion')
    : filtro === 'aprobados'
      ? tickets.filter(t => t.estado === 'aprobado')
      : filtro === 'rechazados'
        ? tickets.filter(t => t.estado === 'rechazado')
        : tickets;

  const cantidadPendientes = tickets.filter(t => t.estado === 'pendiente_aprobacion').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToMenu}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FaShoppingBag className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Tickets de Pagos Adelantados</h1>
              <p className="text-gray-400 text-xs">Aprobación de pagos antes de enviar a cocina</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {cantidadPendientes > 0 && (
              <span className="bg-violet-500 text-white text-sm px-3 py-1 rounded-full font-bold animate-pulse">
                {cantidadPendientes} pendiente{cantidadPendientes > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={fetchTickets}
              className="text-gray-400 hover:text-white p-2 transition-colors"
              title="Actualizar"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 border-b border-gray-800">
        {[
          { key: 'pendientes', label: 'Pendientes', icon: FaClock },
          { key: 'aprobados', label: 'Aprobados', icon: FaCheck },
          { key: 'rechazados', label: 'Rechazados', icon: FaTimes },
          { key: 'todos', label: 'Todos', icon: FaFilter },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filtro === key
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            <Icon className="text-xs" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {loading && ticketsFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <FaSyncAlt className="text-4xl text-violet-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Cargando tickets...</p>
          </div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <FaCheck className="text-4xl text-green-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Sin tickets {filtro === 'pendientes' ? 'pendientes' : filtro}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {ticketsFiltrados.map((ticket) => (
                <motion.div
                  key={ticket._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg"
                >
                  {/* Header del card */}
                  <div className={`p-3 ${
                    ticket.estado === 'pendiente_aprobacion' ? 'bg-violet-600/20 border-b border-violet-500/30' :
                    ticket.estado === 'aprobado' ? 'bg-green-600/20 border-b border-green-500/30' :
                    'bg-red-600/20 border-b border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-violet-300 text-sm font-mono font-bold">
                        TPA #{ticket.ticketNumber || '...'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ticket.estado === 'pendiente_aprobacion' ? 'bg-violet-500/30 text-violet-300' :
                        ticket.estado === 'aprobado' ? 'bg-green-500/30 text-green-300' :
                        'bg-red-500/30 text-red-300'
                      }`}>
                        {ticket.estado === 'pendiente_aprobacion' ? '⏳ Pendiente' :
                         ticket.estado === 'aprobado' ? '✅ Aprobado' : '❌ Rechazado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-gray-300 text-xs">
                        <FaUtensils className="text-gray-400" />
                        <span>Mesa {ticket.numMesa || '?'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <FaUser className="text-gray-500" />
                        <span>{ticket.nombreMozo || ticket.mozoNombre || '?'}</span>
                      </div>
                    </div>
                    <div className="text-gray-500 text-[10px] mt-1">
                      {formatDate(ticket.createdAt)} {formatTime(ticket.createdAt)}
                    </div>
                  </div>

                  {/* Platos */}
                  <div className="p-3 max-h-40 overflow-y-auto border-b border-gray-700">
                    {(ticket.platos || []).map((plato, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">{plato.cantidad}x</span>
                          <span className="text-gray-200 text-sm">{plato.nombre}</span>
                          {plato.tipoServicio === 'para_llevar' && (
                            <span className="text-[10px] bg-amber-600/30 text-amber-300 px-1.5 py-0.5 rounded">
                              Para llevar
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs">{formatCurrency(plato.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="p-3 flex items-center justify-between border-b border-gray-700">
                    <div className="flex items-center gap-1">
                      <FaMoneyBill className="text-green-400" />
                      <span className="text-white font-bold">{formatCurrency(ticket.total)}</span>
                    </div>
                    <div className="text-gray-500 text-xs flex items-center gap-2">
                      {ticket.voucherId && <span>V: {ticket.voucherId}</span>}
                      <span className="uppercase">{ticket.metodoPago}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  {ticket.estado === 'pendiente_aprobacion' && (
                    <div className="p-3 flex gap-2">
                      <button
                        onClick={() => handleAprobar(ticket._id)}
                        disabled={aprobarLoading[ticket._id]}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500
                          disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                          transition-colors font-medium text-sm"
                      >
                        <FaCheck />
                        {aprobarLoading[ticket._id] ? 'Aprobando...' : 'Aprobar'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRechazarModal(ticket._id);
                          setRechazarMotivo(prev => ({ ...prev, [ticket._id]: '' }));
                        }}
                        disabled={rechazarLoading[ticket._id]}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500
                          disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg
                          transition-colors font-medium text-sm"
                      >
                        <FaTimes />
                        {rechazarLoading[ticket._id] ? '...' : 'Rechazar'}
                      </button>
                    </div>
                  )}

                  {/* Info de rechazo */}
                  {ticket.estado === 'rechazado' && ticket.motivoRechazo && (
                    <div className="p-3 bg-red-900/20">
                      <p className="text-red-400 text-xs">
                        <strong>Motivo:</strong> {ticket.motivoRechazo}
                      </p>
                      {ticket.aprobadoPorNombre && (
                        <p className="text-gray-500 text-[10px] mt-1">
                          Aprobado por: {ticket.aprobadoPorNombre}
                        </p>
                      )}
                    </div>
                  )}
                  {ticket.estado === 'aprobado' && ticket.aprobadoPorNombre && (
                    <div className="p-2 bg-green-900/20">
                      <p className="text-green-400 text-xs">
                        Aprobado por: {ticket.aprobadoPorNombre} — {formatTime(ticket.fechaAprobacion)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modal de rechazo */}
      <AnimatePresence>
        {showRechazarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRechazarModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-600"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-white font-bold text-lg mb-3">Motivo de rechazo</h4>
              <textarea
                value={rechazarMotivo[showRechazarModal] || ''}
                onChange={e => setRechazarMotivo(prev => ({ ...prev, [showRechazarModal]: e.target.value }))}
                placeholder="Describe el motivo del rechazo..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm h-24 resize-none border border-gray-600
                  focus:border-violet-500 focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRechazarModal(null)}
                  className="flex-1 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRechazar(showRechazarModal)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors font-medium"
                >
                  Rechazar Ticket
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}