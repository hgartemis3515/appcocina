import React from 'react';

/**
 * Comandas de una familia SOS, delante del tablero.
 * Velo negro oscuro; las tarjetas quedan encima. La columna SOS sigue afuera.
 */
export default function SosGrupoModal({ filas = [], renderTarjeta, onCerrar }) {
  if (!filas.length) return null;
  return (
    <div
      className="absolute inset-0 z-30 overflow-auto bg-black/95"
      aria-label="Comandas agrupadas SOS"
      onClick={() => onCerrar?.()}
    >
      <div className="flex flex-wrap gap-3 p-4 items-start content-start">
        {filas.map(({ comanda, platos }) => (
          <div
            key={String(comanda._id || comanda.id)}
            className="relative z-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {renderTarjeta(comanda, platos)}
          </div>
        ))}
      </div>
    </div>
  );
}
