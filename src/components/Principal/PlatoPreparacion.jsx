import React from 'react';
import { motion } from 'framer-motion';

/**
 * Componente aislado para un plato en "EN PREPARACIÓN".
 * Un solo contenedor clickeable con stopPropagation; animaciones Framer Motion por estado.
 */
const PlatoPreparacion = ({
  plato,
  comandaId,
  platoId,
  cantidad,
  nombre,
  estadoVisual,
  nightMode = true,
  isEliminado = false,
  onToggle,
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEliminado && onToggle) {
      onToggle(comandaId, platoId);
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
        if ((e.key === 'Enter' || e.key === ' ') && !isEliminado && onToggle) {
          e.stopPropagation();
          e.preventDefault();
          onToggle(comandaId, platoId);
        }
      }}
      className={`font-semibold leading-tight px-3 py-2 rounded-lg flex items-center gap-3 cursor-pointer border ${getBackgroundClass()} ${isEliminado ? 'line-through cursor-not-allowed' : ''}`}
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px' }}
      title={isEliminado ? 'Plato eliminado' : estadoVisual === 'procesando' ? '⏳ Procesando' : estadoVisual === 'seleccionado' ? '✓ Listo para finalizar' : 'Click para marcar plato'}
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
      <span className="flex-1 pointer-events-none">
        {cantidad} {nombre}
      </span>
    </motion.div>
  );
};

export default PlatoPreparacion;
