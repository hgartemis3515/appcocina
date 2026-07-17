import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useAlertasCocina from '../../hooks/useAlertasCocina';
import { getServerBaseUrl } from '../../config/apiConfig';

/**
 * AlertaOverlayCocina
 *
 * Overlay a pantalla completa para Alertas operativas en App Cocina.
 * Se monta en el shell global (App.jsx) — tanto en sesiones humanas como en
 * monitores TV/kiosk — porque las alertas deben mostrarse aunque el FAB de chat
 * esté oculto (isMonitorMode).
 *
 * Comportamiento:
 *  - Color de fondo = alerta.estilo.colorHex
 *  - Sonido vía HTML5 Audio (loop si sonidoClave === 'sirena')
 *  - Auto-cierra tras alerta.estilo.duracionMs salvo que estilo.requiereAck
 *  - Botón "Entendido" -> ack al server
 *  - Si llega alerta:cancelada, se cierra de inmediato
 */
export default function AlertaOverlayCocina() {
  const { alertaActiva, cerrarAlerta, ack } = useAlertasCocina();
  const timeoutRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!alertaActiva) return;
    const id = alertaActiva._id || alertaActiva.alertaId;
    const duracionMs = alertaActiva.estilo?.duracionMs || 15000;
    const requiereAck = alertaActiva.estilo?.requiereAck;
    const sonido = alertaActiva.estilo?.sonidoClave;

    // Reproducir sonido
    if (sonido && sonido !== 'silencio') {
      try {
        const audio = new Audio(`${getServerBaseUrl()}/sounds/alertas/${sonido}.mp3`);
        audio.loop = sonido === 'sirena';
        audio.play().catch(() => { /* autoplay bloqueado: ignoramos */ });
        audioRef.current = audio;
      } catch (_) { /* noop */ }
    }

    // Auto-cerrar
    if (!requiereAck) {
      timeoutRef.current = setTimeout(() => cerrarAlerta(id), duracionMs);
    }

    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (_) { /* noop */ }
        audioRef.current = null;
      }
    };
  }, [alertaActiva, cerrarAlerta]);

  if (!alertaActiva) return null;

  const id = alertaActiva._id || alertaActiva.alertaId;
  const color = alertaActiva.estilo?.colorHex || '#e74c3c';
  // Forzar legibilidad: oscurecer un 15% para fondo y usar blanco como texto
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: color,
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    animation: 'alertaOverlayFadeIn 0.15s ease-out'
  };

  const onDismiss = () => {
    ack(id);
    cerrarAlerta(id);
  };

  return createPortal(
    <div style={overlayStyle} role="alert" aria-live="assertive">
      <style>{`
        @keyframes alertaOverlayFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: '80vw', padding: 32 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🚨</div>
        <div style={{
          fontSize: 16, opacity: 0.85, letterSpacing: 2, textTransform: 'uppercase',
          fontWeight: 600
        }}>
          Alerta {alertaActiva.prioridadCodigo || 'urgente'}
        </div>
        <div style={{
          fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700,
          margin: '12px 0', lineHeight: 1.2
        }}>
          {alertaActiva.texto}
        </div>
        {alertaActiva.creadoPorNombre ? (
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            De: {alertaActiva.creadoPorNombre}
          </div>
        ) : null}
        <button
          onClick={onDismiss}
          style={{
            marginTop: 28, padding: '14px 32px',
            background: 'rgba(0,0,0,0.4)', color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 18, cursor: 'pointer'
          }}
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body
  );
}
