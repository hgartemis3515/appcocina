import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ZoneSelector - Componente para seleccionar zona activa en el KDS
 * 
 * Permite al cocinero cambiar entre zonas asignadas o ver todas las comandas.
 * Los filtros de cada zona se aplican automáticamente.
 * 
 * @param {Object} props
 * @param {Array} props.zonasAsignadas - Lista de zonas asignadas al cocinero
 * @param {string|null} props.zonaActivaId - ID de la zona actualmente seleccionada
 * @param {Function} props.onZonaChange - Callback al cambiar zona (zonaId | null)
 * @param {boolean} props.nightMode - Modo oscuro activo
 */
const ZoneSelector = ({
  zonasAsignadas = [],
  zonaActivaId,
  onZonaChange,
  nightMode = true
}) => {
  // Validación defensiva: si no hay zonas, no mostrar nada
  if (!Array.isArray(zonasAsignadas) || zonasAsignadas.length === 0) {
    return null;
  }

  // Filtrar zonas válidas y activas
  const zonasActivas = zonasAsignadas.filter(z => 
    z && typeof z === 'object' && z.activo !== false
  );

  if (zonasActivas.length === 0) {
    return null;
  }

  // Obtener zona activa de forma segura
  const zonaActiva = zonasActivas.find(z => 
    z && (z._id === zonaActivaId || z.id === zonaActivaId)
  );

  // Estilos condicionales
  const bgMain = nightMode ? 'bg-gray-800' : 'bg-white';
  const bgDropdown = nightMode ? 'bg-gray-900' : 'bg-gray-100';
  const textMain = nightMode ? 'text-white' : 'text-gray-900';
  const textSecondary = nightMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = nightMode ? 'border-gray-600' : 'border-gray-300';

  // Iconos por defecto para zonas
  const getZonaIcon = (icono) => {
    const iconos = {
      'flame': '🔥',
      'tools-kitchen': '🍳',
      'chef-hat': '👨‍🍳',
      'pot': '🍲',
      'knife': '🔪',
      'grill': '🍖',
      'barbecue': '🔥',
      'meat': '🥩',
      'fish': '🐟',
      'salad': '🥗',
      'bread': '🍞',
      'coffee': '☕',
      'ice-cream': '🍦',
      'cake': '🍰',
      'pizza': '🍕',
      'default': '📍'
    };
    return iconos[icono] || iconos['default'];
  };

  return (
    <div className="relative">
      {/* Botón principal / Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Opción "Todas" */}
        <motion.button
          onClick={() => onZonaChange(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
            !zonaActivaId
              ? `${nightMode ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'} shadow-md`
              : `${nightMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>📍</span>
          <span>Todas</span>
        </motion.button>

        {/* Chips de zonas */}
        {zonasActivas.map((zona) => {
          const isActive = zonaActivaId === zona._id;
          return (
            <motion.button
              key={zona._id}
              onClick={() => onZonaChange(zona._id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border-2`}
              style={{
                borderColor: isActive ? (zona.color || '#d4af37') : 'transparent',
                backgroundColor: isActive
                  ? `${zona.color || '#d4af37'}20`
                  : nightMode
                    ? 'rgba(55, 65, 81, 0.5)'
                    : 'rgba(229, 231, 235, 0.5)',
                color: nightMode ? 'white' : '#1f2937'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{getZonaIcon(zona.icono)}</span>
              <span>{zona.nombre}</span>
              {zona.filtrosPlatos?.categoriasPermitidas?.length > 0 && (
                <span className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'} ml-1`}>
                  ({zona.filtrosPlatos.categoriasPermitidas.length})
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Indicador de zona activa */}
      <AnimatePresence>
        {zonaActiva && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`mt-2 px-3 py-1.5 rounded-lg text-xs ${nightMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} flex items-center gap-2`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: zonaActiva.color || '#d4af37' }}
            />
            <span>
              Mostrando solo comandas de <strong>{zonaActiva.nombre}</strong>
            </span>
            <button
              onClick={() => onZonaChange(null)}
              className={`ml-2 ${nightMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-500 hover:text-orange-600'}`}
            >
              Ver todas
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * ZoneChipsCompact - Versión compacta para mostrar en header
 */
export const ZoneChipsCompact = ({
  zonasAsignadas = [],
  zonaActivaId,
  onZonaChange,
  nightMode = true
}) => {
  // Validación defensiva
  if (!Array.isArray(zonasAsignadas) || zonasAsignadas.length === 0) {
    return null;
  }

  // Filtrar zonas válidas y activas
  const zonasActivas = zonasAsignadas.filter(z => 
    z && typeof z === 'object' && z.activo !== false
  );

  if (zonasActivas.length === 0) {
    return null;
  }

  // Obtener zona activa de forma segura
  const zonaActiva = zonasActivas.find(z => 
    z && (z._id === zonaActivaId || z.id === zonaActivaId)
  );

  const getZonaIcon = (icono) => {
    const iconos = {
      'flame': '🔥', 'tools-kitchen': '🍳', 'chef-hat': '👨‍🍳',
      'pot': '🍲', 'grill': '🍖', 'meat': '🥩',
      'ice-cream': '🍦', 'cake': '🍰', 'default': '📍'
    };
    return iconos[icono] || iconos['default'];
  };

  return (
    <div className="flex items-center gap-1.5">
      {zonaActiva ? (
        <motion.button
          onClick={() => onZonaChange(null)}
          className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
          style={{
            backgroundColor: `${zonaActiva.color || '#d4af37'}30`,
            borderColor: zonaActiva.color || '#d4af37',
            borderWidth: '1px',
            color: nightMode ? 'white' : '#1f2937'
          }}
          whileTap={{ scale: 0.95 }}
          title={`Zona: ${zonaActiva.nombre} - Click para ver todas`}
        >
          {getZonaIcon(zonaActiva.icono)}
          <span className="hidden sm:inline">{zonaActiva.nombre}</span>
          <span className="text-[10px] opacity-70">✕</span>
        </motion.button>
      ) : (
        <>
          {zonasActivas.slice(0, 3).map((zona) => (
            <motion.button
              key={zona._id}
              onClick={() => onZonaChange(zona._id)}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                nightMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              whileTap={{ scale: 0.95 }}
              title={`Filtrar por ${zona.nombre}`}
            >
              {getZonaIcon(zona.icono)}
              <span className="hidden md:inline">{zona.nombre}</span>
            </motion.button>
          ))}
          {zonasActivas.length > 3 && (
            <span className={`text-xs ${nightMode ? 'text-gray-500' : 'text-gray-400'}`}>
              +{zonasActivas.length - 3}
            </span>
          )}
        </>
      )}
    </div>
  );
};

/**
 * CocineroInfo - Muestra información del cocinero en el header
 */
export const CocineroInfo = ({
  aliasCocinero,
  userName,
  zonasAsignadas = [],
  zonaActivaId,
  onZonaChange,
  nightMode = true
}) => {
  const displayName = aliasCocinero || userName || 'Cocinero';
  const zonasActivas = zonasAsignadas?.filter(z => z.activo !== false) || [];
  const tieneZonas = zonasActivas.length > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Nombre del cocinero */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        nightMode ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <span className="text-lg">👨‍🍳</span>
        <span className={`text-sm font-medium ${nightMode ? 'text-white' : 'text-gray-900'}`}>
          {displayName}
        </span>
      </div>

      {/* Zonas compactas */}
      {tieneZonas && (
        <ZoneChipsCompact
          zonasAsignadas={zonasAsignadas}
          zonaActivaId={zonaActivaId}
          onZonaChange={onZonaChange}
          nightMode={nightMode}
        />
      )}
    </div>
  );
};

/**
 * FilterStatusBadge - Badge que indica filtros activos
 */
export const FilterStatusBadge = ({
  comandasOriginales = 0,
  comandasVisibles = 0,
  platosOcultos = 0,
  filtrosActivos = false,
  zonaActivaId = null,
  nightMode = true
}) => {
  if (!filtrosActivos && !zonaActivaId) {
    return null;
  }

  const comandasOcultas = comandasOriginales - comandasVisibles;
  const hayFiltros = zonaActivaId || comandasOcultas > 0 || platosOcultos > 0;

  if (!hayFiltros) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
        nightMode
          ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'
          : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
      }`}
    >
      <span>🔽</span>
      <span>Vista filtrada</span>
      {comandasOcultas > 0 && (
        <span className={`ml-1 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
          ({comandasOcultas} ocultas)
        </span>
      )}
    </motion.div>
  );
};

export default ZoneSelector;
