import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calcularSegundos, formatearCronometro, nivelAlerta } from '../../hooks/useCocinaMonitorTimer';

/**
 * CocineroBlockHeader - Cabecera de bloque de cocinero para el modo "bloques".
 *
 * Muestra: foto de perfil (o iniciales si no hay foto), alias + nombre, total de platos,
 * badge de urgente si algún timer está en rojo, indicador de sobrecarga, y el timer más antiguo.
 * Es colapsable: al hacer clic se expande/contraen las tarjetas del bloque.
 *
 * Props:
 * - cocinero: { id, alias, nombre }
 * - tarjetas: array de grupos (con timers)
 * - totalPlatos: número de platos del cocinero
 * - configVisual
 * - inicialExpandido: bool (default true)
 */
const colorAcentoPorCocinero = (alias) => {
  if (!alias) return '#d4af37';
  const paleta = ['#d4af37', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#facc15'];
  let h = 0;
  for (let i = 0; i < alias.length; i++) h = (h * 31 + alias.charCodeAt(i)) >>> 0;
  return paleta[h % paleta.length];
};

const CocineroBlockHeader = ({
  cocinero,
  tarjetas = [],
  totalPlatos = 0,
  configVisual = {},
  inicialExpandido = true,
  onToggle,
}) => {
  const [expandido, setExpandido] = useState(inicialExpandido);

  const usarColorCocinero = configVisual.colorPorCocinero !== false;
  const colorCocinero = usarColorCocinero ? colorAcentoPorCocinero(cocinero?.alias) : (configVisual.colorAcento || '#d4af37');
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorAlertaAmarilla = configVisual.colorAlertaAmarilla || '#fbbf24';
  const colorAlertaRoja = configVisual.colorAlertaRoja || '#ef4444';
  const colorFondo = configVisual.colorFondo || '#0a0a0f';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const tamanioFuenteCocinero = configVisual.tamanioFuenteCocinero || 28;
  const tamanioFuenteDetalle = configVisual.tamanioFuenteDetalle || 20;
  const amarilloMin = configVisual.tiempoAmarillo ?? 5;
  const rojoMin = configVisual.tiempoRojo ?? 20;
  const umbralCargaAlta = configVisual.umbralCargaAlta ?? 8;
  const umbralSobrecarga = configVisual.umbralSobrecarga ?? 12;

  // Determinar alerta máxima y timer más antiguo del cocinero
  let alertaMaxima = 'normal';
  let timerMasAntiguo = null;
  let segundosMasAntiguos = -1;
  for (const t of tarjetas) {
    for (const ti of (t.timers || [])) {
      const s = calcularSegundos(ti.tiempoInicio);
      if (s > segundosMasAntiguos) {
        segundosMasAntiguos = s;
        timerMasAntiguo = ti;
      }
      const a = nivelAlerta(s, amarilloMin, rojoMin);
      if (a === 'rojo') alertaMaxima = 'rojo';
      else if (a === 'amarillo' && alertaMaxima !== 'rojo') alertaMaxima = 'amarillo';
    }
  }

  const colorAlerta = alertaMaxima === 'rojo'
    ? colorAlertaRoja
    : alertaMaxima === 'amarillo'
      ? colorAlertaAmarilla
      : colorCocinero;

  let estadoCarga = null;
  if (totalPlatos >= umbralSobrecarga) estadoCarga = { texto: 'Sobrecargado', color: colorAlertaRoja };
  else if (totalPlatos >= umbralCargaAlta) estadoCarga = { texto: 'Carga alta', color: colorAlertaAmarilla };

  const toggle = () => {
    const nuevo = !expandido;
    setExpandido(nuevo);
    onToggle?.(cocinero?.id, nuevo);
  };

  return (
    <div
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 20px',
        background: `${colorCocinero}14`,
        borderBottom: `2px solid ${colorCocinero}55`,
        borderTop: `2px solid ${colorCocinero}55`,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Avatar: foto de perfil si existe, si no iniciales */}
      {cocinero?.fotoUrl ? (
        <img
          src={cocinero.fotoUrl}
          alt={cocinero?.alias || cocinero?.nombre || 'Cocinero'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: `3px solid ${colorCocinero}`,
            boxShadow: `0 0 8px ${colorCocinero}55`,
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: `${colorCocinero}22`,
            border: `3px solid ${colorCocinero}`,
            color: colorCocinero,
            fontSize: '20px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {(cocinero?.alias || cocinero?.nombre || '?').slice(0, 2).toUpperCase()}
        </span>
      )}

      {/* Alias + nombre */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: `${tamanioFuenteCocinero}px`,
            fontWeight: 800,
            color: colorCocinero,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {cocinero?.alias || cocinero?.nombre || 'Cocinero'}
        </span>
        {cocinero?.nombre && cocinero.nombre !== cocinero.alias && (
          <span style={{ fontSize: `${tamanioFuenteDetalle - 4}px`, color: colorTextoSecundario }}>
            {cocinero.nombre}
          </span>
        )}
      </div>

      {/* Estadísticas compactas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: colorTextoSecundario, textTransform: 'uppercase' }}>Platos</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: colorCocinero }}>
            {totalPlatos}
          </div>
        </div>

        {timerMasAntiguo && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: colorTextoSecundario, textTransform: 'uppercase' }}>Más antiguo</div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: colorAlerta,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'ui-monospace, "Courier New", monospace',
                textShadow: alertaMaxima !== 'normal' ? `0 0 12px ${colorAlerta}66` : 'none',
              }}
            >
              {formatearCronometro(segundosMasAntiguos)}
            </div>
          </div>
        )}

        {alertaMaxima === 'rojo' && (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 800,
              color: '#fff',
              background: colorAlertaRoja,
              animation: 'kdspulse 1.5s ease-in-out infinite',
            }}
          >
            ! URGENTE
          </span>
        )}

        {estadoCarga && (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              color: estadoCarga.color,
              background: `${estadoCarga.color}22`,
              border: `1px solid ${estadoCarga.color}77`,
            }}
          >
            {estadoCarga.texto}
          </span>
        )}

        {/* Indicador de colapso */}
        <span
          style={{
            fontSize: '22px',
            color: colorTextoSecundario,
            transition: 'transform 0.2s',
            transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          ▸
        </span>
      </div>
    </div>
  );
};

export default CocineroBlockHeader;