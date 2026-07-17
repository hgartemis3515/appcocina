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
import ChatFabCocina from './Chat/ChatFabCocina';
import AlertaOverlayCocina from './Alertas/AlertaOverlayCocina';

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
  const { isAuthenticated, loading, isMonitorMode, monitorData, bootstrapMonitor } = useAuth();

  // Determinar la vista inicial basada en el estado de autenticación
  useEffect(() => {
    if (loading) {
      setCurrentView('LOADING');
      return;
    }

    // Modo kiosko (TV): ?modo=kiosk&pantalla=N  ->  Ver Cocina Completo filtrado fijo
    const params = new URLSearchParams(window.location.search);
    const modo = params.get('modo');
    const monitorParam = params.get('pantalla') || params.get('monitor');

    if (modo === 'kiosk' && monitorParam) {
      const numeroPantalla = Number(monitorParam);
      // Token de emparejamiento inicial (query ?setup=TOKEN) se guarda solo una vez
      const setupToken = params.get('setup');
      if (setupToken) {
        localStorage.setItem('cocinaMonitorDeviceToken', setupToken);
        // Limpiar la URL para no exponer el token en el historial del TV
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) { /* noop */ }
      }

      if (isMonitorMode && monitorData?.numeroPantalla === numeroPantalla) {
        // Ya autenticado como monitor -> directo a Ver Cocina Completo
        setCocinaOptions({
          modoFijo: true,
          modoKiosk: true,
          numeroPantalla,
          cocineroIdFijo: monitorData.cocineroId || null
        });
        setCurrentView('VER_COCINA_COMPLETO');
      } else {
        // Intentar bootstrap automatico con device token guardado
        bootstrapMonitor(numeroPantalla).then((res) => {
          if (res?.success) {
            setCocinaOptions({
              modoFijo: true,
              modoKiosk: true,
              numeroPantalla,
              cocineroIdFijo: res.data?.cocineroId || null
            });
            setCurrentView('VER_COCINA_COMPLETO');
          } else {
            // No emparejado o token invalido -> mostrar pantalla de error
            setCurrentView('KIOSK_ERROR');
          }
        });
      }
      return;
    }

    if (isAuthenticated) {
      // Deep link modo fijo: ?monitor=N&vistaId=X&modo=fijo
      // Permite abrir directamente Ver Cocina Personalizado en una TV
      const modoFijo = params.get('modo');
      const monitor = params.get('monitor');
      const vistaIdParam = params.get('vistaId');

      if (modoFijo === 'fijo' && monitor) {
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
  }, [isAuthenticated, loading, isMonitorMode, monitorData, bootstrapMonitor]);

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

  // En cualquier vista autenticada (incluido monitor TV) montamos el overlay de alertas
  // para que las alertas lleguen a las pantallas de cocina aunque el FAB de chat esté oculto.
  const alertasOverlay = <AlertaOverlayCocina />;

  // Vista de Menú (requiere autenticación)
  if (currentView === 'MENU') {
    return (
      <ProtectedRoute onRedirect={handleNotAuthenticated}>
        <MenuPage onNavigate={navigateTo} />
        <ChatFabCocina />
        {alertasOverlay}
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
        <ChatFabCocina />
        {alertasOverlay}
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
        <ChatFabCocina />
        {alertasOverlay}
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
        <ChatFabCocina />
        {alertasOverlay}
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
          cocineroIdFijo={cocinaOptions?.cocineroIdFijo || null}
        />
        {alertasOverlay}
      </ProtectedRoute>
    );
  }

  // Error de emparejamiento TV (modo kiosk sin token valido)
  if (currentView === 'KIOSK_ERROR') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">📺</div>
          <h1 className="text-2xl font-bold mb-3 text-orange-400">TV no emparejada</h1>
          <p className="text-gray-400 mb-6">
            Esta pantalla no está configurada o su token de dispositivo es inválido.
            Contacte al encargado para emparejarla desde el panel de administración.
          </p>
          <p className="text-sm text-gray-600">
            Reintentar: recargue esta página después de que el encargado genere un nuevo token.
          </p>
        </div>
      </div>
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
        {alertasOverlay}
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
