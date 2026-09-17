import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash, FaUserSlash, FaUserClock, FaDesktop, FaTruck } from "react-icons/fa";
import { MOTIVOS_RAPIDOS_COCINA, combinarMotivoRapido } from "../../utils/motivosRapidosCocina";

const ICONS = {
  cliente_no_desea: FaUserSlash,
  equivocacion_mozo: FaUserClock,
  error_sistema: FaDesktop,
  error_entrega: FaTruck,
};

/**
 * Modal KDS: 4 motivos rápidos + texto opcional.
 */
const EliminarPlatoKdsModal = ({
  open,
  nightMode = true,
  titulo = 'Eliminar plato',
  platos = [],
  motivo = '',
  onMotivoChange,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const textMain = nightMode ? 'text-white' : 'text-gray-900';
  const textSecondary = nightMode ? 'text-gray-400' : 'text-gray-600';
  const bgCard = nightMode ? 'bg-gray-800' : 'bg-white';
  const btnIdle = nightMode
    ? 'bg-gray-700 border-gray-600 text-white hover:border-red-400 hover:bg-red-950/40'
    : 'bg-white border-gray-300 text-gray-800 hover:border-red-400 hover:bg-red-50';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[11000] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            className={`${bgCard} rounded-2xl max-w-md w-full shadow-2xl border ${nightMode ? 'border-red-900/40' : 'border-red-200'} overflow-hidden`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                <FaTrash className="text-2xl text-red-500" />
              </div>
              <h2 className={`text-lg font-bold ${textMain} mb-2`}>{titulo}</h2>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Elige un motivo. El texto extra es opcional; al pulsar un motivo se elimina y queda en auditoría.
              </p>
              {platos.length > 0 && (
                <ul className={`text-left text-sm mb-4 p-3 rounded-lg ${nightMode ? 'bg-red-950/40 text-red-100' : 'bg-red-50 text-red-900'}`}>
                  {platos.map((p, i) => (
                    <li key={i}>• {p.cantidad}x {p.nombre}</li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-2 gap-2">
                {MOTIVOS_RAPIDOS_COCINA.map((m) => {
                  const Icon = ICONS[m.id] || FaTrash;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={loading}
                      onClick={() => onConfirm(combinarMotivoRapido(m.label, motivo))}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold min-h-[88px] ${btnIdle} disabled:opacity-50`}
                    >
                      <Icon className="text-lg text-red-500" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={motivo}
                onChange={(e) => onMotivoChange?.(e.target.value)}
                disabled={loading}
                rows={2}
                placeholder="Motivo extra (opcional)"
                className={`mt-3 w-full rounded-lg px-3 py-2 text-sm resize-none border ${
                  nightMode
                    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
            <div className={`px-4 py-3 flex justify-end gap-2 ${nightMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${nightMode ? 'border border-gray-600 text-gray-300 hover:border-gray-400' : 'border border-gray-300 text-gray-700 hover:border-gray-500'}`}
              >
                {loading ? 'Eliminando...' : 'Cancelar'}
              </button>
              <button
                type="button"
                disabled={loading || String(motivo || '').trim().length < 2}
                onClick={() => onConfirm(String(motivo || '').trim())}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white disabled:opacity-40"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EliminarPlatoKdsModal;
