import React from 'react';
import { FaClock, FaExclamationTriangle } from 'react-icons/fa';
import BadgeNumeroSerieKds from './BadgeNumeroSerieKds';
import {
  estiloDatoHeaderTarjetaKds,
  estiloNumeroSerieHeaderTarjetaKds,
  colorRelojHeaderTarjeta,
  ocultarPrepHeaderTarjeta,
  ocultarDatoHeaderTarjeta,
  tamanoDatoHeaderTarjeta,
  tamanoLetraHeaderTarjetaKds,
} from '../../utils/estiloHeaderTarjetaKds';
import { hexValidoOrdenCola } from '../../utils/estiloNumeroOrdenKds';
import BadgeReservaKds from './BadgeReservaKds';
import { numeroComandaVisible } from '../../utils/numeroComandaVisible';
import { etiquetaMozosComandas } from '../../utils/numeroComandaMozo';

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
  colorLetraMozo,
  prepText,
  prepTitle,
  ignorarAlertaReloj = false,
  children,
}) {
  const nComanda = numeroComandaVisible(comanda) ?? 'N/A';
  const horaCreacion = (() => {
    const raw = comanda?.createdAt;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Lima',
    });
  })();
  const mozoVisible = etiquetaMozosComandas([{ ...comanda, mozoNombre: nombreMozo }]) || nombreMozo;
  const tam = tamanoLetraHeaderTarjetaKds(config);
  const tamNumero = tamanoDatoHeaderTarjeta(config, 'headerTamanoNumeroComanda', { doble: true });
  const tamMesa = tamanoDatoHeaderTarjeta(config, 'headerTamanoMesa');
  const tamMozo = tamanoDatoHeaderTarjeta(config, 'headerTamanoMozo');
  const tamReloj = tamanoDatoHeaderTarjeta(config, 'headerTamanoCronometro');
  const verNumero = !ocultarDatoHeaderTarjeta(config, 'headerOcultarNumeroComanda');
  const verMesa = !ocultarDatoHeaderTarjeta(config, 'headerOcultarMesa');
  const verMozo = !ocultarDatoHeaderTarjeta(config, 'headerOcultarMozo');
  const verReloj = !ocultarDatoHeaderTarjeta(config, 'headerOcultarCronometro');
  const estiloDato = estiloDatoHeaderTarjetaKds(config);
  const estiloMesa = estiloDatoHeaderTarjetaKds(config, { tamanoOverride: tamMesa });
  const fondoMozo = hexValidoOrdenCola(estiloMozo?.backgroundColor) ? estiloMozo.backgroundColor : null;
  const colorLetra = hexValidoOrdenCola(colorLetraMozo) ? colorLetraMozo : null;
  const estiloMozoChip = estiloDatoHeaderTarjetaKds(config, {
    tamanoOverride: tamMozo,
    ...(fondoMozo ? { fondoOverride: fondoMozo } : { omitirFondo: true }),
    ...(colorLetra ? { colorOverride: colorLetra } : {}),
  });
  const estiloReloj = estiloDatoHeaderTarjetaKds(config, {
    tamanoOverride: tamReloj,
    colorOverride: ignorarAlertaReloj
      ? (hexValidoOrdenCola(config.headerTarjetaColor) ? config.headerTarjetaColor : '#ffffff')
      : colorRelojHeaderTarjeta(
        minutosActuales,
        alertYellowMinutes,
        alertRedMinutes,
        config
      ),
  });
  const ocultarPrep = ocultarPrepHeaderTarjeta(config);
  const prepVisible = !ocultarPrep && prepText;
  const reloj = verReloj ? (
    <RelojKds
      tiempoFormateado={tiempoFormateado}
      estiloReloj={estiloReloj}
      tamIcono={Math.max(10, Math.round(tamReloj * 0.72))}
    />
  ) : null;
  const prep = prepVisible
    ? <Chip style={estiloDato} title={prepTitle || prepText}>{prepText}</Chip>
    : null;
  const reserva = <BadgeReservaKds comanda={comanda} config={config} />;
  const estiloSerie = estiloNumeroSerieHeaderTarjetaKds(config);
  const serie = <BadgeNumeroSerieKds comanda={comanda} style={estiloSerie} />;
  const wrap = estilo === 'clasico' ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-wrap items-center gap-1';
  const umbralAmarillo = 10;
  const umbralRojo = Number(alertRedMinutes) || 0;
  const esUrgente = umbralRojo > 0 && minutosActuales >= umbralRojo;
  const esAtencion = !esUrgente && umbralAmarillo > 0 && minutosActuales >= umbralAmarillo;
  const numero = (
    <div className="w-full flex items-center justify-center gap-1 leading-none" title="Número de comanda">
      {horaCreacion ? (
        <span
          style={{
            ...estiloDato,
            fontSize: `${Math.max(12, Math.round(tam * 0.85))}px`,
            fontWeight: 700,
            lineHeight: 1,
            opacity: 0.9,
          }}
          title="Hora de creación"
        >
          {horaCreacion}
        </span>
      ) : null}
      {verNumero ? (
      <span
        style={{
          ...estiloDato,
          fontSize: `${tamNumero}px`,
          fontWeight: 800,
          lineHeight: 1,
          display: 'inline-block',
        }}
      >
        #{nComanda}
      </span>
      ) : null}
      {(esAtencion || esUrgente) && (
        <FaExclamationTriangle
          className={`shrink-0 ${esUrgente ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}
          style={{ fontSize: `${Math.max(14, Math.round(tam * 1.15))}px` }}
          title={esUrgente ? 'Urgente' : 'Atención'}
          aria-label={esUrgente ? 'Urgente' : 'Atención'}
        />
      )}
    </div>
  );

  if (estilo === 'clasico') {
    return (
      <div className="w-full">
        {numero}
        <div className={`${wrap} justify-between mt-1`}>
          <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
          {verMesa ? <Chip style={estiloMesa}>{nombreMesa}</Chip> : null}
          {reloj}
        </div>
        <div className={`${wrap} justify-between mt-1`}>
          {verMozo ? <Chip style={estiloMozoChip} title={nombreMozo}>👤 {mozoVisible}</Chip> : null}
          <div className={wrap}>
            {serie}
            {prep}
            {reserva}
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (estilo === 'dosFilas') {
    return (
      <div className="leading-none w-full">
        {numero}
        <div className={`${wrap} justify-between mt-1`}>
          <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
          {verMesa ? <Chip style={estiloMesa}>{nombreMesa}</Chip> : null}
          {reloj}
        </div>
        <div className={`${wrap} justify-between mt-1`}>
          {verMozo ? <Chip style={estiloMozoChip} title={nombreMozo}>👤 {mozoVisible}</Chip> : null}
          <div className={wrap}>
            {serie}
            {prep}
            {reserva}
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {numero}
      <div className={`${wrap} justify-center mt-0.5`}>
        <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
        {verMesa ? <Chip style={estiloMesa}>{nombreMesa}</Chip> : null}
        {reloj}
        {verMozo ? (
        <Chip style={{ ...estiloMozoChip, maxWidth: '7rem', overflow: 'hidden' }} title={nombreMozo}>
          <span className="truncate">👤 {mozoVisible}</span>
        </Chip>
        ) : null}
        {serie}
        {prep}
        {reserva}
        {children}
      </div>
    </div>
  );
}
