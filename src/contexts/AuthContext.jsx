import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getServerBaseUrl } from '../config/apiConfig';
import { registerLogoutCallback } from '../config/apiClient';
import axios from 'axios';

/**
 * Contexto de autenticación para App Cocina
 * 
 * Características de seguridad:
 * - Validación de expiración JWT en frontend
 * - Logout automático por inactividad
 * - Token obtenido solo desde contexto, nunca directamente de localStorage
 * - Integración con apiClient para logout automático en 401
 */

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'cocinaAuth';

// Configuración de seguridad
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000; // 5 minutos antes de expirar
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const INACTIVITY_WARNING_MS = 25 * 60 * 1000; // Advertencia a los 25 minutos

/**
 * Decodifica el payload de un JWT sin validar la firma
 * Solo para lectura de claims (exp, rol, userId, etc.)
 * @param {string} token - JWT
 * @returns {Object|null} Payload decodificado o null si es inválido
 */
const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('[AuthContext] Error decodificando JWT:', error);
    return null;
  }
};

/**
 * Verifica si un token está expirado o próximo a expirar
 * @param {string} token - JWT
 * @returns {Object} { isExpired, willExpireSoon, expiresAt, remainingMs }
 */
const checkTokenExpiry = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return { isExpired: true, willExpireSoon: true, expiresAt: null, remainingMs: 0 };
  }
  
  const expiresAt = payload.exp * 1000; // Convertir a milisegundos
  const now = Date.now();
  const remainingMs = expiresAt - now;
  
  return {
    isExpired: remainingMs <= 0,
    willExpireSoon: remainingMs <= TOKEN_EXPIRY_MARGIN_MS,
    expiresAt,
    remainingMs
  };
};

/**
 * Proveedor de contexto de autenticación
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  
  // Refs para timers
  const expiryCheckIntervalRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const inactivityWarningTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  /**
   * Limpia todos los timers de seguridad
   */
  const clearSecurityTimers = useCallback(() => {
    if (expiryCheckIntervalRef.current) {
      clearInterval(expiryCheckIntervalRef.current);
      expiryCheckIntervalRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (inactivityWarningTimerRef.current) {
      clearTimeout(inactivityWarningTimerRef.current);
      inactivityWarningTimerRef.current = null;
    }
  }, []);

  /**
   * Cierra sesión completamente
   */
  const logout = useCallback(() => {
    clearSecurityTimers();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    setShowInactivityWarning(false);
    console.log('[AuthContext] Sesión cerrada');
  }, [clearSecurityTimers]);

  // Registrar callback de logout en apiClient
  useEffect(() => {
    registerLogoutCallback(logout);
  }, [logout]);

  /**
   * Inicia los timers de seguridad después del login
   */
  const startSecurityTimers = useCallback(() => {
    // Limpiar timers existentes
    clearSecurityTimers();
    
    // Check de expiración cada minuto
    expiryCheckIntervalRef.current = setInterval(() => {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        const expiryStatus = checkTokenExpiry(authData.token);
        
        if (expiryStatus.isExpired) {
          console.warn('[AuthContext] Token expirado, cerrando sesión');
          logout();
        } else if (expiryStatus.willExpireSoon) {
          console.warn(`[AuthContext] Token expira pronto: ${Math.round(expiryStatus.remainingMs / 60000)} minutos restantes`);
        }
      }
    }, 60000); // Cada minuto

    // Timer de inactividad
    inactivityTimerRef.current = setTimeout(() => {
      console.warn('[AuthContext] Sesión expirada por inactividad');
      logout();
    }, INACTIVITY_TIMEOUT_MS);

    // Advertencia de inactividad
    inactivityWarningTimerRef.current = setTimeout(() => {
      setShowInactivityWarning(true);
    }, INACTIVITY_WARNING_MS);
  }, [clearSecurityTimers, logout]);

  /**
   * Reinicia el timer de inactividad cuando hay actividad del usuario
   */
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    
    // Reiniciar timer de inactividad
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      console.warn('[AuthContext] Sesión expirada por inactividad');
      logout();
    }, INACTIVITY_TIMEOUT_MS);

    // Reiniciar timer de advertencia
    if (inactivityWarningTimerRef.current) {
      clearTimeout(inactivityWarningTimerRef.current);
    }
    inactivityWarningTimerRef.current = setTimeout(() => {
      setShowInactivityWarning(true);
    }, INACTIVITY_WARNING_MS);
  }, [logout]);

  /**
   * Extiende la sesión (usado cuando el usuario responde a la advertencia)
   */
  const extendSession = useCallback(() => {
    setShowInactivityWarning(false);
    resetInactivityTimer();
    console.log('[AuthContext] Sesión extendida por actividad del usuario');
  }, [resetInactivityTimer]);

  // Listener de actividad del usuario
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      if (token) {
        resetInactivityTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [token, resetInactivityTimer]);

  // Cargar sesión desde localStorage al iniciar
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          
          // Validar que existan token y usuario
          if (!authData.token || !authData.usuario) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return;
          }
          
          // Validar expiración del token
          const expiryStatus = checkTokenExpiry(authData.token);
          if (expiryStatus.isExpired) {
            console.warn('[AuthContext] Token almacenado está expirado, limpiando');
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return;
          }
          
          setToken(authData.token);
          setUser(authData.usuario);
          
          console.log('[AuthContext] Sesión restaurada:', authData.usuario.name, `(${authData.usuario.rol})`);
          
          if (expiryStatus.willExpireSoon) {
            console.warn(`[AuthContext] Token restaurado expira pronto: ${Math.round(expiryStatus.remainingMs / 60000)} minutos`);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Error al cargar sesión guardada:', err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Iniciar timers de seguridad cuando hay token
  useEffect(() => {
    if (token) {
      startSecurityTimers();
    }
    return () => {
      clearSecurityTimers();
    };
  }, [token, startSecurityTimers, clearSecurityTimers]);

  /**
   * Iniciar sesión con DNI
   * @param {string} dni - DNI del usuario
   * @returns {Promise<{success: boolean, error?: string, usuario?: Object}>}
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

      // Validar que el token tiene estructura válida
      const payload = decodeJwtPayload(newToken);
      if (!payload) {
        throw new Error('Token inválido recibido del servidor');
      }

      // Guardar en localStorage (la expiración real se valida en cada uso)
      const authData = { token: newToken, usuario };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

      // Actualizar estado
      setToken(newToken);
      setUser(usuario);

      console.log('[AuthContext] Login exitoso:', usuario.name, `(${usuario.rol})`);

      return { success: true, usuario };
    } catch (err) {
      console.error('[AuthContext] Error en login:', err);

      let errorMessage = 'Error al conectar con el servidor';

      if (err.response) {
        const { status, data } = err.response;
        // Mensajes normalizados, no exponer data.error directamente
        if (status === 400) {
          errorMessage = 'DNI es requerido';
        } else if (status === 401) {
          errorMessage = 'DNI no registrado';
        } else if (status === 403) {
          errorMessage = 'No tiene permisos para acceder a la App Cocina';
        } else if (status >= 500) {
          errorMessage = 'Error en el servidor. Intente más tarde.';
        } else {
          errorMessage = 'Error al procesar la solicitud';
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

  /**
   * Verificar si el usuario puede realizar acciones sensibles
   * (supervisor o admin)
   */
  const canPerformSensitiveActions = useCallback(() => {
    return hasRole(['supervisor', 'admin']);
  }, [hasRole]);

  /**
   * Obtiene el token para usar en Socket (no exponer directamente)
   */
  const getToken = useCallback(() => token, [token]);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    hasRole,
    canPerformSensitiveActions,
    getToken,
    setError,
    showInactivityWarning,
    extendSession,
    // Información del usuario expuesta convenientemente
    userId: user?._id || user?.id,
    userName: user?.name,
    userRole: user?.rol
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
