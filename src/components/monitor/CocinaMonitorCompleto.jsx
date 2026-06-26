import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCocinaMonitorData from '../../hooks/useCocinaMonitorData';
import useCocinaMonitorFilter from '../../hooks/useCocinaMonitorFilter';
import CocinaMonitorLayout from './CocinaMonitorLayout';

/**
 * CocinaMonitorCompleto - Monitor pasivo de TODOS los platos pendientes del día.
 * Solo lectura. No aplica filtros de Vista de Cocina.
 */
const CocinaMonitorCompleto = ({ onGoToMenu, modoFijo = false }) => {
  const { getToken, user } = useAuth();
  const { comandas, loading, error, refrescar } = useCocinaMonitorData({
    getToken,
    cocineroId: user?.id,
  });

  const platosPendientes = useCocinaMonitorFilter(comandas, null, {
    criterio: 'prioridad',
    direccion: 'desc',
  });

  const configVisual = {
    tamanioFuentePlato: 36,
    tamanioFuenteDetalle: 20,
    tamanioFuenteCronometro: 28,
    tiempoAmarillo: 5,
    tiempoRojo: 20,
    modoNocturno: true,
  };

  if (loading && comandas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl text-orange-500 mb-4">⏳</div>
          <p className="text-gray-400 text-xl">Cargando cocina...</p>
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
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <CocinaMonitorLayout
      platosPendientes={platosPendientes}
      configVisual={configVisual}
      nombreVista="Ver Cocina — Completo"
      modoFijo={modoFijo}
      onVolver={modoFijo ? null : onGoToMenu}
    />
  );
};

export default CocinaMonitorCompleto;