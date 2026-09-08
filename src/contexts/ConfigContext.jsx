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
  leerPerfilesVista,
  guardarPerfilesVista,
  mergePerfilesVista,
  esIdPerfilLocal,
  nuevoIdPerfilLocal,
  TIPO_PERFIL_TABLAS_KDS,
} from '../utils/kdsPerfilesVista';
import { syncKdsNotificationSound } from '../utils/kdsNotificationSounds';
import { apiGet, apiPost, apiPut, apiDelete } from '../config/apiClient';
import { useAuth } from './AuthContext';
import {
  claveConfigKdsUsuario,
  idUsuarioCocina,
  sanitizarIdPerfilTablasKds,
  leerConfigKdsInicial,
  leerConfigKdsUsuario,
  persistirSnapshotKdsUsuario,
  construirConfigDesdePerfilTablasKds,
} from '../utils/kdsPerfilPorUsuario';

/**
 * ConfigContext - Contexto para gestión centralizada de configuración KDS
 * 
 * Funcionalidades:
 * - Carga automática con migración de versiones
 * - Perfil de tablas KDS por cuenta (no se comparte al cambiar usuario en el mismo dispositivo)
 * - Limpieza automática de estados obsoletos
 * - Sincronización entre pestañas (storage events)
 * - Validación de configuración
 */

const ConfigContext = createContext(null);

/**
 * Proveedor del contexto de configuración
 */
export const ConfigProvider = ({ children }) => {
  const { user, cocineroConfig, configLoading, configError, isMonitorMode } = useAuth();

  // Estado principal de configuración (por usuario de la sesión, no global del dispositivo)
  const [config, setConfigState] = useState(() => {
    try {
      const savedConfig = leerConfigKdsInicial();
      if (savedConfig) {
        return normalizarConfiguracion(savedConfig);
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
  const usuarioKdsRef = useRef(idUsuarioCocina(user));
  const listoUsuarioKdsRef = useRef('');
  const ultimoPerfilServidorRef = useRef('');

  useEffect(() => {
    perfilesVistaRef.current = perfilesVista;
  }, [perfilesVista]);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    syncKdsNotificationSound(config);
  }, [
    config.soundEnabled,
    config.timbreClave,
    config.timbreVolumen,
    config.sonidoNuevaComanda,
    config.sonidoFinalizar,
    config.sonidoEntregar,
    config.timbreFinalizarClave,
    config.timbreEntregarClave,
  ]);

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
  const escribirConfigLocal = useCallback((configToSave) => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configToSave));
    localStorage.setItem(STORAGE_KEYS.CONFIG_VERSION, KDS_CONFIG_VERSION);
    const uid = usuarioKdsRef.current;
    if (uid) persistirSnapshotKdsUsuario(uid, configToSave);
  }, []);

  const saveConfig = useCallback((newConfig) => {
    const configToSave = {
      ...newConfig,
      version: KDS_CONFIG_VERSION,
      ultimaModificacion: new Date().toISOString(),
    };
    configRef.current = configToSave;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      try {
        escribirConfigLocal(configRef.current);
        setLastSaved(new Date());
        console.log('[ConfigContext] Configuración guardada');
      } catch (e) {
        console.error('[ConfigContext] Error guardando configuración:', e);
      } finally {
        setIsSaving(false);
      }
    }, 300);
  }, [escribirConfigLocal]);

  /**
   * Escribe kdsConfig en localStorage ya (sin esperar el debounce).
   * Funciona con el backend apagado.
   */
  const persistConfigNow = useCallback((cfg) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const configToSave = {
      ...(cfg || configRef.current),
      version: KDS_CONFIG_VERSION,
      ultimaModificacion: new Date().toISOString(),
    };
    configRef.current = configToSave;
    try {
      escribirConfigLocal(configToSave);
      setLastSaved(new Date());
      setIsSaving(false);
      return true;
    } catch (e) {
      console.error('[ConfigContext] Error guardando configuración:', e);
      setIsSaving(false);
      return false;
    }
  }, [escribirConfigLocal]);

  const persistirPerfilTablasKdsEnServidor = useCallback((userId, perfilId) => {
    const uid = String(userId || '').trim();
    if (!uid) return;
    const limpio = sanitizarIdPerfilTablasKds(perfilId);
    const key = `${uid}:${limpio || ''}`;
    if (ultimoPerfilServidorRef.current === key) return;
    ultimoPerfilServidorRef.current = key;
    apiPut(`/api/cocineros/${uid}/config`, { perfilTablasKdsId: limpio }).catch(() => {});
  }, []);

  const aplicarConfigUsuario = useCallback((cfg, { persistirServidor = false } = {}) => {
    const next = normalizarConfiguracion(cfg || DEFAULT_KDS_CONFIG);
    setConfigState(next);
    setPerfilActivoState(next.perfilActivo || null);
    persistConfigNow(next);
    if (persistirServidor) {
      persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, next.perfilActivo);
    }
  }, [persistConfigNow, persistirPerfilTablasKdsEnServidor]);

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
    persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfilId);
    
    console.log(`[ConfigContext] Perfil aplicado: ${perfil.nombre}`);
    return true;
  }, [config, saveConfig, persistirPerfilTablasKdsEnServidor]);

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
      persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfilId);
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
    persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, custom.id);
    return true;
  }, [config, saveConfig, persistirPerfilTablasKdsEnServidor]);

  const recargarPerfilesVista = useCallback(async () => {
    setCargandoPerfilesVista(true);
    const locales = leerPerfilesVista();
    try {
      const res = await apiGet('/api/perfiles-tablas-kds');
      const servidor = (Array.isArray(res?.data) ? res.data : [])
        .map(mapPerfilVistaDesdeApi)
        .filter((p) => p && p.tipo === TIPO_PERFIL_TABLAS_KDS);
      const lista = mergePerfilesVista(locales, servidor);
      guardarPerfilesVista(lista);
      setPerfilesVista(lista);
      return lista;
    } catch (e) {
      console.warn('[ConfigContext] Servidor no disponible; perfiles desde este dispositivo', e);
      setPerfilesVista(locales);
      return locales;
    } finally {
      setCargandoPerfilesVista(false);
    }
  }, []);

  const perfilTablasKdsIdServidor = cocineroConfig?.perfilTablasKdsId;
  const tieneConfigCocinero = !!cocineroConfig;

  /**
   * Al cambiar de cuenta en este dispositivo, guarda el snapshot del usuario anterior
   * y restaura el perfil de tablas KDS de quien entra.
   */
  useEffect(() => {
    const userId = idUsuarioCocina(user);
    const prev = usuarioKdsRef.current;
    const cambioUsuario = prev !== userId;

    if (cambioUsuario && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      setIsSaving(false);
    }

    if (cambioUsuario && prev && configRef.current) {
      persistirSnapshotKdsUsuario(prev, configRef.current);
    }

    if (cambioUsuario) {
      listoUsuarioKdsRef.current = '';
      ultimoPerfilServidorRef.current = '';
    }
    usuarioKdsRef.current = userId || '';

    if (!userId) return;
    if (listoUsuarioKdsRef.current === userId) return;

    const saved = leerConfigKdsUsuario(userId);
    if (saved) {
      aplicarConfigUsuario(saved, { persistirServidor: true });
      listoUsuarioKdsRef.current = userId;
      recargarPerfilesVista();
      return;
    }

    if (isMonitorMode) {
      listoUsuarioKdsRef.current = userId || 'monitor';
      return;
    }

    if (configLoading) return;
    if (!tieneConfigCocinero && !configError) return;

    let cancelled = false;
    (async () => {
      const lista = await recargarPerfilesVista();
      if (cancelled || usuarioKdsRef.current !== userId) return;
      const serverId = sanitizarIdPerfilTablasKds(perfilTablasKdsIdServidor);
      if (serverId) {
        aplicarConfigUsuario(construirConfigDesdePerfilTablasKds(serverId, lista), {
          persistirServidor: false,
        });
      } else {
        aplicarConfigUsuario({ ...DEFAULT_KDS_CONFIG });
      }
      listoUsuarioKdsRef.current = userId;
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    user?._id,
    isMonitorMode,
    configLoading,
    tieneConfigCocinero,
    perfilTablasKdsIdServidor,
    configError,
    aplicarConfigUsuario,
    recargarPerfilesVista,
  ]);

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
    const snap = snapshotPerfilVista(configRef.current);
    const perfilLocal = {
      id: nuevoIdPerfilLocal(),
      nombre,
      tipo: TIPO_PERFIL_TABLAS_KDS,
      config: snap,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const listaLocal = [...perfilesVistaRef.current, perfilLocal];
    guardarPerfilesVista(listaLocal);
    setPerfilesVista(listaLocal);
    setPerfilActivoState(perfilLocal.id);
    setConfigState((prev) => {
      const newConfig = { ...prev, perfilActivo: perfilLocal.id };
      persistConfigNow(newConfig);
      return newConfig;
    });
    try {
      const res = await apiPost('/api/perfiles-tablas-kds', { nombre, config: snap });
      const perfil = mapPerfilVistaDesdeApi(res.data);
      if (perfil) {
        const lista = mergePerfilesVista(
          listaLocal.filter((p) => p.id !== perfilLocal.id),
          [perfil]
        );
        guardarPerfilesVista(lista);
        setPerfilesVista(lista);
        setPerfilActivoState(perfil.id);
        setConfigState((prev) => {
          const newConfig = { ...prev, perfilActivo: perfil.id };
          persistConfigNow(newConfig);
          persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfil.id);
          return newConfig;
        });
        return { ok: true, perfil, localOnly: false };
      }
      persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfilLocal.id);
      return { ok: true, perfil: perfilLocal, localOnly: true };
    } catch (e) {
      persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfilLocal.id);
      return { ok: true, perfil: perfilLocal, localOnly: true };
    } finally {
      setGuardandoPerfilVista(false);
    }
  }, [persistConfigNow, persistirPerfilTablasKdsEnServidor]);

  /**
   * Sobrescribe un perfil guardado con la vista actual.
   */
  const sobrescribirPerfilVista = useCallback(async (perfilId) => {
    if (!perfilId) return { ok: false, error: 'Perfil no encontrado' };
    const actual = perfilesVistaRef.current.find((p) => p.id === perfilId);
    if (!actual) return { ok: false, error: 'Perfil no encontrado' };
    setGuardandoPerfilVista(true);
    const snap = snapshotPerfilVista(configRef.current);
    const actualizado = {
      ...actual,
      tipo: TIPO_PERFIL_TABLAS_KDS,
      config: snap,
      updatedAt: new Date().toISOString(),
    };
    const listaLocal = perfilesVistaRef.current.map((p) => (p.id === perfilId ? actualizado : p));
    guardarPerfilesVista(listaLocal);
    setPerfilesVista(listaLocal);
    setPerfilActivoState(perfilId);
    setConfigState((prev) => {
      const newConfig = { ...prev, perfilActivo: perfilId };
      persistConfigNow(newConfig);
      return newConfig;
    });
    try {
      if (esIdPerfilLocal(perfilId)) {
        const res = await apiPost('/api/perfiles-tablas-kds', {
          nombre: actual.nombre,
          config: snap,
        });
        const perfil = mapPerfilVistaDesdeApi(res.data);
        if (perfil) {
          const lista = mergePerfilesVista(
            listaLocal.filter((p) => p.id !== perfilId),
            [perfil]
          );
          guardarPerfilesVista(lista);
          setPerfilesVista(lista);
          setPerfilActivoState(perfil.id);
          setConfigState((prev) => {
            const newConfig = { ...prev, perfilActivo: perfil.id };
            persistConfigNow(newConfig);
            persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfil.id);
            return newConfig;
          });
        }
        return { ok: true, localOnly: false };
      }
      await apiPut(`/api/perfiles-tablas-kds/${perfilId}`, { config: snap });
      persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, perfilId);
      return { ok: true, localOnly: false };
    } catch (e) {
      return { ok: true, localOnly: true };
    } finally {
      setGuardandoPerfilVista(false);
    }
  }, [persistConfigNow, persistirPerfilTablasKdsEnServidor]);

  /**
   * Elimina un perfil guardado (borrado lógico en servidor).
   */
  const eliminarPerfilVista = useCallback(async (perfilId) => {
    if (!perfilId) return { ok: false, error: 'Perfil no encontrado' };
    setGuardandoPerfilVista(true);
    const listaLocal = perfilesVistaRef.current.filter((p) => p.id !== perfilId);
    guardarPerfilesVista(listaLocal);
    setPerfilesVista(listaLocal);
    if (perfilActivo === perfilId) {
      setPerfilActivoState(null);
      setConfigState((prev) => {
        const newConfig = { ...prev, perfilActivo: null };
        persistConfigNow(newConfig);
        persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, null);
        return newConfig;
      });
    }
    try {
      if (!esIdPerfilLocal(perfilId)) {
        await apiDelete(`/api/perfiles-tablas-kds/${perfilId}`);
      }
      return { ok: true };
    } catch (e) {
      return { ok: true, localOnly: true };
    } finally {
      setGuardandoPerfilVista(false);
    }
  }, [perfilActivo, persistConfigNow, persistirPerfilTablasKdsEnServidor]);

  /**
   * Resetea la configuración a valores por defecto
   */
  const resetConfig = useCallback(() => {
    const newConfig = { ...DEFAULT_KDS_CONFIG };
    
    setConfigState(newConfig);
    setPerfilActivoState(null);
    saveConfig(newConfig);
    persistirPerfilTablasKdsEnServidor(usuarioKdsRef.current, null);
    
    // Limpiar estados locales
    ejecutarLimpieza('manual');
    
    console.log('[ConfigContext] Configuración reseteada a valores por defecto');
    return true;
  }, [saveConfig, persistirPerfilTablasKdsEnServidor]);

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
      const uid = usuarioKdsRef.current;
      const claveUsuario = uid ? claveConfigKdsUsuario(uid) : '';
      const esClaveDeEsteUsuario = claveUsuario && e.key === claveUsuario;
      const esGlobalSinSesion = !uid && e.key === STORAGE_KEYS.CONFIG;
      if (!esClaveDeEsteUsuario && !esGlobalSinSesion) return;
      if (!e.newValue) return;
      try {
        const newConfig = JSON.parse(e.newValue);
        setConfigState(normalizarConfiguracion(newConfig));
        setPerfilActivoState(newConfig.perfilActivo || null);
        console.log('[ConfigContext] Configuración sincronizada desde otra pestaña');
      } catch (err) {
        console.warn('[ConfigContext] Error sincronizando configuración:', err);
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
    persistConfigNow,
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
