import React from 'react';

/**
 * Etiqueta PARA LLEVAR a la derecha del nombre del plato (KDS y Ver Cocina).
 */
export default function BadgeParaLlevar({ fontSize = 12 }) {
  return (
    <span
      title="Este plato es para llevar (no se sirve en mesa)"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        padding: '3px 9px',
        borderRadius: '999px',
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#fcd34d',
        background: 'rgba(245, 158, 11, 0.22)',
        border: '1px solid rgba(245, 158, 11, 0.45)',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      PARA LLEVAR
    </span>
  );
}
