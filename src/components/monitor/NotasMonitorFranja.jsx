import React from 'react';
import { textoFranjaNotas } from '../../utils/notasMonitor';

const ALIGN = { izquierda: 'left', centro: 'center', derecha: 'right' };

const NotasMonitorFranja = ({
  lineas = [],
  titulo = 'Notas:',
  configVisual = {},
  colorTexto,
  fuenteFamilia,
}) => {
  const texto = textoFranjaNotas(lineas, titulo);
  if (!texto) return null;
  const color = configVisual.colorTextoNotas || colorTexto || '#9ca3af';
  const fuente = configVisual.fuenteFamiliaNotas || fuenteFamilia || 'Inter, system-ui, sans-serif';
  const tamanio = Number(configVisual.tamanioFuenteNotas) || 14;
  const peso = configVisual.pesoFuenteNotas || '600';
  const align = ALIGN[configVisual.alinearTablaNotas] || 'left';

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '8px 12px',
        borderTop: `1px solid ${color}33`,
        fontFamily: fuente,
        fontSize: `${tamanio}px`,
        fontWeight: peso,
        color,
        textAlign: align,
        lineHeight: 1.35,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
    >
      {texto}
    </div>
  );
};

export default NotasMonitorFranja;
