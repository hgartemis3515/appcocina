import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCocinaMonitorData from '../../hooks/useCocinaMonitorData';
import useCocinaMonitorFilter from '../../hooks/useCocinaMonitorFilter';
import useCocinerosLista from '../../hooks/useCocinerosLista';
import CocinaMonitorLayout from './CocinaMonitorLayout';

const STORAGE_COCINERO_KEY = 'cocinaMonitorCocineroId';

/**
 * CocinaMonitorCompleto - Monitor pasivo de TODOS los platos pendientes del día.
 *
 * v3.0: Agrupa por cocinero + plato para priorizar al cocinero y mostrar
 *       temporizadores individuales por cada plato tomado.
 *       Compatible con el selector de cocineros (PLAN_SELECTOR_COCINEROS).
 *       Solo lectura. No aplica filtros de Vista de Cocina.
 */
const CocinaMonitorCompleto = ({ onGoToMenu, modoFijo = false }) => {
  const { getToken, user } = useAuth();
  const { comandas, loading, error, refrescar } = useCocinaMonitorData({
    getToken,
    cocineroId: user?.id,
  });

  // Filtro por cocinero del selector (null = General). Persiste en localStorage.
  const [cocineroActivoId, setCocineroActivoId] = useState(() => {
    if (modoFijo) return null;
    try {
      const saved = localStorage.getItem(STORAGE_COCINERO_KEY);
      return saved && saved !== 'general' ? saved : null;
    } catch { return null; }
  });

  // Lista de cocineros activos para el selector (no en modo fijo/TV)
  const { cocineros, loading: loadingCocineros } = useCocinerosLista({
    getToken: modoFijo ? null : getToken,
  });

  const cambiarCocinero = (id) => {
    setCocineroActivoId(id);
    try { localStorage.setItem(STORAGE_COCINERO_KEY, id ?? 'general'); } catch { /* noop */ }
  };

  // Agrupar por cocinero + plato: cada grupo trae `cocinero` y `timers[]` individuales
  const platosPendientesRaw = useCocinaMonitorFilter(comandas, null, {
    criterio: 'prioridad',
    direccion: 'desc',
  }, {
    agruparPorCocinero: true,
    cocineroIdFiltrado: cocineroActivoId,
  });

  // Enriquecer cada grupo con fotoUrl del cocinero (desde la lista del selector)
  const platosPendientes = useMemo(() => {
    if (!platosPendientesRaw || platosPendientesRaw.length === 0) return platosPendientesRaw;
    const fotoPorId = new Map();
    for (const c of cocineros) fotoPorId.set(String(c._id), c.fotoUrl || '');
    return platosPendientesRaw.map(item => {
      if (!item.cocinero) return item;
      const fotoUrl = fotoPorId.get(String(item.cocinero.id)) || '';
      if (!fotoUrl) return item;
      return { ...item, cocinero: { ...item.cocinero, fotoUrl } };
    });
  }, [platosPendientesRaw, cocineros]);

  // Nombre del cocinero seleccionado para el empty state contextual
  const nombreCocineroActivo = useMemo(() => {
    if (!cocineroActivoId) return null;
    const deLista = cocineros.find(c => String(c._id) === String(cocineroActivoId));
    if (deLista) return deLista.alias || deLista.name;
    // Fallback: derivar de las comandas si aún no se cargó la lista
    for (const c of comandas) {
      for (const p of c.platos || []) {
        const pp = p.procesandoPor;
        if (pp && String(pp.cocineroId) === String(cocineroActivoId)) {
          return pp.alias || pp.nombre || 'Cocinero';
        }
      }
    }
    return 'Cocinero';
  }, [cocineroActivoId, cocineros, comandas]);

  // Si el cocinero seleccionado desaparece de la lista (desactivado), volver a General
  useEffect(() => {
    if (cocineroActivoId && !loadingCocineros && cocineros.length > 0 &&
        !cocineros.some(c => String(c._id) === String(cocineroActivoId))) {
      setCocineroActivoId(null);
      try { localStorage.setItem(STORAGE_COCINERO_KEY, 'general'); } catch { /* noop */ }
    }
  }, [cocineroActivoId, loadingCocineros, cocineros]);

  const configVisual = {
    tamanioFuentePlato: 36,
    tamanioFuenteDetalle: 20,
    tamanioFuenteCronometro: 28,
    tamanioFuenteCocinero: 28,
    tiempoAmarillo: 5,
    tiempoRojo: 20,
    modoNocturno: true,
    // Rediseño por cocinero
    modoAgrupacion: 'bloques',        // 'bloques' (col-1) o 'tarjetas' (multi-col)
    mostrarMesas: true,
    modoTimers: 'completos',          // 'completos' o 'resumidos'
    maxTimersVisibles: 6,
    mostrarCabeceraCocinero: true,
    colorPorCocinero: true,
    mostrarCocineroTomado: true,
    umbralCargaAlta: 8,
    umbralSobrecarga: 12,
    // Estilo referencia KDS
    estiloTemporizador: 'vertical',
    intensidadAlerta: 'normal',
    mostrarEtiquetaPlato: false,
    mostrarIconoCocinero: true,
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
      cocineros={modoFijo ? null : cocineros}
      cocineroActivoId={cocineroActivoId}
      onCambiarCocinero={modoFijo ? null : cambiarCocinero}
      nombreCocineroActivo={nombreCocineroActivo}
    />
  );
};

export default CocinaMonitorCompleto;