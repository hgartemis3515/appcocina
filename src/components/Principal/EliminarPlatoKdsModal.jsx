import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash } from "react-icons/fa";

/**
 * Modal KDS: motivo + Eliminar, igual que el tacho de comandas.html.
 */
const EliminarPlatoKdsModal = ({
  open,
  nightMode = true,
  platos = [],
  motivo,
  onMotivoChange,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const motivoOk = String(motivo || '').trim().length >= 2;
  const textMain = nightMode ? 'text-white' : 'text-gray-900';
  const textSecondary = nightMode ? 'text-gray-400' : 'text-gray-600';
  const bgCard = nightMode ? 'bg-gray-800' : 'bg-white';
  const bgInput = nightMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';

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
              <h2 className={`text-lg font-bold ${textMain} mb-2`}>Eliminar plato</h2>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Esta acción quedará registrada en auditoría.
              </p>
              {platos.length > 0 && (
                <ul className={`text-left text-sm mb-4 p-3 rounded-lg ${nightMode ? 'bg-red-950/40 text-red-100' : 'bg-red-50 text-red-900'}`}>
                  {platos.map((p, i) => (
                    <li key={i}>• {p.cantidad}x {p.nombre}</li>
                  ))}
                </ul>
              )}
              <textarea
                value={motivo}
                onChange={(e) => onMotivoChange(e.target.value)}
                placeholder="Motivo de eliminación (requerido)..."
                maxLength={300}
                rows={3}
                className={`w-full p-3 rounded-lg border text-sm resize-none ${bgInput}`}
              />
              <p className={`text-xs ${textSecondary} mt-1 text-left`}>
                Mínimo 2 caracteres ({String(motivo || '').trim().length}/300)
              </p>
            </div>
            <div className={`px-4 py-3 flex justify-end gap-2 ${nightMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${nightMode ? 'border border-gray-600 text-gray-300 hover:border-gray-400' : 'border border-gray-300 text-gray-700 hover:border-gray-500'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!motivoOk || loading}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                  motivoOk && !loading
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EliminarPlatoKdsModal;
