import React from 'react';

/**
 * Componente aislado para un plato en "EN PREPARACIÓN".
 * Un solo div clickeable, handler con stopPropagation, cero bubbling.
 * Sin Framer Motion para evitar conflictos de eventos.
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

  const isProcesando = estadoVisual === 'procesando';
  const isSeleccionado = estadoVisual === 'seleccionado';

  let bgClass = '';
  let textClass = nightMode ? 'text-white' : 'text-gray-900';
  let checkBgClass = nightMode ? 'bg-gray-800' : 'bg-white';
  let checkBorderClass = nightMode ? 'border-gray-500' : 'border-gray-400';
  let checkContent = null;

  if (isEliminado) {
    bgClass = 'bg-red-500/15 text-red-500';
    textClass = 'text-red-500';
    checkBgClass = nightMode ? 'bg-gray-800' : 'bg-white';
    checkBorderClass = nightMode ? 'border-gray-500' : 'border-gray-400';
  } else if (isProcesando) {
    bgClass = 'bg-yellow-400/30';
    textClass = 'text-yellow-600 font-bold';
    checkBgClass = 'bg-yellow-400 border-yellow-500';
    checkBorderClass = 'border-yellow-500';
    checkContent = <span className="text-2xl" aria-hidden>⏳</span>;
  } else if (isSeleccionado) {
    bgClass = 'bg-green-500/30';
    textClass = nightMode ? 'text-green-400' : 'text-green-700 font-bold';
    checkBgClass = 'bg-green-500 border-green-600';
    checkBorderClass = 'border-green-600';
    checkContent = (
      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  } else {
    checkContent = (
      <div className={`w-4 h-4 rounded border-2 ${nightMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-300 border-gray-400'}`} aria-hidden />
    );
  }

  return (
    <div
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
      className={`font-semibold leading-tight px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 cursor-pointer hover:bg-opacity-80 ${bgClass} ${textClass} ${isEliminado ? 'line-through cursor-not-allowed' : ''} ${isSeleccionado ? 'shadow-lg' : ''}`}
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px' }}
      title={isEliminado ? 'Plato eliminado' : isProcesando ? '⏳ Procesando' : isSeleccionado ? '✓ Listo para finalizar' : 'Click para marcar plato'}
    >
      <div className={`w-8 h-8 border-2 rounded flex items-center justify-center pointer-events-none flex-shrink-0 ${checkBgClass} ${checkBorderClass} ${isEliminado ? 'opacity-50' : ''}`}>
        {checkContent}
      </div>
      <span className="flex-1 pointer-events-none">
        {cantidad} {nombre}
      </span>
    </div>
  );
};

export default PlatoPreparacion;
