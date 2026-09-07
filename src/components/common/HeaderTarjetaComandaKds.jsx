import React from 'react';
import { FaClock } from 'react-icons/fa';
import BadgeNumeroSerieKds from './BadgeNumeroSerieKds';
import {
  estiloDatoHeaderTarjetaKds,
  colorRelojHeaderTarjeta,
  ocultarPrepHeaderTarjeta,
  tamanoLetraHeaderTarjetaKds,
} from '../../utils/estiloHeaderTarjetaKds';
import { hexValidoOrdenCola } from '../../utils/estiloNumeroOrdenKds';

function Chip({ style, title, children }) {
  if (children == null || children === '') return null;
  return (
    <span className="inline-flex items-center max-w-full" style={style} title={title}>
      {children}
    </span>
  );
}

function RelojKds({ tiempoFormateado, estiloReloj, tamIcono }) {
  return (
    <Chip style={estiloReloj} title="Tiempo en cocina">
      <FaClock style={{ fontSize: `${tamIcono}px`, flexShrink: 0 }} />
      {tiempoFormateado}
    </Chip>
  );
}

/**
 * Encabezado de tarjeta de comanda: orden, #comanda, mesa, reloj, mozo, Prep.
 * Letras / recuadro vienen de Vista y alertas (headerTarjeta*).
 */
export default function HeaderTarjetaComandaKds({
  estilo = 'compacto',
  config = {},
  cardNumber,
  comanda,
  nombreMesa,
  tiempoFormateado,
  minutosActuales,
  alertYellowMinutes,
  alertRedMinutes,
  estiloMozo,
  nombreMozo,
  prepText,
  prepTitle,
  children,
}) {
  const nComanda = comanda?.comandaNumber || 'N/A';
  const tam = tamanoLetraHeaderTarjetaKds(config);
  const estiloDato = estiloDatoHeaderTarjetaKds(config);
  const fondoMozo = hexValidoOrdenCola(estiloMozo?.backgroundColor) ? estiloMozo.backgroundColor : null;
  const estiloMozoChip = estiloDatoHeaderTarjetaKds(
    config,
    fondoMozo ? { fondoOverride: fondoMozo } : { omitirFondo: true }
  );
  const estiloReloj = estiloDatoHeaderTarjetaKds(config, {
    colorOverride: colorRelojHeaderTarjeta(
      minutosActuales,
      alertYellowMinutes,
      alertRedMinutes,
      config
    ),
  });
  const ocultarPrep = ocultarPrepHeaderTarjeta(config);
  const prepVisible = !ocultarPrep && prepText;
  const reloj = (
    <RelojKds
      tiempoFormateado={tiempoFormateado}
      estiloReloj={estiloReloj}
      tamIcono={Math.max(10, Math.round(tam * 0.72))}
    />
  );
  const prep = prepVisible
    ? <Chip style={estiloDato} title={prepTitle || prepText}>{prepText}</Chip>
    : null;
  const serie = <BadgeNumeroSerieKds comanda={comanda} style={estiloDato} />;
  const wrap = estilo === 'clasico' ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-wrap items-center gap-1';

  if (estilo === 'clasico') {
    return (
      <>
        <div className={`${wrap} justify-between mb-2`}>
          <div className={wrap}>
            <Chip style={estiloDato} title="Número de comanda">Orden #{nComanda}</Chip>
            <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
          </div>
          <div className={wrap}>
            <Chip style={estiloDato}>{nombreMesa}</Chip>
            {reloj}
          </div>
        </div>
        <div className={`${wrap} justify-between`}>
          <Chip style={estiloMozoChip} title={nombreMozo}>👤 {nombreMozo}</Chip>
          <div className={wrap}>
            {serie}
            {prep}
            {children}
          </div>
        </div>
      </>
    );
  }

  if (estilo === 'dosFilas') {
    return (
      <div className="leading-none space-y-1">
        <div className={`${wrap} justify-between`}>
          <Chip style={estiloDato} title="Orden en el tablero / comanda">
            {cardNumber}
            <span style={{ opacity: 0.85, fontWeight: 600 }}>· #{nComanda}</span>
          </Chip>
          <Chip style={estiloDato}>{nombreMesa}</Chip>
          {reloj}
        </div>
        <div className={`${wrap} justify-between`}>
          <Chip style={estiloMozoChip} title={nombreMozo}>👤 {nombreMozo}</Chip>
          <div className={wrap}>
            {serie}
            {prep}
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
      <Chip style={estiloDato} title="Número de comanda">#{nComanda}</Chip>
      <Chip style={estiloDato}>{nombreMesa}</Chip>
      {reloj}
      <Chip style={{ ...estiloMozoChip, maxWidth: '7rem', overflow: 'hidden' }} title={nombreMozo}>
        <span className="truncate">👤 {nombreMozo}</span>
      </Chip>
      {serie}
      {prep}
      {children}
    </div>
  );
}
