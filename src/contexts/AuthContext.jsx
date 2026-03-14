import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getServerBaseUrl } from '../config/apiConfig';

/**
 * Contexto de autenticación para App Cocina
 * Gestiona el estado de sesión, login, logout y validación de token
 */

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'cocinaAuth';

/**
 * Proveedor de contexto de autenticación
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar sesión desde localStorage al iniciar
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          if (authData.token && authData.usuario) {
            // Verificar que el token no haya expirado (los JWT de cocina duran 8h)
            // El backend maneja la validación real, aquí solo hacemos una verificación básica
            setToken(authData.token);
            setUser(authData.usuario);
            console.log('✅ Sesión de cocina restaurada:', authData.usuario.name);
          }
        }
      } catch (err) {
        console.warn('⚠️ Error al cargar sesión guardada:', err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  /**
   * Iniciar sesión con DNI
   * @param {string} dni - DNI del usuario
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const login = useCallback(async (dni) => {
    setError(null);
    setLoading(true);

    try {
      const serverUrl = getServerBaseUrl();
      const response = await axios.post(`${serverUrl}/api/admin/cocina/auth`, { dni }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { token: newToken, usuario } = response.data;

      // Guardar en localStorage
      const authData = { token: newToken, usuario };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

      // Actualizar estado
      setToken(newToken);
      setUser(usuario);

      console.log('✅ Login exitoso:', usuario.name, `(${usuario.rol})`);

      return { success: true, usuario };
    } catch (err) {
      console.error('❌ Error en login:', err);

      let errorMessage = 'Error al conectar con el servidor';

      if (err.response) {
        // Error del servidor
        const { status, data } = err.response;
        if (status === 400) {
          errorMessage = 'DNI es requerido';
        } else if (status === 401) {
          errorMessage = 'DNI no registrado';
        } else if (status === 403) {
          errorMessage = data.error || 'No tiene permisos para acceder a la App Cocina';
        } else {
          errorMessage = data.error || 'Error en el servidor';
        }
      } else if (err.request) {
        errorMessage = 'No se pudo conectar al servidor. Verifique la conexión.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cerrar sesión
   */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    console.log('🔓 Sesión cerrada');
  }, []);

  /**
   * Verificar si el usuario está autenticado
   */
  const isAuthenticated = !!token && !!user;

  /**
   * Verificar si el usuario tiene un rol específico
   * @param {string[]} roles - Array de roles permitidos
   */
  const hasRole = useCallback((roles) => {
    if (!user || !user.rol) return false;
    return roles.includes(user.rol);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    hasRole,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook para usar el contexto de autenticación
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;