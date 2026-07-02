import React, { useMemo } from 'react';
import { calcularSegundos, formatearCronometro, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';

/**
 * TemporizadorChips - Renderiza TODOS los temporizadores individuales de un plato.
 *
 * Modo vertical (default, estilo referencia KDS): bloques rectangulares grandes
 *   apilados en columna, numerados (1-, 2-, 3-...), ordenados antiguo → nuevo.
 *   Cada bloque: cronómetro grande, color por alerta, glow + pulso en crítico.
 * Modo horizontal: zona "( )" con chips numerados en línea.
 *
 * Sin colapso: siempre muestra todos los temporizadores (numerados).
 * Modo "resumido": solo el timer más antiguo + chip `+N timers`.
 *
 * Props:
 * - timers: [{ tiempoInicio, cantidad, mesa, comandaNumero }]
 * - tick: number (forzar re-render cada segundo para refrescar cronómetros)
 * - configVisual: ver campos abajo
 */
const TemporizadorChips = ({ timers = [], configVisual = {}, tick = 0 }) => {
  const tamanioCronometro = configVisual.tamanioFuenteCronometro || 28;
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ff2a4d';
  const colorFondo = configVisual.colorFondo || '#0a0a0f';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const espaciado = configVisual.espaciadoFilas || 'normal';
  const modoResumido = configVisual.modoTimers === 'resumidos';
  const orientacion = configVisual.estiloTemporizador === 'horizontal' ? 'horizontal' : 'vertical';
  const intensidad = configVisual.intensidadAlerta || 'normal'; // 'suave' | 'normal' | 'alta'
  const gap = espaciado === 'compacto' ? '4px' : (orientacion === 'vertical' ? '8px' : '6px');

  // Multiplicador de intensidad para glow/sombra
  const glowMult = intensidad === 'alta' ? 1.6 : intensidad === 'suave' ? 0.5 : 1;

  // tick se usa solo para forzar recálculo cada segundo
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
      .sort((a, b) => b.segundos - a.segundos); // antiguo primero
  }, [timers, amarilloMin, rojoMin, tick]);

  if (calculados.length === 0) return null;

  const colorPorAlerta = (a) =>
    a === 'rojo' ? colorAlertaRoja : a === 'amarillo' ? colorAlertaAmarilla : colorAcento;

  const renderBloqueVertical = (t, idx) => {
    const color = colorPorAlerta(t.alerta);
    const esCritico = t.alerta === 'rojo';
    const esAlerta = t.alerta === 'amarillo';
    const glow = esCritico ? `0 0 ${14 * glowMult}px ${color}` : esAlerta ? `0 0 ${8 * glowMult}px ${color}aa` : 'none';
    const numero = idx + 1;
    return (
      <div
        key={`${numero}-${t.tiempoInicio || ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: espaciado === 'compacto' ? '4px 12px' : '8px 14px',
          borderRadius: '10px',
          border: `2px solid ${esCritico ? color : `${color}88`}`,
          background: esCritico ? color : `${color}1f`,
          boxShadow: glow,
          whiteSpace: 'nowrap',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontSize: `${Math.max(12, tamanioCronometro * 0.5)}px`,
            fontWeight: 800,
            color: esCritico ? '#fffc' : `${color}cc`,
            fontFamily: 'ui-monospace, "Courier New", monospace',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            minWidth: '20px',
            textAlign: 'right',
          }}
        >
          {numero}-
        </span>
        <span
          style={{
            fontSize: `${tamanioCronometro}px`,
            fontWeight: 800,
            fontFamily: 'ui-monospace, "Courier New", monospace',
            fontVariantNumeric: 'tabular-nums',
            color: esCritico ? '#fff' : color,
            textShadow: esCritico ? '0 0 10px #fff' : `0 0 ${8 * glowMult}px ${color}66`,
            animation: esCritico ? 'kdspulse 1.5s ease-in-out infinite' : 'none',
          }}
        >
          {t.cronometro}
        </span>
      </div>
    );
  };

  const renderChipHorizontal = (t, idx) => {
    const color = colorPorAlerta(t.alerta);
    const esCritico = t.alerta === 'rojo';
    const numero = idx + 1;
    return (
      <span
        key={`${numero}-${t.tiempoInicio || ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 10px',
          borderRadius: '6px',
          fontSize: `${tamanioCronometro}px`,
          fontWeight: 800,
          fontFamily: 'ui-monospace, "Courier New", monospace',
          fontVariantNumeric: 'tabular-nums',
          color: esCritico ? colorFondo : color,
          background: esCritico ? color : `${color}22`,
          border: `1px solid ${color}88`,
          textShadow: esCritico ? 'none' : `0 0 10px ${color}55`,
          animation: esCritico ? 'kdspulse 1.5s ease-in-out infinite' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: `${Math.max(11, tamanioCronometro * 0.55)}px`, opacity: 0.8 }}>{numero}-</span>
        {t.cronometro}
      </span>
    );
  };

  // Modo resumido: solo el más antiguo + indicador de cuántos más
  let visibles = calculados;
  let ocultos = 0;
  if (modoResumido && calculados.length > 1) {
    visibles = [calculados[0]];
    ocultos = calculados.length - 1;
  }

  if (orientacion === 'vertical') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap, width: '100%', minWidth: '120px' }}>
        {visibles.map((t, i) => renderBloqueVertical(t, i))}
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

  // Horizontal con numeración (sin paréntesis, estilo compacto)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' }}>
      {visibles.map((t, i) => renderChipHorizontal(t, i))}
      {ocultos > 0 && (
        <span style={{ fontSize: `${Math.max(12, tamanioCronometro * 0.6)}px`, fontWeight: 700, color: colorTextoSecundario }}>
          +{ocultos} más
        </span>
      )}
    </div>
  );
};

export default TemporizadorChips;