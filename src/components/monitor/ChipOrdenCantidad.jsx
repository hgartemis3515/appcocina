import React from 'react';

/**
 * Chip #orden(cantidad) de Ver Cocina: fondo negro, letras blancas.
 * En #1 parpadean el número, la cantidad y el fondo de las letras.
 */
export default function ChipOrdenCantidad({ orden, cantidad, fontSize }) {
  const n = Number(orden);
  const q = Number(cantidad);
  if (!Number.isFinite(n) || n < 1) return null;
  const cant = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
  const fs = Number(fontSize);
  const esUno = n === 1;
  return (
    <span
      className={esUno ? 'kds-orden-blink' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        background: '#000',
        color: '#fff',
        fontWeight: 800,
        borderRadius: 4,
        padding: '1px 7px',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.25,
        letterSpacing: 0.2,
        fontSize: Number.isFinite(fs) && fs > 0 ? `${fs}px` : undefined,
        animation: esUno ? 'kdsOrdenRojo 1s ease-in-out infinite' : undefined,
      }}
    >
      <span>#{n}</span>
      <span>({cant})</span>
    </span>
  );
}

export function ChipsOrdenCantidadRow({ chips, fontSize }) {
  if (!Array.isArray(chips) || chips.length === 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        verticalAlign: 'middle',
      }}
    >
      <span style={{ opacity: 0.9, fontWeight: 700 }}>→</span>
      {chips.map((c) => (
        <ChipOrdenCantidad
          key={`o${c.orden}-${c.cantidad}`}
          orden={c.orden}
          cantidad={c.cantidad}
          fontSize={fontSize}
        />
      ))}
    </span>
  );
}
