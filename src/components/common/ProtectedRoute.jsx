import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

/**
 * ProtectedRoute - Componente para proteger rutas que requieren autenticación
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente hijo a renderizar si está autenticado
 * @param {Function} props.onRedirect - Callback para redirigir al login
 */
const ProtectedRoute = ({ children, onRedirect }) => {
  const { isAuthenticated, loading } = useAuth();

  // Redirigir al login si no está autenticado (efecto secundario)
  useEffect(() => {
    if (!loading && !isAuthenticated && onRedirect) {
      onRedirect();
    }
  }, [loading, isAuthenticated, onRedirect]);

  // Mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de carga mientras redirige
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, mostrar el contenido
  return children;
};

export default ProtectedRoute;
