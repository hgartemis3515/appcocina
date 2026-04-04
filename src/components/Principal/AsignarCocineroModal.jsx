/**
 * AsignarCocineroModal - Modal para seleccionar cocinero
 * 
 * Usado exclusivamente en ComandaStyleSupervi.
 * Permite asignar un cocinero a un plato o a una comanda completa.
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUserPlus, FaUserMinus, FaSpinner, FaUser } from 'react-icons/fa';

const AsignarCocineroModal = ({
  isOpen,
  onClose,
  cocineros,
  loading,
  asignando,
  onAsignar,
  platoActual,
  comandaActual
}) => {
  const inputRef = useRef(null);
  
  // Focus en el primer botón al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Título dinámico según contexto
  const getTitulo = () => {
    if (!comandaActual) return 'Asignar Cocinero';
    if (platoActual) {
      const nombrePlato = platoActual.plato?.nombre || platoActual.nombre || 'Plato';
      return `Asignar a "${nombrePlato}"`;
    }
    return `Asignar a Comanda #${comandaActual.comandaNumber}`;
  };

  // Cocinero actualmente asignado
  const cocineroActualId = platoActual?.asignadoA?._id || platoActual?.asignadoA || 
                           comandaActual?.asignadoA?._id || comandaActual?.asignadoA;

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
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <FaUserPlus className="text-purple-400 text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{getTitulo()}</h3>
                  {comandaActual && (
                    <p className="text-gray-400 text-xs">
                      Comanda #{comandaActual.comandaNumber} • Mesa {comandaActual.mesa?.numero || comandaActual.mesa || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={asignando}
                className="text-gray-400 hover:text-white transition-colors p-2 disabled:opacity-50"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-3xl text-orange-500 mb-3" />
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
                  {/* Opción "Sin asignar" */}
                  {cocineroActualId && (
                    <button
                      onClick={() => onAsignar(null)}
                      disabled={asignando}
                      className="w-full p-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-red-900/30 hover:border-red-700 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                        <FaUserMinus className="text-red-400" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-red-400 font-medium">Quitar asignación</p>
                        <p className="text-gray-500 text-xs">Dejar sin cocinero asignado</p>
                      </div>
                    </button>
                  )}

                  {/* Lista de cocineros */}
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                      Seleccionar cocinero
                    </p>
                    {cocineros.map((cocinero) => {
                      const esActual = cocineroActualId === cocinero._id;
                      return (
                        <button
                          key={cocinero._id}
                          ref={esActual ? inputRef : null}
                          onClick={() => onAsignar(cocinero._id)}
                          disabled={asignando || esActual}
                          className={`w-full p-3 rounded-xl transition-all flex items-center gap-3
                            ${esActual 
                              ? 'bg-purple-900/30 border border-purple-600' 
                              : 'bg-gray-800/50 border border-gray-700 hover:bg-purple-900/20 hover:border-purple-700'}
                            ${asignando ? 'opacity-50' : ''}
                          `}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                            ${esActual 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-700 text-gray-300'}
                          `}>
                            {cocinero.alias?.charAt(0)?.toUpperCase() || 
                             cocinero.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left flex-1">
                            <p className={`font-medium ${esActual ? 'text-purple-300' : 'text-white'}`}>
                              {cocinero.alias || cocinero.nombre || 'Cocinero'}
                            </p>
                            {cocinero.alias && cocinero.nombre && cocinero.alias !== cocinero.nombre && (
                              <p className="text-gray-500 text-xs">{cocinero.nombre}</p>
                            )}
                            {esActual && (
                              <span className="inline-block text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded mt-1">
                                Asignado actualmente
                              </span>
                            )}
                          </div>
                          {asignando && esActual && (
                            <FaSpinner className="animate-spin text-purple-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={onClose}
                disabled={asignando}
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

export default AsignarCocineroModal;
