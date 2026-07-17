import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../config/apiConfig';

/**
 * useAlertasCocina
 *
 * Conecta al namespace /cocina (igual que useSocketCocina) pero SOLO para escuchar
 * eventos de Alerta (`alerta:nueva`, `alerta:cancelada`). Es independiente del
 * socket de comandas para poder montarse en el shell global de la App Cocina,
 * incluidos los monitores TV/kiosk que NO montan el FAB de chat.
 *
 * El JWT del monitor ya trae `numeroPantalla` y `cocineroId`, y el backend hace
 * auto-join a `pantalla-{N}` y `cocinero-{cocineroId}` en la conexión, así que
 * este hook no necesita emitir nada para recibir alertas dirigidas.
 */
const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
};

export default function useAlertasCocina() {
  const { getToken, isMonitorMode } = useAuth();
  const [alertaActiva, setAlertaActiva] = useState(null);
  const socketRef = useRef(null);
  const tokenRef = useRef(null);
  const ackEmitidoRef = useRef(new Set());

  const fetchJson = useCallback(async (path, opts = {}) => {
    const token = await getToken();
    const res = await fetch(`${getServerBaseUrl()}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }, [getToken]);

  const ack = useCallback((alertaId) => {
    if (!alertaId || ackEmitidoRef.current.has(alertaId)) return;
    ackEmitidoRef.current.add(alertaId);
    try {
      socketRef.current?.emit?.('alerta:ack', { alertaId });
    } catch (_) { /* noop */ }
  }, []);

  const cerrarAlerta = useCallback((alertaId) => {
    setAlertaActiva((curr) => {
      if (alertaId && curr && (curr._id === alertaId || curr.alertaId === alertaId)) return null;
      if (!alertaId) return null;
      return curr;
    });
  }, [ack]);

  // Conexión y listeners
  useEffect(() => {
    let cancelled = false;

    const conectar = async () => {
      const token = await getToken();
      if (!token || tokenRef.current === token) {
        if (!token) tokenRef.current = null;
        return;
      }
      tokenRef.current = token;

      const payload = decodeJwt(token);
      // Si el token tiene expirado o no es válido, no conectar
      if (!payload) return;

      const serverUrl = getServerBaseUrl();
      const socket = io(`${serverUrl}/cocina`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        auth: { token }
      });
      if (cancelled) { socket.disconnect(); return; }
      socketRef.current = socket;

      socket.on('connect', async () => {
        // Recuperar alertas activas (por si reconectamos dentro de la ventana)
        try {
          const data = await fetchJson('/alertas/activas');
          if (data?.success && Array.isArray(data.data) && data.data.length) {
            const ahora = Date.now();
            const vigentes = data.data.filter(a => new Date(a.expiraAt).getTime() > ahora);
            if (vigentes.length && !cancelled) {
              const masReciente = vigentes[0];
              ackEmitidoRef.current.delete(masReciente._id);
              setAlertaActiva(masReciente);
            }
          }
        } catch (_) { /* silencioso */ }
      });

      socket.on('alerta:nueva', (alerta) => {
        if (cancelled) return;
        ackEmitidoRef.current.delete(alerta.alertaId || alerta._id);
        setAlertaActiva(alerta);
      });

      socket.on('alerta:cancelada', ({ alertaId }) => {
        if (cancelled) return;
        cerrarAlerta(alertaId);
      });

      socket.on('disconnect', () => { /* socket.io reconecta solo */ });
    };

    conectar();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch (_) { /* noop */ }
        socketRef.current = null;
      }
    };
  }, [getToken, isMonitorMode, fetchJson, cerrarAlerta]);

  return { alertaActiva, cerrarAlerta, ack };
}
