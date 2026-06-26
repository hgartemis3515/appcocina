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
 * 
 * Configuración KDS:
 * - Carga automática de configuración del cocinero al autenticarse
 * - Zonas asignadas con filtros de platos/comandas
 * - Sincronización en tiempo real via Socket.io
 */

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'cocinaAuth';
const REMEMBERED_USER_KEY = 'cocinaRememberedUser';
const KDS_CONFIG_KEY = 'cocinaKdsConfig';
const VIEW_MODE_KEY = 'cocinaViewMode';

// Configuración de seguridad
// v2.0: App Cocina usa sesion persistente - sin logout por inactividad
const TOKEN_EXPIRY_MARGIN_MS = 24 * 60 * 60 * 1000; // Renovar 24h antes de expirar
const INACTIVITY_TIMEOUT_MS = null; // Deshabilitado: las TVs no reciben interaccion
const INACTIVITY_WARNING_MS = null; // Deshabilitado

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
 * Guarda el usuario para "Recordarme"
 * @param {string} username - Nombre de usuario
 * @param {string} name - Nombre del usuario
 */
const saveRememberedUser = (username, name) => {
  try {
    const userData = { username, name, savedAt: Date.now() };
    localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(userData));
    console.log('[AuthContext] Usuario guardado para recordar:', name);
  } catch (err) {
    console.warn('[AuthContext] Error guardando usuario recordado:', err);
  }
};

/**
 * Obtiene el usuario recordado
 * @returns {{username: string, name: string} | null}
 */
const getRememberedUser = () => {
  try {
    const stored = localStorage.getItem(REMEMBERED_USER_KEY);
    if (stored) {
      const userData = JSON.parse(stored);
      return userData;
    }
  } catch (err) {
    console.warn('[AuthContext] Error obteniendo usuario recordado:', err);
  }
  return null;
};

/**
 * Limpia el usuario recordado
 */
const clearRememberedUser = () => {
  localStorage.removeItem(REMEMBERED_USER_KEY);
};

/**
 * Proveedor de contexto de autenticación
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [cocineroConfig, setCocineroConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState(null);
  const [zonaActivaId, setZonaActivaId] = useState(null);
  const [viewMode, setViewModeState] = useState(() => {
    // Restaurar desde localStorage o usar 'personalizada' por defecto
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'general' || saved === 'personalizada' ? saved : 'personalizada';
  });
  
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
   * @param {boolean} keepRemembered - Si true, mantiene el usuario recordado
   */
  const logout = useCallback((keepRemembered = true) => {
    clearSecurityTimers();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(KDS_CONFIG_KEY);
    
    // Si no se quiere mantener el recordado, limpiarlo
    if (!keepRemembered) {
      clearRememberedUser();
    }
    
    setToken(null);
    setUser(null);
    setPermisos([]);
    setReglas([]);
    setError(null);
    setShowInactivityWarning(false);
    setCocineroConfig(null);
    setConfigError(null);
    setZonaActivaId(null);
    console.log('[AuthContext] Sesión cerrada');
  }, [clearSecurityTimers]);

  // Registrar callback de logout en apiClient
  useEffect(() => {
    registerLogoutCallback(logout);
  }, [logout]);

  /**
   * Renueva el token JWT silenciosamente vía POST /api/admin/cocina/auth/refresh
   * v2.0: Sesión persistente - evita el cierre de sesión por expiración
   */
  const refreshToken = useCallback(async () => {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!storedAuth) return null;

      const authData = JSON.parse(storedAuth);
      if (!authData.token) return null;

      const serverUrl = getServerBaseUrl();
      const response = await axios.post(
        `${serverUrl}/api/admin/cocina/auth/refresh`,
        {},
        {
          headers: { 'Authorization': `Bearer ${authData.token}` },
          timeout: 10000
        }
      );

      const { token: newToken, usuario } = response.data;
      if (!newToken) {
        console.warn('[AuthContext] Refresh sin nuevo token');
        return null;
      }

      const newAuthData = { token: newToken, usuario };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthData));

      setToken(newToken);
      setUser(usuario);
      setPermisos(usuario.permisos || []);
      setReglas(usuario.reglas || []);

      console.log('[AuthContext] Token renovado exitosamente, sesión persistente activa');
      return newToken;
    } catch (err) {
      console.warn('[AuthContext] Error renovando token (sesión persistente):', err.message);
      // No cerramos sesión - reintentaremos en el próximo ciclo
      return null;
    }
  }, []);

  /**
   * Inicia los timers de seguridad después del login
   * v2.0: Sesión persistente - renueva el token en vez de cerrar sesión
   */
  const startSecurityTimers = useCallback(() => {
    // Limpiar timers existentes
    clearSecurityTimers();

    // Check de expiración cada 10 minutos - renueva silenciosamente
    expiryCheckIntervalRef.current = setInterval(async () => {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          const expiryStatus = checkTokenExpiry(authData.token);

          if (expiryStatus.isExpired || expiryStatus.willExpireSoon) {
            console.log('[AuthContext] Token próximo a expirar o expirado, renovando...');
            await refreshToken();
          }
        } catch (err) {
          console.warn('[AuthContext] Error en check de expiración:', err.message);
        }
      }
    }, 10 * 60 * 1000); // Cada 10 minutos

    // v2.0: Inactividad deshabilitada para App Cocina (TVs sin interacción)
    // No se configuran timers de inactividad ni advertencias
  }, [clearSecurityTimers, refreshToken]);

  /**
   * Reinicia el timer de inactividad cuando hay actividad del usuario
   * v2.0: NO-OP - la inactividad está deshabilitada en App Cocina
   */
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    // v2.0: No se reinicia_timer de inactividad (deshabilitado)
  }, []);

  /**
   * Extiende la sesión (usado cuando el usuario responde a la advertencia)
   * v2.0: NO-OP - no hay advertencia de inactividad en App Cocina
   */
  const extendSession = useCallback(() => {
    setShowInactivityWarning(false);
    console.log('[AuthContext] Sesión extendida');
  }, []);

  // v2.0: Listener de actividad eliminado - no se tracking de inactividad
  // (eliminado el useEffect que reseteaba timers)

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
          setPermisos(authData.usuario.permisos || []);
          setReglas(authData.usuario.reglas || []);

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

  // v2.1: Sincronización multi-ventana (1-8 páginas compartiendo sesión en un PC)
  // Escucha cambios en localStorage para que cuando una ventana hace login/logout
  // o el token se renueva, todas las demás ventanas se actualicen automáticamente.
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== AUTH_STORAGE_KEY) return;

      console.log('[AuthContext] Cambio en localStorage detectado (multi-ventana)', {
        hasNewValue: !!e.newValue,
        hasOldValue: !!e.oldValue
      });

      try {
        if (!e.newValue) {
          // La sesión se eliminó en otra ventana - hacer logout aquí también
          if (token) {
            console.log('[AuthContext] Logout detectado en otra ventana');
            clearSecurityTimers();
            setToken(null);
            setUser(null);
            setPermisos([]);
            setReglas([]);
            setCocineroConfig(null);
          }
        } else {
          // La sesión se actualizó (login o refresh de token en otra ventana)
          const authData = JSON.parse(e.newValue);
          if (authData.token && authData.usuario) {
            const expiryStatus = checkTokenExpiry(authData.token);
            if (!expiryStatus.isExpired) {
              // Solo actualizar si el token es diferente (evita loops)
              if (authData.token !== token) {
                console.log('[AuthContext] Token actualizado desde otra ventana');
                setToken(authData.token);
                setUser(authData.usuario);
                setPermisos(authData.usuario.permisos || []);
                setReglas(authData.usuario.reglas || []);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Error procesando cambio de storage:', err.message);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token, clearSecurityTimers]);

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
   * Iniciar sesión con usuario y contraseña
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña (DNI)
   * @param {boolean} recordar - Si true, guarda el usuario para futuros logins
   * @returns {Promise<{success: boolean, error?: string, usuario?: Object}>}
   */
  const login = useCallback(async (username, password, recordar = false) => {
    setError(null);
    setLoading(true);

    try {
      const serverUrl = getServerBaseUrl();
      const response = await axios.post(`${serverUrl}/api/admin/cocina/auth`, { 
        username, 
        password 
      }, {
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

      // Guardar usuario para "Recordarme" si está activado
      if (recordar) {
        saveRememberedUser(username, usuario.name);
      } else {
        clearRememberedUser();
      }

      // Actualizar estado
      setToken(newToken);
      setUser(usuario);
      setPermisos(usuario.permisos || []);
      setReglas(usuario.reglas || []);

      console.log('[AuthContext] Login exitoso:', usuario.name, `(${usuario.rol})`);

      return { success: true, usuario };
    } catch (err) {
      console.error('[AuthContext] Error en login:', err);

      let errorMessage = 'Error al conectar con el servidor';

      if (err.response) {
        const { status, data } = err.response;
        // Mensajes normalizados, no exponer data.error directamente
        if (status === 400) {
          errorMessage = 'Usuario y contraseña son requeridos';
        } else if (status === 401) {
          errorMessage = 'Credenciales incorrectas';
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
   * Verificar si el usuario tiene un permiso específico
   * @param {string} permiso - ID del permiso a verificar
   */
  const hasPermission = useCallback((permiso) => {
    // Admin tiene todos los permisos
    if (user?.rol === 'admin') return true;
    // Verificar si el permiso está en la lista de permisos del usuario
    return permisos.includes(permiso);
  }, [user, permisos]);

  /**
   * Verifica si el usuario tiene una regla específica activa
   * Las reglas son restricciones de comportamiento (admin no está sujeto a ellas)
   * @param {string} regla - ID de la regla a verificar
   */
  const hasRegla = useCallback((regla) => {
    // Admin no está sujeto a reglas restrictivas
    if (user?.rol === 'admin') return false;
    return reglas.includes(regla);
  }, [user, reglas]);

  /**
   * Verificar si el usuario tiene al menos uno de los permisos especificados
   * @param {string[]} permisosArray - Array de IDs de permisos
   */
  const hasAnyPermission = useCallback((permisosArray) => {
    return permisosArray.some(p => hasPermission(p));
  }, [hasPermission]);

  /**
   * Obtiene el token para usar en Socket (no exponer directamente)
   */
  const getToken = useCallback(() => token, [token]);

  /**
   * Carga la configuración KDS del cocinero desde el backend
   * Incluye zonas asignadas con sus filtros
   * @returns {Promise<Object|null>}
   */
  const loadCocineroConfig = useCallback(async () => {
    console.log('[AuthContext] loadCocineroConfig llamado', { 
      userId: user?.id, 
      userName: user?.name,
      hasToken: !!token 
    });
    
    if (!user?.id || !token) {
      console.warn('[AuthContext] No hay usuario o token para cargar configuración');
      return null;
    }

    setConfigLoading(true);
    setConfigError(null);

    try {
      const serverUrl = getServerBaseUrl();
      const configUrl = `${serverUrl}/api/cocineros/${user.id}/config`;
      
      console.log('[AuthContext] Llamando a:', configUrl);

      // Cargar configuración del cocinero
      const configResponse = await axios.get(configUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('[AuthContext] Respuesta recibida:', {
        status: configResponse.status,
        success: configResponse.data?.success,
        hasData: !!configResponse.data?.data
      });

      let config = {};
      let zonasAsignadas = [];

      if (configResponse.data?.success && configResponse.data?.data) {
        config = configResponse.data.data;
        zonasAsignadas = config.zonasAsignadas || [];
        
        console.log('[AuthContext] Config parseada:', {
          alias: config.aliasCocinero,
          tieneFiltrosPlatos: !!config.filtrosPlatos,
          tieneFiltrosComandas: !!config.filtrosComandas,
          zonasCount: zonasAsignadas.length,
          zonas: zonasAsignadas.map(z => z.nombre)
        });
      } else {
        console.warn('[AuthContext] Respuesta sin datos esperados:', configResponse.data);
      }

      // Intentar cargar zonas adicionales si hay endpoint dedicado
      try {
        const zonasResponse = await axios.get(`${serverUrl}/api/cocineros/${user.id}/zonas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (zonasResponse.data?.success && zonasResponse.data?.data) {
          // Combinar zonas del endpoint dedicado si no vienen en config
          if (zonasResponse.data.data.length > 0 && zonasAsignadas.length === 0) {
            zonasAsignadas = zonasResponse.data.data;
            console.log('[AuthContext] Zonas cargadas de endpoint dedicado:', zonasAsignadas.length);
          }
        }
      } catch (zonasErr) {
        // No es crítico si falla la carga de zonas por separado
        console.log('[AuthContext] Zonas ya incluidas en config o endpoint no disponible:', zonasErr.message);
      }

      // Construir configuración completa
      const fullConfig = {
        ...config,
        zonasAsignadas,
        cocineroId: user.id,
        aliasCocinero: config.aliasCocinero || user.name
      };

      // Restaurar zona activa desde localStorage
      const savedZonaActiva = localStorage.getItem('cocinaZonaActiva');
      if (savedZonaActiva && zonasAsignadas.some(z => z._id === savedZonaActiva)) {
        setZonaActivaId(savedZonaActiva);
        fullConfig.zonaActivaId = savedZonaActiva;
      }

      setCocineroConfig(fullConfig);
      console.log('[AuthContext] Configuración KDS cargada exitosamente:', {
        alias: fullConfig.aliasCocinero,
        zonas: zonasAsignadas.length,
        filtrosPlatos: !!config.filtrosPlatos,
        filtrosComandas: !!config.filtrosComandas
      });

      // Guardar en localStorage para acceso rápido
      localStorage.setItem(KDS_CONFIG_KEY, JSON.stringify(fullConfig));

      return fullConfig;
    } catch (err) {
      console.warn('[AuthContext] Error cargando configuración KDS:', err.message);
      setConfigError('No se pudo cargar la configuración del servidor');

      // Si hay error, intentar cargar configuración guardada
      const savedConfig = localStorage.getItem(KDS_CONFIG_KEY);
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setCocineroConfig(parsed);
          console.log('[AuthContext] Usando configuración guardada en cache');
          return parsed;
        } catch {
          // Si falla el parseo, usar defaults
        }
      }

      // Configuración por defecto
      const defaultConfig = {
        cocineroId: user.id,
        aliasCocinero: user.name,
        filtrosPlatos: { modoInclusion: false, platosPermitidos: [], categoriasPermitidas: [], tiposPermitidos: [] },
        filtrosComandas: { areasPermitidas: [], mesasEspecificas: [], rangoHorario: { inicio: null, fin: null }, soloPrioritarias: false },
        configTableroKDS: { tiempoAmarillo: 15, tiempoRojo: 20, maxTarjetasVisibles: 20, modoAltoVolumen: false, sonidoNotificacion: true, modoNocturno: true, columnasGrid: 5, filasGrid: 1, tamanioFuente: 15 },
        zonasAsignadas: []
      };
      setCocineroConfig(defaultConfig);
      return defaultConfig;
    } finally {
      setConfigLoading(false);
    }
  }, [user, token]);

  /**
   * Actualiza la configuración KDS (para usar cuando se recibe evento de actualización)
   */
  const updateCocineroConfig = useCallback((newConfig) => {
    setCocineroConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem(KDS_CONFIG_KEY, JSON.stringify(updated));
      return updated;
    });
    console.log('[AuthContext] Configuración KDS actualizada');
  }, []);

  /**
   * Cambia la zona activa del cocinero
   * @param {string|null} zonaId - ID de la zona o null para ver todas
   */
  const setZonaActiva = useCallback((zonaId) => {
    setZonaActivaId(zonaId);
    setCocineroConfig(prev => {
      if (!prev) return prev;
      const updated = { ...prev, zonaActivaId: zonaId };
      localStorage.setItem(KDS_CONFIG_KEY, JSON.stringify(updated));
      return updated;
    });

    // Guardar preferencia en localStorage
    if (zonaId) {
      localStorage.setItem('cocinaZonaActiva', zonaId);
    } else {
      localStorage.removeItem('cocinaZonaActiva');
    }

    console.log('[AuthContext] Zona activa cambiada a:', zonaId || 'Todas');
  }, []);

  /**
   * Cambia el modo de vista (general/personalizada)
   * @param {'general'|'personalizada'} mode - Modo de vista
   */
  const setViewMode = useCallback((mode) => {
    if (mode !== 'general' && mode !== 'personalizada') {
      console.warn('[AuthContext] viewMode inválido:', mode);
      return;
    }
    
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
    console.log('[AuthContext] Modo de vista cambiado a:', mode);
  }, []);

  /**
   * Obtiene las zonas asignadas activas
   * @returns {Array} - Lista de zonas activas
   */
  const getZonasActivas = useCallback(() => {
    if (!cocineroConfig?.zonasAsignadas) return [];
    return cocineroConfig.zonasAsignadas.filter(z => z.activo !== false);
  }, [cocineroConfig]);

  // Cargar configuración KDS cuando hay usuario autenticado
  useEffect(() => {
    if (user?.id && token) {
      loadCocineroConfig();
    } else {
      setCocineroConfig(null);
      setConfigError(null);
      setZonaActivaId(null);
      localStorage.removeItem(KDS_CONFIG_KEY);
      localStorage.removeItem('cocinaZonaActiva');
    }
  }, [user?.id, token, loadCocineroConfig]);

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
    hasPermission,
    hasAnyPermission,
    hasRegla,
    getToken,
    setError,
    showInactivityWarning,
    extendSession,
    refreshToken, // v2.0: renovación silenciosa de sesión persistente
    getRememberedUser,
    // Configuración del cocinero
    cocineroConfig,
    configLoading,
    configError,
    loadCocineroConfig,
    updateCocineroConfig,
    // Gestión de zonas
    zonaActivaId,
    setZonaActiva,
    getZonasActivas,
    // Modo de vista (general/personalizada)
    viewMode,
    setViewMode,
    // Información del usuario expuesta convenientemente
    userId: user?._id || user?.id,
    userName: user?.name,
    userRole: user?.rol,
    permisos,
    reglas
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
