/**
 * ComandaStyleSupervi - Vista de Supervisor del KDS
 * 
 * Extiende ComandaStyle con funcionalidades de supervisor:
 * - Intercepta "Tomar Plato/Comanda" para asignar cocinero obligatoriamente
 * - Permite "Dejar Plato" y "Finalizar Comanda" como supervisor
 * - Modal obligatorio de selección de cocinero
 * 
 * Solo accesible para usuarios con rol supervisor o admin.
 * 
 * @module ComandaStyleSupervi
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserPlus, FaArrowLeft, FaUserCheck, FaSpinner, FaHandPaper, FaCheck } from 'react-icons/fa';

import ComandaStyle from './comandastyle';
import AsignarCocineroModal from './AsignarCocineroModal';
import TomarCocineroModal from './TomarCocineroModal';
import useAsignacionCocinero from '../../hooks/useAsignacionCocinero';
import useProcesamiento from '../../hooks/useProcesamiento';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Componente wrapper que extiende ComandaStyle con funcionalidades de supervisor
 */
const ComandaStyleSupervi = ({ onGoToMenu, initialOptions }) => {
  const { hasRole, getToken, userId } = useAuth();
  
  // Verificar permisos de supervisor
  const tienePermiso = hasRole(['supervisor', 'admin']);
  
  // Estado para toast notifications
  const [toastLocal, setToastLocal] = useState(null);
  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  
  // Estados para modal de "Tomar" (interceptado)
  const [modalTomarAbierto, setModalTomarAbierto] = useState(false);
  const [tipoToma, setTipoToma] = useState(null); // 'platos' | 'comanda'
  const [accionPendiente, setAccionPendiente] = useState(null); // { tipo, datos }
  
  // Estados para modales de "Dejar" (interceptado)
  const [modalDejarAbierto, setModalDejarAbierto] = useState(false);
  const [dejarMotivo, setDejarMotivo] = useState('');
  const [dejarLoading, setDejarLoading] = useState(false);
  const [accionDejarPendiente, setAccionDejarPendiente] = useState(null); // { tipo: 'platos'|'comanda', datos }
  
  // Estado para forzar reseteo de selección en ComandaStyle
  const [resetKey, setResetKey] = useState(0);
  
  // Hook de asignación de cocinero (existente)
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

  // Hook de procesamiento
  const {
    loading: procesando,
    tomarPlato,
    tomarComanda,
    liberarPlato,
    liberarComanda,
    finalizarPlato,
    finalizarComanda
  } = useProcesamiento({
    getToken,
    showToast: (msg) => setToastLocal({ ...msg, duration: 3000 }),
    onProcesamientoChange: (data) => {
      console.log('[Supervi] Procesamiento actualizado:', data);
      if (data.type === 'PLATO_TOMADO' || data.type === 'COMANDA_TOMADA') {
        setModalTomarAbierto(false);
        setAccionPendiente(null);
      }
      if (data.type === 'PLATO_LIBERADO' || data.type === 'COMANDA_LIBERADA') {
        setModalDejarAbierto(false);
        setAccionDejarPendiente(null);
        // Forzar reseteo de selección en ComandaStyle
        setResetKey(prev => prev + 1);
      }
    }
  });

  // Cargar lista de cocineros al montar
  useEffect(() => {
    if (tienePermiso) {
      cargarCocineros();
    }
  }, [tienePermiso]);

  // Limpiar toast después de duration
  useEffect(() => {
    if (toastLocal?.duration) {
      const timer = setTimeout(() => setToastLocal(null), toastLocal.duration);
      return () => clearTimeout(timer);
    }
  }, [toastLocal]);

  // Handler para abrir modal manual (botón "Asignar" existente)
  const handleOpenManualModal = useCallback(() => {
    setModalManualAbierto(true);
  }, []);

  // ============================================
  // INTERCEPTADORES DE ACCIONES DEL SUPERVISOR
  // ============================================

  /**
   * Intercepta "Tomar Plato" desde ComandaStyle
   * En lugar de ejecutar directamente, abre modal para seleccionar cocinero
   */
  const handleSupervisorTomarPlato = useCallback((platos) => {
    console.log('[Supervi] Interceptado Tomar Plato:', platos);
    if (!platos || platos.length === 0) {
      setToastLocal({ type: 'warning', text: 'Selecciona al menos un plato', duration: 3000 });
      return;
    }
    setTipoToma('platos');
    setAccionPendiente({ tipo: 'platos', datos: platos });
    setModalTomarAbierto(true);
  }, []);

  /**
   * Intercepta "Tomar Comanda" desde ComandaStyle
   * En lugar de ejecutar directamente, abre modal para seleccionar cocinero
   */
  const handleSupervisorTomarComanda = useCallback((comandaId) => {
    console.log('[Supervi] Interceptado Tomar Comanda:', comandaId);
    setTipoToma('comanda');
    setAccionPendiente({ tipo: 'comanda', datos: { comandaId } });
    setModalTomarAbierto(true);
  }, []);

  /**
   * Intercepta "Dejar Plato" desde ComandaStyle
   * Abre modal para ingresar motivo antes de liberar
   */
  const handleSupervisorDejarPlato = useCallback((platos) => {
    console.log('[Supervi] Interceptado Dejar Plato:', platos);
    if (!platos || platos.length === 0) return;
    setAccionDejarPendiente({ tipo: 'platos', datos: platos });
    setDejarMotivo('');
    setModalDejarAbierto(true);
  }, []);

  /**
   * Intercepta "Dejar Comanda" desde ComandaStyle
   */
  const handleSupervisorDejarComanda = useCallback((comandaId) => {
    console.log('[Supervi] Interceptado Dejar Comanda:', comandaId);
    setAccionDejarPendiente({ tipo: 'comanda', datos: { comandaId } });
    setDejarMotivo('');
    setModalDejarAbierto(true);
  }, []);

  // ============================================
  // EJECUCIÓN DE ACCIONES CON COCINERO ASIGNADO
  // ============================================

  /**
   * Ejecuta la toma con el cocinero seleccionado
   * NOTA: Como supervisor, usa forzar=true para poder reasignar platos ya tomados
   */
  const handleConfirmarToma = useCallback(async (cocineroId) => {
    if (!accionPendiente) return;

    const { tipo, datos } = accionPendiente;
    console.log('[Supervi] Confirmando toma:', tipo, 'para cocinero:', cocineroId);

    if (tipo === 'comanda') {
      // forzar=true para permitir reasignación como supervisor
      const result = await tomarComanda(datos.comandaId, cocineroId, true);
      if (result.success) {
        setToastLocal({
          type: 'success',
          text: `👨‍🍳 Comanda asignada al cocinero`,
          duration: 3000
        });
        // Forzar reseteo de selección
        setResetKey(prev => prev + 1);
      }
    } else if (tipo === 'platos') {
      let exitosos = 0;
      for (const plato of datos) {
        // forzar=true para permitir reasignación como supervisor
        const result = await tomarPlato(
          plato.comandaId || plato.comanda?._id,
          plato.platoId || plato._id,
          cocineroId,
          true // forzar reasignación
        );
        if (result.success) exitosos++;
      }
      if (exitosos > 0) {
        setToastLocal({
          type: 'success',
          text: `👨‍🍳 ${exitosos} plato${exitosos > 1 ? 's' : ''} asignado${exitosos > 1 ? 's' : ''}`,
          duration: 3000
        });
        // Forzar reseteo de selección
        setResetKey(prev => prev + 1);
      }
    }
  }, [accionPendiente, tomarPlato, tomarComanda]);

  /**
   * Ejecuta la liberación con motivo
   */
  const handleConfirmarDejar = useCallback(async () => {
    if (!accionDejarPendiente) return;
    if (!dejarMotivo.trim()) {
      setToastLocal({ type: 'warning', text: 'Ingresa un motivo', duration: 3000 });
      return;
    }

    const { tipo, datos } = accionDejarPendiente;
    setDejarLoading(true);
    console.log('[Supervi] Confirmando dejar:', tipo, 'motivo:', dejarMotivo);

    try {
      if (tipo === 'comanda') {
        // Para dejar comanda, usar el userId del supervisor
        const result = await liberarComanda(datos.comandaId, userId, dejarMotivo.trim());
        if (result.success) {
          setToastLocal({ type: 'info', text: 'Comanda liberada', duration: 3000 });
          setModalDejarAbierto(false);
          // Forzar reseteo de selección
          setResetKey(prev => prev + 1);
        }
      } else if (tipo === 'platos') {
        let exitosos = 0;
        for (const plato of datos) {
          const result = await liberarPlato(
            plato.comandaId || plato.comanda?._id,
            plato.platoId || plato._id,
            userId,
            dejarMotivo.trim()
          );
          if (result.success) exitosos++;
        }
        if (exitosos > 0) {
          setToastLocal({ type: 'info', text: `${exitosos} plato${exitosos > 1 ? 's' : ''} liberado${exitosos > 1 ? 's' : ''}`, duration: 3000 });
          setModalDejarAbierto(false);
          // Forzar reseteo de selección
          setResetKey(prev => prev + 1);
        }
      }
    } finally {
      setDejarLoading(false);
    }
  }, [accionDejarPendiente, dejarMotivo, userId, liberarPlato, liberarComanda]);

  /**
   * Ejecuta finalizar platos (el supervisor puede finalizar cualquier plato)
   */
  const handleSupervisorFinalizarPlato = useCallback(async (platos) => {
    console.log('[Supervi] Finalizar platos:', platos);
    if (!platos || platos.length === 0) return;

    let exitosos = 0;
    for (const plato of platos) {
      // Usar el userId del supervisor para auditoría
      const result = await finalizarPlato(
        plato.comandaId || plato.comanda?._id,
        plato.platoId || plato._id,
        userId
      );
      if (result.success) exitosos++;
    }
    
    if (exitosos > 0) {
      setToastLocal({
        type: 'success',
        text: `✅ ${exitosos} plato${exitosos > 1 ? 's' : ''} finalizado${exitosos > 1 ? 's' : ''}`,
        duration: 3000
      });
      // Forzar reseteo de selección
      setResetKey(prev => prev + 1);
    }
  }, [userId, finalizarPlato]);

  /**
   * Ejecuta finalizar comanda
   */
  const handleSupervisorFinalizarComanda = useCallback(async (comandaId) => {
    console.log('[Supervi] Finalizar comanda:', comandaId);
    const result = await finalizarComanda(comandaId, userId);
    if (result.success) {
      setToastLocal({
        type: 'success',
        text: '✅ Comanda finalizada',
        duration: 3000
      });
      // Forzar reseteo de selección
      setResetKey(prev => prev + 1);
    }
  }, [userId, finalizarComanda]);

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

  return (
    <div className="relative min-h-screen">
      {/* Badge indicador de Vista Supervisor */}
      <div className="fixed top-20 right-4 z-40">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-purple-600 rounded-lg text-white text-sm font-semibold shadow-lg">
            <FaUserPlus className="inline mr-1" />
            Vista Supervisor
          </div>
          
          {/* Botón "Asignar" manual */}
          <button
            onClick={handleOpenManualModal}
            className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 rounded-lg text-white text-sm font-medium shadow-lg"
            title="Asignar cocinero manualmente"
          >
            Asignar
          </button>
        </div>
      </div>

      {/* Renderizar ComandaStyle con interceptores */}
      <ComandaStyle
        key={resetKey}
        onGoToMenu={onGoToMenu}
        initialOptions={initialOptions}
        isSupervisorView={true}
        // Interceptadores para "Tomar"
        onSupervisorTomarPlato={handleSupervisorTomarPlato}
        onSupervisorTomarComanda={handleSupervisorTomarComanda}
        // Interceptadores para "Dejar"
        onSupervisorDejarPlato={handleSupervisorDejarPlato}
        onSupervisorDejarComanda={handleSupervisorDejarComanda}
        // Interceptadores para "Finalizar"
        onSupervisorFinalizarPlato={handleSupervisorFinalizarPlato}
        onSupervisorFinalizarComanda={handleSupervisorFinalizarComanda}
      />

      {/* Modal de "Tomar" - Selección de cocinero OBLIGATORIO */}
      <TomarCocineroModal
        isOpen={modalTomarAbierto}
        onClose={() => {
          setModalTomarAbierto(false);
          setTipoToma(null);
          setAccionPendiente(null);
        }}
        cocineros={cocineros}
        loading={loadingCocineros}
        procesando={procesando}
        onConfirmar={handleConfirmarToma}
        platosSeleccionados={tipoToma === 'platos' && accionPendiente?.datos ? accionPendiente.datos : []}
        comandaSeleccionada={tipoToma === 'comanda' && accionPendiente?.datos ? { _id: accionPendiente.datos.comandaId } : null}
      />

      {/* Modal de "Dejar" - Motivo de auditoría */}
      <AnimatePresence>
        {modalDejarAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !dejarLoading && setModalDejarAbierto(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                    <FaHandPaper className="text-red-400 text-lg" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {accionDejarPendiente?.tipo === 'comanda' ? 'Dejar Comanda' : 'Dejar Plato'}
                  </h2>
                </div>
                <button
                  onClick={() => setModalDejarAbierto(false)}
                  disabled={dejarLoading}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Contenido */}
              <p className="text-gray-400 text-sm mb-4">
                Ingresa el motivo por el cual se libera {accionDejarPendiente?.tipo === 'comanda' ? 'la comanda' : 'el/los plato(s)'}:
              </p>

              <textarea
                value={dejarMotivo}
                onChange={(e) => setDejarMotivo(e.target.value)}
                placeholder="Ej: Cliente solicitó cambio, Ingrediente no disponible..."
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none resize-none h-24"
                disabled={dejarLoading}
              />

              {/* Botones */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setModalDejarAbierto(false)}
                  disabled={dejarLoading}
                  className="flex-1 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarDejar}
                  disabled={dejarLoading || !dejarMotivo.trim()}
                  className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {dejarLoading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <FaHandPaper />
                      <span>Dejar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de asignación de cocinero (existente - manual) */}
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
