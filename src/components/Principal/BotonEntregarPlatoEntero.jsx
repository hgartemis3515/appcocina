import React from 'react';
import { motion } from 'framer-motion';

/**
 * Atajo a la derecha de Finalizar plato. Visible solo con permiso entregar-plato-entero-kds.
 */
const BotonEntregarPlatoEntero = ({
  visible,
  enabled,
  loading,
  nightMode,
  onClick,
  count = 0
}) => {
  if (!visible) return null;

  const activo = enabled && !loading;
  const label = count > 1 ? `Entregar plato entero (${count})` : 'Entregar plato entero';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!activo}
      title="Finalizar y confirmar salida de cocina en un paso"
      className={`px-4 py-3 font-bold rounded-lg text-sm shadow-lg flex items-center gap-2 max-w-[11rem] leading-tight text-left ${
        activo
          ? 'bg-teal-700 text-white hover:bg-teal-800 cursor-pointer'
          : nightMode
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-300 text-gray-400 cursor-not-allowed'
      }`}
      whileHover={activo ? { scale: 1.05 } : {}}
      whileTap={activo ? { scale: 0.95 } : {}}
    >
      {loading ? '…' : '🚶'}
      <span>{loading ? 'Procesando...' : label}</span>
    </motion.button>
  );
};

export default BotonEntregarPlatoEntero;
