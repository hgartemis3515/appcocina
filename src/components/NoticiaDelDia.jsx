import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../config/apiConfig';
import { gsap } from '../utils/registerGsapPlugins';
import { playKdsEventSound } from '../utils/kdsNotificationSounds';

const KEY = 'gambusinas_noticias_vistas';

function htmlVisible(html, origin) {
  return String(html || '').replace(/src="\/uploads\//g, `src="${origin}/uploads/`);
}

function sonarComoComanda() {
  playKdsEventSound('nuevaComanda');
}

function meToca(aviso, esMonitor, numeroPantalla) {
  const canal = aviso?.canal || aviso?.cocinaAlcance || 'todas';
  if (canal === 'todas') return true;
  if (canal === 'kds') return !esMonitor;
  if (canal === 'pantallas') {
    if (!esMonitor) return false;
    const n = Number(numeroPantalla);
    if (aviso.pantalla != null) return Number(aviso.pantalla) === n;
    const lista = (aviso.pantallas || []).map(Number);
    return !lista.length || lista.includes(n);
  }
  return !esMonitor;
}

export default function NoticiaDelDia({ esMonitor = false, numeroPantalla = null }) {
  const { getToken, user } = useAuth();
  const [aviso, setAviso] = useState(null);
  const [resta, setResta] = useState(15);
  const franjaRef = useRef(null);
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

  const marcar = useCallback((id, ymd) => {
    if (!id || !ymd) return;
    const prev = vistas(ymd);
    localStorage.setItem(KEY, JSON.stringify({ user: userKey, ymd, ids: [...new Set([...prev, String(id)])] }));
  }, [userKey, vistas]);

  const abrir = useCallback((data, sonar) => {
    if (!data || !meToca(data, esMonitor, numeroPantalla)) return;
    const segundos = Math.min(120, Math.max(5, Number(data.segundosEnPantalla) || 15));
    setResta(segundos);
    setAviso({ ...data, segundos });
    if (sonar) sonarComoComanda();
  }, [esMonitor, numeroPantalla]);

  const cerrar = useCallback(() => {
    if (aviso?.noticiaId && aviso?.fechaOperativa && !aviso.temporal) marcar(aviso.noticiaId, aviso.fechaOperativa);
    setAviso(null);
  }, [aviso, marcar]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${getServerBaseUrl()}/api/noticias/hoy`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok || !vivo) return;
        const data = await res.json();
        const ya = vistas(data.fechaOperativa);
        const nueva = (data.noticias || []).find((n) => !ya.includes(String(n._id)) && meToca(n, esMonitor, numeroPantalla));
        if (nueva) {
          abrir({
            titulo: nueva.titulo,
            cuerpoHtml: nueva.cuerpoHtml,
            segundosEnPantalla: nueva.segundosEnPantalla,
            cocinaAlcance: nueva.cocinaAlcance,
            pantallas: nueva.pantallas,
            noticiaId: nueva._id,
            fechaOperativa: data.fechaOperativa,
          }, false);
        }
      } catch (_) { /* sin red */ }
    })();
    return () => { vivo = false; };
  }, [getToken, vistas, abrir, esMonitor, numeroPantalla]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    const socket = io(`${getServerBaseUrl()}/cocina`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('noticia-publicada', (payload) => {
      if (!payload) return;
      if (payload.accion === 'retirada') {
        const id = String(payload.noticiaId || '');
        setAviso((actual) => (actual && id && String(actual.noticiaId || '') === id ? null : actual));
        return;
      }
      abrir(payload, true);
    });
    socket.on('noticia-temporal', (payload) => {
      if (payload) abrir({ ...payload, temporal: true }, true);
    });
    return () => socket.disconnect();
  }, [getToken, abrir]);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setInterval(() => {
      setResta((n) => {
        if (n <= 1) {
          cerrar();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [aviso, cerrar]);

  useEffect(() => {
    const el = franjaRef.current;
    if (!el || !aviso) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof gsap === 'undefined') return undefined;
    const tween = gsap.fromTo(el, { y: -28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    return () => tween.kill();
  }, [aviso]);

  if (!aviso) return null;
  const total = aviso.segundos || 15;
  const pct = Math.max(0, Math.round((resta / total) * 100));
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const origin = getServerBaseUrl();
  const plano = String(aviso.cuerpoHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const tieneImagen = /<img/i.test(aviso.cuerpoHtml || '');
  const letras = (aviso.titulo || '').length + plano.length + (tieneImagen ? 40 : 0);
  const ancho = letras < 40 ? 'min(92vw, 28rem)' : letras < 120 ? 'min(92vw, 40rem)' : 'min(92vw, 56rem)';
  const tituloCls = letras < 40
    ? 'text-6xl md:text-7xl'
    : letras < 120
      ? 'text-5xl md:text-6xl'
      : 'text-5xl';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
      <div
        ref={franjaRef}
        className="pointer-events-auto bg-[#1a1a28] rounded-2xl border-[3px] border-[#d4af37] shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: ancho,
          maxHeight: '70vh',
          ...(reduce ? {} : {
            animation: 'resplandorUrgente 1.6s ease-in-out infinite',
            '--kds-alerta-color': '#d4af37',
          }),
        }}
        role="dialog"
        aria-label="Aviso de cocina"
      >
        <div className="bg-[#12121a] px-4 py-2 border-b border-[rgba(212,175,55,0.35)] text-center">
          <span className="text-xs uppercase tracking-widest font-black text-[#d4af37]">
            {esMonitor ? `Aviso · Pantalla ${numeroPantalla || ''}` : 'Aviso a cocina'}
          </span>
        </div>
        {aviso.titulo ? (
          <div className="px-6 pt-4 pb-2 text-center">
            <h2 className={`${tituloCls} font-black text-white leading-tight`}>{aviso.titulo}</h2>
          </div>
        ) : null}
        {plano || tieneImagen ? (
          <div
            className="px-6 pb-3 overflow-y-auto text-center text-4xl font-bold text-white leading-snug [&_p]:text-white [&_strong]:text-[#d4af37] [&_img]:mx-auto [&_img]:max-h-64 [&_img]:max-w-full [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: htmlVisible(aviso.cuerpoHtml, origin) }}
          />
        ) : null}
        <div className="px-6 pb-4 flex items-center justify-center gap-3">
          <div className="flex items-baseline gap-1 bg-[#0a0a0f] border-2 border-[rgba(212,175,55,0.5)] px-3 py-1.5 rounded-xl">
            <span className="text-3xl font-black text-[#d4af37] font-mono tabular-nums leading-none">{resta}</span>
            <span className="text-xs font-extrabold text-white uppercase">seg</span>
          </div>
          <button type="button" onClick={cerrar} className="h-12 px-5 bg-[#d4af37] text-[#0a0a0f] font-black uppercase rounded-xl">
            Cerrar
          </button>
        </div>
        <div className="w-full h-1.5 bg-white/10">
          <div className="h-full bg-[#d4af37]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
