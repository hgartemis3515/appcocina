import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../config/apiConfig';
import { gsap, useGSAP } from '../utils/registerGsapPlugins';

const KEY = 'gambusinas_noticias_vistas';

function htmlVisible(html, origin) {
  return String(html || '').replace(/src="\/uploads\//g, `src="${origin}/uploads/`);
}

function paraZona(aviso, zona) {
  const d = aviso?.destinos;
  if (!Array.isArray(d) || d.length === 0) return zona !== 'caja';
  return d.includes(zona);
}

function fechaLegible(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function NoticiaDelDia({ zona = 'cocina' }) {
  const { getToken, user } = useAuth();
  const [noticias, setNoticias] = useState([]);
  const [fecha, setFecha] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [nuevasIds, setNuevasIds] = useState([]);
  const [flash, setFlash] = useState(null);
  const rootRef = useRef(null);
  const tlRef = useRef(null);

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
      const res = await fetch(`${getServerBaseUrl()}/api/noticias/hoy?destino=${encodeURIComponent(zona)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const lista = (Array.isArray(data.noticias) ? data.noticias : []).filter((n) => paraZona(n, zona));
      const ymd = data.fechaOperativa || '';
      setFecha(ymd);
      setNoticias(lista);
      const ya = vistas(ymd);
      const nuevas = lista.filter((n) => !ya.includes(String(n._id))).map((n) => String(n._id));
      setNuevasIds(nuevas);
      if (nuevas.length) setAbierta(true);
    } catch (_) {
      /* sin red no se marca */
    }
  }, [getToken, vistas, zona]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    const socket = io(`${getServerBaseUrl()}/cocina`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('noticia-publicada', (aviso) => { if (paraZona(aviso, zona)) cargar(); });
    socket.on('noticia-temporal', (aviso) => {
      if (aviso && aviso.titulo && paraZona(aviso, zona)) setFlash(aviso);
    });
    return () => socket.disconnect();
  }, [getToken, cargar, zona]);

  const { contextSafe } = useGSAP(() => {
    if (!abierta) return undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('[data-hoja]', { y: 32, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5 })
        .fromTo('[data-noticia]', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07 }, '-=0.25')
        .fromTo('[data-listo]', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, '-=0.2');
      tlRef.current = tl;
      return () => { tlRef.current = null; };
    });
    mm.add('(prefers-reduced-motion: reduce)', () => {
      tlRef.current = null;
    });
    return () => mm.revert();
  }, { scope: rootRef, dependencies: [abierta], revertOnUpdate: true });

  const marcarVistas = useCallback(() => {
    if (fecha && noticias.length) {
      localStorage.setItem(KEY, JSON.stringify({
        user: userKey,
        ymd: fecha,
        ids: noticias.map((n) => String(n._id)),
      }));
    }
  }, [fecha, noticias, userKey]);

  const cerrar = contextSafe(() => {
    marcarVistas();
    const tl = tlRef.current;
    if (tl) {
      tl.eventCallback('onReverseComplete', () => setAbierta(false));
      tl.timeScale(1.7).reverse();
    } else {
      setAbierta(false);
    }
  });

  const originPrevio = getServerBaseUrl();
  const avisoFlash = flash ? (
    <div className="fixed bottom-4 right-4 z-[85] w-[min(100%-2rem,28rem)] pointer-events-none">
      <div className="pointer-events-auto bg-gray-900 text-white rounded-2xl border border-amber-500/40 w-full max-h-[70vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 pt-4 pb-1">
          <p className="text-[11px] uppercase tracking-wide text-amber-300 font-bold">Solo esta vez</p>
          <h2 className="text-xl font-bold">{flash.titulo}</h2>
        </div>
        <div
          className="overflow-auto px-5 py-3 text-base leading-relaxed [&_img]:max-w-full [&_img]:rounded-lg"
          dangerouslySetInnerHTML={{ __html: htmlVisible(flash.cuerpoHtml, originPrevio) }}
        />
        <button type="button" onClick={() => setFlash(null)} className="m-4 min-h-[52px] rounded-xl bg-amber-500 text-black font-bold">
          Listo
        </button>
      </div>
    </div>
  ) : null;

  if (!abierta || !noticias.length) return avisoFlash;
  const origin = getServerBaseUrl();
  const nNuevas = nuevasIds.length;

  return (
    <>
    {avisoFlash}
    <div ref={rootRef} className="fixed bottom-4 right-4 z-[80] w-[min(100%-2rem,28rem)] pointer-events-none">
      <div
        data-hoja
        className="pointer-events-auto bg-gray-900 text-white rounded-2xl border border-amber-500/40 shadow-[0_30px_80px_rgba(0,0,0,0.6)] w-full max-h-[70vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="false"
        aria-label="Noticias de hoy"
      >
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />
        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold leading-tight">Noticias de hoy</h2>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{fechaLegible(fecha)}</p>
          </div>
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
            {nNuevas > 0 ? `${nNuevas} ${nNuevas === 1 ? 'nueva' : 'nuevas'}` : `${noticias.length}`}
          </span>
        </div>
        <div className="overflow-auto px-5 py-3 space-y-4">
          {noticias.map((n) => (
            <article key={n._id} data-noticia className="rounded-xl bg-gray-800/60 border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="font-semibold text-lg leading-snug">{n.titulo}</h3>
                {nuevasIds.includes(String(n._id)) ? (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black">Nuevo</span>
                ) : null}
              </div>
              <div
                className="text-base leading-relaxed [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: htmlVisible(n.cuerpoHtml, origin) }}
              />
              {n.autor?.nombre ? <p className="text-[11px] text-gray-500 mt-2">— {n.autor.nombre}</p> : null}
            </article>
          ))}
        </div>
        <button
          type="button"
          data-listo
          onClick={cerrar}
          className="m-4 min-h-[52px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] transition-colors text-black font-bold text-lg"
        >
          Listo
        </button>
      </div>
    </div>
    </>
  );
}
