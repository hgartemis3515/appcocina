/**
 * PpaSidebar - Sidebar de Comandas y Pagos Adelantados
 * Renombrado: "Comandas y adelantados" (anteriormente "Tickets PPA")
 * Ahora incluye: Aprobar, Reportar (comandas), Imprimir
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaTimes, FaClock, FaUtensils, FaShoppingBag, FaUser, FaMoneyBill, FaPrint, FaExclamationTriangle } from 'react-icons/fa';
import useTablaAprobacion from '../../hooks/useTablaAprobacion';

const formatCurrency = (amount) => `S/. ${Number(amount || 0).toFixed(2)}`;
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const tipoBadge = (tipo) => {
  const t = String(tipo || '').toLowerCase();
  if (t === 'comanda_completa' || t === 'comanda') return { label: 'COMANDA', bg: 'bg-blue-500/30 text-blue-300' };
  return { label: 'ADELANTADO', bg: 'bg-violet-500/30 text-violet-300' };
};

export default function PpaSidebar({ socket, onClose }) {
  const { items, loading, error, fetchItems, aprobarItem, reportarItem, rechazarItem, imprimirComanda, cantidadPendientes } = useTablaAprobacion();
  const [aprobarLoading, setAprobarLoading] = useState({});
  const [reportarLoading, setReportarLoading] = useState({});
  const [rechazarLoading, setRechazarLoading] = useState({});
  const [reportarMotivo, setReportarMotivo] = useState({});
  const [rechazarMotivo, setRechazarMotivo] = useState({});
  const [showReportarModal, setShowReportarModal] = useState(null);
  const [showRechazarModal, setShowRechazarModal] = useState(null);

  const handleAprobar = async (ticket) => {
    const ticketId = ticket._id;
    setAprobarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('cocineroId') || '';
      const userName = localStorage.getItem('userName') || localStorage.getItem('cocineroName') || 'Cocina';
      const ticketTipo = ticket.tipo === 'pago_adelantado' ? 'ADELANTADO' : 'COMANDA';
      await aprobarItem(ticketId, ticketTipo, userId, userName);
    } catch (err) {
      console.error('Error al aprobar:', err);
      alert('Error al aprobar el ticket: ' + (err.userMessage || err.message));
    } finally {
      setAprobarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleReportar = async (ticketId) => {
    const motivo = (reportarMotivo[ticketId] || '').trim();
    if (motivo.length < 3) {
      alert('El motivo es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }
    setReportarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('cocineroId') || '';
      const userName = localStorage.getItem('userName') || localStorage.getItem('cocineroName') || 'Cocina';
      await reportarItem(ticketId, motivo, userId, userName);
      setShowReportarModal(null);
    } catch (err) {
      console.error('Error al reportar:', err);
      alert('Error al reportar: ' + (err.userMessage || err.message));
    } finally {
      setReportarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleRechazar = async (ticketId) => {
    const motivo = (rechazarMotivo[ticketId] || '').trim();
    if (motivo.length < 3) {
      alert('Debes escribir un motivo de rechazo (mínimo 3 caracteres).');
      return;
    }
    setRechazarLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('cocineroId') || '';
      const userName = localStorage.getItem('userName') || localStorage.getItem('cocineroName') || 'Cocina';
      await rechazarItem(ticketId, motivo, userId, userName);
      setShowRechazarModal(null);
    } catch (err) {
      console.error('Error al rechazar:', err);
      alert('Error al rechazar el ticket: ' + (err.userMessage || err.message));
    } finally {
      setRechazarLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const pendientes = items.filter(t => t.estado === 'pendiente_aprobacion');

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaShoppingBag className="text-violet-400" />
          <h3 className="text-white font-bold text-sm">Comandas y Adelantados</h3>
          {cantidadPendientes > 0 && (
            <span className="bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full">
              {cantidadPendientes}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1"
        >
          <FaTimes />
        </button>
      </div>

      {/* Lista de tickets */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && pendientes.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <FaClock className="text-2xl mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Cargando tickets...</p>
          </div>
        )}

        {!loading && pendientes.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <FaCheck className="text-2xl mx-auto mb-2 text-green-500" />
            <p className="text-sm">Sin tickets pendientes</p>
          </div>
        )}

        <AnimatePresence>
          {pendientes.map((ticket) => {
            const badge = tipoBadge(ticket.tipo);
            const isComanda = ticket.tipo === 'comanda_completa' || String(ticket.tipo || '').toUpperCase() === 'COMANDA';
            return (
              <motion.div
                key={ticket._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                {/* Info del ticket */}
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-yellow-300">
                      #{ticket.ticketNumber || '...'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <FaUtensils className="text-gray-400 text-xs" />
                    <span className="text-gray-300 text-xs font-medium">
                      Mesa {ticket.numMesa || '?'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaUser className="text-gray-400 text-xs" />
                    <span className="text-gray-400 text-xs">
                      {ticket.nombreMozo || ticket.mozoNombre || 'Mozo'}
                    </span>
                  </div>
                </div>

                {/* Platos */}
                <div className="p-3 border-b border-gray-700 max-h-32 overflow-y-auto">
                  {(ticket.platos || []).map((plato, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-300 text-xs">{plato.cantidad}x</span>
                        <span className="text-gray-200 text-xs truncate max-w-[140px]">
                          {plato.nombre}
                        </span>
                        {plato.tipoServicio === 'para_llevar' && (
                          <span className="text-[10px] bg-amber-600/30 text-amber-300 px-1 rounded">
                            Llevar
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-xs">
                        {formatCurrency(plato.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total y voucher */}
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <FaMoneyBill className="text-green-400 text-xs" />
                      <span className="text-white text-sm font-bold">
                        {formatCurrency(ticket.total)}
                      </span>
                    </div>
                    {ticket.voucherId && (
                      <span className="text-[10px] text-gray-500">
                        Voucher: {ticket.voucherId}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 uppercase">
                      {ticket.moneda || 'Soles'} {ticket.metodoPago ? `· ${ticket.metodoPago}` : ''}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-2 flex gap-2">
                  <button
                    onClick={() => imprimirComanda(ticket)}
                    className="flex items-center justify-center gap-1 bg-gray-600 hover:bg-gray-500
                      text-white text-xs py-1.5 px-2 rounded-lg transition-colors"
                    title="Imprimir comanda"
                  >
                    <FaPrint className="text-[10px]" />
                  </button>
                  <button
                    onClick={() => handleAprobar(ticket)}
                    disabled={aprobarLoading[ticket._id]}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500
                      disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-1.5 rounded-lg
                      transition-colors font-medium"
                  >
                    <FaCheck className="text-xs" />
                    {aprobarLoading[ticket._id] ? '...' : 'Aprobar'}
                  </button>
                  {isComanda ? (
                    <button
                      onClick={() => {
                        setShowReportarModal(ticket._id);
                        setReportarMotivo(prev => ({ ...prev, [ticket._id]: '' }));
                      }}
                      disabled={reportarLoading[ticket._id]}
                      className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500
                        disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-1.5 px-2 rounded-lg
                        transition-colors font-medium"
                      title="Reportar comanda"
                    >
                      <FaExclamationTriangle className="text-[10px]" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowRechazarModal(ticket._id);
                        setRechazarMotivo(prev => ({ ...prev, [ticket._id]: '' }));
                      }}
                      disabled={rechazarLoading[ticket._id]}
                      className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500
                        disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-1.5 px-2 rounded-lg
                        transition-colors font-medium"
                      title="Rechazar PPA"
                    >
                      <FaTimes className="text-[10px]" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal de reportar (comandas) */}
      <AnimatePresence>
        {showReportarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReportarModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-4 max-w-sm w-full border border-gray-600"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <FaExclamationTriangle className="text-red-400" />
                <h4 className="text-white font-bold">Reportar Comanda</h4>
              </div>
              <p className="text-gray-400 text-xs mb-2">
                El mozo será notificado. Motivo obligatorio.
              </p>
              <textarea
                value={reportarMotivo[showReportarModal] || ''}
                onChange={e => setReportarMotivo(prev => ({ ...prev, [showReportarModal]: e.target.value }))}
                placeholder="Motivo del reporte (mínimo 3 caracteres)..."
                className="w-full bg-gray-700 text-white rounded p-2 text-sm h-20 resize-none border border-gray-600
                  focus:border-red-500 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowReportarModal(null)}
                  className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReportar(showReportarModal)}
                  disabled={(reportarMotivo[showReportarModal] || '').trim().length < 3 || reportarLoading[showReportarModal]}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500
                    disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {reportarLoading[showReportarModal] ? 'Reportando...' : 'Reportar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de rechazo (PPA) */}
      <AnimatePresence>
        {showRechazarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRechazarModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-4 max-w-sm w-full border border-gray-600"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-white font-bold mb-1">Motivo de rechazo</h4>
              <p className="text-gray-400 text-xs mb-2">
                Obligatorio. La comanda se eliminará y quedará registrada en auditoría.
              </p>
              <textarea
                value={rechazarMotivo[showRechazarModal] || ''}
                onChange={e => setRechazarMotivo(prev => ({ ...prev, [showRechazarModal]: e.target.value }))}
                placeholder="Escribe el motivo (mínimo 3 caracteres)..."
                className="w-full bg-gray-700 text-white rounded p-2 text-sm h-20 resize-none border border-gray-600
                  focus:border-violet-500 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowRechazarModal(null)}
                  className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRechazar(showRechazarModal)}
                  disabled={(rechazarMotivo[showRechazarModal] || '').trim().length < 3 || rechazarLoading[showRechazarModal]}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500
                    disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {rechazarLoading[showRechazarModal] ? 'Rechazando...' : 'Rechazar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}