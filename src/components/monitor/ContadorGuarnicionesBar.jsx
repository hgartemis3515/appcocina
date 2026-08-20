import React from 'react';
import { textoContadorGuarniciones } from '../../utils/nombreComplementoCanonico';

/**
 * Contador de Ver Cocina Completo. Ocupa la ranura del buscador de platos.
 */
const ContadorGuarnicionesBar = ({
  filas = [],
  configVisual = {},
  colorTextoSecundario = '#9ca3af',
}) => {
  const texto = Array.isArray(filas) && filas.length > 0
    ? textoContadorGuarniciones(filas)
    : '';
  const fontSize = Number(configVisual.tamanioFuenteContadorGuarniciones) || 14;
  const fontFamily = configVisual.fuenteFamiliaContadorGuarniciones || 'inherit';
  const color = configVisual.colorTextoContadorGuarniciones || colorTextoSecundario;
  return (
    <div
      title={texto || undefined}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '4px 12px',
        fontSize: `${fontSize}px`,
        fontFamily,
        fontWeight: 700,
        color,
        lineHeight: 1.35,
        letterSpacing: '0.01em',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </div>
  );
};

export default ContadorGuarnicionesBar;
