/**
 * Configuración de API para App Cocina
 * 
 * Características de seguridad:
 * - Lista blanca de hosts permitidos
 * - Validación de protocolo (http/https)
 * - Eliminación de IPs privadas hardcodeadas como default
 */

const CONFIG_KEY = 'kdsConfig';
const BACKEND_PORT = 3000;

// ==========================================
// LISTA BLANCA DE HOSTS PERMITIDOS
// ==========================================
// Solo estos hosts son aceptados para conectar al backend
// Modificar según el entorno de despliegue

const ALLOWED_HOSTS = {
  development: [
    'localhost',
    '127.0.0.1',
    '::1',
    // Agregar IPs de desarrollo local si es necesario
  ],
  production: [
    // Agregar dominio/IP de producción
    // Ejemplo: 'api.lasgambusinas.com', '192.168.1.100'
  ]
};

// Obtener entorno actual
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Obtiene la lista de hosts permitidos según el entorno
 * @returns {string[]}
 */
export const getAllowedHosts = () => {
  const envHosts = process.env.REACT_APP_ALLOWED_HOSTS;
  
  // Si hay hosts definidos en .env, usarlos
  if (envHosts) {
    return envHosts.split(',').map(h => h.trim()).filter(Boolean);
  }
  
  // Si no, usar la lista por defecto según entorno
  return isDevelopment 
    ? ALLOWED_HOSTS.development 
    : ALLOWED_HOSTS.production;
};

/**
 * Valida si un host está en la lista blanca
 * @param {string} host - Host a validar
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export const validateHost = (host) => {
  if (!host || typeof host !== 'string') {
    return { allowed: false, reason: 'Host vacío o inválido' };
  }

  const normalizedHost = host.toLowerCase().trim();
  const allowedHosts = getAllowedHosts();
  
  // En desarrollo, permitir cualquier host con advertencia
  if (isDevelopment && allowedHosts.length === 0) {
    console.warn('[apiConfig] Modo desarrollo: permitiendo host sin validación:', normalizedHost);
    return { allowed: true };
  }

  // Verificar contra lista blanca
  const isAllowed = allowedHosts.some(allowed => {
    // Coincidencia exacta
    if (normalizedHost === allowed.toLowerCase()) return true;
    // Coincidencia de subdominio (ej: .lasgambusinas.com)
    if (allowed.startsWith('.') && normalizedHost.endsWith(allowed.toLowerCase())) return true;
    return false;
  });

  if (!isAllowed) {
    return { 
      allowed: false, 
      reason: `Host "${normalizedHost}" no está en la lista de hosts permitidos` 
    };
  }

  return { allowed: true };
};

/**
 * Extrae el host de una URL
 * @param {string} url - URL completa
 * @returns {string|null} Host extraído
 */
const extractHost = (url) => {
  try {
    if (!url) return null;
    
    // Agregar protocolo si no tiene
    let urlToParse = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToParse = `http://${url}`;
    }
    
    const parsed = new URL(urlToParse);
    return parsed.hostname;
  } catch {
    return null;
  }
};

/**
 * Valida si una URL es válida y su host está permitido
 * @param {string} url - URL a validar
 * @returns {Object} { valid: boolean, error?: string, host?: string }
 */
export const validateApiUrl = (url) => {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL es requerida' };
  }

  // Validar formato de URL
  let urlToTest = url.trim();
  if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
    urlToTest = `http://${urlToTest}`;
  }

  try {
    new URL(urlToTest);
  } catch {
    return { valid: false, error: 'Formato de URL inválido' };
  }

  // Extraer y validar host
  const host = extractHost(url);
  if (!host) {
    return { valid: false, error: 'No se pudo extraer el host de la URL' };
  }

  const hostValidation = validateHost(host);
  if (!hostValidation.allowed) {
    return { 
      valid: false, 
      error: hostValidation.reason || 'Host no permitido' 
    };
  }

  return { valid: true, host };
};

/**
 * Obtiene la URL por defecto del servidor
 * Prioriza REACT_APP_IP del .env
 * @returns {string}
 */
const getDefaultServerUrl = () => {
  const envIP = process.env.REACT_APP_IP;
  if (envIP && envIP.trim() !== '') {
    return `http://${envIP.trim()}:${BACKEND_PORT}`;
  }
  // Fallback a localhost solo en desarrollo
  if (isDevelopment) {
    return 'http://localhost:3000';
  }
  // En producción sin REACT_APP_IP, no debería haber default
  console.error('[apiConfig] No hay URL de servidor configurada para producción');
  return '';
};

/**
 * Obtiene la URL del API
 * PRIORIDAD: localStorage > REACT_APP_IP > REACT_APP_API_COMANDA > default
 * @returns {string} URL completa del API
 */
export const getApiUrl = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.apiUrl && config.apiUrl.trim() !== '') {
        let url = config.apiUrl.trim();
        
        // Validar que el host esté permitido
        const validation = validateApiUrl(url);
        if (!validation.valid) {
          console.warn('[apiConfig] URL guardada no válida:', validation.error);
          // Limpiar configuración inválida
          localStorage.removeItem(CONFIG_KEY);
        } else {
          // Normalizar URL
          if (!url.includes('/api/comanda')) {
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/api/comanda')) {
              url = url.endsWith('/api') ? `${url}/comanda` : `${url}/api/comanda`;
            }
          }
          return url;
        }
      }
    }
  } catch (error) {
    console.warn('[apiConfig] Error leyendo configuración:', error);
  }

  // Fallback a variables de entorno
  const envIP = process.env.REACT_APP_IP;
  if (envIP && envIP.trim() !== '') {
    const base = `http://${envIP.trim()}:${BACKEND_PORT}`;
    return `${base}/api/comanda`;
  }

  const envUrl = process.env.REACT_APP_API_COMANDA;
  if (envUrl && envUrl.trim() !== '') return envUrl;

  // Default solo en desarrollo
  if (isDevelopment) {
    return 'http://localhost:3000/api/comanda';
  }

  return '';
};

/**
 * Obtiene la URL base del servidor (sin /api/comanda)
 * @returns {string} URL base del servidor
 */
export const getServerBaseUrl = () => {
  try {
    const apiUrl = getApiUrl();
    if (apiUrl) {
      let baseUrl = apiUrl.replace(/\/api\/comanda\/?$/, '');
      if (baseUrl && baseUrl.trim() !== '') {
        return baseUrl;
      }
    }
  } catch (error) {
    console.warn('[apiConfig] Error obteniendo URL base:', error);
  }

  return getDefaultServerUrl();
};

/**
 * Indica si hay configuración guardada en localStorage
 * @returns {boolean}
 */
export const isConfigured = () => {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      return !!(config.apiUrl && config.apiUrl.trim() !== '');
    }
  } catch {}
  return false;
};

/**
 * Guarda la URL del API en la configuración
 * Valida que el host esté permitido antes de guardar
 * @param {string} apiUrl - URL del API a guardar
 * @returns {Object} { success: boolean, error?: string }
 */
export const setApiUrl = (apiUrl) => {
  // Validar URL y host
  const validation = validateApiUrl(apiUrl);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    let config = savedConfig ? JSON.parse(savedConfig) : {};
    
    // Normalizar la URL
    let normalizedUrl = apiUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `http://${normalizedUrl}`;
    }
    
    // Agregar /api/comanda si no lo tiene
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
    
    return { success: true };
  } catch (error) {
    console.error('[apiConfig] Error guardando URL:', error);
    return { success: false, error: 'Error al guardar la configuración' };
  }
};

/**
 * Obtiene la URL del API configurada (sin procesar)
 * @returns {string|null}
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
 * Valida si una URL tiene formato válido
 * @param {string} url - URL a validar
 * @returns {boolean}
 */
export const isValidUrl = (url) => {
  try {
    if (!url || url.trim() === '') return false;
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
 * Formatea una URL agregando http:// si falta
 * @param {string} url - URL a formatear
 * @returns {string}
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
 * Genera contenido de archivo .env basado en configuración actual
 * @returns {string}
 */
export const generateEnvContent = () => {
  const apiUrl = getApiUrl();
  const baseUrl = apiUrl.replace(/\/api\/comanda\/?$/, '');
  return `REACT_APP_API_COMANDA=${baseUrl}/api/comanda\n`;
};

/**
 * Obtiene la URL base desde configuración o .env
 * @returns {string}
 */
export const getBaseUrlFromConfig = () => {
  return getServerBaseUrl();
};

export default {
  getApiUrl,
  getServerBaseUrl,
  setApiUrl,
  getRawApiUrl,
  isConfigured,
  isValidUrl,
  formatUrl,
  generateEnvContent,
  getBaseUrlFromConfig,
  validateApiUrl,
  validateHost,
  getAllowedHosts
};
