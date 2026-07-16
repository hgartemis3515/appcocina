import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { getServerBaseUrl } from '../../config/apiConfig';

/**
 * ChatFabCocina v2 — Panel Messenger-like (split: contactos + hilo)
 * FAB inferior derecha. Oculto en monitores TV.
 */

const PRIORIDADES = [
  { code: 'normal', label: 'Normal', color: '#3498db' },
  { code: 'baja', label: 'Baja', color: '#95a5a6' },
  { code: 'alta', label: 'Alta', color: '#f39c12' },
  { code: 'urgente', label: 'Urgente', color: '#e74c3c' },
  { code: 'critica', label: 'Crítica', color: '#c0392b' }
];

const FAB_STYLE = {
  position: 'fixed',
  bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
  right: 'max(16px, env(safe-area-inset-right, 0px))',
  left: 'auto',
  top: 'auto',
  zIndex: 10050,
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
  color: '#0a0a0f',
  fontSize: 24,
  cursor: 'pointer',
  boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  touchAction: 'manipulation',
  margin: 0,
  padding: 0
};

async function apiFetch(path, token, opts = {}) {
  const url = `${getServerBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function micDisponible() {
  const host = window.location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1';
  if (!window.isSecureContext && !local) return { ok: false, reason: 'insecure' };
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'unsupported' };
  return { ok: true };
}

function mimeGrabacion() {
  const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  for (const t of tipos) {
    try {
      if (window.MediaRecorder?.isTypeSupported?.(t)) return t;
    } catch (_) { /* ignore */ }
  }
  return '';
}

export default function ChatFabCocina() {
  const { getToken, hasPermission, isMonitorMode } = useAuth();
  const [puedeVer, setPuedeVer] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState('conversaciones');
  const [conversaciones, setConversaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [convActiva, setConvActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [noLeidos, setNoLeidos] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [typingShown, setTypingShown] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches
  );
  const [vistaHiloMovil, setVistaHiloMovil] = useState(false);

  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recTimerRef = useRef(null);
  const audioFileRef = useRef(null);
  const enviarAlPararRef = useRef(true);
  const socketRef = useRef(null);
  const convActivaRef = useRef(null);
  const cargarMensajesRef = useRef(null);
  const cargarInboxRef = useRef(null);

  useEffect(() => { convActivaRef.current = convActiva; }, [convActiva]);

  useEffect(() => {
    if (isMonitorMode) { setPuedeVer(false); return; }
    setPuedeVer(hasPermission('ver-mensajes'));
  }, [hasPermission, isMonitorMode]);

  const getMiId = useCallback(() => {
    try {
      const t = getToken();
      const p = JSON.parse(atob(t.split('.')[1]));
      return String(p.id || p._id || p.userId || '');
    } catch { return ''; }
  }, [getToken]);

  // === Datos ===
  const cargarInbox = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const resp = await apiFetch('/api/mensajes/conversaciones', token);
      if (resp?.success) setConversaciones(resp.data || []);
      const c = await apiFetch('/api/mensajes/no-leidos/count', token);
      setNoLeidos(c?.data?.count || 0);
    } catch (e) {
      console.warn('[ChatFabCocina] Error cargando inbox:', e.message);
    }
  }, [getToken]);

  const cargarUsuarios = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const resp = await apiFetch('/api/mozos?limit=200', token);
      const list = Array.isArray(resp) ? resp : (resp?.data || resp?.mozos || []);
      const miId = getMiId();
      setUsuarios(list.filter(u => {
        const id = String(u._id || u.id || '');
        if (miId && id === miId) return false;
        return u.activo !== false;
      }));
    } catch (e) {
      console.warn('[ChatFabCocina] Error cargando personas:', e.message);
    }
  }, [getToken, getMiId]);

  const cargarMensajes = useCallback(async (convId) => {
    const token = getToken();
    if (!token) return;
    setCargando(true);
    try {
      const resp = await apiFetch(`/api/mensajes/conversaciones/${convId}/mensajes?limit=50`, token);
      setMensajes(resp?.data || []);
      try {
        await apiFetch(`/api/mensajes/conversaciones/${convId}/leido`, token, { method: 'PATCH', body: JSON.stringify({}) });
      } catch (eLeido) {
        console.warn('[ChatFabCocina] No se pudo marcar leído:', eLeido.message);
      }
      cargarInbox();
    } catch (e) {
      console.warn('[ChatFabCocina] Error cargando mensajes:', e.message);
    }
    setCargando(false);
  }, [getToken, cargarInbox]);

  useEffect(() => { cargarMensajesRef.current = cargarMensajes; }, [cargarMensajes]);
  useEffect(() => { cargarInboxRef.current = cargarInbox; }, [cargarInbox]);

  // === Socket (namespace /cocina — cocina no puede autenticar en /admin) ===
  useEffect(() => {
    if (!puedeVer) return;
    const token = getToken();
    if (!token) return;
    const miId = getMiId();
    const serverUrl = getServerBaseUrl();
    let socket;
    try {
      socket = io(`${serverUrl}/cocina`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (miId) socket.emit('join-cocinero', miId);
      });

      socket.on('mensaje:nuevo', (data) => {
        const activa = convActivaRef.current;
        if (activa && data?.conversacionId && String(data.conversacionId) === String(activa._id || activa)) {
          cargarMensajesRef.current?.(activa._id || activa);
        }
        cargarInboxRef.current?.();
      });
      socket.on('mensaje:typing', (d) => {
        const activa = convActivaRef.current;
        if (!d?.remitenteId || !activa) return;
        if (String(d.conversacionId) !== String(activa._id || activa)) return;
        setTypingShown(d.remitenteNombre || d.remitenteId);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingShown(null), 3000);
      });
      socket.on('mensaje:entregado', () => {
        const activa = convActivaRef.current;
        if (activa) cargarMensajesRef.current?.(activa._id || activa);
      });
      socket.on('mensaje:leido', () => {
        const activa = convActivaRef.current;
        if (activa) cargarMensajesRef.current?.(activa._id || activa);
      });
    } catch (e) {
      console.warn('[ChatFabCocina] Error socket:', e.message);
    }
    return () => {
      try { socket?.disconnect(); } catch (_) {}
      socketRef.current = null;
    };
  }, [puedeVer, getToken, getMiId]);

  // === Init + polling ===
  useEffect(() => {
    if (!puedeVer) return;
    cargarInbox();
    cargarUsuarios();
    const t = setInterval(() => { cargarInbox(); }, 30000);
    return () => clearInterval(t);
  }, [puedeVer, cargarInbox, cargarUsuarios]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const onChange = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setVistaHiloMovil(false);
    };
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const abrirConversacion = async (c) => {
    setConvActiva(c);
    if (isMobile) setVistaHiloMovil(true);
    await cargarMensajes(c._id);
    if (socketRef.current) socketRef.current.emit('join-conversacion', c._id);
  };

  const cerrarPanel = () => {
    setAbierto(false);
    setVistaHiloMovil(false);
  };

  const volverLista = () => setVistaHiloMovil(false);

  const iniciarDM = async (usuarioId) => {
    const token = getToken();
    try {
      const resp = await apiFetch('/api/mensajes/conversaciones', token, {
        method: 'POST', body: JSON.stringify({ tipo: 'directo', destinatarioId: usuarioId })
      });
      if (resp?.success) {
        await cargarInbox();
        abrirConversacion(resp.data);
      }
    } catch (_) {}
  };

  // === Enviar texto ===
  const enviarTexto = async () => {
    const t = texto.trim();
    if (!t || !convActiva) return;
    setTexto('');
    const token = getToken();
    try {
      await apiFetch(`/api/mensajes/conversaciones/${convActiva._id}/mensajes`, token, {
        method: 'POST', body: JSON.stringify({ texto: t, prioridadCodigo: prioridad })
      });
      await cargarMensajes(convActiva._id);
    } catch (e) {
      setTexto(t);
      alert('No se pudo enviar');
    }
  };

  const onInputChange = (val) => {
    setTexto(val);
    if (!convActiva) return;
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      const token = getToken();
      apiFetch(`/api/mensajes/conversaciones/${convActiva._id}/typing`, token, {
        method: 'POST', body: JSON.stringify({})
      }).catch(() => {});
    }
  };

  // === Voz MediaRecorder ===
  const iniciarGrabacion = async () => {
    if (!convActiva) { alert('Selecciona una conversación'); return; }
    if (grabando) return;
    if (!hasPermission('enviar-mensajes-voz')) { alert('Sin permiso para notas de voz'); return; }

    const check = micDisponible();
    if (!check.ok) {
      if (check.reason === 'insecure') {
        alert('El micrófono solo funciona en HTTPS o localhost.\nEn red local (http://IP) usa el botón 📎 para adjuntar un audio.');
      } else {
        alert('Este navegador no permite grabar audio. Usa el botón 📎 para adjuntar un archivo.');
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];
      const mime = mimeGrabacion();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const usedMime = mr.mimeType || mime || 'audio/webm';
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: usedMime });
        stream.getTracks().forEach(t => t.stop());
        recordingStreamRef.current = null;
        clearInterval(recTimerRef.current);
        const debeEnviar = enviarAlPararRef.current;
        setGrabando(false);
        if (!debeEnviar || audioChunksRef.current.length === 0) return;
        const convId = convActivaRef.current?._id || convActivaRef.current;
        if (!convId) return;
        await subirVoz(blob, usedMime, convId);
      };
      mediaRecorderRef.current = mr;
      enviarAlPararRef.current = true;
      mr.start(250);
      setGrabando(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => {
          if (s + 1 >= 60) { detenerGrabacion(true); }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setGrabando(false);
      const msg = e?.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado. Actívalo en el navegador o usa 📎.'
        : 'No se pudo acceder al micrófono. Usa 📎 para adjuntar audio.';
      alert(msg);
      console.warn('[ChatFabCocina] mic:', e);
    }
  };

  const detenerGrabacion = (enviar = true) => {
    enviarAlPararRef.current = enviar;
    try {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    } catch (_) {}
    clearInterval(recTimerRef.current);
  };

  const subirVoz = async (blob, mimeHint = 'audio/webm', convIdOverride = null) => {
    const convId = convIdOverride || convActiva?._id;
    if (!convId) return;
    const token = getToken();
    try {
      const mime = (mimeHint || blob.type || 'audio/webm').split(';')[0];
      const ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : (mime.includes('ogg') ? 'ogg' : 'webm');
      const fd = new FormData();
      fd.append('audio', new File([blob], `voz-${Date.now()}.${ext}`, { type: mime }));
      fd.append('prioridadCodigo', prioridad);
      const url = `${getServerBaseUrl()}/api/mensajes/conversaciones/${convId}/mensajes/voz`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await cargarMensajes(convId);
    } catch (e) {
      console.warn('[ChatFabCocina] subir voz:', e);
      alert('No se pudo enviar la nota de voz');
    }
  };

  const onAudioFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !convActiva) return;
    await subirVoz(file, file.type || 'audio/webm');
  };

  // === Render helpers ===
  const fmtHora = (d) => {
    try { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  // Filtrado
  const q = busqueda.toLowerCase();
  const convsFiltradas = conversaciones.filter(c => !q || (c.titulo || '').toLowerCase().includes(q) || (c.ultimoMensajePreview || '').toLowerCase().includes(q));
  const usersFiltrados = usuarios.filter(u => !q || (u.name || '').toLowerCase().includes(q) || (u.rol || '').toLowerCase().includes(q));

  if (!puedeVer) return null;

  const mostrarSidebar = !isMobile || !vistaHiloMovil;
  const mostrarHilo = !isMobile || vistaHiloMovil;

  // === FAB ===
  const fab = (
    <button
      type="button"
      onClick={() => { setAbierto(true); setVistaHiloMovil(false); }}
      className="chat-fab-cocina"
      style={FAB_STYLE}
      title="Chat interno"
    >💬
      {noLeidos > 0 && (
        <span className="chat-fab-badge">{noLeidos > 99 ? '99+' : noLeidos}</span>
      )}
    </button>
  );

  const panel = !abierto ? null : (
    <div className={`chat-panel-cocina${isMobile ? ' is-mobile' : ''}${vistaHiloMovil ? ' mobile-hilo' : ''}`}>
      {/* Sidebar */}
      {mostrarSidebar && (
        <div className="chat-sidebar-cocina">
          <div className="chat-side-header">
            <div className="chat-brand">💬 Chat</div>
            <div className="chat-tabs">
              <TabBtn label="Recientes" active={vista === 'conversaciones'} onClick={() => setVista('conversaciones')} />
              <TabBtn label="Personas" active={vista === 'usuarios'} onClick={() => setVista('usuarios')} />
              <button type="button" onClick={cerrarPanel} style={btnCloseStyle}>✕</button>
            </div>
          </div>
          <div className="chat-search">
            <input
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar persona, canal o mensaje…"
            />
          </div>
          <div className="chat-side-lista">
            {vista === 'conversaciones' && convsFiltradas.map(c => (
              <ConvRow key={c._id} c={c} active={convActiva?._id === c._id} onClick={() => abrirConversacion(c)} />
            ))}
            {vista === 'usuarios' && usersFiltrados.map(u => (
              <UserRow key={u._id} u={u} onClick={() => iniciarDM(u._id)} />
            ))}
            {vista === 'conversaciones' && convsFiltradas.length === 0 && (
              <div className="chat-empty">Sin conversaciones</div>
            )}
            {vista === 'usuarios' && usersFiltrados.length === 0 && (
              <div className="chat-empty">Sin personas</div>
            )}
          </div>
        </div>
      )}

      {/* Hilo */}
      {mostrarHilo && (
        <div className="chat-hilo-cocina">
          <div className="chat-hilo-header">
            {isMobile && (
              <button type="button" className="chat-btn-atras" onClick={volverLista} aria-label="Volver">‹</button>
            )}
            <div className="chat-hilo-titulo">
              {convActiva ? `${convActiva.tipo === 'anuncio' ? '📢 ' : (convActiva.tipo === 'canal' ? '# ' : '')}${convActiva.titulo || 'Conversación'}` : 'Selecciona una conversación'}
            </div>
            {!isMobile && <button type="button" onClick={cerrarPanel} style={btnCloseStyle}>✕</button>}
          </div>
          <div className="chat-mensajes-cocina">
            {cargando && <div className="chat-empty">Cargando…</div>}
            {!cargando && mensajes.length === 0 && <div className="chat-empty pad">Sin mensajes. ¡Escribe o envía una nota de voz!</div>}
            {mensajes.map(m => {
              const esMio = String(m.remitenteId?._id || m.remitenteId || '') === getMiId();
              const prioColor = m.prioridad >= 9 ? '#e74c3c' : (m.prioridad >= 7 ? '#f39c12' : 'transparent');
              const prioChip = m.prioridad > 5 ? <span style={{ fontSize: 9, color: prioColor, border: `1px solid ${prioColor}`, borderRadius: 4, padding: '0 4px', marginLeft: 4 }}>{m.prioridadCodigo}</span> : null;
              const estadoIcon = esMio ? (m.estado === 'leido' ? '✓✓' : (m.estado === 'entregado' ? '✓✓' : '✓')) : '';
              const estadoColor = esMio ? (m.estado === 'leido' ? '#4fc3f7' : '#666') : 'transparent';
              let bubble;
              if (m.tipoContenido === 'voz') {
                bubble = <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22 }}>🎤</span>
                  <audio controls src={m.audio?.url || ''} style={{ height: 32, maxWidth: '100%', width: 200 }} />
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{m.audio?.duracionMs ? Math.round(m.audio.duracionMs / 1000) + 's' : ''}</span>
                </div>;
              } else if (m.tipoContenido === 'sistema') {
                bubble = <div style={{ fontStyle: 'italic', opacity: 0.7 }}>⚙️ {m.texto}</div>;
              } else {
                bubble = <div>{m.texto}</div>;
              }
              return (
                <div key={m._id} style={{ display: 'flex', flexDirection: 'column', alignItems: esMio ? 'flex-end' : 'flex-start', margin: '2px 0', width: '100%' }}>
                  <div style={{ fontSize: 10, color: '#5a5a7a', marginBottom: 2 }}>
                    {esMio ? 'Yo' : m.remitenteId?.name}{prioChip}
                  </div>
                  <div className={esMio ? 'chat-bubble mia' : 'chat-bubble otra'}>{bubble}</div>
                  <div style={{ fontSize: 9, color: estadoColor, marginTop: 2 }}>{estadoIcon} {fmtHora(m.createdAt)}</div>
                </div>
              );
            })}
          </div>
          <div className="chat-typing">
            {typingShown ? `${typingShown} está escribiendo…` : ''}
          </div>
          {!grabando ? (
            <div className="chat-composer-cocina">
              <input
                ref={audioFileRef}
                type="file"
                accept="audio/*,audio/webm,audio/mp4,audio/m4a,audio/ogg,audio/aac,.webm,.m4a,.ogg,.mp3"
                style={{ display: 'none' }}
                onChange={onAudioFile}
              />
              <button type="button" title="Adjuntar audio" className="chat-btn-icon-soft"
                onClick={() => {
                  if (!convActiva) { alert('Selecciona una conversación'); return; }
                  audioFileRef.current?.click();
                }}
              >📎</button>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)} style={selectStyle} className="chat-prio-select">
                {PRIORIDADES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
              <div className="chat-input-wrap">
                <input value={texto} onChange={e => onInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
                  placeholder="Escribe un mensaje..."
                />
              </div>
              {hasPermission('enviar-mensajes-voz') && (
                <button type="button" onClick={iniciarGrabacion} title="Nota de voz" className="chat-btn-round gold">🎤</button>
              )}
              <button type="button" onClick={enviarTexto} title="Enviar" className="chat-btn-round blue">➤</button>
            </div>
          ) : (
            <div className="chat-recording">
              <div className="chat-rec-dot" />
              <span>Grabando... {recSeconds}s</span>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={() => detenerGrabacion(false)} className="chat-btn-outline">Cancelar</button>
              <button type="button" onClick={() => detenerGrabacion(true)} className="chat-btn-send-rec">Enviar ✓</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(
    <>
      <ChatResponsiveStyles />
      {fab}
      {panel}
    </>,
    document.body
  );
}

function ChatResponsiveStyles() {
  return (
    <style>{`
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      .chat-fab-cocina {
        position: fixed !important;
        bottom: max(16px, env(safe-area-inset-bottom, 0px)) !important;
        right: max(16px, env(safe-area-inset-right, 0px)) !important;
        left: auto !important;
        top: auto !important;
        z-index: 10050 !important;
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
        color: #0a0a0f; font-size: 24px; cursor: pointer;
        box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        border: none; touch-action: manipulation;
        margin: 0 !important; padding: 0 !important;
      }
      .chat-btn-icon-soft {
        background: transparent; border: none; color: #d4af37; font-size: 20px; cursor: pointer; padding: 4px;
      }
      .chat-fab-badge {
        position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 4px;
        border-radius: 10px; background: #e74c3c; color: white; font-size: 11px; font-weight: bold;
        display: flex; align-items: center; justify-content: center;
      }
      .chat-panel-cocina {
        position: fixed; bottom: 0; right: 0; z-index: 10000;
        width: min(880px, 100vw); height: 100vh; height: 100dvh;
        background: #1a1a28; color: #fff;
        box-shadow: -8px 0 32px rgba(0,0,0,0.6);
        display: flex; font-family: Inter, system-ui, sans-serif;
        overflow: hidden;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .chat-sidebar-cocina {
        width: 320px; max-width: 42%; border-right: 1px solid rgba(212,175,55,0.15);
        display: flex; flex-direction: column; background: #12121a; min-width: 0;
      }
      .chat-side-header {
        padding: 12px 12px 10px; display: flex; align-items: center; justify-content: space-between;
        gap: 8px; border-bottom: 1px solid rgba(212,175,55,0.15); flex-wrap: wrap;
      }
      .chat-brand { font-weight: 700; color: #d4af37; font-size: 16px; }
      .chat-tabs { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
      .chat-search { padding: 8px 10px; }
      .chat-search input {
        width: 100%; box-sizing: border-box; background: #0a0a0f; color: #fff;
        border: 1px solid rgba(212,175,55,0.25); border-radius: 8px; padding: 8px 10px; font-size: 13px;
      }
      .chat-side-lista { flex: 1; overflow-y: auto; padding: 0 6px; -webkit-overflow-scrolling: touch; }
      .chat-empty { padding: 24px; text-align: center; color: #5a5a7a; font-size: 13px; }
      .chat-empty.pad { padding: 40px; font-size: 14px; }
      .chat-hilo-cocina { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
      .chat-hilo-header {
        padding: 12px 14px; background: #12121a; border-bottom: 1px solid rgba(212,175,55,0.15);
        display: flex; align-items: center; gap: 8px; min-height: 52px;
      }
      .chat-btn-atras {
        background: transparent; border: none; color: #d4af37; font-size: 28px;
        line-height: 1; cursor: pointer; padding: 0 4px 0 0;
      }
      .chat-hilo-titulo {
        font-weight: 600; font-size: 14px; flex: 1; min-width: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .chat-mensajes-cocina {
        flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 4px;
        -webkit-overflow-scrolling: touch;
      }
      .chat-typing { padding: 2px 16px 4px; font-size: 11px; color: #a0a0b8; font-style: italic; min-height: 16px; }
      .chat-composer-cocina {
        padding: 10px 12px; border-top: 1px solid rgba(212,175,55,0.15); background: #12121a;
        display: flex; gap: 6px; align-items: center;
      }
      .chat-input-wrap {
        flex: 1; min-width: 0; display: flex; background: #0a0a0f;
        border: 1px solid rgba(212,175,55,0.25); border-radius: 20px; padding: 4px 10px;
      }
      .chat-input-wrap input {
        flex: 1; min-width: 0; background: transparent; color: #fff; border: none; outline: none;
        font-size: 14px; padding: 8px 4px;
      }
      .chat-btn-round {
        width: 40px; height: 40px; border-radius: 50%; border: none; font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        touch-action: manipulation;
      }
      .chat-btn-round.gold { background: #d4af37; color: #0a0a0f; }
      .chat-btn-round.blue { background: #0084ff; color: white; }
      .chat-bubble {
        padding: 8px 14px; border-radius: 18px; max-width: min(70%, 420px); font-size: 13px;
        color: #fff; word-break: break-word;
      }
      .chat-bubble.mia { background: #0084ff; border-bottom-right-radius: 4px; }
      .chat-bubble.otra { background: #2a2a3a; border-bottom-left-radius: 4px; }
      .chat-recording {
        padding: 10px 14px; background: #2a1a1a; border-top: 1px solid #e74c3c;
        display: flex; align-items: center; gap: 10px; color: #e74c3c; font-size: 13px; font-weight: 600;
      }
      .chat-rec-dot { width: 12px; height: 12px; border-radius: 50%; background: #e74c3c; animation: pulse 1s infinite; }
      .chat-btn-outline, .chat-btn-send-rec {
        border-radius: 8px; padding: 8px 12px; cursor: pointer; font-size: 12px;
      }
      .chat-btn-outline { background: transparent; border: 1px solid #e74c3c; color: #e74c3c; }
      .chat-btn-send-rec { background: #e74c3c; border: none; color: white; font-weight: 600; }

      @media (max-width: 900px) {
        .chat-panel-cocina { width: min(100vw, 720px); }
        .chat-sidebar-cocina { width: 280px; max-width: 40%; }
      }
      @media (max-width: 700px) {
        .chat-fab-cocina {
          width: 52px !important; height: 52px !important; font-size: 22px !important;
          bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;
          right: max(12px, env(safe-area-inset-right, 0px)) !important;
          left: auto !important; top: auto !important;
        }
        .chat-panel-cocina {
          width: 100vw; left: 0; right: 0; top: 0; bottom: 0;
          padding-top: env(safe-area-inset-top, 0px);
          box-shadow: none;
        }
        .chat-sidebar-cocina { width: 100%; max-width: none; border-right: none; }
        .chat-hilo-cocina { width: 100%; }
        .chat-composer-cocina { padding-bottom: max(10px, env(safe-area-inset-bottom, 0px)); }
        .chat-bubble { max-width: 82%; font-size: 14px; }
      }
      @media (max-width: 380px) {
        .chat-brand { font-size: 14px; }
        .chat-btn-round { width: 36px; height: 36px; font-size: 16px; }
        .chat-prio-select { display: none; }
      }
    `}</style>
  );
}

// === Subcomponentes ===
function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: `1px solid ${active ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.15)'}`,
      color: active ? '#d4af37' : '#a0a0b8', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer'
    }}>{label}</button>
  );
}

function ConvRow({ c, active, onClick }) {
  const prioColor = c.prioridadMinima >= 9 ? '#e74c3c' : (c.prioridadMinima >= 7 ? '#f39c12' : null);
  const inicial = (c.titulo || '?').replace('#', '').charAt(0).toUpperCase();
  const icono = c.tipo === 'anuncio' ? '📢' : (c.tipo === 'canal' ? '#' : '●');
  return (
    <div onClick={onClick} style={{
      padding: '10px 10px', borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center',
      marginBottom: 2, position: 'relative', background: active ? 'rgba(212,175,55,0.15)' : 'transparent'
    }}>
      {c.pineado && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#d4af37', borderRadius: 2 }} />}
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: prioColor || '#d4af37', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{inicial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{icono} {c.titulo || 'DM'}</span>
          {c.noLeidos > 0 && <span style={{ background: prioColor || '#ff4757', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 'bold' }}>{c.noLeidos}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#a0a0b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultimoMensajePreview || ''}</div>
      </div>
    </div>
  );
}

function UserRow({ u, onClick }) {
  const inicial = (u.name || '?').charAt(0).toUpperCase();
  const rolColor = { admin: '#e74c3c', supervisor: '#f39c12', cocinero: '#e67e22', mozos: '#3498db', capitanMozos: '#9b59b6', cajero: '#1abc9c' }[u.rol] || '#7f8c8d';
  return (
    <div onClick={onClick} style={{ padding: '10px 10px', borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 2 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: rolColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{inicial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || '?'}</div>
        <div style={{ fontSize: 11, color: '#a0a0b8' }}>{u.rol || ''}</div>
      </div>
      <div style={{ color: '#d4af37', fontSize: 18 }}>💬</div>
    </div>
  );
}

const btnCloseStyle = { background: 'transparent', border: 'none', color: '#a0a0b8', cursor: 'pointer', fontSize: 20 };
const selectStyle = { background: 'transparent', color: '#d4af37', border: 'none', fontSize: 11, outline: 'none' };