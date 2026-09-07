import React from 'react';
import { textoNumeroSerieKds } from '../../utils/kdsComandaEstilo';

/** N/S junto al cronómetro y el mozo en la tarjeta KDS. */
export default function BadgeNumeroSerieKds({ comanda, compacto = false }) {
  const serie = textoNumeroSerieKds(comanda);
  if (!serie) return null;
  return (
    <span
      className={`inline-flex items-center font-black tabular-nums leading-none tracking-normal text-white ${
        compacto ? 'text-sm px-0.5' : 'text-base px-1 py-0.5'
      }`}
      style={{ fontFamily: 'Arial, sans-serif', letterSpacing: 0 }}
      title={`Número de serie ${serie}`}
    >
      N/S {serie}
    </span>
  );
}
