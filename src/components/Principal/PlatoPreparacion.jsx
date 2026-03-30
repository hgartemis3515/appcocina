import React from 'react';
import { motion } from 'framer-motion';

/**
 * Componente aislado para un plato en "EN PREPARACIÓN".
 * Un solo contenedor clickeable con stopPropagation; animaciones Framer Motion por estado.
 * 🔥 CORREGIDO: Ahora usa platoIndex en lugar de platoId para el endpoint de anulación
 * 
 * v7.2: Agregado soporte para mostrar badge de cocinero que esta procesando el plato
 * v7.2.1: Agregado estado visual 'dejar' (rojo) para liberar platos tomados
 */
const PlatoPreparacion = ({
  plato,
  comandaId,
  platoId,
  platoIndex, // 🔥 NUEVO: Índice del plato en el array (necesario para anulación)
  cantidad,
  nombre,
  estadoVisual,
  nightMode = true,
  isEliminado = false,
  onToggle,
  complementosSeleccionados = [],
  // v7.2: Props para multi-cocinero
  procesandoPor = null,  // { cocineroId, nombre, alias, timestamp }
  usuarioActualId = null, // Para mostrar "Tú" vs nombre del cocinero
}) => {
  // v7.2: Determinar si el plato está tomado por otro cocinero (no se puede interactuar)
  const tomadoPorOtro = procesandoPor?.cocineroId && 
                         procesandoPor.cocineroId.toString() !== usuarioActualId?.toString();
  
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // 🔥 FIX: No permitir interacción si está tomado por otro cocinero
    if (tomadoPorOtro || isEliminado) return;
    if (onToggle && platoIndex !== undefined) {
      onToggle(comandaId, platoIndex); // 🔥 CORREGIDO: Pasar índice, no ID
    }
  };

  const visualState = isEliminado ? 'eliminado' : estadoVisual;

  const containerVariants = {
    normal: {
      scale: 1,
      opacity: 1,
      boxShadow: '0 0 0px rgba(0,0,0,0)',
      transition: { duration: 0.2 },
    },
    procesando: {
      scale: [1, 1.015, 1],
      opacity: [1, 0.95, 1],
      boxShadow: [
        '0 0 8px rgba(251, 191, 36, 0.3)',
        '0 0 16px rgba(251, 191, 36, 0.5)',
        '0 0 8px rgba(251, 191, 36, 0.3)',
      ],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    dejar: {
      scale: [1, 1.02, 1],
      opacity: [1, 0.9, 1],
      boxShadow: [
        '0 0 8px rgba(239, 68, 68, 0.3)',
        '0 0 16px rgba(239, 68, 68, 0.5)',
        '0 0 8px rgba(239, 68, 68, 0.3)',
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    seleccionado: {
      scale: 1,
      opacity: 1,
      boxShadow: [
        '0 0 12px rgba(34, 197, 94, 0.4)',
        '0 0 20px rgba(34, 197, 94, 0.6)',
        '0 0 12px rgba(34, 197, 94, 0.4)',
      ],
      transition: {
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    eliminado: {
      scale: 0.98,
      opacity: 0.6,
      boxShadow: '0 0 0px rgba(0,0,0,0)',
      transition: { duration: 0.2 },
    },
  };

  const iconVariants = {
    normal: { scale: 1, rotate: 0 },
    procesando: {
      y: [-1.5, 1.5, -1.5],
      rotate: [0, 3, -3, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    dejar: {
      x: [-2, 2, -2],
      rotate: [0, -5, 5, 0],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    seleccionado: {
      scale: [0, 1.1, 1],
      rotate: [0, -15, 0],
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 15,
      },
    },
    eliminado: { scale: 1, opacity: 0.5 },
  };

  const getBackgroundClass = () => {
    if (isEliminado) return 'bg-red-500/15 text-red-500 border-red-500/30';
    switch (estadoVisual) {
      case 'seleccionado':
        return nightMode ? 'bg-green-500/30 text-green-400 border-green-500/50' : 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'dejar':
        return nightMode ? 'bg-red-500/30 text-red-300 border-red-500/50' : 'bg-red-500/20 text-red-700 border-red-500/50';
      case 'procesando':
        return nightMode ? 'bg-yellow-400/30 text-yellow-200 border-yellow-400/50' : 'bg-yellow-400/20 text-yellow-700 border-yellow-400/50';
      default:
        return nightMode ? 'text-white border-transparent hover:bg-gray-700/50' : 'text-gray-900 border-transparent hover:bg-gray-100';
    }
  };

  let checkBorderColor = nightMode ? '#6b7280' : '#9ca3af';
  let checkBgColor = 'transparent';
  if (estadoVisual === 'seleccionado') {
    checkBorderColor = '#22c55e';
    checkBgColor = 'rgba(34, 197, 94, 0.2)';
  } else if (estadoVisual === 'dejar') {
    checkBorderColor = '#ef4444';
    checkBgColor = 'rgba(239, 68, 68, 0.2)';
  } else if (estadoVisual === 'procesando') {
    checkBorderColor = '#fbbf24';
    checkBgColor = 'rgba(251, 191, 36, 0.2)';
  } else if (nightMode) {
    checkBorderColor = '#6b7280';
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isEliminado && onToggle && platoIndex !== undefined) {
          e.stopPropagation();
          e.preventDefault();
          onToggle(comandaId, platoIndex); // 🔥 CORREGIDO: Pasar índice, no ID
        }
      }}
      className={`font-semibold leading-tight px-3 py-2 rounded-lg flex items-start gap-3 cursor-pointer border ${getBackgroundClass()} ${isEliminado ? 'line-through cursor-not-allowed' : ''}`}
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px' }}
      title={isEliminado ? 'Plato eliminado' : estadoVisual === 'dejar' ? '↩️ Dejar plato' : estadoVisual === 'procesando' ? '⏳ Procesando' : estadoVisual === 'seleccionado' ? '✓ Listo para finalizar' : 'Click para marcar plato'}
      variants={containerVariants}
      initial="normal"
      animate={visualState}
      whileHover={!isEliminado ? { scale: 1.02 } : {}}
      whileTap={!isEliminado ? { scale: 0.98 } : {}}
    >
      <div
        className="w-8 h-8 border-2 rounded flex items-center justify-center pointer-events-none flex-shrink-0"
        style={{
          borderColor: checkBorderColor,
          backgroundColor: checkBgColor,
          ...(isEliminado ? { opacity: 0.5 } : {}),
        }}
      >
        {visualState === 'seleccionado' && (
          <motion.svg
            className="w-5 h-5 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
            variants={iconVariants}
            initial="normal"
            animate="seleccionado"
            aria-hidden
          >
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </motion.svg>
        )}
        {visualState === 'dejar' && (
          <motion.span
            className="text-xl"
            variants={iconVariants}
            animate="dejar"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.5))' }}
            aria-hidden
          >
            ↩️
          </motion.span>
        )}
        {visualState === 'procesando' && (
          <motion.span
            className="text-xl"
            variants={iconVariants}
            animate="procesando"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(252, 211, 77, 0.5))' }}
            aria-hidden
          >
            ⏳
          </motion.span>
        )}
        {visualState === 'normal' && (
          <div
            className={`w-4 h-4 rounded border-2 ${nightMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-300 border-gray-400'}`}
            aria-hidden
          />
        )}
        {visualState === 'eliminado' && (
          <span className="text-red-500 text-lg font-bold" aria-hidden>✕</span>
        )}
      </div>
      <div className="flex-1 pointer-events-none">
        <div className="flex items-center gap-2 flex-wrap">
          <span>{cantidad} {nombre}</span>
          
          {/* v7.2: Badge de cocinero que esta procesando el plato */}
          {procesandoPor?.cocineroId && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                procesandoPor.cocineroId?.toString() === usuarioActualId?.toString()
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}
              title={`Tomado por: ${procesandoPor.nombre || procesandoPor.alias || 'Cocinero'}`}
            >
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                👨‍🍳
              </motion.span>
              <span className="max-w-[60px] truncate">
                {procesandoPor.cocineroId?.toString() === usuarioActualId?.toString()
                  ? 'Tú'
                  : (procesandoPor.alias || procesandoPor.nombre || 'Cocinero')}
              </span>
            </motion.span>
          )}
        </div>
        
        {complementosSeleccionados && complementosSeleccionados.length > 0 && (
          <div className="flex flex-col gap-0.5 pointer-events-none mt-0.5">
            {complementosSeleccionados.map((comp, i) => {
              // v2.0: Mostrar cantidad si es mayor a 1
              const opcionTexto = Array.isArray(comp.opcion) ? comp.opcion.join(', ') : comp.opcion;
              const cantidadComp = comp.cantidad || 1;
              const mostrarCantidad = cantidadComp > 1;
              
              return (
                <span
                  key={i}
                  className={`text-xs leading-tight pl-1 ${
                    nightMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
                >
                  · {opcionTexto}{mostrarCantidad ? ` x${cantidadComp}` : ''}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PlatoPreparacion;
