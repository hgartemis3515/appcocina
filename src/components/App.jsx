import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import ComandaStyle from './Principal/comandastyle';
import ComandaStylePerso from './Principal/ComandastylePerso';
import ProtectedRoute from './common/ProtectedRoute';
import { FaSpinner } from 'react-icons/fa';

/**
 * Router interno de la App de Cocina
 * Maneja navegación entre vistas: LOGIN | MENU | COCINA | COCINA_PERSONALIZADA
 * 
 * COCINA = Vista General (sin filtros de zonas) - usa Comandastyle.jsx
 * COCINA_PERSONALIZADA = Vista Personalizada (filtrada por zonas) - usa ComandastylePerso.jsx
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
      // Si está autenticado, ir al menú por defecto
      // Si venía de un refresh en cocina, podría restaurarse desde localStorage
      const lastView = localStorage.getItem('cocinaLastView');
      if (lastView === 'COCINA' || lastView === 'COCINA_PERSONALIZADA') {
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
    if (view === 'COCINA' || view === 'COCINA_PERSONALIZADA') {
      localStorage.setItem('cocinaLastView', view);
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
