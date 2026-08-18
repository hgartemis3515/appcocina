import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCocinaMonitorData from '../../hooks/useCocinaMonitorData';
import useCocinaMonitorFilter from '../../hooks/useCocinaMonitorFilter';
import useCocinerosLista from '../../hooks/useCocinerosLista';
import useBuscadorPlatos from '../../hooks/useBuscadorPlatos';
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
const CocinaMonitorCompleto = ({ onGoToMenu, modoFijo = false, cocineroIdFijo = null }) => {
  const { getToken, user } = useAuth();
  const { comandas, loading, error, refrescar } = useCocinaMonitorData({
    getToken,
    cocineroId: user?.id,
  });

  // En modo fijo, setear el titulo de la pagina con el numero de monitor
  // para que el script PowerShell del .bat pueda encontrar la ventana por titulo.
  useEffect(() => {
    if (!modoFijo) return;
    const params = new URLSearchParams(window.location.search);
    const monitor = params.get('monitor') || '?';
    document.title = `monitor-${monitor}`;
  }, [modoFijo]);

  // Filtro por cocinero del selector (null = General). Persiste en localStorage.
  // En modo kiosk (cocineroIdFijo), se respeta el cocinero asignado y NO se toca localStorage.
  const [cocineroActivoId, setCocineroActivoId] = useState(() => {
    if (cocineroIdFijo) return cocineroIdFijo;
    if (modoFijo) return null;
    try {
      const saved = localStorage.getItem(STORAGE_COCINERO_KEY);
      return saved && saved !== 'general' ? saved : null;
    } catch { return null; }
  });

  // Lista de cocineros activos para el selector y enriquecimiento de platos (fotoUrl).
  // Se carga siempre (tambien en modo fijo) para que los platos tengan foto del cocinero.
  const { cocineros, loading: loadingCocineros } = useCocinerosLista({
    getToken,
  });

  const cambiarCocinero = (id) => {
    if (cocineroIdFijo) return; // bloqueado en modo kiosk
    setCocineroActivoId(id);
    try { localStorage.setItem(STORAGE_COCINERO_KEY, id ?? 'general'); } catch { /* noop */ }
  };

  // Búsqueda de platos (igual lógica que el KDS de comandas).
  // No persiste en localStorage: la búsqueda es efímera de sesión.
  const [searchTerm, setSearchTerm] = useState('');

  const {
    comandasFiltradas,
    totalPlatosEncontrados,
    totalComandasEncontradas,
    hayFiltroActivo,
    sugerencias,
  } = useBuscadorPlatos(comandas, searchTerm, {
    soloUltimaComanda: false,
  });

  // Cuando hay búsqueda activa, reemplazamos los platos de cada comanda por los
  // coincidentes (platosFiltrados) antes de pasarlos al filtro del monitor.
  // Si no hay búsqueda, pasamos las comandas sin tocar.
  const comandasParaMonitor = useMemo(() => {
    if (!hayFiltroActivo) return comandas;
    return comandasFiltradas.map(c => ({
      ...c,
      platos: Array.isArray(c.platosFiltrados) ? c.platosFiltrados : c.platos,
    }));
  }, [comandas, comandasFiltradas, hayFiltroActivo]);

  // Agrupar por cocinero + plato: cada grupo trae `cocinero` y `timers[]` individuales
  // Más viejo → más nuevo (izquierda→derecha, arriba→abajo en el grid)
  const platosPendientesRaw = useCocinaMonitorFilter(comandasParaMonitor, null, {
    criterio: 'tiempo',
    direccion: 'asc',
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

  // Si el cocinero seleccionado desaparece de la lista (desactivado), volver a General.
  // No aplica en modo kiosk: el cocineroIdFijo se mantiene aunque se desactive en admin
  // (el admin debe reasignar o regenerar token si quiere cambiar el TV).
  useEffect(() => {
    if (cocineroIdFijo) return;
    if (cocineroActivoId && !loadingCocineros && cocineros.length > 0 &&
        !cocineros.some(c => String(c._id) === String(cocineroActivoId))) {
      setCocineroActivoId(null);
      try { localStorage.setItem(STORAGE_COCINERO_KEY, 'general'); } catch { /* noop */ }
    }
  }, [cocineroActivoId, loadingCocineros, cocineros, cocineroIdFijo]);

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
    <>
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
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalPlatosEncontrados={totalPlatosEncontrados}
        totalComandasEncontradas={totalComandasEncontradas}
        hayFiltroBusqueda={hayFiltroActivo}
        sugerenciasBusqueda={sugerencias}
        onSugerenciaClick={setSearchTerm}
        getToken={getToken}
        comandas={comandasParaMonitor}
      />
    </>
  );
};

export default CocinaMonitorCompleto;