import React from 'react';

/** −/+ a la derecha del plato. El valor inicial es el máximo de la línea. */
export default function StepperCantidadEliminar({ value, max, onChange, nightMode = true }) {
  const tope = Math.max(1, Math.floor(Number(max) || 1));
  const actual = Math.min(tope, Math.max(1, Math.floor(Number(value) || tope)));
  if (tope <= 1) {
    return <span className="font-black tabular-nums">{tope}</span>;
  }
  const btn = nightMode
    ? 'border-gray-500 text-white hover:bg-gray-700'
    : 'border-gray-400 text-gray-900 hover:bg-gray-200';
  return (
    <span
      className="inline-flex items-center gap-1 flex-shrink-0"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Quitar una unidad"
        disabled={actual <= 1}
        onClick={() => onChange(Math.max(1, actual - 1))}
        className={`w-8 h-8 rounded border text-lg leading-none font-bold disabled:opacity-40 ${btn}`}
      >
        −
      </button>
      <span className="w-6 text-center font-black tabular-nums">{actual}</span>
      <button
        type="button"
        aria-label="Sumar una unidad"
        disabled={actual >= tope}
        onClick={() => onChange(Math.min(tope, actual + 1))}
        className={`w-8 h-8 rounded border text-lg leading-none font-bold disabled:opacity-40 ${btn}`}
      >
        +
      </button>
    </span>
  );
}
