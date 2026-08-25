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
          if (alive) aplicarYPublicar(res.data?.data?.config || {});
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
              colorFondo={colorFondo}
              colorTextoPrincipal={colorTextoPrincipal}
              colorTextoSecundario={colorTextoSecundario}
              colorAcento={colorAcento}
              getToken={getToken}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizarMonitorRemoto;
