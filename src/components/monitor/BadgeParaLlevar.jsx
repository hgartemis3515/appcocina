import React from 'react';
import { COLOR_PARA_LLEVAR, COLOR_PARA_LLEVAR_BORDE } from '../../utils/estiloParaLlevarKds';

/**
 * Etiqueta PARA LLEVAR a la derecha del nombre del plato (KDS y Ver Cocina).
 */
export default function BadgeParaLlevar({ fontSize = 12, texto = 'PARA LLEVAR' }) {
  return (
    <span
      title={texto === 'EXTRA CLIENTE' ? 'Extra cliente' : 'Este plato es para llevar (no se sirve en mesa)'}
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
        color: '#ffffff',
        background: COLOR_PARA_LLEVAR,
        border: `1px solid ${COLOR_PARA_LLEVAR_BORDE}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      {texto}
    </span>
  );
}
