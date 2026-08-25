import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';
import { getServerBaseUrl } from '../../config/apiConfig';
import MonitorConfigPanel from './MonitorConfigPanel';
import { DEFAULT_CONFIG, snapshotConfigPerfil } from './CocinaMonitorLayout';
import { publicarDisenoMonitor } from '../../utils/monitorDesignSync';
import { primerCocineroIdFiltro } from '../../utils/cocineroFiltroIds';

/**
 * Panel Personalizar Ver Cocina Completo dirigido a un monitor pasivo (2–9).
 * Los cambios se ven en la ventana despegada (app o Hub) y se guardan en esa pantalla.
 */
const PersonalizarMonitorRemoto = ({
  numero,
  getToken,
  ventanaHija = null,
  perfilAplicar = 'none',
  cocineroId = null,
  onClose,
}) => {
  const [localDesign, setLocalDesign] = useState(() => snapshotConfigPerfil(DEFAULT_CONFIG));
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const saveTimerRef = useRef(null);
  const localDesignRef = useRef(localDesign);
  localDesignRef.current = localDesign;

  const [perfiles, setPerfiles] = useState([]);
  const [perfilSelId, setPerfilSelId] = useState(null);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(false);
  const [cargandoPerfilId, setCargandoPerfilId] = useState(null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilMensaje, setPerfilMensaje] = useState(null);

  const aplicarYPublicar = useCallback((config) => {
    const completa = snapshotConfigPerfil({ ...DEFAULT_CONFIG, ...(config || {}) });
    setLocalDesign(completa);
    publicarDisenoMonitor(numero, completa, ventanaHija);
    return completa;
  }, [numero, ventanaHija]);

  const persistir = useCallback(async (config) => {
    if (!getToken) return;
    try {
      setGuardando(true);
      const token = getToken();
      await axios.put(
        `${getServerBaseUrl()}/api/pantallas-cocina/${numero}/config-visual`,
        { config },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'No se pudo guardar en el monitor' });
    } finally {
      setGuardando(false);
    }
  }, [getToken, numero]);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${getToken?.()}` }), [getToken]);

  const cargarPerfiles = useCallback(async () => {
    if (!getToken) return;
    try {
      setCargandoPerfiles(true);
      const res = await axios.get(`${getServerBaseUrl()}/api/perfiles-ver-cocina`, {
        headers: authHeaders(),
        timeout: 5000,
      });
      setPerfiles(res.data?.data || []);
    } catch (err) {
      console.warn('[PersonalizarMonitorRemoto] perfiles:', err.message);
    } finally {
      setCargandoPerfiles(false);
    }
  }, [getToken, authHeaders]);

  useEffect(() => {
    cargarPerfiles();
  }, [cargarPerfiles]);

  const flashPerfil = (tipo, texto) => {
    setPerfilMensaje({ tipo, texto });
    setTimeout(() => setPerfilMensaje(null), 3000);
  };

  const seleccionarPerfil = useCallback(async (perfilId) => {
    if (!perfilId) { setPerfilSelId(null); return; }
    if (!getToken) return;
    setCargandoPerfilId(perfilId);
    try {
      const res = await axios.get(`${getServerBaseUrl()}/api/perfiles-ver-cocina/${perfilId}`, {
        headers: authHeaders(),
        timeout: 5000,
      });
      const perfil = res.data?.data;
      const config = perfil?.config;
      if (config && typeof config === 'object') {
        const completa = aplicarYPublicar(config);
        await persistir(completa);
        setPerfilSelId(perfilId);
        flashPerfil('ok', `Perfil "${perfil?.nombre || 'Perfil'}" cargado ✓`);
      } else {
        flashPerfil('error', 'El perfil no tiene configuración válida');
      }
    } catch (err) {
      flashPerfil('error', err?.response?.data?.error || 'Error al cargar perfil');
    } finally {
      setCargandoPerfilId(null);
    }
  }, [getToken, authHeaders, aplicarYPublicar, persistir]);

  const snapshotActual = useCallback(
    () => snapshotConfigPerfil({ ...DEFAULT_CONFIG, ...localDesignRef.current }),
    [],
  );

  const guardarPerfilComo = useCallback(async (nombre) => {
    if (!getToken) return;
    const nom = (nombre || '').trim();
    if (!nom) {
      flashPerfil('error', 'Ingresa un nombre para el perfil');
      return false;
    }
    try {
      setGuardandoPerfil(true);
      const res = await axios.post(
        `${getServerBaseUrl()}/api/perfiles-ver-cocina`,
        { nombre: nom, config: snapshotActual() },
        { headers: authHeaders() }
      );
      const creado = res.data?.data;
      flashPerfil('ok', `Perfil "${nom}" guardado ✓`);
      await cargarPerfiles();
      if (creado?._id) setPerfilSelId(creado._id);
      return true;
    } catch (err) {
      flashPerfil('error', err?.response?.data?.error || 'Error al guardar perfil');
      return false;
    } finally {
      setGuardandoPerfil(false);
    }
  }, [getToken, authHeaders, snapshotActual, cargarPerfiles]);

  const sobrescribirPerfil = useCallback(async (perfilId) => {
    if (!perfilId || !getToken) return;
    const p = perfiles.find((x) => String(x._id) === String(perfilId));
    if (!p) return;
    try {
      setGuardandoPerfil(true);
      await axios.put(
        `${getServerBaseUrl()}/api/perfiles-ver-cocina/${perfilId}`,
        { config: snapshotActual() },
        { headers: authHeaders() }
      );
      flashPerfil('ok', `Perfil "${p.nombre}" actualizado ✓`);
      await cargarPerfiles();
    } catch (err) {
      flashPerfil('error', err?.response?.data?.error || 'Error al actualizar perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  }, [getToken, authHeaders, perfiles, snapshotActual, cargarPerfiles]);

  const eliminarPerfil = useCallback(async (perfilId) => {
    if (!perfilId || !getToken) return;
    const p = perfiles.find((x) => String(x._id) === String(perfilId));
    if (!p) return;
    try {
      setGuardandoPerfil(true);
      await axios.delete(`${getServerBaseUrl()}/api/perfiles-ver-cocina/${perfilId}`, {
        headers: authHeaders(),
      });
      flashPerfil('ok', `Perfil "${p.nombre}" eliminado`);
      if (String(perfilSelId) === String(perfilId)) setPerfilSelId(null);
      await cargarPerfiles();
    } catch (err) {
      flashPerfil('error', err?.response?.data?.error || 'Error al eliminar perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  }, [getToken, authHeaders, perfiles, perfilSelId, cargarPerfiles]);

  const guardarPerfilCocinero = useCallback(async () => {
    const idPerfil = primerCocineroIdFiltro(cocineroId);
    if (!idPerfil) {
      flashPerfil('error', 'Asigna un cocinero a este monitor para guardar su perfil auto');
      return;
    }
    if (!getToken) return;
    try {
      setGuardandoPerfil(true);
      await axios.put(
        `${getServerBaseUrl()}/api/cocineros/${idPerfil}/perfil-ver-cocina`,
        { config: snapshotActual() },
        { headers: authHeaders() }
      );
      flashPerfil('ok', 'Perfil del cocinero (auto) guardado ✓');
    } catch (err) {
      flashPerfil('error', err?.response?.data?.error || 'Error al guardar perfil del cocinero');
    } finally {
      setGuardandoPerfil(false);
    }
  }, [cocineroId, getToken, authHeaders, snapshotActual]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setCargando(true);
      setMensaje(null);
      try {
        const token = getToken?.();
        if (!token) return;
        const base = getServerBaseUrl();
        const vis = await axios.get(`${base}/api/pantallas-cocina/${numero}/config-visual`, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
        });
        const data = vis.data?.data;
        if (alive && data?.tieneOverride && data.config && Object.keys(data.config).length > 0) {
          aplicarYPublicar(data.config);
          return;
        }
        if (perfilAplicar && perfilAplicar !== 'none' && perfilAplicar !== 'auto') {
          const res = await axios.get(`${base}/api/perfiles-ver-cocina/${perfilAplicar}`, {
            headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
          });
          if (alive) {
            aplicarYPublicar(res.data?.data?.config || {});
            setPerfilSelId(perfilAplicar);
          }
          return;
        }
        const cid = primerCocineroIdFiltro(cocineroId);
        if (perfilAplicar === 'auto' && cid) {
          const res = await axios.get(`${base}/api/cocineros/${cid}/perfil-ver-cocina`, {
            headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
          });
          if (alive) aplicarYPublicar(res.data?.data || {});
          return;
        }
        if (alive) aplicarYPublicar(DEFAULT_CONFIG);
      } catch (err) {
        if (alive) {
          aplicarYPublicar(DEFAULT_CONFIG);
          if (err?.response?.status !== 404) {
            setMensaje({ tipo: 'error', texto: 'No se pudo cargar el diseño actual' });
          }
        }
      } finally {
        if (alive) setCargando(false);
      }
    })();
    return () => { alive = false; };
  }, [numero, getToken, perfilAplicar, cocineroId, aplicarYPublicar]);

  const onChange = useCallback((nueva) => {
    const completa = aplicarYPublicar(nueva);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistir(completa), 600);
  }, [aplicarYPublicar, persistir]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const onReset = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      setGuardando(true);
      const token = getToken?.();
      await axios.put(
        `${getServerBaseUrl()}/api/pantallas-cocina/${numero}/config-visual`,
        { config: null },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );
      publicarDisenoMonitor(numero, null, ventanaHija);
      setPerfilSelId(null);
      setMensaje({ tipo: 'ok', texto: 'Monitor restaurado al perfil asignado' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err?.response?.data?.error || 'No se pudo restaurar' });
    } finally {
      setGuardando(false);
    }
    setLocalDesign(snapshotConfigPerfil(DEFAULT_CONFIG));
  }, [getToken, numero, ventanaHija]);

  const configVisual = { ...DEFAULT_CONFIG, ...localDesign };
  const colorFondo = configVisual.colorFondo || '#0a0a0f';
  const colorTextoPrincipal = configVisual.colorTextoPrincipal || '#ffffff';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const colorAcento = configVisual.colorAcento || '#d4af37';
  const cidAsignado = primerCocineroIdFiltro(cocineroId);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-950 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Personalizar Ver Cocina — Monitor {numero}</h2>
            <p className="text-xs text-gray-400">
              Con la ventana abierta o cerrada. Si está abierta, los cambios se ven en tiempo real; si no, quedan listos para el próximo despliegue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {guardando && <span className="text-xs text-amber-300">Guardando…</span>}
            {mensaje && (
              <span className={`text-xs ${mensaje.tipo === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {mensaje.texto}
              </span>
            )}
            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white" aria-label="Cerrar">
              <FaTimes />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {cargando ? (
            <div className="p-8 text-center text-gray-400">Cargando diseño del monitor…</div>
          ) : (
            <MonitorConfigPanel
              configVisual={configVisual}
              localDesign={localDesign}
              onChange={onChange}
              onReset={onReset}
              onSaveProfile={cidAsignado ? guardarPerfilCocinero : undefined}
              guardandoPerfil={guardandoPerfil}
              perfilMensaje={perfilMensaje}
              colorFondo={colorFondo}
              colorTextoPrincipal={colorTextoPrincipal}
              colorTextoSecundario={colorTextoSecundario}
              colorAcento={colorAcento}
              perfiles={perfiles}
              perfilSelId={perfilSelId}
              cargandoPerfiles={cargandoPerfiles}
              cargandoPerfilId={cargandoPerfilId}
              onSeleccionarPerfil={seleccionarPerfil}
              onGuardarPerfilComo={guardarPerfilComo}
              onSobrescribirPerfil={sobrescribirPerfil}
              onEliminarPerfil={eliminarPerfil}
              onRecargarPerfiles={cargarPerfiles}
              getToken={getToken}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizarMonitorRemoto;
