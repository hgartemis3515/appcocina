import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  KDS_CONFIG_VERSION,
  DEFAULT_KDS_CONFIG,
  STORAGE_KEYS,
  PERFILES_PREDEFINIDOS,
  validarConfiguracion,
  normalizarConfiguracion,
  aplicarPerfil,
  ejecutarLimpieza,
  verificarNecesidadLimpieza,
} from '../config/kdsConfigConstants';

/**
 * ConfigContext - Contexto para gestión centralizada de configuración KDS
 * 
 * Funcionalidades:
 * - Carga automática con migración de versiones
 * - Limpieza automática de estados obsoletos
 * - Sincronización entre pestañas (storage events)
 * - Validación de configuración
 */

const ConfigContext = createContext(null);

/**
 * Proveedor del contexto de configuración
 */
export const ConfigProvider = ({ children }) => {
  // Estado principal de configuración
  const [config, setConfigState] = useState(() => {
    // Intentar cargar configuración guardada
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        // Normalizar para asegurar que todos los campos existan
        return normalizarConfiguracion(parsed);
      }
    } catch (e) {
      console.warn('[ConfigContext] Error cargando configuración guardada:', e);
    }
    return DEFAULT_KDS_CONFIG;
  });

  // Estado de perfil activo
  const [perfilActivo, setPerfilActivoState] = useState(config.perfilActivo || null);

  // Estado para feedback de guardado
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Ref para debounce de guardado
  const saveTimeoutRef = useRef(null);

  /**
   * Ejecuta limpieza automática si es necesaria
   */
  useEffect(() => {
    const verificacion = verificarNecesidadLimpieza();
    
    if (verificacion.necesitaLimpieza) {
      console.log(`[ConfigContext] Limpieza automática necesaria: ${verificacion.razon}`);
      const resultado = ejecutarLimpieza(verificacion.tipo);
      
      if (resultado.limpiado.length > 0) {
        console.log('[ConfigContext] Elementos limpiados:', resultado.limpiado);
      }
      
      // Actualizar versión en localStorage
      localStorage.setItem(STORAGE_KEYS.CONFIG_VERSION, KDS_CONFIG_VERSION);
    }
  }, []);

  /**
   * Guarda la configuración en localStorage con debounce
   */
  const saveConfig = useCallback((newConfig) => {
    // Guardar versión actual
    const configToSave = {
      ...newConfig,
      version: KDS_CONFIG_VERSION,
      ultimaModificacion: new Date().toISOString(),
    };

    // Debounce para evitar escrituras excesivas
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configToSave));
        localStorage.setItem(STORAGE_KEYS.CONFIG_VERSION, KDS_CONFIG_VERSION);
        setLastSaved(new Date());
        console.log('[ConfigContext] Configuración guardada');
      } catch (e) {
        console.error('[ConfigContext] Error guardando configuración:', e);
      } finally {
        setIsSaving(false);
      }
    }, 300);
  }, []);

  /**
   * Actualiza la configuración (parcial o completa)
   */
  const updateConfig = useCallback((updates) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Sincronizar design para compatibilidad
      if (updates.tamanoFuente !== undefined || updates.columnasGrid !== undefined || updates.filasGrid !== undefined) {
        newConfig.design = {
          fontSize: newConfig.tamanoFuente,
          cols: newConfig.columnasGrid,
          rows: newConfig.filasGrid,
        };
      }
      
      // Validar configuración
      const validation = validarConfiguracion(newConfig);
      if (!validation.valid) {
        console.warn('[ConfigContext] Configuración inválida:', validation.errors);
      }
      
      // Si se cambia una opción relevante, quitar perfil activo
      if (perfilActivo && _isOpcionPersonalizada(newConfig, perfilActivo)) {
        newConfig.perfilActivo = null;
        setPerfilActivoState(null);
      } else {
        newConfig.perfilActivo = perfilActivo;
      }
      
      saveConfig(newConfig);
      return newConfig;
    });
  }, [perfilActivo, saveConfig]);

  /**
   * Verifica si una configuración difiere del perfil activo
   */
  const _isOpcionPersonalizada = (configToCheck, perfilId) => {
    const perfil = Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilId);
    if (!perfil) return false;

    // Keys que no cuentan como personalización
    const ignoredKeys = ['version', 'ultimaModificacion', 'perfilActivo', 'design'];
    
    return Object.keys(perfil.config).some(key => {
      if (ignoredKeys.includes(key)) return false;
      return configToCheck[key] !== perfil.config[key];
    });
  };

  /**
   * Aplica un perfil predefinido
   */
  const aplicarPerfilPredefinido = useCallback((perfilId) => {
    const perfil = Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilId);
    
    if (!perfil) {
      console.warn(`[ConfigContext] Perfil no encontrado: ${perfilId}`);
      return false;
    }

    const newConfig = aplicarPerfil(perfilId, config);
    
    setConfigState(newConfig);
    setPerfilActivoState(perfilId);
    saveConfig(newConfig);
    
    console.log(`[ConfigContext] Perfil aplicado: ${perfil.nombre}`);
    return true;
  }, [config, saveConfig]);

  /**
   * Resetea la configuración a valores por defecto
   */
  const resetConfig = useCallback(() => {
    const newConfig = { ...DEFAULT_KDS_CONFIG };
    
    setConfigState(newConfig);
    setPerfilActivoState(null);
    saveConfig(newConfig);
    
    // Limpiar estados locales
    ejecutarLimpieza('manual');
    
    console.log('[ConfigContext] Configuración reseteada a valores por defecto');
    return true;
  }, [saveConfig]);

  /**
   * Obtiene el perfil activo actual
   */
  const getPerfilActivo = useCallback(() => {
    if (!perfilActivo) return null;
    return Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilActivo) || null;
  }, [perfilActivo]);

  // Sincronizar con localStorage en cambios
  useEffect(() => {
    // Escuchar cambios de storage desde otras pestañas
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.CONFIG && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          setConfigState(normalizarConfiguracion(newConfig));
          setPerfilActivoState(newConfig.perfilActivo || null);
          console.log('[ConfigContext] Configuración sincronizada desde otra pestaña');
        } catch (err) {
          console.warn('[ConfigContext] Error sincronizando configuración:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Cleanup del timeout de debounce al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const value = {
    // Estado
    config,
    perfilActivo,
    isSaving,
    lastSaved,
    
    // Acciones
    updateConfig,
    aplicarPerfilPredefinido,
    resetConfig,
    
    // Helpers
    getPerfilActivo,
    
    // Constantes expuestas
    PERFILES: PERFILES_PREDEFINIDOS,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

/**
 * Hook para usar el contexto de configuración
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de un ConfigProvider');
  }
  return context;
};

export default ConfigContext;
