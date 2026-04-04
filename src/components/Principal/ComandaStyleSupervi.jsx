/**
 * ComandaStyleSupervi - Vista de Supervisor del KDS
 * 
 * Wrapper simple que muestra ComandaStyle con badge de supervisor
 * y modal de asignación de cocineros.
 * 
 * Solo accesible para usuarios con rol supervisor o admin.
 * 
 * @module ComandaStyleSupervi
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserPlus, FaArrowLeft } from 'react-icons/fa';

import ComandaStyle from './comandastyle';
import AsignarCocineroModal from './AsignarCocineroModal';
import useAsignacionCocinero from '../../hooks/useAsignacionCocinero';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Componente wrapper que extiende ComandaStyle con funcionalidades de supervisor
 * NOTA: La funcionalidad de asignar cocineros se implementa mediante el modal
 * que se abre manualmente. La integración completa con las tarjetas de platos
 * requiere modificar ComandaStyle para aceptar las props de supervisor.
 */
const ComandaStyleSupervi = ({ onGoToMenu, initialOptions }) => {
  const { hasRole, getToken } = useAuth();
  
  // Verificar permisos de supervisor
  const tienePermiso = hasRole(['supervisor', 'admin']);
  
  // Estado para toast notifications
  const [toastLocal, setToastLocal] = useState(null);
  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  
  // Hook de asignación de cocinero
  const {
    cocineros,
    loadingCocineros,
    asignando,
    modalAbierto,
    platoSeleccionado,
    comandaSeleccionada,
    cargarCocineros,
    cerrarModal,
    asignarCocinero
  } = useAsignacionCocinero({
    getToken,
    showToast: (msg) => setToastLocal({ ...msg, duration: 3000 }),
    onAsignacionActualizada: (data) => {
      console.log('[Supervi] Asignación actualizada:', data);
    }
  });

  // Cargar lista de cocineros al montar (solo una vez)
  useEffect(() => {
    if (tienePermiso) {
      cargarCocineros();
    }
  }, [tienePermiso]);

  // Mostrar error si no tiene permisos
  if (!tienePermiso) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⛔</div>
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-400 mb-4">
            Solo supervisores y administradores pueden acceder a esta vista.
          </p>
          <button
            onClick={onGoToMenu}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2 mx-auto"
          >
            <FaArrowLeft /> Volver al Menú
          </button>
        </div>
      </div>
    );
  }

  // Handler para abrir modal manual (para testing)
  const handleOpenManualModal = useCallback(() => {
    setModalManualAbierto(true);
  }, []);

  // Limpiar toast después de duration
  useEffect(() => {
    if (toastLocal?.duration) {
      const timer = setTimeout(() => setToastLocal(null), toastLocal.duration);
      return () => clearTimeout(timer);
    }
  }, [toastLocal]);

  return (
    <div className="relative">
      {/* Badge indicador de Vista Supervisor */}
      <div className="fixed top-20 right-4 z-40">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-purple-600 rounded-lg text-white text-sm font-semibold shadow-lg">
            <FaUserPlus className="inline mr-1" />
            Vista Supervisor
          </div>
          {/* Botón temporal para probar modal */}
          <button
            onClick={handleOpenManualModal}
            className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 rounded-lg text-white text-sm font-medium shadow-lg"
            title="Asignar cocinero"
          >
            Asignar
          </button>
        </div>
      </div>

      {/* Renderizar ComandaStyle base sin props extra */}
      <ComandaStyle
        onGoToMenu={onGoToMenu}
        initialOptions={initialOptions}
      />

      {/* Modal de asignación de cocinero (desde hook o manual) */}
      <AsignarCocineroModal
        isOpen={modalAbierto || modalManualAbierto}
        onClose={() => {
          cerrarModal();
          setModalManualAbierto(false);
        }}
        cocineros={cocineros}
        loading={loadingCocineros}
        asignando={asignando}
        onAsignar={asignarCocinero}
        platoActual={platoSeleccionado}
        comandaActual={comandaSeleccionada}
      />

      {/* Toast notification local */}
      <AnimatePresence>
        {toastLocal && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50
              ${toastLocal.type === 'success' ? 'bg-green-600 text-white' : ''}
              ${toastLocal.type === 'error' ? 'bg-red-600 text-white' : ''}
              ${toastLocal.type === 'warning' ? 'bg-yellow-500 text-gray-900' : ''}
              ${toastLocal.type === 'info' ? 'bg-blue-600 text-white' : ''}
            `}
          >
            <p className="font-medium">{toastLocal.text || toastLocal.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComandaStyleSupervi;
