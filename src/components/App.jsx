import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import TicketsPpaPage from './pages/TicketsPpaPage';
import ComandaStyle from './Principal/comandastyle';
import ComandaStylePerso from './Principal/ComandastylePerso';
import ComandaStyleSupervi from './Principal/ComandaStyleSupervi';
import CocinaMonitorCompleto from './monitor/CocinaMonitorCompleto';
import CocinaMonitorPersonalizado from './monitor/CocinaMonitorPersonalizado';
import DesplegarMonitoresPage from './pages/DesplegarMonitoresPage';
import ProtectedRoute from './common/ProtectedRoute';
import { FaSpinner } from 'react-icons/fa';

/**
 * Router interno de la App de Cocina
 * Maneja navegación entre vistas: LOGIN | MENU | COCINA | COCINA_PERSONALIZADA | COCINA_SUPERVISOR | TICKETS_PPA
 * 
 * COCINA = Vista General (sin filtros de zonas) - usa Comandastyle.jsx
 * COCINA_PERSONALIZADA = Vista Personalizada (filtrada por zonas) - usa ComandastylePerso.jsx
 * COCINA_SUPERVISOR = Vista Supervisor (asigna cocineros) - usa ComandaStyleSupervi.jsx
 */
const AppRouter = () => {
  const [currentView, setCurrentView] = useState('LOADING');
  const [cocinaOptions, setCocinaOptions] = useState(null);
  const { isAuthenticated, loading } = useAuth();

  // Determinar la vista inicial basada en el estado de autenticación
  useEffect(() => {
    if (loading) {
      setCurrentView('LOADING');
    } else if (isAuthenticated) {
      // Deep link modo fijo: ?monitor=N&vistaId=X&modo=fijo
      // Permite abrir directamente Ver Cocina Personalizado en una TV
      const params = new URLSearchParams(window.location.search);
      const modo = params.get('modo');
      const monitor = params.get('monitor');
      const vistaIdParam = params.get('vistaId');

      if (modo === 'fijo' && monitor) {
        // Modo fijo para TV - va directo al monitor personalizado
        setCocinaOptions({ modoFijo: true, monitor, vistaId: vistaIdParam });
        setCurrentView('VER_COCINA_PERSONALIZADO');
        return;
      }

      // Si está autenticado, ir al menú por defecto
      // Si venía de un refresh en cocina, podría restaurarse desde localStorage
      const lastView = localStorage.getItem('cocinaLastView');
      if (lastView === 'COCINA' || lastView === 'COCINA_PERSONALIZADA' || lastView === 'COCINA_SUPERVISOR'
          || lastView === 'VER_COCINA_COMPLETO' || lastView === 'VER_COCINA_PERSONALIZADO') {
        setCurrentView(lastView);
        localStorage.removeItem('cocinaLastView');
      } else {
        setCurrentView('MENU');
      }
    } else {
      setCurrentView('LOGIN');
    }
  }, [isAuthenticated, loading]);

  // Función de navegación centralizada
  const navigateTo = useCallback((view, options = null) => {
    console.log('🔄 Navegando a:', view, options ? 'con opciones' : '');
    
    // Guardar última vista para restaurar en refresh
    if (['COCINA', 'COCINA_PERSONALIZADA', 'COCINA_SUPERVISOR',
         'VER_COCINA_COMPLETO', 'VER_COCINA_PERSONALIZADO'].includes(view)) {
      // No persistir si está en modo fijo (TVs no deben volver al monitor al refrescar)
      if (!cocinaOptions?.modoFijo) {
        localStorage.setItem('cocinaLastView', view);
      }
    } else {
      localStorage.removeItem('cocinaLastView');
    }

    setCocinaOptions(options);
    setCurrentView(view);
  }, []);

  // Función para volver al menú desde cocina
  const goToMenu = useCallback(() => {
    localStorage.removeItem('cocinaLastView');
    setCocinaOptions(null);
    setCurrentView('MENU');
  }, []);

  // Handler para cuando el usuario no está autenticado
  const handleNotAuthenticated = useCallback(() => {
    setCurrentView('LOGIN');
  }, []);

  // Pantalla de carga inicial
  if (currentView === 'LOADING') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Iniciando sistema...</p>
        </div>
      </div>
    );
  }

  // Vista de Login (sin protección)
  if (currentView === 'LOGIN') {
    return <LoginPage />;
  }

  // Vista de Menú (requiere autenticación)
  if (currentView === 'MENU') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <MenuPage onNavigate={navigateTo} />
      </ProtectedRoute>
    );
  }

  // Vista de Cocina (requiere autenticación)
  if (currentView === 'COCINA') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <ComandaStyle 
          onGoToMenu={goToMenu} 
          initialOptions={cocinaOptions}
        />
      </ProtectedRoute>
    );
  }

  // Vista de Cocina Personalizada (requiere autenticación)
  // Usa ComandastylePerso.jsx con filtros de zonas
  if (currentView === 'COCINA_PERSONALIZADA') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <ComandaStylePerso 
          onGoToMenu={goToMenu} 
          initialOptions={cocinaOptions}
        />
      </ProtectedRoute>
    );
  }

  // Vista de Supervisor (requiere autenticación + rol supervisor/admin)
  // Usa ComandaStyleSupervi.jsx con capacidad de asignar cocineros
  if (currentView === 'COCINA_SUPERVISOR') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <ComandaStyleSupervi 
          onGoToMenu={goToMenu} 
          initialOptions={cocinaOptions}
        />
      </ProtectedRoute>
    );
  }

  // Vista de Tickets PPA (requiere autenticación)
  if (currentView === 'TICKETS_PPA') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <TicketsPpaPage onGoToMenu={goToMenu} />
      </ProtectedRoute>
    );
  }

  // Ver Cocina Completo - monitor pasivo (solo lectura)
  if (currentView === 'VER_COCINA_COMPLETO') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <CocinaMonitorCompleto
          onGoToMenu={goToMenu}
          modoFijo={cocinaOptions?.modoFijo || false}
        />
      </ProtectedRoute>
    );
  }

  // Ver Cocina Personalizado - monitor pasivo filtrado por Vista de Cocina
  if (currentView === 'VER_COCINA_PERSONALIZADO') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <CocinaMonitorPersonalizado
          onGoToMenu={goToMenu}
          modoFijo={cocinaOptions?.modoFijo || false}
          vistaIdInicial={cocinaOptions?.vistaId || null}
        />
      </ProtectedRoute>
    );
  }

  // Desplegar Monitores - consola para abrir las 8 TVs
  if (currentView === 'DESPLEGAR_MONITORES') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <DesplegarMonitoresPage onGoToMenu={goToMenu} />
      </ProtectedRoute>
    );
  }

  // Fallback
  return <LoginPage />;
};

/**
 * App principal con AuthProvider y ConfigProvider
 * 
 * ConfigProvider gestiona la configuración del KDS incluyendo:
 * - Opciones de vista y diseño
 * - Limpieza automática de estados locales
 */
const App = () => {
  return (
    <AuthProvider>
      <ConfigProvider>
        <AppRouter />
      </ConfigProvider>
    </AuthProvider>
  );
};

export default App;
