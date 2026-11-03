import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../config/apiConfig';
import { gsap, useGSAP } from '../utils/registerGsapPlugins';
import { noticiaAplicaEnPantalla, noticiaSuenaEnTablaKds } from '../utils/noticiaDestinoCocina';
import { playKdsEventSound } from '../utils/kdsNotificationSounds';

const KEY = 'gambusinas_noticias_vistas';

function htmlVisible(html, origin) {
  return String(html || '').replace(/src="\/uploads\//g, `src="${origin}/uploads/`);
}


function segundosAviso(aviso) {
  const n = Number(aviso?.segundosEnPantalla);
  const base = Number.isFinite(n) && n > 0 ? n : 15;
  return Math.min(120, Math.max(5, Math.round(base)));
}

function fechaLegible(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function NoticiaDelDia({
  zona = 'cocina',
  superficie = null,
  numeroPantalla = null,
  cocineroId = null,
}) {
  const { getToken, user } = useAuth();
  const tipo = superficie || (zona === 'caja' ? 'caja' : 'kds');
  const aplica = useCallback((aviso) => noticiaAplicaEnPantalla(aviso, {
    tipo,
    numeroPantalla,
    cocineroId,
  }), [tipo, numeroPantalla, cocineroId]);
  const [noticias, setNoticias] = useState([]);
  const [fecha, setFecha] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [nuevasIds, setNuevasIds] = useState([]);
  const [flash, setFlash] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(15);
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
      const lista = (Array.isArray(data.noticias) ? data.noticias : []).filter((n) => aplica(n));
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
  }, [getToken, vistas, aplica]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    const socket = io(`${getServerBaseUrl()}/cocina`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    const sonarEnTabla = (aviso) => {
      if (tipo !== 'kds' || !noticiaSuenaEnTablaKds(aviso)) return;
      playKdsEventSound('nuevaComanda');
    };
    socket.on('noticia-publicada', (aviso) => {
      if (aviso?.accion === 'creada') sonarEnTabla(aviso);
      if (aplica(aviso)) cargar();
    });
    socket.on('noticia-temporal', (aviso) => {
      sonarEnTabla(aviso);
      if (aviso && (aviso.titulo || aviso.cuerpoHtml) && aplica(aviso)) setFlash(aviso);
    });
    return () => socket.disconnect();
  }, [getToken, cargar, aplica, tipo]);

  const { contextSafe } = useGSAP(() => {
    if (!abierta) return undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('[data-velo]', { opacity: 0 }, { opacity: 1, duration: 0.35 })
        .fromTo('[data-hoja]', { y: 32, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5 }, '-=0.2')
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

  useEffect(() => {
    if (!flash) return undefined;
    const total = segundosAviso(flash);
    const fin = Date.now() + total * 1000;
    setSegundosRestantes(total);
    const id = setInterval(() => {
      const msRestantes = fin - Date.now();
      if (msRestantes <= 0) {
        setSegundosRestantes(0);
        setFlash(null);
      } else {
        setSegundosRestantes(Math.ceil(msRestantes / 1000));
      }
    }, 200);
    return () => clearInterval(id);
  }, [flash]);

  const originPrevio = getServerBaseUrl();
  const totalSegundos = flash ? segundosAviso(flash) : 15;
  const porcentajeBarra = Math.max(0, Math.min(100, (segundosRestantes / totalSegundos) * 100));
  const avisoFlash = flash ? createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
      <style>{`
        @keyframes kdsAvisoEntrada {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .kds-aviso-anim { animation: kdsAvisoEntrada 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .kds-aviso-anim { animation: none !important; transform: none !important; }
        }
      `}</style>
      <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setFlash(null)} aria-label="Cerrar aviso" />
      <div
        className="kds-aviso-anim relative w-[min(100%,42rem)] max-h-[82vh] flex flex-col overflow-hidden rounded-2xl border-4 border-[#FFE14A] bg-[#000000] text-white shadow-[0_0_50px_rgba(255,225,74,0.35),0_30px_80px_rgba(0,0,0,0.9)]"
        role="dialog"
        aria-modal="true"
        aria-label={flash.titulo || 'Aviso'}
      >
        <div className="px-6 pt-6 pb-4">
          <p className="text-sm uppercase tracking-widest text-[#FFE14A] font-black text-center">Aviso</p>
          {flash.titulo ? <h2 className="text-3xl sm:text-4xl font-black leading-tight mt-1.5 text-center text-white">{flash.titulo}</h2> : null}
        </div>
        <div
          className="overflow-auto px-6 py-4 text-xl sm:text-2xl leading-snug text-white [&_strong]:font-black [&_strong]:text-[#FFE14A] [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-3 [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: htmlVisible(flash.cuerpoHtml, originPrevio) }}
        />
        <button
          type="button"
          onClick={() => setFlash(null)}
          aria-label={`Listo. Se cierra en ${segundosRestantes} segundos`}
          className="relative m-6 mt-3 flex flex-col overflow-hidden rounded-xl border-2 border-[#FFE14A] bg-transparent px-5 py-3 text-white active:scale-[0.99]"
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-black tracking-wide text-white">
            Listo
          </span>
          <span
            className="relative z-10 flex items-center justify-between gap-4"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="rounded-md border border-[#FFE14A] bg-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#FFE14A]">
              se cierra en
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black tabular-nums leading-none text-[#FFE14A]">{segundosRestantes}</span>
              <span className="text-lg sm:text-xl font-black text-[#FFE14A]">s</span>
            </span>
          </span>
          <span className="relative z-10 mt-2 block h-1.5 w-full overflow-hidden rounded-full" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-[#FFE14A] transition-[width] duration-200 ease-linear"
              style={{ width: `${porcentajeBarra}%` }}
            />
          </span>
        </button>
      </div>
    </div>,
    document.body,
  ) : null;

  if (!abierta || !noticias.length) return avisoFlash;
  const origin = getServerBaseUrl();
  const nNuevas = nuevasIds.length;

  return (
    <>
    {avisoFlash}
    {createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <button type="button" data-velo className="absolute inset-0 bg-black/70" onClick={cerrar} aria-label="Cerrar noticias" />
      <div
        data-hoja
        className="relative w-[min(100%,42rem)] max-h-[82vh] flex flex-col overflow-hidden rounded-2xl border border-amber-500/50 bg-gray-900 text-white shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        role="dialog"
        aria-modal="true"
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
    </div>,
    document.body,
    )}
    </>
  );
}
