import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { getServerBaseUrl } from '../../config/apiConfig';
import useCocinaMonitorData from '../../hooks/useCocinaMonitorData';
import useCocinaMonitorFilter from '../../hooks/useCocinaMonitorFilter';
import CocinaMonitorLayout from './CocinaMonitorLayout';

const STORAGE_KEY = 'cocinaMonitorVistaId';

/**
 * CocinaMonitorPersonalizado - Monitor pasivo filtrado por Vista de Cocina.
 * Soporta `modoFijo` para TVs (sin menú, sin cambiar de vista).
 *
 * Props:
 * - onGoToMenu
 * - modoFijo: bool
 * - vistaIdInicial: string|null - override (deep link / URL)
 */
const CocinaMonitorPersonalizado = ({ onGoToMenu, modoFijo = false, vistaIdInicial = null }) => {
  const { getToken, user } = useAuth();
  const [vistasCocina, setVistasCocina] = useState([]);
  const [vistaActivaId, setVistaActivaId] = useState(
    vistaIdInicial || localStorage.getItem(STORAGE_KEY) || null
  );
  const [loadingVistas, setLoadingVistas] = useState(true);

  // Cargar vistas de cocina disponibles
  const cargarVistas = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await axios.get(`${getServerBaseUrl()}/api/vistas-cocina/activas`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      const vistas = res.data?.data || [];
      setVistasCocina(vistas);

      // Si no hay vista activa pero hay vistas, tomar la primera
      if (!vistaActivaId && vistas.length > 0) {
        setVistaActivaId(vistas[0]._id);
      }
    } catch (err) {
      console.warn('[CocinaMonitorPersonalizado] Error cargando vistas:', err.message);
    } finally {
      setLoadingVistas(false);
    }
  }, [getToken, vistaActivaId]);

  useEffect(() => {
    cargarVistas();
  }, [cargarVistas]);

  const cambiarVista = useCallback((id) => {
    setVistaActivaId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  // Vista activa objeto
  const vistaActiva = vistasCocina.find(v => v._id === vistaActivaId) || null;

  // Datos de comandas
  const { comandas, loading, error, refrescar } = useCocinaMonitorData({
    getToken,
    cocineroId: user?.id,
  });

  // Filtrar platos por la vista activa
  const platosPendientes = useCocinaMonitorFilter(
    comandas,
    vistaActiva,
    vistaActiva?.ordenamiento || { criterio: 'prioridad', direccion: 'desc' }
  );

  // Config visual de la vista (con defaults)
  const configVisual = vistaActiva?.configVisual || {
    tamanioFuentePlato: 36,
    tamanioFuenteDetalle: 20,
    tamanioFuenteCronometro: 28,
    tiempoAmarillo: vistaActiva?.configCronometro?.tiempoAmarillo || 5,
    tiempoRojo: vistaActiva?.configCronometro?.tiempoRojo || 20,
    modoNocturno: true,
  };

  // Incluir umbrales cron dentro de configVisual para PlatoMonitorRow
  configVisual.tiempoAmarillo = configVisual.tiempoAmarillo || 5;
  configVisual.tiempoRojo = configVisual.tiempoRojo || 20;

  if (loadingVistas && vistasCocina.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl text-orange-500 mb-4">⏳</div>
          <p className="text-gray-400 text-xl">Cargando vistas de cocina...</p>
        </div>
      </div>
    );
  }

  if (vistasCocina.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-300 text-2xl mb-4">No hay vistas de cocina configuradas</p>
          <p className="text-gray-500 mb-6">
            Cree vistas en el panel administrativo (cocineros → Personalizar vista).
          </p>
          {onGoToMenu && (
            <button
              onClick={onGoToMenu}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Volver al menú
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading && comandas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl text-orange-500 mb-4">⏳</div>
          <p className="text-gray-400 text-xl">Cargando platos...</p>
        </div>
      </div>
    );
  }

  if (error && comandas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <button
            onClick={refrescar}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 mr-2"
          >
            Reintentar
          </button>
          {onGoToMenu && (
            <button
              onClick={onGoToMenu}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Menú
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <CocinaMonitorLayout
      platosPendientes={platosPendientes}
      configVisual={configVisual}
      nombreVista={vistaActiva?.nombre || 'Personalizada'}
      modoFijo={modoFijo}
      onVolver={modoFijo ? null : onGoToMenu}
      vistasCocina={modoFijo ? null : vistasCocina}
      vistaActivaId={vistaActivaId}
      onCambiarVista={modoFijo ? null : cambiarVista}
    />
  );
};

export default CocinaMonitorPersonalizado;