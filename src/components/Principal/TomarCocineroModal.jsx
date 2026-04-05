/**
 * TomarCocineroModal - Modal para seleccionar cocinero al "Tomar" plato/comanda
 * 
 * Similar a AsignarCocineroModal pero enfocado en procesamiento.
 * Permite seleccionar qué cocinero tomará los platos/comandas seleccionados.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUserCheck, FaSpinner, FaUser, FaUtensils } from 'react-icons/fa';

const TomarCocineroModal = ({
  isOpen,
  onClose,
  cocineros,
  loading,
  procesando,
  onConfirmar,
  platosSeleccionados = [],
  comandaSeleccionada = null
}) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getTitulo = () => {
    if (comandaSeleccionada) {
      return `Tomar Comanda #${comandaSeleccionada.comandaNumber || comandaSeleccionada.numeroComanda || ''}`;
    }
    if (platosSeleccionados?.length === 1) {
      return `Tomar "${platosSeleccionados[0].platoNombre || platosSeleccionados[0].nombre || 'Plato'}"`;
    }
    return `Tomar ${platosSeleccionados?.length || 0} plato${platosSeleccionados?.length === 1 ? '' : 's'}`;
  };

  const getDescripcion = () => {
    if (comandaSeleccionada) {
      return `Selecciona el cocinero que preparará toda la comanda`;
    }
    if (platosSeleccionados?.length === 1) {
      return `Selecciona el cocinero que preparará este plato`;
    }
    return `Selecciona el cocinero que preparará estos platos`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <FaUserCheck className="text-green-400 text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{getTitulo()}</h3>
                  {comandaSeleccionada && (
                    <p className="text-gray-400 text-xs">
                      Mesa {comandaSeleccionada.mesa?.numero || comandaSeleccionada.mesa || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={procesando}
                className="text-gray-400 hover:text-white transition-colors p-2 disabled:opacity-50"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Descripción */}
            <p className="text-gray-400 text-sm mb-4">
              {getDescripcion()}
            </p>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-3xl text-green-500 mb-3" />
                  <p className="text-gray-400">Cargando cocineros...</p>
                </div>
              ) : cocineros.length === 0 ? (
                <div className="text-center py-8">
                  <FaUser className="text-4xl text-gray-600 mb-3 mx-auto" />
                  <p className="text-gray-400">No hay cocineros disponibles</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Verifique la configuración de cocineros
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cocineros.map((cocinero) => (
                    <button
                      key={cocinero._id}
                      ref={inputRef}
                      onClick={() => onConfirmar(cocinero._id)}
                      disabled={procesando}
                      className="w-full p-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-green-900/30 hover:border-green-600 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm text-white">
                        {cocinero.alias?.charAt(0)?.toUpperCase() || 
                         cocinero.nombre?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white font-medium">
                          {cocinero.alias || cocinero.nombre || 'Cocinero'}
                        </p>
                        {cocinero.alias && cocinero.nombre && cocinero.alias !== cocinero.nombre && (
                          <p className="text-gray-500 text-xs">{cocinero.nombre}</p>
                        )}
                      </div>
                      {procesando && (
                        <FaSpinner className="animate-spin text-green-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={onClose}
                disabled={procesando}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TomarCocineroModal;
