/**
 * Configuración de API para App Cocina
 * Permite configurar la URL del backend desde la UI sin necesidad de recompilar
 */

const CONFIG_KEY = 'kdsConfig';
const DEFAULT_API_URL = 'http://192.168.18.127:3000/api/comanda';

/**
 * Obtiene la URL del API desde localStorage o usa el valor por defecto
 * PRIORIDAD: localStorage > REACT_APP_API_COMANDA > DEFAULT
 * @returns {string} URL completa del API
 */
export const getApiUrl = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.apiUrl && config.apiUrl.trim() !== '') {
        // Asegurar que la URL termine correctamente
        let url = config.apiUrl.trim();
        // Si no termina con /api/comanda, agregarlo
        if (!url.includes('/api/comanda')) {
          // Si termina con /, quitar el /
          if (url.endsWith('/')) {
            url = url.slice(0, -1);
          }
          // Agregar /api/comanda si no está presente
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
  
  // Fallback a variable de entorno (si existe) o valor por defecto
  // NOTA: process.env.REACT_APP_API_COMANDA solo está disponible en tiempo de compilación
  const envUrl = process.env.REACT_APP_API_COMANDA;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  
  return DEFAULT_API_URL;
};

/**
 * Obtiene la URL base del servidor (sin /api/comanda) para Socket.io
 * @returns {string} URL base del servidor
 */
export const getServerBaseUrl = () => {
  try {
    const apiUrl = getApiUrl();
    // Remover /api/comanda del final
    let baseUrl = apiUrl.replace(/\/api\/comanda\/?$/, '');
    // Si está vacío, usar el default
    if (!baseUrl || baseUrl.trim() === '') {
      baseUrl = 'http://192.168.18.127:3000';
    }
    return baseUrl;
  } catch (error) {
    console.warn('[apiConfig] Error obteniendo URL base:', error);
    return 'http://192.168.18.127:3000';
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
        const url = config.apiUrl.trim();
        return url.replace(/\/api\/comanda\/?$/, '');
      }
    }
  } catch (error) {
    console.warn('[apiConfig] Error leyendo configuración:', error);
  }
  
  // Fallback a variable de entorno
  const envUrl = process.env.REACT_APP_API_COMANDA;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/api\/comanda\/?$/, '');
  }
  
  return 'http://192.168.18.127:3000';
};

