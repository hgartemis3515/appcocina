import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FaArrowLeft, FaDesktop, FaTv, FaPlay, FaStop, FaSync } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getServerBaseUrl } from '../../config/apiConfig';
import { abrirMonitorPantalla } from '../../utils/monitorWindowManager';

/**
 * DesplegarMonitoresPage - Consola para abrir/gerenciar las ventanas
 * de monitor en los televisores de cocina.
 *
 * Muestra la lista de pantallas (TV 1..8) con su vista asignada y permite
 * abrirlas, probarlas individualmente o desplegarlas todas de una vez.
 */
const DesplegarMonitoresPage = ({ onGoToMenu }) => {
  const { getToken, user } = useAuth();
  const [pantallas, setPantallas] = useState([]);
  const [vistas, setVistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ventanas, setVentanas] = useState({}); // { [numero]: windowRef }
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      const [pantallasRes, vistasRes] = await Promise.all([
        axios.get(`${getServerBaseUrl()}/api/pantallas-cocina/activas`, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
        }),
        axios.get(`${getServerBaseUrl()}/api/vistas-cocina/activas`, {
          headers: { Authorization: `Bearer ${token}` }, timeout: 5000,
        }),
      ]);

      setPantallas(pantallasRes.data?.data || []);
      setVistas(vistasRes.data?.data || []);
      setError(null);
    } catch (err) {
      console.warn('[DesplegarMonitores] Error:', err.message);
      setError('No se pudieron cargar las pantallas');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirPantalla = (pantalla) => {
    const win = abrirMonitorPantalla(pantalla);
    if (win) {
      setVentanas(prev => ({ ...prev, [pantalla.numeroPantalla]: win }));
    }
  };

  const desplegarTodas = () => {
    pantallas.forEach((p, idx) => {
      // Encadenar aperturas para evitar popup blocker
      setTimeout(() => abrirPantalla(p), idx * 200);
    });
  };

  const cerrarTodas = () => {
    Object.values(ventanas).forEach(win => {
      try { win.close(); } catch (err) { /* ignore */ }
    });
    setVentanas({});
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToMenu}
            className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300"
          >
            <FaArrowLeft /> Menú
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaDesktop className="text-cyan-400" /> Desplegar Monitores de Cocina
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargarDatos}
            className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 text-sm"
          >
            <FaSync /> Refrescar
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
        <p className="text-blue-300 text-sm">
          💡 Configure las pantallas y vistas asignadas en el panel admin (Cocineros → Personalizar vista).
          Al desplegar, cada ventana se abre en pantallas separadas y entra en modo fijo (solo lectura).
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin text-4xl mb-3">⏳</div>
          Cargando pantallas...
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700/40 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {!loading && pantallas.length === 0 && (
        <div className="text-center py-12">
          <FaTv className="text-5xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-xl mb-2">No hay pantallas configuradas</p>
          <p className="text-gray-500">
            Cree pantallas de cocina (TV 1–8) y asígneles vistas desde el panel administrativo.
          </p>
        </div>
      )}

      {/* Grid de pantallas */}
      {!loading && pantallas.length > 0 && (
        <>
          <div className="flex gap-3 mb-6">
            <button
              onClick={desplegarTodas}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 flex items-center gap-2"
            >
              <FaPlay /> Desplegar todas
            </button>
            <button
              onClick={cerrarTodas}
              className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold flex items-center gap-2"
            >
              <FaStop /> Cerrar todas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pantallas.map((pantalla) => {
              const vistaNombre = pantalla.vistaCocinaId?.nombre || '(Sin vista)';
              const vistaColor = pantalla.vistaCocinaId?.color || '#d4af37';
              return (
                <motion.div
                  key={pantalla._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-900 border border-gray-800 rounded-xl"
                  style={{ borderLeft: `4px solid ${vistaColor}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📺</span>
                      <div>
                        <h3 className="font-bold">TV {pantalla.numeroPantalla}</h3>
                        <p className="text-xs text-gray-400">{pantalla.nombre}</p>
                      </div>
                    </div>
                    {ventanas[pantalla.numeroPantalla] && !ventanas[pantalla.numeroPantalla].closed ? (
                      <span className="text-xs px-2 py-1 bg-green-600/30 text-green-400 rounded">Abierta</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">Cerrada</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 mb-3">
                    Vista: <span style={{ color: vistaColor }}>{vistaNombre}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirPantalla(pantalla)}
                      className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                    >
                      <FaPlay /> Abrir
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer - estado socket */}
      <div className="mt-6 text-xs text-gray-500">
        Usuario: {user?.name} ({user?.rol}) · Sesión persistente activa
      </div>
    </div>
  );
};

export default DesplegarMonitoresPage;