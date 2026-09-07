import React from 'react';
import { FaClock } from 'react-icons/fa';
import BadgeNumeroSerieKds from './BadgeNumeroSerieKds';

function colorReloj(minutosActuales, alertYellowMinutes, alertRedMinutes) {
  if (minutosActuales >= alertRedMinutes) return 'text-red-200';
  if (minutosActuales >= alertYellowMinutes) return 'text-yellow-200';
  return 'text-white';
}

function RelojKds({ tiempoFormateado, minutosActuales, alertYellowMinutes, alertRedMinutes, compacto }) {
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${compacto ? 'text-xs' : 'text-base'} ${colorReloj(minutosActuales, alertYellowMinutes, alertRedMinutes)}`} style={{ fontFamily: 'Arial, sans-serif' }}>
      <FaClock className={compacto ? 'text-[10px]' : 'text-sm'} />
      {tiempoFormateado}
    </span>
  );
}

function BadgePrep({ prepText, prepTitle, compacto }) {
  if (!prepText) return null;
  return (
    <span
      className={`rounded font-semibold bg-gray-600/70 ${compacto ? 'px-1 py-0 text-[10px]' : 'px-1.5 py-0.5 text-xs'}`}
      style={{ fontFamily: 'Arial, sans-serif' }}
      title={prepTitle || prepText}
    >
      {prepText}
    </span>
  );
}

/**
 * Encabezado de tarjeta de comanda: orden, #comanda, mesa, reloj, mozo, Prep.
 */
export default function HeaderTarjetaComandaKds({
  estilo = 'compacto',
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
  const reloj = (
    <RelojKds
      tiempoFormateado={tiempoFormateado}
      minutosActuales={minutosActuales}
      alertYellowMinutes={alertYellowMinutes}
      alertRedMinutes={alertRedMinutes}
      compacto={estilo !== 'clasico'}
    />
  );
  const prep = <BadgePrep prepText={prepText} prepTitle={prepTitle} compacto={estilo !== 'clasico'} />;
  const serie = <BadgeNumeroSerieKds comanda={comanda} compacto={estilo !== 'clasico'} />;

  if (estilo === 'clasico') {
    return (
      <>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-white font-bold text-xl mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              Orden #{nComanda}
            </div>
            <div className="text-white font-semibold text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
              {cardNumber}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-white font-semibold text-lg mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              {nombreMesa}
            </div>
            {reloj}
          </div>
        </div>
        <div className="flex items-center justify-between text-white text-xs flex-wrap gap-1">
          <span className="font-semibold" style={estiloMozo}>👤 {nombreMozo}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
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
      <div className="text-white leading-none space-y-1">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <span className="font-bold text-sm tabular-nums" style={{ fontFamily: 'Arial, sans-serif' }}>
            {cardNumber}
            <span className="opacity-80 font-semibold"> · #{nComanda}</span>
          </span>
          <span className="font-semibold text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>{nombreMesa}</span>
          {reloj}
        </div>
        <div className="flex items-center justify-between gap-1 flex-wrap text-xs">
          <span className="font-semibold" style={estiloMozo}>👤 {nombreMozo}</span>
          <div className="flex items-center gap-1 flex-wrap">
            {serie}
            {prep}
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-x-1.5 gap-y-0.5 flex-wrap text-white leading-none">
      <span className="font-black text-sm tabular-nums" style={{ fontFamily: 'Arial, sans-serif' }} title="Orden en el tablero">{cardNumber}</span>
      <span className="font-bold text-sm" style={{ fontFamily: 'Arial, sans-serif' }} title="Número de comanda">#{nComanda}</span>
      <span className="font-semibold text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>{nombreMesa}</span>
      {reloj}
      <span className="font-semibold text-[11px] truncate max-w-[5.5rem]" style={estiloMozo} title={nombreMozo}>👤 {nombreMozo}</span>
      {serie}
      {prep}
      {children}
    </div>
  );
}
