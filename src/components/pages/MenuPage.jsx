import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUtensils, 
  FaCog, 
  FaSignOutAlt, 
  FaChartBar, 
  FaHistory, 
  FaClock,
  FaUserCircle,
  FaChevronRight,
  FaEye,
  FaFilter,
  FaMapMarkerAlt,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

/**
 * MenuPage - Menú principal del App de Cocina
 * Navegación a las diferentes funcionalidades del sistema
 * 
 * Incluye selección de modo de vista:
 * - Vista General: Todas las comandas sin filtros
 * - Vista Personalizada: Filtrada por Zonas KDS del cocinero
 */
const MenuPage = ({ onNavigate }) => {
  const { user, logout, cocineroConfig, configLoading, viewMode, setViewMode, getZonasActivas } = useAuth();
  const [showViewSelector, setShowViewSelector] = useState(false);

  // Obtener zonas activas del cocinero
  const zonasActivas = useMemo(() => getZonasActivas(), [getZonasActivas]);
  const tieneZonas = zonasActivas.length > 0;
  const tieneConfiguracion = cocineroConfig && (tieneZonas || cocineroConfig.filtrosPlatos || cocineroConfig.filtrosComandas);

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      logout();
    }
  };

  // Función para navegar a cocina con el modo de vista seleccionado
  const handleNavigateToCocina = (selectedViewMode) => {
    setViewMode(selectedViewMode);
    setShowViewSelector(false);
    onNavigate('COCINA');
  };

  // Obtener icono de zona
  const getZonaIcon = (icono) => {
    const iconos = {
      'flame': '🔥', 'tools-kitchen': '🍳', 'chef-hat': '👨‍🍳',
      'pot': '🍲', 'grill': '🍖', 'meat': '🥩',
      'ice-cream': '🍦', 'cake': '🍰', 'default': '📍'
    };
    return iconos[icono] || iconos['default'];
  };

  // Opciones de vista para el modal
  const viewOptions = [
    {
      id: 'general',
      title: 'Vista General',
      subtitle: 'Todas las comandas del día sin filtros',
      icon: FaEye,
      color: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/30',
      description: 'Ve el panorama completo de la cocina sin restricciones de zonas.',
      badge: null
    },
    {
      id: 'personalizada',
      title: 'Vista Personalizada',
      subtitle: tieneZonas 
        ? `Filtrada por: ${zonasActivas.map(z => z.nombre).join(', ')}` 
        : 'Filtrada por tu configuración',
      icon: FaFilter,
      color: tieneConfiguracion ? 'from-green-500 to-emerald-600' : 'from-gray-500 to-gray-600',
      shadowColor: tieneConfiguracion ? 'shadow-green-500/30' : 'shadow-gray-500/30',
      description: tieneZonas 
        ? 'Solo las comandas y platos de tus zonas asignadas.'
        : 'Personaliza tu vista según tu configuración de cocinero.',
      badge: tieneZonas ? `${zonasActivas.length} zona${zonasActivas.length > 1 ? 's' : ''}` : null,
      disabled: !tieneConfiguracion
    }
  ];

  // Opciones principales del menú
  const mainOptions = [
    {
      id: 'cocina',
      title: 'Ver Comandas',
      subtitle: 'Tablero KDS en tiempo real',
      icon: FaUtensils,
      color: 'from-green-500 to-emerald-600',
      shadowColor: 'shadow-green-500/30',
      action: () => setShowViewSelector(true),
      enabled: true,
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      subtitle: 'Ajustes del sistema',
      icon: FaCog,
      color: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/30',
      action: () => onNavigate('COCINA', { openConfig: true }),
      enabled: true,
    },
  ];

  // Opciones futuras (deshabilitadas)
  const futureOptions = [
    {
      id: 'reportes',
      title: 'Reportes del Día',
      subtitle: 'Estadísticas y resumen',
      icon: FaChartBar,
      enabled: false,
    },
    {
      id: 'historial',
      title: 'Historial',
      subtitle: 'Días anteriores',
      icon: FaHistory,
      enabled: false,
    },
    {
      id: 'tiempos',
      title: 'Tiempos de Prep.',
      subtitle: 'Estadísticas de preparación',
      icon: FaClock,
      enabled: false,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <FaUtensils className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                COCINA LAS GAMBUSINAS
              </h1>
              <p className="text-gray-400 text-xs">Menú Principal</p>
            </div>
          </div>
          
          {/* Usuario y logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.name || 'Cocinero'}</p>
              <p className="text-gray-400 text-xs capitalize">{user?.rol || 'cocinero'}</p>
            </div>
            <FaUserCircle className="text-gray-400 text-3xl" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-300 px-4 py-2 rounded-lg transition-all text-sm border border-gray-700 hover:border-red-700"
            >
              <FaSignOutAlt />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Bienvenida con info de configuración */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Bienvenido, <span className="text-orange-400">{user?.name || 'Cocinero'}</span>!
            </h2>
            <p className="text-gray-400">Seleccione una opción para continuar</p>
            
            {/* Indicador de configuración/zonas */}
            {configLoading ? (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
                <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                <span className="text-gray-400 text-sm">Cargando configuración...</span>
              </div>
            ) : tieneZonas ? (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded-lg">
                <FaMapMarkerAlt className="text-green-400" />
                <span className="text-green-400 text-sm font-medium">
                  Zonas asignadas: {zonasActivas.map(z => z.nombre).join(', ')}
                </span>
              </div>
            ) : tieneConfiguracion ? (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                <FaFilter className="text-blue-400" />
                <span className="text-blue-400 text-sm font-medium">
                  Tienes configuración personalizada activa
                </span>
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                <FaEye className="text-gray-400" />
                <span className="text-gray-400 text-sm">
                  Sin configuración personalizada - Vista General disponible
                </span>
              </div>
            )}
          </motion.div>

          {/* Opciones principales */}
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Opciones Principales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mainOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.id}
                    onClick={option.action}
                    disabled={!option.enabled}
                    whileHover={{ scale: option.enabled ? 1.02 : 1 }}
                    whileTap={{ scale: option.enabled ? 0.98 : 1 }}
                    className={`
                      relative overflow-hidden
                      w-full p-6 rounded-2xl
                      bg-gradient-to-r ${option.color}
                      text-left text-white
                      shadow-lg ${option.shadowColor}
                      transition-all duration-300
                      ${option.enabled 
                        ? 'cursor-pointer hover:shadow-xl' 
                        : 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                          <Icon className="text-2xl" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold mb-1">{option.title}</h4>
                          <p className="text-white/80 text-sm">{option.subtitle}</p>
                        </div>
                      </div>
                      <FaChevronRight className="text-2xl text-white/50" />
                    </div>
                    
                    {/* Efecto de brillo al hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Opciones futuras */}
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Próximamente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {futureOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className="relative w-full p-5 rounded-xl bg-gray-800/50 border border-gray-700 border-dashed"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center">
                        <Icon className="text-xl text-gray-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-500 mb-1">{option.title}</h4>
                        <p className="text-gray-600 text-sm">{option.subtitle}</p>
                      </div>
                    </div>
                    <span className="absolute top-2 right-2 text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                      Próximamente
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Info de conexión */}
          <motion.div variants={itemVariants} className="mt-8">
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs">
                Las Gambusinas &copy; {new Date().getFullYear()} | Sistema de Cocina v2.1
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Modal de selección de vista */}
      <AnimatePresence>
        {showViewSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Seleccionar Vista</h3>
                  <p className="text-gray-400 text-sm mt-1">Elige cómo quieres ver las comandas</p>
                </div>
                <button
                  onClick={() => setShowViewSelector(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Opciones de vista */}
              <div className="space-y-3">
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  const isCurrentView = viewMode === option.id;
                  const isDisabled = option.disabled;
                  
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => !isDisabled && handleNavigateToCocina(option.id)}
                      disabled={isDisabled}
                      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                      className={`
                        w-full p-4 rounded-xl text-left transition-all
                        ${isDisabled 
                          ? 'bg-gray-800/50 opacity-60 cursor-not-allowed' 
                          : isCurrentView
                            ? `bg-gradient-to-r ${option.color} cursor-pointer ring-2 ring-white/30`
                            : `bg-gray-800 hover:bg-gray-700 cursor-pointer`}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          ${isDisabled 
                            ? 'bg-gray-700' 
                            : isCurrentView 
                              ? 'bg-white/20' 
                              : `bg-gradient-to-r ${option.color}`}
                        `}>
                          <Icon className={`text-xl ${isDisabled ? 'text-gray-500' : 'text-white'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-bold ${isDisabled ? 'text-gray-500' : 'text-white'}`}>
                              {option.title}
                            </h4>
                            {option.badge && (
                              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white">
                                {option.badge}
                              </span>
                            )}
                            {isCurrentView && !isDisabled && (
                              <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full text-white">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${isDisabled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {option.subtitle}
                          </p>
                          <p className={`text-xs mt-1 ${isDisabled ? 'text-gray-600' : 'text-gray-500'}`}>
                            {option.description}
                          </p>
                        </div>
                        {!isDisabled && (
                          <FaChevronRight className="text-gray-400" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Info adicional si tiene zonas */}
              {tieneZonas && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs mb-2">Tus zonas asignadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {zonasActivas.map((zona) => (
                      <span
                        key={zona._id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: `${zona.color || '#d4af37'}20`,
                          color: 'white',
                          borderLeft: `3px solid ${zona.color || '#d4af37'}`
                        }}
                      >
                        {getZonaIcon(zona.icono)} {zona.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje si no tiene configuración */}
              {!tieneConfiguracion && !configLoading && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <p className="text-blue-300 text-xs">
                    💡 No tienes configuración personalizada. La Vista General te mostrará todas las comandas del día.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
