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
import { letraRevisionTicket } from '../../utils/comandaPrint/ticketCocinaHtml';
import { etiquetaMozosComandas } from '../../utils/numeroComandaMozo';

function Chip({ style, title, children }) {
  if (children == null || children === '') return null;
  return (
    <span className="inline-flex items-center max-w-full" style={style} title={title}>
      {children}
    </span>
  );
}

/** `Jose 1` / `Jose 1+2 · Ana 3` → el número del mozo a la mitad del nombre. */
function TextoMozoKds({ texto }) {
  const grupos = String(texto || '').split(' · ');
  return grupos.map((grupo, i) => {
    const m = grupo.trim().match(/^(.+?)\s+(\d+(?:\+\d+)*)$/);
    const nombre = m ? m[1] : grupo.trim();
    const numero = m ? m[2] : '';
    return (
      <React.Fragment key={`${nombre}-${i}`}>
        {i > 0 ? ' · ' : null}
        {nombre}
        {numero ? (
          <>
            {' '}
            <span style={{ fontSize: '0.5em', fontWeight: 700 }}>{numero}</span>
          </>
        ) : null}
      </React.Fragment>
    );
  });
}

/** Cuadro de mesa de la tabla KDS: `M1` → `Mesa 1`. */
function textoCuadroMesaKds(nombreMesa) {
  const s = String(nombreMesa ?? '').trim();
  const m = s.match(/^M(\d.*)$/i);
  return m ? `Mesa ${m[1]}` : s;
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
 * Encabezado de tarjeta: mozo a la izquierda y mesa a la derecha (tamaño del #), #comanda abajo.
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
  const nComanda = `${numeroComandaVisible(comanda) ?? 'N/A'}${letraRevisionTicket(comanda?.revisionTicket)}`;
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
  const tamReloj = tamanoDatoHeaderTarjeta(config, 'headerTamanoCronometro');
  const verNumero = !ocultarDatoHeaderTarjeta(config, 'headerOcultarNumeroComanda');
  const verMesa = !ocultarDatoHeaderTarjeta(config, 'headerOcultarMesa');
  const verMozo = !ocultarDatoHeaderTarjeta(config, 'headerOcultarMozo');
  const verReloj = !ocultarDatoHeaderTarjeta(config, 'headerOcultarCronometro');
  const estiloDato = estiloDatoHeaderTarjetaKds(config);
  const fondoMozo = hexValidoOrdenCola(estiloMozo?.backgroundColor) ? estiloMozo.backgroundColor : null;
  const colorLetra = hexValidoOrdenCola(colorLetraMozo) ? colorLetraMozo : null;
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
  const estiloHero = {
    ...estiloDato,
    fontSize: `${tamNumero}px`,
    fontWeight: 800,
    lineHeight: 1,
    maxWidth: '58%',
    minWidth: 0,
    overflow: 'hidden',
  };
  const hero = (verMozo || verMesa) ? (
    <div className="w-full flex items-center justify-between gap-1 leading-none">
      {verMozo ? (
        <span
          style={{
            ...estiloHero,
            ...(colorLetra ? { color: colorLetra } : {}),
            ...(fondoMozo ? { backgroundColor: fondoMozo } : {}),
          }}
          title={mozoVisible || nombreMozo}
        >
          <span className="truncate">
            <TextoMozoKds texto={mozoVisible || nombreMozo} />
          </span>
        </span>
      ) : <span />}
      {verMesa ? (
        <span
          style={{ ...estiloHero, flexShrink: 0, maxWidth: 'none', overflow: 'visible', whiteSpace: 'nowrap' }}
          title="Mesa"
        >
          {textoCuadroMesaKds(nombreMesa)}
        </span>
      ) : null}
    </div>
  ) : null;
  const hora = horaCreacion ? (
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
  ) : null;
  const numeroChico = verNumero ? (
    <span style={{ ...estiloDato, fontWeight: 800 }} title="Número de comanda">
      #{nComanda}
    </span>
  ) : null;
  const urgencia = (esAtencion || esUrgente) ? (
    <FaExclamationTriangle
      className={`shrink-0 ${esUrgente ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}
      style={{ fontSize: `${Math.max(14, Math.round(tam * 1.15))}px` }}
      title={esUrgente ? 'Urgente' : 'Atención'}
      aria-label={esUrgente ? 'Urgente' : 'Atención'}
    />
  ) : null;

  if (estilo === 'clasico') {
    return (
      <div className="w-full">
        {hero}
        <div className={`${wrap} justify-between mt-1`}>
          {hora}
          {numeroChico}
          {urgencia}
          <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
          {reloj}
        </div>
        <div className={`${wrap} justify-between mt-1`}>
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
        {hero}
        <div className={`${wrap} justify-between mt-1`}>
          {hora}
          {numeroChico}
          {urgencia}
          <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
          {reloj}
        </div>
        <div className={`${wrap} justify-between mt-1`}>
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
      {hero}
      <div className={`${wrap} justify-center mt-0.5`}>
        {hora}
        {numeroChico}
        {urgencia}
        <Chip style={estiloDato} title="Orden en el tablero">{cardNumber}</Chip>
        {reloj}
        {serie}
        {prep}
        {reserva}
        {children}
      </div>
    </div>
  );
}
