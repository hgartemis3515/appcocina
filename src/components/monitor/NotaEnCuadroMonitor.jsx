import React from 'react';
import { formatoNotaEnCuadro } from '../../utils/notasMonitor';

/** Nota / observación del mozo: siempre "-Nota: …". */
const NotaEnCuadroMonitor = ({ texto, configVisual = {}, colorFallback = '#fbbf24' }) => {
  const t = formatoNotaEnCuadro(texto);
  if (!t) return null;
  const fs = Number(configVisual.tamanioFuenteNotas) || 14;
  return (
    <div
      title="Nota del mozo"
      style={{
        marginTop: '4px',
        fontSize: `${fs}px`,
        fontWeight: configVisual.pesoFuenteNotas || 600,
        fontFamily: configVisual.fuenteFamiliaNotas || undefined,
        color: configVisual.colorTextoNotas || colorFallback,
        lineHeight: 1.35,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
    >
      {t}
    </div>
  );
};

export default NotaEnCuadroMonitor;
