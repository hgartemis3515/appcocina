import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaHandPaper, FaExclamationTriangle } from "react-icons/fa";

/**
 * DejarPlatoModal - Modal para registrar motivo al liberar un plato
 * v7.2.1: Registro de auditoría cuando un cocinero deja un plato
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Callback para cerrar el modal
 * @param {function} onConfirm - Callback para confirmar con el motivo
 * @param {Array} platos - Lista de platos que se van a liberar
 * @param {boolean} nightMode - Modo oscuro
 * @param {boolean} loading - Estado de carga
 */
const DejarPlatoModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  platos = [], 
  nightMode = true,
  loading = false
}) => {
  const [motivo, setMotivo] = useState('');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');

  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const textTertiary = nightMode ? "text-gray-300" : "text-gray-700";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";

  // Opciones predefinidas de motivo
  const motivosPredefinidos = [
    { value: 'cambio_turno', label: 'Cambio de turno' },
    { value: 'emergencia', label: 'Emergencia personal' },
    { value: 'falta_insumos', label: 'Falta de insumos' },
    { value: 'otro_cocinero', label: 'Otro cocinero tomará el plato' },
    { value: 'otro', label: 'Otro motivo' }
  ];

  const handleConfirm = () => {
    const motivoFinal = motivo === 'otro' 
      ? motivoPersonalizado.trim() 
      : motivosPredefinidos.find(m => m.value === motivo)?.label || motivo;
    
    if (!motivoFinal) {
      return;
    }
    
    onConfirm(motivoFinal);
  };

  const isValid = motivo === 'otro' 
    ? motivoPersonalizado.trim().length >= 3 
    : motivo !== '';

  // Resetear estados al cerrar
  const handleClose = () => {
    setMotivo('');
    setMotivoPersonalizado('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={`${bgModal} border ${borderModal} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-600/20 border-b border-red-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <FaHandPaper className="text-red-400 text-lg" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${textModal}`}>Dejar Plato(s)</h2>
                  <p className={`text-xs ${textSecondary}`}>
                    {platos.length} plato{platos.length > 1 ? 's' : ''} será{platos.length > 1 ? 'án' : 'á'} liberado{platos.length > 1 ? 's' : ''} para otros cocineros
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className={`w-8 h-8 rounded-full ${nightMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} flex items-center justify-center transition-colors`}
              >
                <FaTimes className={textSecondary} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Lista de platos */}
              <div className={`${nightMode ? 'bg-gray-700/50' : 'bg-gray-100'} rounded-lg p-3 max-h-32 overflow-y-auto`}>
                <p className={`text-xs ${textSecondary} mb-2 font-medium`}>Platos a liberar:</p>
                <ul className={`text-sm ${textTertiary} space-y-1`}>
                  {platos.slice(0, 5).map((plato, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      {plato.nombre || plato.plato?.nombre || 'Plato'}
                    </li>
                  ))}
                  {platos.length > 5 && (
                    <li className={`text-xs ${textSecondary}`}>
                      ...y {platos.length - 5} más
                    </li>
                  )}
                </ul>
              </div>

              {/* Advertencia */}
              <div className={`flex items-start gap-2 p-3 rounded-lg ${nightMode ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                <FaExclamationTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className={`text-xs ${nightMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  Al dejar el plato, estará disponible para que otro cocinero lo tome. 
                  Esta acción quedará registrada en la auditoría.
                </p>
              </div>

              {/* Selector de motivo */}
              <div>
                <label className={`block text-sm font-medium ${textTertiary} mb-2`}>
                  Motivo de liberación *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${borderModal} ${inputBg} ${textModal} text-sm focus:outline-none focus:ring-2 focus:ring-red-500`}
                >
                  <option value="">Selecciona un motivo...</option>
                  {motivosPredefinidos.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Motivo personalizado */}
              {motivo === 'otro' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>
                    Describe el motivo *
                  </label>
                  <textarea
                    value={motivoPersonalizado}
                    onChange={(e) => setMotivoPersonalizado(e.target.value)}
                    placeholder="Escribe el motivo aquí..."
                    maxLength={200}
                    rows={3}
                    className={`w-full p-3 rounded-lg border ${borderModal} ${inputBg} ${textModal} text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none`}
                  />
                  <p className={`text-xs ${textSecondary} mt-1 text-right`}>
                    {motivoPersonalizado.length}/200
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${borderModal} flex gap-3`}>
              <button
                onClick={handleClose}
                disabled={loading}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm ${nightMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                  isValid && !loading
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    Liberando...
                  </span>
                ) : (
                  `Liberar ${platos.length > 1 ? `${platos.length} platos` : 'plato'}`
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DejarPlatoModal;
