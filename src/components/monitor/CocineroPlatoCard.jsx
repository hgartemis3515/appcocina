import React from 'react';
import { motion } from 'framer-motion';
import { calcularSegundos, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import TemporizadorChips from './TemporizadorChips';
import MesaChips from './MesaChips';

/**
 * CocineroPlatoCard - Tarjeta por combinación cocinero + plato.
 *
 * Estética KDS premium (estilo referencia):
 *  - Fondo vino/negro, borde neón (rojo en crítico, acento en normal).
 *  - Esquinas redondeadas, contraste alto, lectura inmediata.
 *  - Izquierda: cocinero fucsia arriba, plato enorme blanco, badge ×N bloque,
 *    complementos, abajo placa URGENTE + mesas chips.
 *  - Derecha: columna vertical de temporizadores individuales (antiguo→nuevo arriba→abajo).
 *
 * El color de borde / glow refleja la alerta MÁXIMA entre los timers.
 *
 * Props:
 * - item: grupo del filtro con { nombre, cantidadTotal, platos, timers, cocinero, ... }
 * - configVisual: apariencia + umbrales + flags de personalización
 * - mostrarCocinero: si true renderiza línea de cocinero arriba (modo tarjetas)
 * - modoTarjeta: layout grid (true) vs lista (false)
 */
const colorAcentoPorCocinero = (alias) => {
  if (!alias) return '#ff4fa3';
  const paleta = ['#ff4fa3', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#facc15'];
  let h = 0;
  for (let i = 0; i < alias.length; i++) h = (h * 31 + alias.charCodeAt(i)) >>> 0;
  return paleta[h % paleta.length];
};

const CocineroPlatoCard = ({
  item,
  configVisual = {},
  mostrarCocinero = false,
  modoTarjeta = false,
  tick = 0,
}) => {
  const { nombre, cantidadTotal, platos = [], timers = [], cocinero } = item;

  // Config
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ff2a4d';
  const tamanioFuentePlato = configVisual.tamanioFuentePlato || 38;
  const tamanioFuenteDetalle = configVisual.tamanioFuenteDetalle || 18;
  const tamanioFuenteCocinero = configVisual.tamanioFuenteCocinero || 24;
  const tamanioFuenteCronometro = configVisual.tamanioFuenteCronometro || 28;
  const colorTextoPrincipal = configVisual.colorTextoPrincipal || '#ffffff';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#b8a8c8';
  const espaciado = configVisual.espaciadoFilas || 'normal';
  const fuenteFamilia = configVisual.fuenteFamilia || 'Inter, system-ui, sans-serif';
  const usarColorCocinero = configVisual.colorPorCocinero !== false;
  const mostrarIconoCocinero = configVisual.mostrarIconoCocinero !== false;
  const mostrarEtiquetaPlato = configVisual.mostrarEtiquetaPlato === true;
  const estiloTemporizador = configVisual.estiloTemporizador || 'vertical';

  // Alerta máxima de los timers (define color de la tarjeta)
  let alertaMaxima = 'normal';
  for (const t of timers) {
    const s = calcularSegundos(t.tiempoInicio);
    const a = nivelAlerta(s, amarilloMin, rojoMin);
    if (a === 'rojo') { alertaMaxima = 'rojo'; break; }
    if (a === 'amarillo') alertaMaxima = 'amarillo';
  }

  const esCritico = alertaMaxima === 'rojo';
  const esAlerta = alertaMaxima === 'amarillo';
  const colorCocinero = usarColorCocinero ? colorAcentoPorCocinero(cocinero?.alias) : colorAcento;

  // Colores estilo referencia
  const FONDO_VINO = '#1a0f1f';
  const FONDO_VINO_HOVER = '#241029';
  const colorBorde = esCritico
    ? colorAlertaRoja
    : esAlerta
      ? colorAlertaAmarilla
      : `${colorAcento}77`;
  const glowBorde = esCritico
    ? `0 0 18px ${colorAlertaRoja}88, inset 0 0 12px ${colorAlertaRoja}33`
    : esAlerta
      ? `0 0 8px ${colorAlertaAmarilla}33`
      : 'none';

  // Complementos / observaciones
  const complementosSet = new Set();
  const platoRef = platos[0]?.plato;
  if (platoRef) {
    const comps = platoRef.complementosSeleccionados || platoRef.complementos || [];
    comps.forEach(c => {
      if (typeof c === 'string') { complementosSet.add(c); return; }
      const grupo = c.grupo ? `${c.grupo}: ` : '';
      const opcion = c.opcion || c.nombre || '';
      const cant = c.cantidad > 1 ? ` ×${c.cantidad}` : '';
      if (opcion) complementosSet.add(`${grupo}${opcion}${cant}`.trim());
    });
    const obs = platoRef.observaciones || platoRef.nota;
    if (obs) complementosSet.add(obs);
  }
  const complementosTexto = Array.from(complementosSet).slice(0, 6).join(' · ');
  const mostrarComplementos = configVisual.mostrarComplementos !== false;
  const hayParaLlevar = platos.some(p => p.comanda.tipoServicio === 'para_llevar');

  // Estilos base
  const paddingY = espaciado === 'compacto' ? '12px' : espaciado === 'amplio' ? '22px' : '16px';
  const paddingX = espaciado === 'compacto' ? '14px' : '18px';

  const estiloTarjeta = {
    background: esCritico ? `linear-gradient(135deg, ${FONDO_VINO}, ${colorAlertaRoja}1f)` : FONDO_VINO,
    color: colorTextoPrincipal,
    border: `2px solid ${colorBorde}`,
    borderRadius: '14px',
    padding: `${paddingY} ${paddingX}`,
    fontFamily: fuenteFamilia,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: '16px',
    minWidth: 0,
    minHeight: modoTarjeta ? '130px' : 'auto',
    boxShadow: glowBorde,
    position: 'relative',
    overflow: 'hidden',
  };

  // Lado izquierdo: bloque textual (~65%)
  const ladoIzquierdo = (
    <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      {/* Cocinero arriba (fucsia, siempre visible si mostrarCocinero) */}
      {mostrarCocinero && cocinero && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {mostrarIconoCocinero && (
            cocinero.fotoUrl ? (
              <img
                src={cocinero.fotoUrl}
                alt={cocinero.alias || cocinero.nombre || 'Cocinero'}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${colorCocinero}`,
                  boxShadow: `0 0 6px ${colorCocinero}55`,
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: `${colorCocinero}22`,
                  border: `2px solid ${colorCocinero}`,
                  color: colorCocinero,
                  fontSize: '13px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {(cocinero.alias || cocinero.nombre || '?').slice(0, 2).toUpperCase()}
              </span>
            )
          )}
          <span
            style={{
              fontSize: `${tamanioFuenteCocinero}px`,
              fontWeight: 800,
              color: colorCocinero,
              lineHeight: 1.1,
              textShadow: `0 0 8px ${colorCocinero}55`,
            }}
          >
            {cocinero.alias || cocinero.nombre || 'Cocinero'}
          </span>
        </div>
      )}

      {/* Plato + cantidad */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {mostrarEtiquetaPlato && (
          <span style={{ fontSize: `${tamanioFuenteDetalle}px`, color: colorTextoSecundario, fontWeight: 600, textTransform: 'uppercase' }}>
            Plato:
          </span>
        )}
        <div
          style={{
            fontSize: `${tamanioFuentePlato}px`,
            fontWeight: 900,
            lineHeight: 1.05,
            color: colorTextoPrincipal,
            textShadow: '0 2px 8px rgba(0,0,0,0.45)',
          }}
        >
          {nombre}
        </div>
        {/* Badge cantidad - bloque oscuro resaltado */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '46px',
            padding: '4px 12px',
            borderRadius: '10px',
            background: '#0d0612',
            border: `2px solid ${esCritico ? colorAlertaRoja : colorAcento}`,
            color: esCritico ? colorAlertaRoja : colorAcento,
            fontSize: `${tamanioFuentePlato * 0.6}px`,
            fontWeight: 900,
            boxShadow: esCritico ? `0 0 12px ${colorAlertaRoja}88` : `0 0 8px ${colorAcento}44`,
            flexShrink: 0,
          }}
        >
          ×{cantidadTotal}
        </span>
      </div>

      {/* Complementos / sabores / notas */}
      {mostrarComplementos && complementosTexto && (
        <div
          style={{
            fontSize: `${tamanioFuenteDetalle}px`,
            color: colorTextoSecundario,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 500,
          }}
        >
          {complementosTexto}
        </div>
      )}

      {/* Espaciador */}
      <div style={{ flex: 1, minHeight: '4px' }} />

      {/* Zona inferior: placa URGENTE + mesas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {esCritico && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 14px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 900,
              color: '#fff',
              background: colorAlertaRoja,
              border: `1px solid #fff3`,
              boxShadow: `0 0 14px ${colorAlertaRoja}cc, inset 0 0 8px #fff3`,
              textShadow: '0 0 6px #fff',
              animation: 'kdspulse 1.5s ease-in-out infinite',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ! URGENTE
          </span>
        )}
        {esAlerta && !esCritico && (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 800,
              color: '#1a0f1f',
              background: colorAlertaAmarilla,
              border: `1px solid ${colorAlertaAmarilla}88`,
            }}
          >
            ⏳ ATENCIÓN
          </span>
        )}
        {hayParaLlevar && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: colorAcento,
              background: `${colorAcento}1f`,
              border: `1px solid ${colorAcento}66`,
            }}
          >
            Para llevar
          </span>
        )}
        {configVisual.mostrarMesas !== false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: colorTextoSecundario, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {timers.length > 1 ? 'Mesas:' : 'Mesa:'}
            </span>
            <MesaChips timers={timers} configVisual={{ ...configVisual, colorTextoSecundario, colorAcento }} />
          </div>
        )}
      </div>
    </div>
  );

  // Lado derecho: columna de temporizadores individuales
  const ladoDerecho = (
    <div
      style={{
        flex: '0 0 auto',
        minWidth: estiloTemporizador === 'vertical' ? '110px' : 'auto',
        maxWidth: estiloTemporizador === 'vertical' ? '160px' : 'none',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
      }}
    >
      <TemporizadorChips timers={timers} configVisual={configVisual} tick={tick} />
    </div>
  );

  const contenido = (
    <>
      {ladoIzquierdo}
      {ladoDerecho}
    </>
  );

  if (modoTarjeta) {
    return <div style={estiloTarjeta}>{contenido}</div>;
  }

  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0, y: -8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ duration: 0.22 }}
      style={estiloTarjeta}
    >
      {contenido}
    </motion.div>
  );
};

export default CocineroPlatoCard;