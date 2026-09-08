import React, { useEffect, useState } from 'react';
import {
  esComandaReserva,
  textoHorarioReservaKds,
  msRetrasoReserva,
  formatCronometroMs,
} from '../../utils/kdsFilters';
import {
  estiloCuadroReservaKds,
  estiloLetraReservaKds,
  estiloLetraHorarioReservaKds,
  estiloCronometroReservaKds,
} from '../../utils/estiloReservaKds';

function useRetrasoReservaMs(comanda) {
  const esReserva = esComandaReserva(comanda);
  const [retrasoMs, setRetrasoMs] = useState(() => (esReserva ? msRetrasoReserva(comanda) : 0));

  useEffect(() => {
    if (!esReserva) {
      setRetrasoMs(0);
      return undefined;
    }
    setRetrasoMs(msRetrasoReserva(comanda));
    const t = setInterval(() => setRetrasoMs(msRetrasoReserva(comanda)), 1000);
    return () => clearInterval(t);
  }, [esReserva, comanda]);

  return { esReserva, retrasoMs };
}

/** En encabezado: RESERVA + horarios. El atraso va en la fila EN PREPARACIÓN. */
export default function BadgeReservaKds({ comanda, config = {} }) {
  const { esReserva } = useRetrasoReservaMs(comanda);
  if (!esReserva) return null;

  const horas = textoHorarioReservaKds(comanda);

  return (
    <span className="inline-flex items-center max-w-full">
      <span style={estiloCuadroReservaKds(config)} title="Reserva: hora del pedido y hora de atención">
        <span style={estiloLetraReservaKds(config)}>RESERVA</span>
        {horas ? <span style={estiloLetraHorarioReservaKds(config)}>{horas}</span> : null}
      </span>
    </span>
  );
}

/** Pegado a la derecha de EN PREPARACIÓN, solo si el cliente se atrasó. */
export function CronometroAtrasoReservaKds({ comanda, config = {} }) {
  const { esReserva, retrasoMs } = useRetrasoReservaMs(comanda);
  if (!esReserva || retrasoMs < 1000) return null;

  return (
    <span
      className="ml-auto shrink-0"
      style={estiloCronometroReservaKds(config)}
      title="Tiempo que el cliente se está tardando respecto a la hora de atención"
    >
      +{formatCronometroMs(retrasoMs)}
    </span>
  );
}
