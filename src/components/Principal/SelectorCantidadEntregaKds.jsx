import React from 'react';

/**
 * A la derecha de "Entregar plato entero": −  Nombre xN  +  Max
 * Solo visible cuando hay una línea seleccionada con cantidad > 1.
 */
const SelectorCantidadEntregaKds = ({
  visible,
  nombre,
  value,
  max,
  nightMode,
  disabled,
  onMinus,
  onPlus,
  onMax
}) => {
  if (!visible) return null;

  const btn = `w-8 h-8 rounded-md font-black text-lg flex items-center justify-center flex-shrink-0 ${
    disabled
      ? nightMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-400'
      : nightMode
        ? 'bg-gray-700 text-white hover:bg-gray-600'
        : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
  }`;

  return (
    <div
      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 shadow-lg ${
        nightMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
      }`}
      title="Cuántas unidades de esta comanda entregar (el resto sigue en cocina)"
    >
      <button type="button" className={btn} disabled={disabled || value <= 1} onClick={onMinus} aria-label="Menos">−</button>
      <span className="px-1.5 font-bold text-sm whitespace-nowrap max-w-[11rem] truncate">
        {nombre} x{value}
      </span>
      <button type="button" className={btn} disabled={disabled || value >= max} onClick={onPlus} aria-label="Más">+</button>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={onMax}
        className={`px-2.5 h-8 rounded-md text-xs font-extrabold uppercase tracking-wide flex-shrink-0 ${
          disabled || value >= max
            ? nightMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-400'
            : 'bg-violet-700 text-white hover:bg-violet-800'
        }`}
      >
        Max
      </button>
    </div>
  );
};

export default SelectorCantidadEntregaKds;
