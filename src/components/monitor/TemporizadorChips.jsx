import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calcularSegundos, formatearCronometro, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';
import { estiloNumeroSecuencial, textoNumeroSecuencial, radioForma } from '../../utils/monitorBadgeStyles';

/**
 * TemporizadorChips - Temporizadores individuales con numeración GLOBAL (#1 = más viejo).
 *
 * El badge #N usa el mismo modelo visual que tenía el número de la tarjeta de plato
 * (tamaño tipográfico del plato, borde acento, peso 900).
 * Contorno del chip: colorLinea (misma comanda = mismo color); fill/glow por alerta.
 *
 * Props:
 * - timers: [{ tiempoInicio, numeroGlobal, colorLinea, lineaId, unidadIndex, ... }]
 * - tick, configVisual
 */
const TemporizadorChips = ({ timers = [], configVisual = {}, tick = 0, ocultarNumeroSecuencial = false }) => {
  const tamanioCronometro = configVisual.tamanioFuenteCronometro || 28;
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ff2a4d';
  const colorFondo = configVisual.colorFondo || '#0a0a0f';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  // Colores personalizados del cronómetro. null = automático (según alerta).
  const cronometroColor = configVisual.cronometroColor || null;
  const cronometroContorno = configVisual.cronometroContorno || null;
  const cronometroFondo = configVisual.cronometroFondo || null;
  const cronometroContornoLetra = configVisual.cronometroContornoLetra || null;
  // Fondo tipo resaltado detrás de las cifras (estilo "subrayado de texto"). null = sin fondo.
  const cronometroFondoTexto = configVisual.cronometroFondoTexto || null;
  const espaciado = configVisual.espaciadoFilas || 'normal';
  const modoResumido = configVisual.modoTimers === 'resumidos';
  const orientacion = configVisual.estiloTemporizador === 'horizontal' ? 'horizontal' : 'vertical';
  const intensidad = configVisual.intensidadAlerta || 'normal';
  const esUnido = espaciado === 'unido';
  const cronometroForma = configVisual.cronometroForma || 'redondeado';
  const radioChip = radioForma(cronometroForma, {
    esUnido,
    radioPx: configVisual.cronometroRadio,
    defaultPx: 10,
  });
  const anchoChip = configVisual.cronometroAncho != null && configVisual.cronometroAncho !== ''
    ? Math.max(40, Number(configVisual.cronometroAncho) || 0)
    : null;
  const altoChip = configVisual.cronometroAlto != null && configVisual.cronometroAlto !== ''
    ? Math.max(24, Number(configVisual.cronometroAlto) || 0)
    : null;
  const gap = espaciado === 'compacto' || esUnido
    ? '4px'
    : (orientacion === 'vertical' ? '8px' : '6px');

  const glowMult = intensidad === 'alta' ? 1.6 : intensidad === 'suave' ? 0.5 : 1;
  const _ = tick;

  const calculados = useMemo(() => {
    return timers
      .map(t => {
        const segundos = calcularSegundos(t.tiempoInicio);
        return {
          ...t,
          segundos,
          cronometro: formatearCronometro(segundos),
          alerta: nivelAlerta(segundos, amarilloMin, rojoMin),
        };
      })
      .sort((a, b) => {
        // Preferir numeroGlobal si existe; si no, por edad
        if (a.numeroGlobal != null && b.numeroGlobal != null) {
          return a.numeroGlobal - b.numeroGlobal;
        }
        return b.segundos - a.segundos;
      });
  }, [timers, amarilloMin, rojoMin, tick]);

  if (calculados.length === 0) return null;

  const colorPorAlerta = (a) =>
    a === 'rojo' ? colorAlertaRoja : a === 'amarillo' ? colorAlertaAmarilla : colorAcento;

  const renderBadgeNumero = (numero) => (
    <span
      style={estiloNumeroSecuencial(configVisual)}
      title={`Orden global ${numero} (más viejo = 1)`}
    >
      {textoNumeroSecuencial(numero, configVisual)}
    </span>
  );

  const animOn = configVisual.animacionesTarjetas !== false;

  const timerKey = (t, idx) =>
    `${t.lineaId || 't'}-${t.unidadIndex ?? idx}-${t.tiempoInicio || ''}`;

  const renderBloqueVertical = (t, idx) => {
    const colorAlerta = colorPorAlerta(t.alerta);
    const esCritico = t.alerta === 'rojo';
    const esAlerta = t.alerta === 'amarillo';
    // Color del texto: custom siempre si está definido, si no según alerta
    const colorTexto = cronometroColor != null ? cronometroColor : (esCritico ? '#fff' : colorAlerta);
    // Borde del chip: custom siempre si está definido, si no colorLinea o alerta
    const colorBorde = cronometroContorno != null ? cronometroContorno : (t.colorLinea || colorAlerta);
    // Fondo del chip: custom siempre si está definido, si no según alerta
    const fondoChip = cronometroFondo != null
      ? cronometroFondo
      : (esCritico ? colorAlerta : `${colorAlerta}1f`);
    // Contorno de la letra (text stroke)
    const contornoLetra = cronometroContornoLetra
      ? `${Math.max(1, Math.round(tamanioCronometro / 18))}px ${cronometroContornoLetra}`
      : 'none';
    const glow = esCritico ? `0 0 ${14 * glowMult}px ${colorAlerta}` : esAlerta ? `0 0 ${8 * glowMult}px ${colorAlerta}aa` : 'none';
    const numero = t.numeroGlobal != null ? t.numeroGlobal : idx + 1;
    const estilo = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '10px',
      padding: espaciado === 'compacto' ? '4px 10px' : '8px 12px',
      borderRadius: radioChip,
      border: `2px solid ${colorBorde}`,
      background: fondoChip,
      boxShadow: glow,
      whiteSpace: 'nowrap',
      width: anchoChip ? `${anchoChip}px` : '100%',
      minWidth: anchoChip ? `${anchoChip}px` : undefined,
      minHeight: altoChip ? `${altoChip}px` : undefined,
      boxSizing: 'border-box',
    };
    const inner = (
      <>
        {!ocultarNumeroSecuencial && renderBadgeNumero(numero)}
        <span
          style={{
            fontSize: `${tamanioCronometro}px`,
            fontWeight: 800,
            fontFamily: 'ui-monospace, "Courier New", monospace',
            fontVariantNumeric: 'tabular-nums',
            color: colorTexto,
            WebkitTextStroke: contornoLetra,
            background: cronometroFondoTexto || 'transparent',
            padding: cronometroFondoTexto ? '2px 8px' : 0,
            borderRadius: cronometroFondoTexto ? '6px' : 0,
            textShadow: esCritico ? '0 0 10px #fff' : `0 0 ${8 * glowMult}px ${colorAlerta}66`,
            animation: esCritico ? 'kdspulse 1.5s ease-in-out infinite' : 'none',
          }}
        >
          {t.cronometro}
        </span>
      </>
    );
    if (!animOn) {
      return <div key={timerKey(t, idx)} style={estilo}>{inner}</div>;
    }
    return (
      <motion.div
        key={timerKey(t, idx)}
        layout
        initial={{ opacity: 0, x: 12, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 28, scale: 0.9, filter: 'blur(2px)', transition: { duration: 0.22 } }}
        transition={{ layout: { type: 'spring', stiffness: 400, damping: 32 }, duration: 0.2 }}
        style={estilo}
      >
        {inner}
      </motion.div>
    );
  };

  const renderChipHorizontal = (t, idx) => {
    const colorAlerta = colorPorAlerta(t.alerta);
    const esCritico = t.alerta === 'rojo';
    const colorTexto = cronometroColor != null ? cronometroColor : (esCritico ? colorFondo : colorAlerta);
    const colorBorde = cronometroContorno != null ? cronometroContorno : (t.colorLinea || colorAlerta);
    const fondoChip = cronometroFondo != null
      ? cronometroFondo
      : (esCritico ? colorAlerta : `${colorAlerta}22`);
    const contornoLetra = cronometroContornoLetra
      ? `${Math.max(1, Math.round(tamanioCronometro / 18))}px ${cronometroContornoLetra}`
      : 'none';
    const numero = t.numeroGlobal != null ? t.numeroGlobal : idx + 1;
    const estilo = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 10px',
      borderRadius: radioChip,
      fontSize: `${tamanioCronometro}px`,
      fontWeight: 800,
      fontFamily: 'ui-monospace, "Courier New", monospace',
      fontVariantNumeric: 'tabular-nums',
      color: colorTexto,
      WebkitTextStroke: contornoLetra,
      background: fondoChip,
      border: `2px solid ${colorBorde}`,
      textShadow: esCritico ? 'none' : `0 0 10px ${colorAlerta}55`,
      animation: esCritico ? 'kdspulse 1.5s ease-in-out infinite' : 'none',
      whiteSpace: 'nowrap',
      minWidth: anchoChip ? `${anchoChip}px` : undefined,
      minHeight: altoChip ? `${altoChip}px` : undefined,
      boxSizing: 'border-box',
    };
    const inner = (
      <>
        {!ocultarNumeroSecuencial && renderBadgeNumero(numero)}
        <span
          style={{
            background: cronometroFondoTexto || 'transparent',
            padding: cronometroFondoTexto ? '2px 8px' : 0,
            borderRadius: cronometroFondoTexto ? '6px' : 0,
          }}
        >
          {t.cronometro}
        </span>
      </>
    );
    if (!animOn) {
      return <span key={timerKey(t, idx)} style={estilo}>{inner}</span>;
    }
    return (
      <motion.span
        key={timerKey(t, idx)}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85, x: 16, transition: { duration: 0.2 } }}
        transition={{ layout: { type: 'spring', stiffness: 400, damping: 32 }, duration: 0.18 }}
        style={estilo}
      >
        {inner}
      </motion.span>
    );
  };

  let visibles = calculados;
  let ocultos = 0;
  const maxVis = Math.max(2, Math.min(20, Number(configVisual.maxTimersVisibles) || 6));
  if (modoResumido && calculados.length > 1) {
    visibles = [calculados[0]];
    ocultos = calculados.length - 1;
  } else if (calculados.length > maxVis) {
    visibles = calculados.slice(0, maxVis);
    ocultos = calculados.length - maxVis;
  }

  if (orientacion === 'vertical') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap, width: anchoChip ? `${anchoChip}px` : '100%', minWidth: 0 }}>
        <AnimatePresence initial={false} mode={animOn ? 'popLayout' : undefined}>
          {visibles.map((t, i) => renderBloqueVertical(t, i))}
        </AnimatePresence>
        {ocultos > 0 && (
          <span
            style={{
              fontSize: `${Math.max(12, tamanioCronometro * 0.55)}px`,
              fontWeight: 700,
              color: colorTextoSecundario,
              textAlign: 'center',
              padding: '2px 0',
            }}
          >
            +{ocultos} más
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' }}>
      <AnimatePresence initial={false} mode={animOn ? 'popLayout' : undefined}>
        {visibles.map((t, i) => renderChipHorizontal(t, i))}
      </AnimatePresence>
      {ocultos > 0 && (
        <span style={{ fontSize: `${Math.max(12, tamanioCronometro * 0.6)}px`, fontWeight: 700, color: colorTextoSecundario }}>
          +{ocultos} más
        </span>
      )}
    </div>
  );
};

export default TemporizadorChips;
