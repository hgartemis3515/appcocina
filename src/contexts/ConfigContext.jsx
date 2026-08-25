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
import {
  snapshotPerfilVista,
  aplicarSnapshotVista,
  sanitizarNombrePerfil,
  nombrePerfilDisponible,
  mapPerfilVistaDesdeApi,
  perfilVistaDifiere,
  TIPO_PERFIL_TABLAS_KDS,
} from '../utils/kdsPerfilesVista';
import { syncKdsNotificationSound } from '../utils/kdsNotificationSounds';
import { apiGet, apiPost, apiPut, apiDelete } from '../config/apiClient';

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
  const [perfilesVista, setPerfilesVista] = useState([]);
  const perfilesVistaRef = useRef(perfilesVista);
  const [cargandoPerfilesVista, setCargandoPerfilesVista] = useState(false);
  const [guardandoPerfilVista, setGuardandoPerfilVista] = useState(false);

  // Estado para feedback de guardado
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Ref para debounce de guardado
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    perfilesVistaRef.current = perfilesVista;
  }, [perfilesVista]);

  useEffect(() => {
    syncKdsNotificationSound(config);
  }, [config.soundEnabled, config.timbreClave, config.timbreVolumen]);

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
    const preset = Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilId);
    if (preset) {
      const ignoredKeys = ['version', 'ultimaModificacion', 'perfilActivo', 'design'];
      return Object.keys(preset.config).some(key => {
        if (ignoredKeys.includes(key)) return false;
        return configToCheck[key] !== preset.config[key];
      });
    }
    const custom = perfilesVistaRef.current.find(p => p.id === perfilId);
    if (!custom) return false;
    return perfilVistaDifiere(configToCheck, custom.config);
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
   * Carga un perfil de vista (plantilla predefinida o perfil guardado en servidor).
   */
  const cargarPerfilVista = useCallback((perfilId) => {
    if (!perfilId) return false;
    const preset = Object.values(PERFILES_PREDEFINIDOS).find(p => p.id === perfilId);
    if (preset) {
      const newConfig = aplicarPerfil(perfilId, config);
      setConfigState(newConfig);
      setPerfilActivoState(perfilId);
      saveConfig(newConfig);
      return true;
    }
    const custom = perfilesVistaRef.current.find(p => p.id === perfilId);
    if (!custom) return false;
    const merged = aplicarSnapshotVista(config, custom.config);
    const newConfig = {
      ...normalizarConfiguracion(merged),
      perfilActivo: custom.id,
    };
    setConfigState(newConfig);
    setPerfilActivoState(custom.id);
    saveConfig(newConfig);
    return true;
  }, [config, saveConfig]);

  const recargarPerfilesVista = useCallback(async () => {
    setCargandoPerfilesVista(true);
    try {
      const res = await apiGet('/api/perfiles-tablas-kds');
      const lista = (Array.isArray(res?.data) ? res.data : [])
        .map(mapPerfilVistaDesdeApi)
        .filter((p) => p && p.tipo === TIPO_PERFIL_TABLAS_KDS);
      setPerfilesVista(lista);
      return lista;
    } catch (e) {
      console.warn('[ConfigContext] No se pudieron cargar perfiles de tablas KDS', e);
      return perfilesVistaRef.current;
    } finally {
      setCargandoPerfilesVista(false);
    }
  }, []);

  /**
   * Crea un perfil con la vista/alertas actuales (servidor, tipo tablas_kds).
   */
  const crearPerfilVista = useCallback(async (nombreRaw) => {
    const nombre = sanitizarNombrePerfil(nombreRaw);
    if (!nombre) return { ok: false, error: 'Escribe un nombre para el perfil' };
    if (!nombrePerfilDisponible(perfilesVistaRef.current, nombre)) {
      return { ok: false, error: 'Ya existe un perfil con ese nombre' };
    }
    setGuardandoPerfilVista(true);
    try {
      const res = await apiPost('/api/perfiles-tablas-kds', {
        nombre,
        config: snapshotPerfilVista(config),
      });
      const perfil = mapPerfilVistaDesdeApi(res.data);
      await recargarPerfilesVista();
      if (perfil) {
        setPerfilActivoState(perfil.id);
        setConfigState((prev) => {
          const newConfig = { ...prev, perfilActivo: perfil.id };
          saveConfig(newConfig);
          return newConfig;
        });
      }
      return { ok: true, perfil };
    } catch (e) {
      const status = e?.response?.status;
      const msg = status === 409
        ? 'Ya existe un perfil con ese nombre'
        : (e?.response?.data?.error || e?.userMessage || 'No se pudo crear el perfil');
      return { ok: false, error: msg };
    } finally {
      setGuardandoPerfilVista(false);
    }
  }, [config, recargarPerfilesVista, saveConfig]);

  /**
   * Sobrescribe un perfil guardado con la vista actual.
   */
  const sobrescribirPerfilVista = useCallback(async (perfilId) => {
    if (!perfilId) return { ok: false, error: 'Perfil no encontrado' };
    setGuardandoPerfilVista(true);
    try {
      await apiPut(`/api/perfiles-tablas-kds/${perfilId}`, {
        config: snapshotPerfilVista(config),
      });
      await recargarPerfilesVista();
      setPerfilActivoState(perfilId);
      setConfigState((prev) => {
        const newConfig = { ...prev, perfilActivo: perfilId };
        saveConfig(newConfig);
        return newConfig;
      });
      return { ok: true };
    } catch (e) {
      const status = e?.response?.status;
      const msg = status === 404
        ? 'Perfil no encontrado'
        : (e?.response?.data?.error || e?.userMessage || 'No se pudo guardar el perfil');
      return { ok: false, error: msg };
    } finally {
      setGuardandoPerfilVista(false);
    }
  }, [config, recargarPerfilesVista, saveConfig]);

  /**
   * Elimina un perfil guardado (borrado lógico en servidor).
   */
  const eliminarPerfilVista = useCallback(async (perfilId) => {
    if (!perfilId) return { ok: false, error: 'Perfil no encontrado' };
    setGuardandoPerfilVista(true);
    try {
      await apiDelete(`/api/perfiles-tablas-kds/${perfilId}`);
      await recargarPerfilesVista();
      if (perfilActivo === perfilId) {
        setPerfilActivoState(null);
        setConfigState((prev) => {
          const newConfig = { ...prev, perfilActivo: null };
          saveConfig(newConfig);
          return newConfig;
        });
      }
      return { ok: true };
    } catch (e) {
      const status = e?.response?.status;
      const msg = status === 404
        ? 'Perfil no encontrado'
        : (e?.response?.data?.error || e?.userMessage || 'No se pudo eliminar el perfil');
      return { ok: false, error: msg };
    } finally {
      setGuardandoPerfilVista(false);
    }
  }, [perfilActivo, recargarPerfilesVista, saveConfig]);

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
    perfilesVista,
    cargandoPerfilesVista,
    guardandoPerfilVista,
    isSaving,
    lastSaved,
    
    // Acciones
    updateConfig,
    aplicarPerfilPredefinido,
    cargarPerfilVista,
    recargarPerfilesVista,
    crearPerfilVista,
    sobrescribirPerfilVista,
    eliminarPerfilVista,
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
