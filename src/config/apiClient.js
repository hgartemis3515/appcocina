/**
 * Cliente HTTP centralizado para App Cocina
 * 
 * Intercepta todas las llamadas REST e inyecta el header Authorization
 * Maneja errores de autenticación (401) globalmente
 * Normaliza errores para no exponer internals del backend
 */

import axios from 'axios';
import { getServerBaseUrl } from './apiConfig';

// Clave para almacenamiento de sesión
const AUTH_STORAGE_KEY = 'cocinaAuth';

// Mensajes de error normalizados para UI
const ERROR_MESSAGES = {
  400: 'Solicitud inválida. Verifique los datos ingresados.',
  401: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'Recurso no encontrado.',
  409: 'Conflicto con el estado actual. Refresque la página.',
  422: 'Datos inválidos. Verifique la información.',
  429: 'Demasiadas solicitudes. Espere un momento.',
  500: 'Error interno del servidor. Intente más tarde.',
  502: 'Servidor no disponible. Verifique conexión.',
  503: 'Servicio temporalmente no disponible.',
  NETWORK: 'No se pudo conectar al servidor. Verifique su conexión.',
  TIMEOUT: 'La solicitud tardó demasiado. Intente nuevamente.',
  UNKNOWN: 'Ocurrió un error inesperado.'
};

// Callback para logout forzado (será registrado por AuthContext)
let logoutCallback = null;

/**
 * Registra el callback de logout para ser llamado en caso de 401
 * @param {Function} callback - Función de logout
 */
export const registerLogoutCallback = (callback) => {
  logoutCallback = callback;
};

/**
 * Obtiene el token del almacenamiento local
 * @returns {string|null}
 */
const getStoredToken = () => {
  try {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      return authData.token || null;
    }
  } catch (error) {
    console.warn('[apiClient] Error leyendo token:', error);
  }
  return null;
};

/**
 * Normaliza el error para mostrar mensaje seguro en UI
 * @param {Error} error - Error original
 * @returns {Object} { message, code, status }
 */
const normalizeError = (error) => {
  // Error de red (sin respuesta)
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return { message: ERROR_MESSAGES.TIMEOUT, code: 'TIMEOUT', status: 0 };
    }
    return { message: ERROR_MESSAGES.NETWORK, code: 'NETWORK_ERROR', status: 0 };
  }

  const { status, data } = error.response;
  
  // Error 401: Sesión expirada o inválida
  if (status === 401) {
    // Disparar logout forzado
    if (logoutCallback) {
      logoutCallback();
    }
    return { message: ERROR_MESSAGES[401], code: 'UNAUTHORIZED', status };
  }

  // Usar mensaje normalizado, no exponer data.error del backend
  const message = ERROR_MESSAGES[status] || ERROR_MESSAGES.UNKNOWN;
  
  return { message, code: `HTTP_${status}`, status };
};

/**
 * Crea la instancia de axios con configuración base
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: getServerBaseUrl(),
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Interceptor de request: inyectar token
  client.interceptors.request.use(
    (config) => {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor de response: normalizar errores
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const normalizedError = normalizeError(error);
      // Adjuntar información normalizada al error original
      error.normalized = normalizedError;
      error.userMessage = normalizedError.message;
      return Promise.reject(error);
    }
  );

  return client;
};

// Instancia singleton del cliente
let apiClientInstance = null;

/**
 * Obtiene la instancia del cliente HTTP
 * Si no existe, la crea
 * @returns {axios.AxiosInstance}
 */
export const getApiClient = () => {
  if (!apiClientInstance) {
    apiClientInstance = createApiClient();
  }
  return apiClientInstance;
};

/**
 * Refresca la instancia del cliente (útil si cambia la URL base)
 */
export const refreshApiClient = () => {
  apiClientInstance = createApiClient();
  return apiClientInstance;
};

/**
 * Helper para peticiones GET con token automático
 * @param {string} endpoint - Ruta del endpoint (ej: '/api/comanda')
 * @param {Object} params - Query params
 * @returns {Promise<Object>}
 */
export const apiGet = async (endpoint, params = {}) => {
  const client = getApiClient();
  const response = await client.get(endpoint, { params });
  return response.data;
};

/**
 * Helper para peticiones POST con token automático
 * @param {string} endpoint - Ruta del endpoint
 * @param {Object} data - Body de la petición
 * @returns {Promise<Object>}
 */
export const apiPost = async (endpoint, data = {}) => {
  const client = getApiClient();
  const response = await client.post(endpoint, data);
  return response.data;
};

/**
 * Helper para peticiones PUT con token automático
 * @param {string} endpoint - Ruta del endpoint
 * @param {Object} data - Body de la petición
 * @returns {Promise<Object>}
 */
export const apiPut = async (endpoint, data = {}) => {
  const client = getApiClient();
  const response = await client.put(endpoint, data);
  return response.data;
};

/**
 * Helper para peticiones DELETE con token automático
 * @param {string} endpoint - Ruta del endpoint
 * @returns {Promise<Object>}
 */
export const apiDelete = async (endpoint) => {
  const client = getApiClient();
  const response = await client.delete(endpoint);
  return response.data;
};

export default {
  getApiClient,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  registerLogoutCallback,
  refreshApiClient,
  ERROR_MESSAGES
};
