/**
 * Configuración de API para App Cocina
 * Permite configurar la URL del backend desde la UI sin necesidad de recompilar
 */

const CONFIG_KEY = 'kdsConfig';
const DEFAULT_API_URL = 'http://localhost:3000/api/comanda';
const BACKEND_PORT = 3000;

/**
 * Indica si hay configuración guardada en localStorage (usuario ya configuró)
 */
export const isConfigured = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      return !!(config.apiUrl && config.apiUrl.trim() !== '');
    }
  } catch (_) {}
  return false;
};

/**
 * Obtiene la URL del API
 * PRIORIDAD: localStorage > REACT_APP_IP (si !isConfigured) > REACT_APP_API_COMANDA > DEFAULT (localhost)
 * @returns {string} URL completa del API
 */
export const getApiUrl = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.apiUrl && config.apiUrl.trim() !== '') {
        let url = config.apiUrl.trim();
        if (!url.includes('/api/comanda')) {
          if (url.endsWith('/')) url = url.slice(0, -1);
          if (!url.endsWith('/api/comanda')) {
            url = url.endsWith('/api') ? `${url}/comanda` : `${url}/api/comanda`;
          }
        }
        return url;
      }
    }
  } catch (error) {
    console.warn('[apiConfig] Error leyendo configuración:', error);
  }

  // Fallback prioritario: IP centralizada del .env si no hay config en localStorage
  const envIP = process.env.REACT_APP_IP;
  if (envIP && envIP.trim() !== '') {
    const base = `http://${envIP.trim()}:${BACKEND_PORT}`;
    return `${base}/api/comanda`;
  }

  const envUrl = process.env.REACT_APP_API_COMANDA;
  if (envUrl && envUrl.trim() !== '') return envUrl;

  return DEFAULT_API_URL;
};

/**
 * Obtiene la URL base del servidor (sin /api/comanda) para Socket.io y axios baseURL
 * Misma prioridad que getApiUrl: localStorage > REACT_APP_IP > REACT_APP_API_COMANDA > localhost
 * @returns {string} URL base del servidor
 */
export const getServerBaseUrl = () => {
  try {
    const apiUrl = getApiUrl();
    let baseUrl = apiUrl.replace(/\/api\/comanda\/?$/, '');
    if (!baseUrl || baseUrl.trim() === '') {
      const envIP = process.env.REACT_APP_IP;
      baseUrl = envIP && envIP.trim() ? `http://${envIP.trim()}:${BACKEND_PORT}` : 'http://localhost:3000';
    }
    return baseUrl;
  } catch (error) {
    console.warn('[apiConfig] Error obteniendo URL base:', error);
    const envIP = process.env.REACT_APP_IP;
    return envIP && envIP.trim() ? `http://${envIP.trim()}:${BACKEND_PORT}` : 'http://localhost:3000';
  }
};

/**
 * Guarda la URL del API en la configuración
 * @param {string} apiUrl - URL del API a guardar
 */
export const setApiUrl = (apiUrl) => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    let config = savedConfig ? JSON.parse(savedConfig) : {};
    
    // Normalizar la URL
    let normalizedUrl = apiUrl.trim();
    // Si no termina con /api/comanda, agregarlo
    if (!normalizedUrl.includes('/api/comanda')) {
      if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
      }
      if (!normalizedUrl.endsWith('/api/comanda')) {
        normalizedUrl = normalizedUrl.endsWith('/api') 
          ? `${normalizedUrl}/comanda` 
          : `${normalizedUrl}/api/comanda`;
      }
    }
    
    config.apiUrl = normalizedUrl;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    console.log('[apiConfig] URL guardada:', normalizedUrl);
  } catch (error) {
    console.error('[apiConfig] Error guardando URL:', error);
    throw error;
  }
};

/**
 * Obtiene la URL del API configurada (sin procesar)
 * @returns {string|null} URL del API o null si no está configurada
 */
export const getRawApiUrl = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      return config.apiUrl || null;
    }
  } catch (error) {
    console.warn('[apiConfig] Error leyendo URL raw:', error);
  }
  return null;
};

/**
 * Valida si una URL es válida
 * @param {string} url - URL a validar
 * @returns {boolean} true si la URL es válida
 */
export const isValidUrl = (url) => {
  try {
    if (!url || url.trim() === '') return false;
    // Permitir URLs con o sin protocolo
    const urlToTest = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `http://${url}`;
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
};

/**
 * Formatea una URL para que sea válida (agrega http:// si falta)
 * @param {string} url - URL a formatear
 * @returns {string} URL formateada
 */
export const formatUrl = (url) => {
  if (!url || url.trim() === '') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `http://${trimmed}`;
};

/**
 * Genera el contenido del archivo .env basado en la configuración actual
 * @returns {string} Contenido del archivo .env
 */
export const generateEnvContent = () => {
  const apiUrl = getApiUrl();
  // Extraer la URL base (sin /api/comanda) para el .env
  const baseUrl = apiUrl.replace(/\/api\/comanda\/?$/, '');
  return `REACT_APP_API_COMANDA=${baseUrl}/api/comanda\n`;
};

/**
 * Obtiene la URL base del servidor desde la configuración o .env
 * @returns {string} URL base del servidor (sin /api/comanda)
 */
export const getBaseUrlFromConfig = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.apiUrl && config.apiUrl.trim() !== '') {
        return config.apiUrl.trim().replace(/\/api\/comanda\/?$/, '');
      }
    }
  } catch (error) {
    console.warn('[apiConfig] Error leyendo configuración:', error);
  }

  const envIP = process.env.REACT_APP_IP;
  if (envIP && envIP.trim() !== '') return `http://${envIP.trim()}:${BACKEND_PORT}`;

  const envUrl = process.env.REACT_APP_API_COMANDA;
  if (envUrl && envUrl.trim() !== '') return envUrl.replace(/\/api\/comanda\/?$/, '');

  return 'http://localhost:3000';
};

