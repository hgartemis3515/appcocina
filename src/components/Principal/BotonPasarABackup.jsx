import React from 'react';
import { motion } from 'framer-motion';

/**
 * A la derecha de "Entregar plato entero". Pasa platos en proceso a su backup de asignación.
 */
const BotonPasarABackup = ({
  visible = true,
  enabled,
  loading,
  nightMode,
  onClick,
  count = 0
}) => {
  if (!visible) return null;

  const activo = enabled && !loading;
  const label = count > 1 ? `Cambiar a Backup (${count})` : 'Cambiar a Backup';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!activo}
      title="Pasar el plato en proceso al backup configurado en asignación automática"
      className={`px-4 py-3 font-bold rounded-lg text-sm shadow-lg flex items-center gap-2 max-w-[11rem] leading-tight text-left ${
        activo
          ? 'bg-amber-600 text-white hover:bg-amber-700 cursor-pointer'
          : nightMode
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-300 text-gray-400 cursor-not-allowed'
      }`}
      whileHover={activo ? { scale: 1.05 } : {}}
      whileTap={activo ? { scale: 0.95 } : {}}
    >
      {loading ? '…' : '↻'}
      <span>{loading ? 'Pasando...' : label}</span>
    </motion.button>
  );
};

export default BotonPasarABackup;
