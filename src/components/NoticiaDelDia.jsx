import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../config/apiConfig';

const KEY = 'gambusinas_noticias_vistas';

function htmlVisible(html, origin) {
  return String(html || '').replace(/src="\/uploads\//g, `src="${origin}/uploads/`);
}

export default function NoticiaDelDia() {
  const { getToken, user } = useAuth();
  const [noticias, setNoticias] = useState([]);
  const [fecha, setFecha] = useState('');
  const [abierta, setAbierta] = useState(false);

  const userKey = String(user?._id || user?.id || 'cocinero');

  const vistas = useCallback((ymd) => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!data || data.user !== userKey || data.ymd !== ymd) return [];
      return Array.isArray(data.ids) ? data.ids.map(String) : [];
    } catch (_) {
      return [];
    }
  }, [userKey]);

  const cargar = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${getServerBaseUrl()}/api/noticias/hoy`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const lista = Array.isArray(data.noticias) ? data.noticias : [];
      const ymd = data.fechaOperativa || '';
      setFecha(ymd);
      setNoticias(lista);
      const ya = vistas(ymd);
      if (lista.some((n) => !ya.includes(String(n._id)))) setAbierta(true);
    } catch (_) {
      /* sin red no se marca */
    }
  }, [getToken, vistas]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    const socket = io(`${getServerBaseUrl()}/cocina`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('noticia-publicada', () => { cargar(); });
    return () => socket.disconnect();
  }, [getToken, cargar]);

  const cerrar = () => {
    if (fecha && noticias.length) {
      localStorage.setItem(KEY, JSON.stringify({
        user: userKey,
        ymd: fecha,
        ids: noticias.map((n) => String(n._id)),
      }));
    }
    setAbierta(false);
  };

  if (!abierta || !noticias.length) return null;
  const origin = getServerBaseUrl();

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 text-white rounded-2xl border border-amber-500/40 w-full max-w-lg max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold px-5 pt-4">Noticias de hoy</h2>
        <div className="overflow-auto px-5 py-3 space-y-4">
          {noticias.map((n) => (
            <article key={n._id}>
              <h3 className="font-semibold text-lg mb-1">{n.titulo}</h3>
              <div
                className="text-base leading-relaxed [&_img]:max-w-full [&_img]:rounded-lg"
                dangerouslySetInnerHTML={{ __html: htmlVisible(n.cuerpoHtml, origin) }}
              />
            </article>
          ))}
        </div>
        <button
          type="button"
          onClick={cerrar}
          className="m-4 min-h-[48px] rounded-xl bg-amber-500 text-black font-bold"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
