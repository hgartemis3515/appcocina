/**
 * PlatoConProcesamiento - Componente para mostrar badges de procesamiento de platos
 * 
 * TEMA 5: Muestra visualmente:
 * - Badge animado cuando un plato está siendo procesado
 * - Nombre del cocinero que tomó el plato
 * - Botón "Liberar" solo para quien tomó el plato
 * - Badge verde con quien terminó el plato
 * 
 * @module PlatoConProcesamiento
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaCheck, FaTimes } from 'react-icons/fa';

/**
 * Componente para mostrar el estado de procesamiento de un plato
 * 
 * @param {Object} props
 * @param {Object} props.plato - Datos del plato
 * @param {string} props.comandaId - ID de la comanda
 * @param {string} props.usuarioActualId - ID del usuario actual
 * @param {Function} props.onTomar - Callback para tomar el plato
 * @param {Function} props.onLiberar - Callback para liberar el plato
 * @param {Function} props.onFinalizar - Callback para finalizar el plato
 * @param {boolean} props.disabled - Si el control está deshabilitado
 */
const PlatoConProcesamiento = ({
  plato,
  comandaId,
  usuarioActualId,
  onTomar,
  onLiberar,
  onFinalizar,
  disabled = false,
  loading = false
}) => {
  const procesandoPor = plato?.procesandoPor;
  const procesadoPor = plato?.procesadoPor;
  const estaSiendoProcesado = procesandoPor?.cocineroId;
  const esMiProceso = procesandoPor?.cocineroId === usuarioActualId;
  const estaListo = plato?.estado === 'recoger' || plato?.estado === 'entregado';

  // Animación para el badge pulsante
  const pulseVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  // No mostrar nada si el plato está listo y no tiene info de procesadoPor
  if (estaListo && !procesadoPor) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Badge de "Procesando" - Cuando alguien está preparando el plato */}
      <AnimatePresence>
        {estaSiendoProcesado && !estaListo && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={`
              inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
              ${esMiProceso 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }
            `}
          >
            {/* Icono animado */}
            <motion.span
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              className="text-base"
            >
              👨‍🍳
            </motion.span>
            
            {/* Nombre del cocinero */}
            <span className="max-w-[80px] truncate">
              {esMiProceso ? 'Tú' : (procesandoPor?.alias || procesandoPor?.nombre || 'Cocinero')}
            </span>
            
            {/* Botón liberar - Solo para quien tomó el plato */}
            {esMiProceso && onLiberar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLiberar(comandaId, plato._id || plato.platoId);
                }}
                disabled={loading || disabled}
                className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
                title="Liberar plato"
              >
                <FaTimes className="text-[10px]" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge de "Procesado" - Cuando el plato está listo */}
      <AnimatePresence>
        {estaListo && procesadoPor && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-300 border border-green-600/30"
          >
            <FaCheck className="text-[10px]" />
            <span className="max-w-[100px] truncate">
              {procesadoPor?.alias || procesadoPor?.nombre || 'Completado'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón "Tomar" - Solo si no está siendo procesado y no está listo */}
      {!estaSiendoProcesado && !estaListo && onTomar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTomar(comandaId, plato._id || plato.platoId);
          }}
          disabled={loading || disabled}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
            transition-all duration-200
            ${loading || disabled
              ? 'bg-gray-600/30 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
            }
          `}
        >
          <FaUser className="text-[10px]" />
          <span>Tomar</span>
        </button>
      )}
    </div>
  );
};

/**
 * Componente para mostrar el badge de procesamiento a nivel de comanda completa
 */
export const ComandaProcesamientoBadge = ({
  comanda,
  usuarioActualId,
  onTomar,
  onLiberar,
  disabled = false,
  loading = false
}) => {
  const procesandoPor = comanda?.procesandoPor;
  const estaSiendoProcesada = procesandoPor?.cocineroId;
  const esMiComanda = procesandoPor?.cocineroId === usuarioActualId;

  if (!estaSiendoProcesada) {
    return onTomar ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTomar(comanda._id);
        }}
        disabled={loading || disabled}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-all duration-200
          ${loading || disabled
            ? 'bg-gray-600/30 text-gray-400 cursor-not-allowed'
            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
          }
        `}
      >
        <FaUser />
        <span>Tomar Comanda</span>
      </button>
    ) : null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        ${esMiComanda
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
        }
      `}
    >
      <motion.span
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        👨‍🍳
      </motion.span>
      
      <span>
        {esMiComanda ? 'Tu comanda' : `${procesandoPor?.alias || procesandoPor?.nombre}`}
      </span>
      
      {esMiComanda && onLiberar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLiberar(comanda._id);
          }}
          disabled={loading || disabled}
          className="ml-1 p-1 rounded hover:bg-white/10 transition-colors"
          title="Liberar comanda"
        >
          <FaTimes className="text-xs" />
        </button>
      )}
    </motion.div>
  );
};

/**
 * Badge compacto para mostrar en tarjetas pequeñas
 */
export const ProcesamientoBadgeCompact = ({ plato, usuarioActualId }) => {
  const procesandoPor = plato?.procesandoPor;
  const procesadoPor = plato?.procesadoPor;
  const estaListo = plato?.estado === 'recoger' || plato?.estado === 'entregado';

  if (estaListo && procesadoPor) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <FaCheck className="text-[8px]" />
        {procesadoPor?.alias || '✓'}
      </span>
    );
  }

  if (procesandoPor?.cocineroId) {
    const esMio = procesandoPor.cocineroId === usuarioActualId;
    return (
      <motion.span
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className={`inline-flex items-center gap-1 text-xs ${esMio ? 'text-green-400' : 'text-yellow-400'}`}
      >
        👨‍🍳 {esMio ? 'Tú' : (procesandoPor?.alias || '...')}
      </motion.span>
    );
  }

  return null;
};

export default PlatoConProcesamiento;
