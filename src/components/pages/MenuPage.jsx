import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaUtensils, 
  FaCog, 
  FaSignOutAlt, 
  FaChartBar, 
  FaHistory, 
  FaClock,
  FaUserCircle,
  FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

/**
 * MenuPage - Menú principal del App de Cocina
 * Navegación a las diferentes funcionalidades del sistema
 */
const MenuPage = ({ onNavigate }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      logout();
    }
  };

  // Opciones principales del menú
  const mainOptions = [
    {
      id: 'cocina',
      title: 'Ver Comandas',
      subtitle: 'Tablero KDS en tiempo real',
      icon: FaUtensils,
      color: 'from-green-500 to-emerald-600',
      shadowColor: 'shadow-green-500/30',
      action: () => onNavigate('COCINA'),
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
          {/* Bienvenida */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Bienvenido, <span className="text-orange-400">{user?.name || 'Cocinero'}</span>!
            </h2>
            <p className="text-gray-400">Seleccione una opción para continuar</p>
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
                Las Gambusinas &copy; {new Date().getFullYear()} | Sistema de Cocina v2.0
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default MenuPage;
