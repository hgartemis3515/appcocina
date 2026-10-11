import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getServerBaseUrl } from '../../config/apiConfig';

/**
 * Franja de inventario crítico en Ver Cocina Completo y Personalizado.
 * No resta stock: solo muestra lo que el panel ya marcó.
 */
export default function AlertaInventarioFranja({ getToken }) {
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    let vivo = true;
    const token = typeof getToken === 'function' ? getToken() : null;
    if (!token) return undefined;
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${getServerBaseUrl()}/api/inventario/alertas`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (vivo && data && Array.isArray(data.alertas)) setAlertas(data.alertas);
      })
      .catch(() => {});

    const socket = io(`${getServerBaseUrl()}/cocina`, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socket.on('inventario:alerta', (payload) => {
      if (payload && Array.isArray(payload.alertas)) setAlertas(payload.alertas);
    });
    return () => {
      vivo = false;
      socket.disconnect();
    };
  }, [getToken]);

  if (!alertas.length) return null;

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '8px 16px',
        background: '#3f1212',
        color: '#ffd6d6',
        borderBottom: '1px solid #7a2424',
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1.4
      }}
    >
      Alerta crítica
      {' · '}
      {alertas.map((a) => `${a.nombre} ${a.tipoProducto} ${a.saldo}`).join('  ·  ')}
    </div>
  );
}
