// PLAN v5.5: 1. Refina botón toolbar (texto dinámico). 2. Handler auto-selección. 3. API+toast+sonido. 4. Sort prioritario en useEffect/socket. 5. Icono 🚀 rojo header. 6. Reset 'recoger'.
// PLAN REVERTIR v5.5: 1. Refina botón/menú. 2. Lista platos reversibles. 3. Handler plato granular. 4. Modal checkboxes. 5. Socket/UI update. 6. Toast confirm.
// VISTA PERSONALIZADA KDS: Filtrada por zonas/cocinero - Componente dedicado exclusivamente a Vista Personalizada
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import moment from "moment-timezone";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "../additionals/SearchBar";
import { 
  FaCog, 
  FaFilePdf, 
  FaSync, 
  FaTimes,
  FaCheckCircle,
  FaClock,
  FaChevronRight,
  FaUndo,
  FaPause,
  FaUserFriends,
  FaExpand,
  FaCompress,
  FaSearch,
  FaArrowLeft,
  FaEye,
  FaFilter
} from "react-icons/fa";
import ConfigModal from "./ConfigModal";
import ReportsModal from "./ReportsModal";
import RevertirModal from "./RevertirModal";
import DejarPlatoModal from "./DejarPlatoModal";
import PlatoPreparacion from "./PlatoPreparacion";
import useSocketCocina from "../../hooks/useSocketCocina";
import useProcesamiento from "../../hooks/useProcesamiento";
import { getApiUrl } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { 
  aplicarFiltrosAComandas, 
  debeMostrarComanda, 
  debeMostrarPlato,
  calcularEstadisticasFiltrado 
} from "../../utils/kdsFilters";
import { CocineroInfo, ZoneChipsCompact, FilterStatusBadge } from "../common/ZoneSelector";

// Sonido de notificación
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log("No se pudo reproducir el sonido:", error);
  }
};

const ComandaStylePerso = ({ onGoToMenu, initialOptions }) => {
  // Hook de autenticación - el rol viene del contexto, no de localStorage
  // Configuración de cocinero, zonas para Vista Personalizada
  const { 
    userRole, 
    canPerformSensitiveActions, 
    getToken,
    cocineroConfig,
    configLoading,
    configError,
    zonaActivaId,
    setZonaActiva,
    getZonasActivas,
    userName,
    userId,
    // TEMA 1: Funciones para actualizar configuración cuando llega evento Socket
    updateCocineroConfig,
    loadCocineroConfig
  } = useAuth();
  
  const [comandas, setComandas] = useState([]);
  const [filteredComandas, setFilteredComandas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [config, setConfig] = useState({
    alertYellowMinutes: 15,
    alertRedMinutes: 20,
    soundEnabled: true,
    autoPrint: false,
    nightMode: true,
    design: {
      fontSize: 15,
      cols: 5,
      rows: 1
    }
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showRevertir, setShowRevertir] = useState(false);
  // 🔥 NUEVO: Estado para modal de anular plato
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [anularMotivo, setAnularMotivo] = useState('');
  const [anularObservaciones, setAnularObservaciones] = useState('');
  const [anularLoading, setAnularLoading] = useState(false);
  // 🔥 NUEVO: Estado para modal de dejar plato (con motivo para auditoría)
  const [showDejarModal, setShowDejarModal] = useState(false);
  const [dejarMotivo, setDejarMotivo] = useState('');
  const [dejarLoading, setDejarLoading] = useState(false);
  const [platosPendientesDejar, setPlatosPendientesDejar] = useState([]);
  // v7.4.1: Estado para modal de dejar comanda (con motivo para auditoría)
  const [showDejarComandaModal, setShowDejarComandaModal] = useState(false);
  const [dejarComandaMotivo, setDejarComandaMotivo] = useState('');
  const [dejarComandaLoading, setDejarComandaLoading] = useState(false);
  const [comandaPendienteDejar, setComandaPendienteDejar] = useState(null);
  const [expandedComandas, setExpandedComandas] = useState(new Set());
  const [horaActual, setHoraActual] = useState(moment().tz("America/Lima"));
  const [fechaActual, setFechaActual] = useState(moment().tz("America/Lima"));
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showEntregadoConfirm, setShowEntregadoConfirm] = useState(false);
  // Estados visuales de platos: 'normal' | 'procesando' | 'seleccionado' (local-only, persistente)
  const [platoStates, setPlatoStates] = useState(new Map()); // Map<`${comandaId}-${platoId}`, 'normal'|'procesando'|'seleccionado'>
  // v7.4: Estados visuales de comandas para el ciclo de 3 estados (normal | dejar | finalizar)
  const [comandaStates, setComandaStates] = useState(new Map()); // Map<comandaId, 'normal'|'dejar'|'finalizar'>
  const [platosEliminados, setPlatosEliminados] = useState(new Map()); // Trackear platos eliminados: { comandaId: [{ platoId, nombre, cantidad, timestamp }] }
  // Estado para checkboxes de platos individuales: Map<`${comandaId}-${platoId}`, boolean>
  const [platosChecked, setPlatosChecked] = useState(new Map());
  // Estado para tiempos formateados HH:MM:SS por comanda: Map<comandaId, string>
  const [tiemposComandas, setTiemposComandas] = useState(new Map());
  // Estado para prevenir double-submit en finalizar platos
  const [isFinalizandoPlatos, setIsFinalizandoPlatos] = useState(false);
  // Estado para trackear comandas que ya fueron auto-completadas (evitar loops)
  const [comandasAutoCompletadas, setComandasAutoCompletadas] = useState(new Set());
  // Estado para toast notifications simples
  const [toastMessage, setToastMessage] = useState(null);
  
  // ==================== ESTADOS PARA FILTRADO POR VISTAS ====================
  // Comandas originales sin filtrar (para poder cambiar entre vistas sin recargar)
  const [comandasOriginales, setComandasOriginales] = useState([]);
  // Estadísticas de filtrado para debugging/UI
  const [estadisticasFiltrado, setEstadisticasFiltrado] = useState(null);
  
  const previousComandasRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const lastSuccessTimeRef = useRef(Date.now());
  const newComandasRef = useRef(new Set());
  
  // Estado de conexión Socket.io
  const [socketConnectionStatus, setSocketConnectionStatus] = useState('desconectado');

  // ============================================================
  // SISTEMA MULTI-COCINERO v7.2: Hook de procesamiento
  // Permite tomar/liberar/finalizar platos con identificación de cocinero
  // ============================================================
  
  // Handler para cambios de procesamiento (cuando otro cocinero toma/libera plato)
  const handleProcesamientoChange = useCallback((data) => {
    console.log('[Procesamiento] Cambio recibido:', data.type);
    
    switch (data.type) {
      case 'PLATO_TOMADO':
        // Actualizar estado local del plato
        setComandas(prev => prev.map(comanda => {
          if (comanda._id !== data.comandaId) return comanda;
          return {
            ...comanda,
            platos: comanda.platos.map(p => {
              const pId = p._id?.toString() || p.platoId?.toString();
              if (pId === data.platoId?.toString()) {
                return { ...p, procesandoPor: data.procesandoPor };
              }
              return p;
            })
          };
        }));
        break;
        
      case 'PLATO_LIBERADO':
        // Limpiar procesandoPor del plato
        setComandas(prev => prev.map(comanda => {
          if (comanda._id !== data.comandaId) return comanda;
          return {
            ...comanda,
            platos: comanda.platos.map(p => {
              const pId = p._id?.toString() || p.platoId?.toString();
              if (pId === data.platoId?.toString()) {
                return { ...p, procesandoPor: null };
              }
              return p;
            })
          };
        }));
        break;
        
      case 'PLATO_FINALIZADO':
        // El socket ya actualiza el estado del plato via plato-actualizado
        // Aqui solo necesitamos limpiar estados visuales locales
        const platoKey = `${data.comandaId}-${data.platoId}`;
        setPlatoStates(prev => {
          const nuevo = new Map(prev);
          nuevo.set(platoKey, 'normal');
          return nuevo;
        });
        setPlatosChecked(prev => {
          const nuevo = new Map(prev);
          nuevo.delete(platoKey);
          return nuevo;
        });
        break;
        
      case 'PLATO_OCUPADO':
        // Otro cocinero tomo el plato antes que nosotros
        setToastMessage({
          type: 'warning',
          message: `⚠️ Este plato ya fue tomado por ${data.procesandoPor?.alias || 'otro cocinero'}`,
          duration: 4000
        });
        // Actualizar estado con el cocinero real
        setComandas(prev => prev.map(comanda => {
          if (comanda._id !== data.comandaId) return comanda;
          return {
            ...comanda,
            platos: comanda.platos.map(p => {
              const pId = p._id?.toString() || p.platoId?.toString();
              if (pId === data.platoId?.toString()) {
                return { ...p, procesandoPor: data.procesandoPor };
              }
              return p;
            })
          };
        }));
        break;
        
      case 'COMANDA_TOMADA':
        // Actualizar estado local de la comanda
        setComandas(prev => prev.map(comanda => {
          if (comanda._id !== data.comandaId) return comanda;
          
          // Si viene la comanda completa con platos actualizados, usarla directamente
          if (data.comanda && data.comanda.platos) {
            return data.comanda;
          }
          
          // Si no, actualizar solo el procesandoPor del encabezado
          return {
            ...comanda,
            procesandoPor: data.procesandoPor
          };
        }));
        
        // Siempre actualizar platoStates para cada plato con procesandoPor
        // Esto es CRÍTICO para que los platos se muestren en amarillo
        if (data.comanda && data.comanda.platos) {
          setPlatoStates(prev => {
            const nuevo = new Map(prev);
            data.comanda.platos.forEach((plato, index) => {
              if (plato.procesandoPor?.cocineroId) {
                // Usar el índice como clave (igual que en el renderizado)
                const key = `${data.comandaId}-${index}`;
                nuevo.set(key, 'procesando');
              }
            });
            return nuevo;
          });
        }
        break;
        
      case 'COMANDA_LIBERADA':
        // v7.4: Limpiar procesandoPor de la comanda y sus platos
        setComandas(prev => prev.map(comanda => {
          if (comanda._id !== data.comandaId) return comanda;
          
          // Si viene la comanda actualizada, usarla directamente
          if (data.comanda) {
            return data.comanda;
          }
          
          // Si no, limpiar procesandoPor manualmente
          return {
            ...comanda,
            procesandoPor: null,
            platos: comanda.platos.map(p => ({
              ...p,
              procesandoPor: null
            }))
          };
        }));
        
        // Resetear estado visual de la comanda
        setComandaStates(prev => {
          const nuevo = new Map(prev);
          nuevo.delete(data.comandaId);
          return nuevo;
        });
        
        // Resetear estados visuales de los platos
        setPlatoStates(prev => {
          const nuevo = new Map(prev);
          const comanda = comandas.find(c => c._id === data.comandaId);
          if (comanda && comanda.platos) {
            comanda.platos.forEach((plato, index) => {
              const key = `${data.comandaId}-${index}`;
              nuevo.delete(key);
            });
          }
          return nuevo;
        });
        break;
        
      case 'COMANDA_FINALIZADA':
        // v7.4: Actualizar comanda y todos sus platos a estado 'recoger'
        setComandas(prev => prev.map(comanda => {
          if (comanda._id !== data.comandaId) return comanda;
          
          // Si viene la comanda actualizada, usarla directamente
          if (data.comanda) {
            return data.comanda;
          }
          
          // Si no, actualizar manualmente
          return {
            ...comanda,
            procesandoPor: null,
            status: 'recoger',
            platos: comanda.platos.map(p => ({
              ...p,
              estado: 'recoger',
              procesandoPor: null
            }))
          };
        }));
        
        // Resetear estado visual de la comanda
        setComandaStates(prev => {
          const nuevo = new Map(prev);
          nuevo.delete(data.comandaId);
          return nuevo;
        });
        
        // Resetear estados visuales de los platos
        setPlatoStates(prev => {
          const nuevo = new Map(prev);
          const comanda = comandas.find(c => c._id === data.comandaId);
          if (comanda && comanda.platos) {
            comanda.platos.forEach((plato, index) => {
              const key = `${data.comandaId}-${index}`;
              nuevo.set(key, 'normal');
            });
          }
          return nuevo;
        });
        
        // Limpiar checks
        setPlatosChecked(prev => {
          const nuevo = new Map(prev);
          nuevo.forEach((_, key) => {
            if (key.startsWith(`${data.comandaId}-`)) {
              nuevo.delete(key);
            }
          });
          return nuevo;
        });
        break;
    }
  }, [comandas]);

  // Hook de procesamiento multi-cocinero
  const {
    loading: procesamientoLoading,
    error: procesamientoError,
    tomarPlato,
    liberarPlato,
    finalizarPlato: finalizarPlatoConCocinero,
    tomarComanda,
    liberarComanda,
    finalizarComanda
  } = useProcesamiento({
    getToken,
    showToast: (msg) => setToastMessage(msg),
    onProcesamientoChange: handleProcesamientoChange
  });

  // Actualizar hora y fecha cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const now = moment().tz("America/Lima");
      setHoraActual(now);
      setFechaActual(now);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar configuración desde localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('kdsConfig');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      // Asegurar que design existe con valores por defecto
      if (!parsed.design) {
        parsed.design = { fontSize: 15, cols: 5, rows: 1 };
      }
      setConfig(parsed);
    }
  }, []);

  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('kdsConfig', JSON.stringify(config));
  }, [config]);

  // Cargar estados de platos desde localStorage al montar
  useEffect(() => {
    try {
      const savedStates = localStorage.getItem('platoStates');
      if (savedStates) {
        const parsed = JSON.parse(savedStates);
        const statesMap = new Map(parsed);
        setPlatoStates(statesMap);
        console.log('✅ Estados de platos cargados desde localStorage:', statesMap.size);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando estados de platos desde localStorage:', error);
    }
  }, []);

  // Persistir estados de platos en localStorage
  useEffect(() => {
    try {
      const statesArray = Array.from(platoStates.entries());
      localStorage.setItem('platoStates', JSON.stringify(statesArray));
    } catch (error) {
      console.warn('⚠️ Error guardando estados de platos en localStorage:', error);
    }
  }, [platoStates]);

  // Manejar opciones iniciales (por ejemplo, abrir configuración automáticamente)
  useEffect(() => {
    if (initialOptions?.openConfig) {
      setShowConfig(true);
    }
  }, [initialOptions]);

  // Función para regresar al menú (cierra todos los modales primero)
  const handleGoToMenu = useCallback(() => {
    // Cerrar todos los modales abiertos
    setShowConfig(false);
    setShowReports(false);
    setShowRevertir(false);
    setShowSearch(false);
    setShowAnularModal(false);
    setShowDejarModal(false);
    
    // Navegar al menú
    if (onGoToMenu) {
      onGoToMenu();
    }
  }, [onGoToMenu]);

  // ==================== FUNCIÓN CENTRAL DE FILTRADO (VISTA PERSONALIZADA) ====================
  /**
   * Filtra comandas según la configuración del cocinero y zonas asignadas
   * Este componente es exclusivamente Vista Personalizada
   */
  const filtrarComandasPersonalizadas = useCallback((comandasAFiltrar) => {
    // Validación defensiva: si no hay comandas, retornar vacío
    if (!comandasAFiltrar || !Array.isArray(comandasAFiltrar) || comandasAFiltrar.length === 0) {
      return [];
    }

    // Vista Personalizada: Aplicar filtros
    console.log('[VISTA PERSONALIZADA] Aplicando filtros de zonas/cocinero');
    
    // Si la configuración está cargando, esperar (no mostrar error aún)
    if (configLoading) {
      console.log('[VISTA PERSONALIZADA] Configuración cargando, esperando...');
      setEstadisticasFiltrado({
        comandasOriginales: comandasAFiltrar.length,
        comandasVisibles: comandasAFiltrar.length,
        comandasOcultas: 0,
        porcentajeVisible: 100,
        cargando: true
      });
      return comandasAFiltrar;
    }
    
    // Si no hay configuración cargada después de terminar la carga
    if (!cocineroConfig) {
      console.warn('[VISTA PERSONALIZADA] No hay cocineroConfig disponible');
      setEstadisticasFiltrado({
        comandasOriginales: comandasAFiltrar.length,
        comandasVisibles: comandasAFiltrar.length,
        comandasOcultas: 0,
        porcentajeVisible: 100,
        sinConfiguracion: true
      });
      return comandasAFiltrar;
    }

    // Normalizar zonasAsignadas a array
    const zonasAsignadas = Array.isArray(cocineroConfig.zonasAsignadas) 
      ? cocineroConfig.zonasAsignadas 
      : [];

    // Construir configuración extendida para filtros
    const configExtendida = {
      ...cocineroConfig,
      zonasAsignadas,
      zonaActivaId: zonaActivaId || null
    };

    // DEBUG: Mostrar configuración usada para filtrar
    console.log('[VISTA PERSONALIZADA] Config para filtros:', {
      tieneFiltrosPlatos: !!(cocineroConfig.filtrosPlatos && Object.keys(cocineroConfig.filtrosPlatos).length > 0),
      tieneFiltrosComandas: !!(cocineroConfig.filtrosComandas && Object.keys(cocineroConfig.filtrosComandas).length > 0),
      zonasAsignadasCount: zonasAsignadas.length,
      zonasAsignadas: zonasAsignadas.map(z => ({
        id: z._id || z.id,
        nombre: z.nombre,
        activo: z.activo,
        tieneFiltrosPlatos: !!(z.filtrosPlatos && Object.keys(z.filtrosPlatos).length > 0),
        categoriasPermitidas: z.filtrosPlatos?.categoriasPermitidas?.length || 0
      })),
      zonaActivaId
    });

    // Aplicar filtros usando kdsFilters
    try {
      const comandasFiltradas = aplicarFiltrosAComandas(comandasAFiltrar, configExtendida);

      // Calcular estadísticas
      const stats = calcularEstadisticasFiltrado(comandasAFiltrar, comandasFiltradas);
      setEstadisticasFiltrado({
        ...stats,
        zonaActivaId,
        zonasAsignadas: zonasAsignadas.length
      });

      console.log(`[VISTA PERSONALIZADA] Filtrado completado: ${stats.comandasVisibles}/${stats.comandasOriginales} comandas visibles (${stats.porcentajeVisible}%)`);

      return comandasFiltradas;
    } catch (error) {
      console.error('[VISTA PERSONALIZADA] Error al filtrar comandas:', error);
      // En caso de error, retornar las comandas sin filtrar
      return comandasAFiltrar;
    }
  }, [cocineroConfig, zonaActivaId, configLoading]);

  // Efecto para re-filtrar cuando cambian las dependencias
  // IMPORTANTE: Se re-ejecuta cuando cocineroConfig cambia (se cargó)
  useEffect(() => {
    if (comandasOriginales.length > 0) {
      const filtradas = filtrarComandasPersonalizadas(comandasOriginales);
      setComandas(filtradas);
    }
  }, [cocineroConfig, zonaActivaId, comandasOriginales, filtrarComandasPersonalizadas]);

  const obtenerComandas = useCallback(async () => {
    try {
      const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
      // 🚀 FASE A1: Usar endpoint optimizado para cocina
      const apiUrl = `${getApiUrl()}/cocina/${fechaActual}`;
      
      console.log('🔍 [FASE A1] Obteniendo comandas desde endpoint optimizado:', apiUrl);
      console.log('📅 Fecha buscada:', fechaActual);
      
      const startTime = Date.now();
      const response = await axios.get(apiUrl, { timeout: 5000 });
      const elapsedMs = Date.now() - startTime;
      
      // Log del tiempo de respuesta (el backend también lo envía en header)
      const serverTime = response.headers['x-response-time'];
      console.log(`✅ [FASE A1] Respuesta recibida en ${elapsedMs}ms (servidor: ${serverTime || 'N/A'})`);
      
      // VALIDACIÓN CRÍTICA: Filtrar comandas que tienen platos sin nombre cargado Y comandas eliminadas
      const comandasValidas = response.data.filter(c => {
        // ✅ FILTRAR COMANDAS ELIMINADAS (IsActive = false)
        if (c.IsActive === false || c.IsActive === null || c.eliminada === true) {
          console.warn(`⚠️ Comanda #${c.comandaNumber} filtrada: comanda eliminada (IsActive: ${c.IsActive})`);
          return false;
        }
        
        // Si no tiene platos, no es válida
        if (!c.platos || c.platos.length === 0) return false;
        
        // Verificar que TODOS los platos tengan nombre cargado completamente
        const todosPlatosConNombre = c.platos.every(plato => {
          // 🚀 FASE A1: Usar campos desnormalizados si están disponibles
          const nombre = plato.plato?.nombre || plato.nombre;
          return nombre && nombre.trim().length > 0;
        });
        
        if (!todosPlatosConNombre) {
          console.warn(`⚠️ Comanda #${c.comandaNumber} filtrada: tiene platos sin nombre cargado`);
          return false;
        }
        
        return true;
      });
      
      console.log('✅ Comandas recibidas:', response.data.length);
      console.log(`✅ Comandas válidas: ${comandasValidas.length}`);
      
      if (comandasValidas.length > 0) {
        console.log('📋 Primera comanda válida:', {
          _id: comandasValidas[0]._id,
          numero: comandasValidas[0].comandaNumber,
          status: comandasValidas[0].status,
          IsActive: comandasValidas[0].IsActive,
          platos: comandasValidas[0].platos?.length,
          createdAt: comandasValidas[0].createdAt,
          estadosPlatos: comandasValidas[0].platos?.map(p => ({
            estado: p.estado,
            nombre: p.plato?.nombre || p.nombre || 'Sin nombre'
          })) || []
        });
      }
      
      // Verificar si hay comandas sin platos o con platos sin nombre
      const comandasSinPlatos = response.data.filter(c => !c.platos || c.platos.length === 0);
      const comandasConPlatosSinNombre = response.data.length - comandasValidas.length - comandasSinPlatos.length;
      
      if (comandasSinPlatos.length > 0) {
        console.warn(`⚠️ ${comandasSinPlatos.length} comandas sin platos:`, comandasSinPlatos.map(c => c.comandaNumber));
      }
      if (comandasConPlatosSinNombre > 0) {
        console.warn(`⚠️ ${comandasConPlatosSinNombre} comandas con platos sin nombre (filtradas, esperando carga completa)`);
      }
      
      if (comandasValidas.length === 0 && response.data.length > 0) {
        console.warn('⚠️ No hay comandas válidas (todas tienen platos sin nombre o sin platos)');
      }
      
      // Detectar nuevas comandas para reproducir sonido y animación (solo de comandas válidas)
      if (config.soundEnabled && previousComandasRef.current.length > 0) {
        const nuevasComandas = comandasValidas.filter(
          nueva => !previousComandasRef.current.some(
            anterior => anterior._id === nueva._id
          )
        );
        
        const nuevasIngresantes = nuevasComandas.filter(
          c => c.platos?.some(p => p.estado === "en_espera" || p.estado === "ingresante")
        );
        
        if (nuevasIngresantes.length > 0) {
          playNotificationSound();
          // Marcar nuevas comandas para animación
          nuevasIngresantes.forEach(c => {
            newComandasRef.current.add(c._id);
            setTimeout(() => {
              newComandasRef.current.delete(c._id);
            }, 2000);
          });
        }
      }
      
      previousComandasRef.current = comandasValidas;
      
      // Vista Personalizada: guardar comandas originales y aplicar filtros de zonas
      setComandasOriginales(comandasValidas);
      
      // Aplicar filtros de configuración del cocinero
      const comandasFiltradas = filtrarComandasPersonalizadas(comandasValidas);
      
      setComandas(comandasFiltradas);
      lastSuccessTimeRef.current = Date.now();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
    } catch (error) {
      console.error("❌ Error al obtener las comandas:", error);
      
      // Manejar errores sin crash - mostrar notificación si es un error de API
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error || 'Error desconocido';
        
        if (status === 409) {
          console.warn("⚠️ Conflicto detectado:", message);
          // No mostrar alerta agresiva, solo log
        } else if (status === 400) {
          console.warn("⚠️ Error de validación:", message);
        } else if (status >= 500) {
          console.error("❌ Error del servidor:", message);
        }
      } else if (error.request) {
        console.warn("⚠️ No se recibió respuesta del servidor");
      } else {
        console.error("❌ Error al configurar la petición:", error.message);
      }
      
      const timeSinceLastSuccess = Date.now() - lastSuccessTimeRef.current;
      if (timeSinceLastSuccess > 10000 && !reconnectTimeoutRef.current) {
        console.log("⚠️ Intentando reconectar...");
        reconnectTimeoutRef.current = setTimeout(() => {
          obtenerComandas();
          reconnectTimeoutRef.current = null;
        }, 2000);
      }
    }
  }, [config.soundEnabled]);

  // Callbacks para eventos Socket.io
  const handleNuevaComanda = useCallback((nuevaComanda) => {
    console.log('📥 Nueva comanda recibida vía Socket.io:', nuevaComanda?.comandaNumber);
    
    // Validación defensiva: verificar que la comanda es válida
    if (!nuevaComanda || typeof nuevaComanda !== 'object' || !nuevaComanda._id) {
      console.warn('⚠️ handleNuevaComanda recibió comanda inválida:', nuevaComanda);
      return;
    }
    
    // VALIDACIÓN: Verificar que todos los platos tengan nombre antes de agregar
    if (nuevaComanda.platos && Array.isArray(nuevaComanda.platos) && nuevaComanda.platos.length > 0) {
      const todosPlatosConNombre = nuevaComanda.platos.every(plato => {
        const platoObj = plato.plato || plato;
        const nombre = platoObj?.nombre || plato?.nombre;
        return nombre && typeof nombre === 'string' && nombre.trim().length > 0;
      });
      
      if (!todosPlatosConNombre) {
        console.warn(`⚠️ Comanda #${nuevaComanda.comandaNumber} recibida vía Socket.io pero tiene platos sin nombre. Esperando a que se carguen...`);
        // No agregar la comanda todavía, esperar a que llegue actualizada con los nombres
        return;
      }
    }
    
    // ==================== FILTRADO VISTA PERSONALIZADA ====================
    // Verificar si la comanda debe mostrarse según filtros de zonas
    if (cocineroConfig) {
      // Normalizar zonasAsignadas
      const zonasAsignadas = Array.isArray(cocineroConfig.zonasAsignadas) 
        ? cocineroConfig.zonasAsignadas 
        : [];
      
      const debeMostrar = debeMostrarComanda(
        nuevaComanda,
        cocineroConfig.filtrosComandas,
        zonasAsignadas,
        zonaActivaId
      );
      
      if (!debeMostrar) {
        console.log(`[VISTA PERSONALIZADA] Nueva comanda #${nuevaComanda.comandaNumber} oculta por filtros`);
        // Actualizar referencia pero no mostrar en UI
        setComandasOriginales(prev => [...prev, nuevaComanda]);
        previousComandasRef.current = [...previousComandasRef.current, nuevaComanda];
        return;
      }
      
      // También filtrar los platos de la comanda si aplica
      if (Array.isArray(nuevaComanda.platos)) {
        const platosFiltrados = nuevaComanda.platos.filter(plato => {
          if (!plato || typeof plato !== 'object') return false;
          return debeMostrarPlato(
            plato,
            cocineroConfig.filtrosPlatos,
            zonasAsignadas,
            zonaActivaId
          );
        });
        
        if (platosFiltrados.length === 0) {
          console.log(`[VISTA PERSONALIZADA] Nueva comanda #${nuevaComanda.comandaNumber} sin platos visibles después de filtrar`);
          setComandasOriginales(prev => [...prev, nuevaComanda]);
          previousComandasRef.current = [...previousComandasRef.current, nuevaComanda];
          return;
        }
        
        // Crear comanda con platos filtrados
        nuevaComanda = {
          ...nuevaComanda,
          platos: platosFiltrados,
          _platosOcultos: (nuevaComanda.platos?.length || 0) - platosFiltrados.length
        };
      }
    }
    
    // Reproducir sonido si está habilitado
    if (config.soundEnabled) {
      playNotificationSound();
    }
    
    // Marcar para animación
    newComandasRef.current.add(nuevaComanda._id);
    setTimeout(() => {
      newComandasRef.current.delete(nuevaComanda._id);
    }, 2000);
    
    // Actualizar lista de comandas (agregar nueva o reemplazar si ya existe)
    setComandas(prev => {
      const existe = prev.find(c => c && c._id === nuevaComanda._id);
      if (existe) {
        // Actualizar comanda existente
        return prev.map(c => c._id === nuevaComanda._id ? nuevaComanda : c);
      } else {
        // Agregar nueva comanda al inicio
        return [nuevaComanda, ...prev];
      }
    });
    
    // Actualizar también comandasOriginales
    setComandasOriginales(prev => {
      const existe = prev.find(c => c && c._id === nuevaComanda._id);
      if (existe) {
        return prev.map(c => c._id === nuevaComanda._id ? nuevaComanda : c);
      }
      return [nuevaComanda, ...prev];
    });
    
    // Actualizar referencia
    previousComandasRef.current = [...previousComandasRef.current, nuevaComanda];
  }, [config.soundEnabled, cocineroConfig, zonaActivaId]);

  const handleComandaActualizada = useCallback((data) => {
    // Validar que data existe
    if (!data) {
      console.warn('⚠️ handleComandaActualizada recibió data null/undefined');
      return;
    }

    // AUTO-TRIGGER: Detectar cuando comanda pasa a 'recoger' y mostrar feedback
    const comandaParaVerificar = data.comanda || data;
    if (comandaParaVerificar && comandaParaVerificar.status === 'recoger') {
      const comandaAnterior = comandas.find(c => c._id === comandaParaVerificar._id);
      if (comandaAnterior && comandaAnterior.status !== 'recoger') {
        // Comanda acaba de pasar a 'recoger' - mostrar toast y sonido
        setToastMessage({
          type: 'success',
          message: `✅ Comanda #${comandaParaVerificar.comandaNumber || ''} → Mozos recogerán`,
          duration: 4000
        });
        
        if (config.soundEnabled) {
          playNotificationSound();
        }
        
        // Remover de auto-completadas para permitir re-procesamiento si es necesario
        setComandasAutoCompletadas(prev => {
          const nuevo = new Set(prev);
          nuevo.delete(comandaParaVerificar._id);
          return nuevo;
        });
      }
    }
    
    // ✅ MANEJAR ELIMINACIÓN DE COMANDA - Remover tarjeta en tiempo real
    if (data.eliminada === true || (data.comanda && (data.comanda.IsActive === false || data.comanda.eliminada === true))) {
      const comandaId = data.comandaId || data.comanda?._id || data._id;
      console.log('🗑️ Removiendo comanda eliminada de la lista:', comandaId);
      
      setComandas(prev => {
        const comandasFiltradas = prev.filter(c => {
          const cId = c._id?.toString ? c._id.toString() : c._id;
          const eliminarId = comandaId?.toString ? comandaId.toString() : comandaId;
          return cId !== eliminarId;
        });
        
        if (comandasFiltradas.length < prev.length) {
          console.log(`✅ Comanda ${comandaId} removida de la lista. Total: ${prev.length} → ${comandasFiltradas.length}`);
        }
        
        return comandasFiltradas;
      });
      
      // Actualizar referencia
      previousComandasRef.current = previousComandasRef.current.filter(c => {
        const cId = c._id?.toString ? c._id.toString() : c._id;
        const eliminarId = comandaId?.toString ? comandaId.toString() : comandaId;
        return cId !== eliminarId;
      });
      
      return; // No continuar con la actualización normal
    }
    
    // data puede ser la comanda directamente o un objeto con comanda y platosEliminados
    const comandaActualizada = data.comanda || data;
    const platosEliminadosData = data.platosEliminados || [];
    
    // Validar que comandaActualizada existe y tiene _id
    if (!comandaActualizada || !comandaActualizada._id) {
      console.warn('⚠️ Comanda actualizada no tiene _id válido:', data);
      return;
    }
    
    console.log('📥 Comanda actualizada vía Socket.io:', comandaActualizada.comandaNumber || comandaActualizada._id);
    console.log('📋 Datos recibidos:', {
      comandaId: comandaActualizada._id,
      platos: comandaActualizada.platos?.length || 0,
      status: comandaActualizada.status
    });
    
    // VALIDACIÓN: Verificar que todos los platos tengan nombre antes de actualizar
    if (comandaActualizada.platos && comandaActualizada.platos.length > 0) {
      const todosPlatosConNombre = comandaActualizada.platos.every(plato => {
        const platoObj = plato.plato || plato;
        const nombre = platoObj?.nombre || plato?.nombre;
        return nombre && nombre.trim().length > 0;
      });
      
      if (!todosPlatosConNombre) {
        console.warn(`⚠️ Comanda #${comandaActualizada.comandaNumber} actualizada pero tiene platos sin nombre. Esperando actualización completa...`);
        // No actualizar todavía, esperar a que llegue con los nombres completos
        return;
      }
    }
    
    // Detectar platos eliminados comparando la comanda anterior con la nueva
    setComandas(prev => {
      console.log('🔄 Actualizando comanda en estado. Total comandas antes:', prev.length);
      const index = prev.findIndex(c => c._id === comandaActualizada._id);
      if (index !== -1) {
        const comandaAnterior = prev[index];
        
        // Detectar platos que estaban antes pero ya no están
        const platosAnteriores = new Map();
        comandaAnterior.platos?.forEach((p, idx) => {
          const platoId = p.plato?._id || p.plato || p.platoId;
          const platoObj = p.plato || p;
          const nombre = platoObj?.nombre || p?.nombre;
          const cantidad = comandaAnterior.cantidades?.[idx] || 1;
          if (platoId) {
            platosAnteriores.set(platoId.toString(), { platoId, nombre, cantidad });
          }
        });
        
        const platosActuales = new Set();
        comandaActualizada.platos?.forEach(p => {
          const platoId = p.plato?._id || p.plato || p.platoId;
          if (platoId) {
            platosActuales.add(platoId.toString());
          }
        });
        
        // Encontrar platos eliminados
        // PRIORIDAD: Usar datos del historial si vienen (más confiables), sino usar comparación
        const eliminados = [];
        
        // Usar historialPlatos de la comanda actualizada si está disponible
        const historialPlatos = comandaActualizada.historialPlatos || [];
        
        if (historialPlatos.length > 0) {
          // Usar historialPlatos del backend (más confiables, tienen nombres correctos y mozo)
          historialPlatos.forEach(h => {
            if (h.estado === 'eliminado') {
              // Obtener nombre del mozo
              let nombreMozo = 'Mozo';
              if (h.usuario) {
                if (typeof h.usuario === 'object' && h.usuario.name) {
                  nombreMozo = h.usuario.name;
                } else if (typeof h.usuario === 'object' && h.usuario.nombre) {
                  nombreMozo = h.usuario.nombre;
                } else if (h.nombreMozo) {
                  nombreMozo = h.nombreMozo;
                }
              }
              
              eliminados.push({
                platoId: h.platoId,
                nombre: h.nombreOriginal || 'Plato eliminado',
                cantidad: h.cantidadOriginal || 1,
                timestamp: h.timestamp || new Date().toISOString(),
                nombreMozo: nombreMozo,
                motivo: h.motivo || 'Eliminado'
              });
            }
          });
        } else if (platosEliminadosData && platosEliminadosData.length > 0) {
          // Usar datos del historial del backend (más confiables, tienen nombres correctos)
          platosEliminadosData.forEach(h => {
            if (h.estado === 'eliminado') {
              eliminados.push({
                platoId: h.platoId,
                nombre: h.nombreOriginal || 'Plato eliminado',
                cantidad: h.cantidadOriginal || 1,
                timestamp: h.timestamp || new Date().toISOString(),
                nombreMozo: h.usuario?.name || h.usuario?.nombre || h.nombreMozo || 'Mozo',
                motivo: h.motivo || 'Eliminado'
              });
            }
          });
        } else {
          // Si no vienen del historial, usar comparación local
          platosAnteriores.forEach((info, platoId) => {
            if (!platosActuales.has(platoId)) {
              eliminados.push({
                platoId: info.platoId,
                nombre: info.nombre || 'Plato eliminado',
                cantidad: info.cantidad,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
        
        // Guardar platos eliminados en el estado
        if (eliminados.length > 0) {
          setPlatosEliminados(prevEliminados => {
            const nuevo = new Map(prevEliminados);
            const comandaId = comandaActualizada._id;
            const eliminadosActuales = nuevo.get(comandaId) || [];
            // Agregar nuevos eliminados sin duplicar por platoId
            eliminados.forEach(eliminado => {
              // Verificar si ya existe un plato eliminado con el mismo platoId
              const existe = eliminadosActuales.some(e => {
                // Comparar por platoId (puede ser número o string)
                const mismoPlatoId = e.platoId?.toString() === eliminado.platoId?.toString();
                // Si tienen el mismo platoId, es un duplicado
                return mismoPlatoId;
              });
              
              if (!existe) {
                eliminadosActuales.push(eliminado);
              } else {
                console.log(`⚠️ Plato eliminado duplicado ignorado: ${eliminado.nombre} (ID: ${eliminado.platoId})`);
              }
            });
            
            nuevo.set(comandaId, eliminadosActuales);
            console.log(`🗑️ Platos eliminados en comanda #${comandaActualizada.comandaNumber}:`, eliminadosActuales.length, 'únicos');
            return nuevo;
          });
        }
        
        const nuevas = [...prev];
        // Crear una nueva referencia completa del objeto para forzar re-render
        // Esto asegura que React detecte el cambio y re-renderice
        nuevas[index] = JSON.parse(JSON.stringify(comandaActualizada));
        console.log('✅ Comanda actualizada en estado. Nueva versión:', {
          _id: nuevas[index]._id,
          comandaNumber: nuevas[index].comandaNumber,
          platos: nuevas[index].platos?.length || 0,
          status: nuevas[index].status,
          platosDetalle: nuevas[index].platos?.map(p => ({
            nombre: p.plato?.nombre || p.nombre,
            estado: p.estado
          }))
        });
        return nuevas;
      } else {
        // Si la comanda no existe en el estado anterior, agregarla si tiene platos válidos
        if (comandaActualizada.platos && comandaActualizada.platos.length > 0) {
          const todasPlatosConNombre = comandaActualizada.platos.every(plato => {
            const platoObj = plato.plato || plato;
            const nombre = platoObj?.nombre || plato?.nombre;
            return nombre && nombre.trim().length > 0;
          });
          
          if (todasPlatosConNombre) {
            return [comandaActualizada, ...prev];
          }
        }
      }
      // Si no existe y no se puede agregar, refrescar todas las comandas
      obtenerComandas();
      return prev;
    });
    
    // Forzar actualización del filtro después de actualizar comandas
    // El useEffect de filteredComandas se ejecutará automáticamente cuando cambie 'comandas'
    // También forzar un pequeño delay para asegurar que React procese el cambio
    // (Delay silencioso, sin logs innecesarios)
  }, [obtenerComandas]);

  // FASE 3: Actualización granular de plato (solo actualiza 1 plato, no toda la comanda)
  const handlePlatoActualizado = useCallback((data) => {
    console.log('📥 FASE3: Plato actualizado granular vía Socket.io:', {
      comandaId: data.comandaId,
      platoId: data.platoId,
      nuevoEstado: data.nuevoEstado,
      estadoAnterior: data.estadoAnterior,
      plato: data.plato,
      comanda: data.comanda
    });
    
    // 🔥 AUDITORÍA: Detectar si el plato fue eliminado
    const platoEliminado = data.plato?.eliminado === true || data.eliminado === true;
    
    // Si el plato fue eliminado, actualizar historial de platos eliminados
    if (platoEliminado && data.comanda?.historialPlatos) {
      const historialEliminado = data.comanda.historialPlatos.filter(h => 
        h.estado === 'eliminado' && 
        (h.platoId?.toString() === data.platoId?.toString() || 
         h.plato?.toString() === data.platoId?.toString())
      );
      
      if (historialEliminado.length > 0) {
        const ultimoEliminado = historialEliminado[historialEliminado.length - 1];
        setPlatosEliminados(prevEliminados => {
          const nuevo = new Map(prevEliminados);
          const comandaId = data.comandaId;
          const eliminadosActuales = nuevo.get(comandaId) || [];
          
          // Verificar si ya existe
          const existe = eliminadosActuales.some(e => 
            e.platoId?.toString() === data.platoId?.toString()
          );
          
          if (!existe) {
            eliminadosActuales.push({
              platoId: data.platoId,
              nombre: ultimoEliminado.nombreOriginal || data.plato?.nombre || 'Plato eliminado',
              cantidad: ultimoEliminado.cantidadOriginal || 1,
              timestamp: ultimoEliminado.timestamp || new Date(),
              nombreMozo: ultimoEliminado.usuario?.name || ultimoEliminado.usuario?.nombre || ultimoEliminado.nombreMozo || 'Mozo',
              motivo: ultimoEliminado.motivo || 'Eliminado'
            });
            nuevo.set(comandaId, eliminadosActuales);
            console.log(`🗑️ Plato eliminado detectado: ${data.platoId} por ${ultimoEliminado.usuario?.name || 'Mozo'}`);
          }
          
          return nuevo;
        });
      }
    }
    
    // Validar datos mínimos requeridos
    if (!data.comandaId || !data.platoId) {
      console.warn('⚠️ FASE3: Datos incompletos en plato-actualizado, refrescando todas las comandas');
      obtenerComandas();
      return;
    }
    
    // Si no hay nuevoEstado pero el plato fue eliminado, refrescar comanda completa
    if (!data.nuevoEstado && platoEliminado) {
      console.log('🔄 Plato eliminado detectado, refrescando comanda completa para obtener historial');
      obtenerComandas();
      return;
    }
    
    // FASE 3: Actualización GRANULAR - Solo actualizar el plato específico
    setComandas(prev => {
      const comandaIndex = prev.findIndex(c => {
        const cId = c._id?.toString ? c._id.toString() : c._id;
        const dataComandaId = data.comandaId?.toString ? data.comandaId.toString() : data.comandaId;
        return cId === dataComandaId;
      });
      
      if (comandaIndex === -1) {
        console.warn('⚠️ FASE3: Comanda no encontrada para actualizar plato, refrescando todas las comandas');
        // Si no encontramos la comanda, refrescar todas (fallback)
        setTimeout(() => obtenerComandas(), 100);
        return prev;
      }
      
      const comanda = prev[comandaIndex];
      const platoIdStr = data.platoId?.toString ? data.platoId.toString() : data.platoId;
      
      // Buscar el plato en la comanda
      const platoIndex = comanda.platos?.findIndex(p => {
        const pId = p.plato?._id?.toString ? p.plato._id.toString() : 
                    p.plato?.toString ? p.plato.toString() : 
                    p.platoId?.toString ? p.platoId.toString() : 
                    p.plato;
        return pId === platoIdStr;
      });
      
      if (platoIndex === -1 || !comanda.platos) {
        console.warn('⚠️ FASE3: Plato no encontrado en comanda, refrescando comanda completa');
        // Si no encontramos el plato, refrescar solo esta comanda (fallback)
        setTimeout(() => obtenerComandas(), 100);
        return prev;
      }
      
      // FASE 3: Actualizar SOLO el estado del plato específico (inmutable)
      const nuevasComandas = [...prev];
      const nuevaComanda = { ...comanda };
      const nuevosPlatos = [...nuevaComanda.platos];
      const platoActualizado = { ...nuevosPlatos[platoIndex] };
      
      // 🔥 AUDITORÍA: Si el plato fue eliminado, marcar como eliminado
      if (platoEliminado) {
        platoActualizado.eliminado = true;
        if (data.plato?.eliminadoPor) {
          platoActualizado.eliminadoPor = data.plato.eliminadoPor;
        }
        if (data.plato?.eliminadoAt) {
          platoActualizado.eliminadoAt = data.plato.eliminadoAt;
        }
        if (data.plato?.eliminadoRazon) {
          platoActualizado.eliminadoRazon = data.plato.eliminadoRazon;
        }
      }
      
      // Actualizar estado del plato (si existe)
      if (data.nuevoEstado) {
        platoActualizado.estado = data.nuevoEstado;
      }
      
      // Si el plato fue eliminado, también actualizar historialPlatos de la comanda
      if (platoEliminado && data.comanda?.historialPlatos) {
        nuevaComanda.historialPlatos = data.comanda.historialPlatos;
      }
      
      // Actualizar timestamp si existe
      if (!platoActualizado.tiempos) {
        platoActualizado.tiempos = {};
      }
      platoActualizado.tiempos[data.nuevoEstado] = data.timestamp || new Date();
      
      nuevosPlatos[platoIndex] = platoActualizado;
      nuevaComanda.platos = nuevosPlatos;
      nuevasComandas[comandaIndex] = nuevaComanda;
      
      // Reproducir sonido si está habilitado
      if (config.soundEnabled) {
        playNotificationSound();
      }
      
      // FIX: revertir multi-plato similar - Encontrar el índice del plato usando el subdocumento _id
      // El Socket envía platoId = subdocumento._id, pero platoStates usa platoIndex como key
      const platoIndexEncontrado = comanda.platos?.findIndex(p => 
        p._id?.toString() === data.platoId?.toString()
      );
      
      // Si encontramos el índice, usarlo; si no, intentar buscar por otros IDs como fallback
      const platoIndexParaKey = platoIndexEncontrado >= 0 ? platoIndexEncontrado : platoIndex;
      
      // Resetear estado visual local cuando Socket actualiza plato (backend cambió estado)
      // FIX: Usar el índice del plato para el key, no el platoId
      const platoKey = `${data.comandaId}-${platoIndexParaKey}`;
      setPlatoStates(prev => {
        const nuevo = new Map(prev);
        // Reset a 'normal' cuando backend actualiza (plato ya procesado)
        if (data.nuevoEstado === "recoger") {
          nuevo.set(platoKey, 'normal');
        }
        // PARRAFO 5: Si vuelve a 'en_espera' (revertido), también resetear
        if (data.nuevoEstado === "en_espera") {
          nuevo.set(platoKey, 'normal');
          console.log(`↩️ Plato revertido a preparación: ${data.platoId} (índice: ${platoIndexParaKey})`);
        }
        return nuevo;
      });
      
      // Limpiar checkbox antiguo si existe (compatibilidad)
      setPlatosChecked(prev => {
        const nuevo = new Map(prev);
        nuevo.delete(platoKey);
        return nuevo;
      });
      
      console.log(`✅ FASE3: Plato ${data.platoId} actualizado a "${data.nuevoEstado}" en comanda ${data.comandaId} (sin recargar comanda completa)`);
      
      // Resetear estado visual local cuando Socket actualiza plato (ya está en reset arriba)
      // No necesita código adicional aquí, ya se resetea arriba
      
      return nuevasComandas;
    });
  }, [config.soundEnabled, obtenerComandas]);

  // TEMA 1: Handler para cuando se actualiza la configuración del cocinero vía Socket
  // Se ejecuta cuando el admin cambia zonas, filtros o preferencias KDS
  const handleConfigCocineroActualizada = useCallback(async (data) => {
    console.log('[ComandaStylePerso] Configuración de cocinero actualizada vía Socket:', data);
    
    // Si viene con refresh=true, recargar configuración completa del servidor
    if (data.refresh) {
      console.log('[ComandaStylePerso] Recargando configuración completa desde servidor...');
      if (loadCocineroConfig) {
        await loadCocineroConfig();
      }
      return;
    }
    
    // Si vienen cambios específicos, actualizar el estado
    if (data.cambios && updateCocineroConfig) {
      console.log('[ComandaStylePerso] Aplicando cambios de configuración:', data.cambios);
      updateCocineroConfig(data.cambios);
    }
    
    // Mostrar notificación al usuario
    setToastMessage({
      type: 'info',
      message: '⚙️ Tu configuración KDS ha sido actualizada',
      duration: 4000
    });
    
    // Reproducir sonido si está habilitado
    if (config.soundEnabled) {
      playNotificationSound();
    }
  }, [updateCocineroConfig, loadCocineroConfig, config.soundEnabled]);

  // Hook Socket.io - REEMPLAZA EL POLLING
  // Se pasa el token para autenticación del handshake
  // TEMA 1: Se pasa el cocineroId para unirse a la room personal y recibir actualizaciones de config
  const { connected, connectionStatus, authError: socketAuthError } = useSocketCocina({
    onNuevaComanda: handleNuevaComanda,
    onComandaActualizada: handleComandaActualizada,
    onPlatoActualizado: handlePlatoActualizado,
    onConfigCocineroActualizada: handleConfigCocineroActualizada, // TEMA 1: Handler para actualizaciones de config
    obtenerComandas: obtenerComandas,
    token: getToken(), // Token JWT para autenticación
    cocineroId: cocineroConfig?.cocineroId || null // TEMA 1: Room personal para actualizaciones de config
  });

  // Actualizar estado de conexión
  useEffect(() => {
    setSocketConnectionStatus(connectionStatus);
  }, [connectionStatus]);

  // Obtener comandas iniciales al montar (SOLO UNA VEZ)
  // El polling ha sido ELIMINADO - ahora se usa Socket.io para actualizaciones en tiempo real
  useEffect(() => {
    obtenerComandas();
    
    // Cleanup solo para timeouts
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []); // Solo ejecutar una vez al montar

  // ============================================================
  // v7.4: Inicializar estados visuales cuando se cargan las comandas
  // Esto es CRÍTICO para que al recargar la página se restauren los estados
  // de las comandas que ya están siendo procesadas por un cocinero
  // ============================================================
  useEffect(() => {
    if (comandas.length === 0) return;
    
    // Inicializar platoStates para platos que ya tienen procesandoPor
    setPlatoStates(prev => {
      const nuevo = new Map(prev);
      let cambios = false;
      
      comandas.forEach(comanda => {
        if (comanda.platos && comanda.procesandoPor?.cocineroId) {
          comanda.platos.forEach((plato, index) => {
            if (plato.procesandoPor?.cocineroId) {
              const key = `${comanda._id}-${index}`;
              if (!nuevo.has(key) || nuevo.get(key) !== 'procesando') {
                nuevo.set(key, 'procesando');
                cambios = true;
              }
            }
          });
        }
      });
      
      return cambios ? nuevo : prev;
    });
    
    // NOTA: NO inicializamos comandaStates automáticamente.
    // Las comandas tomadas por el usuario quedan sin estado visual hasta que
    // el usuario haga click en la tarjeta para activar el ciclo de 2 estados.
  }, [comandas, userId]);

  // Filtrar comandas por término de búsqueda
  useEffect(() => {
    const filtered = comandas.filter((comanda) => {
      if (searchTerm === "") return true;
      return comanda.platos?.some((plato) =>
        (plato.plato?.nombre || plato?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    setFilteredComandas(filtered);
  }, [comandas, searchTerm]);

  // Filtrar comandas por estado (SICAR) - Solo se muestran comandas con status "en_espera"
  // y que tengan al menos un plato aún no entregado (filtro por estado individual de plato).
  // No mostrar comandas donde TODOS los platos están entregado/pagado (ya salieron del ámbito cocina).
  const enEspera = filteredComandas.filter(c => {
    // Si no tiene platos, no mostrar
    if (!c.platos || c.platos.length === 0) return false;

    const platosActivos = c.platos.filter(p => p.eliminado !== true);
    if (platosActivos.length === 0) return false;

    // REGLA: No mostrar comanda si TODOS los platos están en estado entregado o pagado
    const todosEntregadosOPagados = platosActivos.every(p => {
      const e = (p.estado || '').toLowerCase();
      return e === 'entregado' || e === 'pagado';
    });
    if (todosEntregadosOPagados) return false;

    // SOLO mostrar comandas con status "en_espera"
    // REGLA COCINA: NO mostrar comandas con status "recoger" o "entregado" (solo mozos manejan entregado)
    if (c.status !== "en_espera") return false;

    // VALIDACIÓN CRÍTICA: Solo mostrar comandas donde TODOS los platos tengan nombre cargado
    const todosPlatosConNombre = c.platos.every(plato => {
      const platoObj = plato.plato || plato;
      const nombre = platoObj?.nombre || plato?.nombre;
      return nombre && nombre.trim().length > 0;
    });

    if (!todosPlatosConNombre) {
      console.warn(`⚠️ Comanda #${c.comandaNumber} oculta: tiene platos sin nombre cargado`);
      return false;
    }

    return true;
  });

  // Ya no mostramos comandas en "recoger" o "entregado" en el panel principal
  // Solo se muestran comandas con status "en_espera"
  const recoger = []; // Vacío - no mostramos comandas en recoger

  // Ya no mostramos comandas entregadas en el panel principal
  // Solo se muestran en_espera y recoger

  // Debug logs
  useEffect(() => {
    if (comandas.length > 0) {
      console.log('📊 Estadísticas de comandas:');
      console.log(`  - Total recibidas: ${comandas.length}`);
      console.log(`  - Filtradas: ${filteredComandas.length}`);
      console.log(`  - En espera (mostradas): ${enEspera.length}`);
      console.log(`  - Recoger (ocultas): ${filteredComandas.filter(c => {
        if (!c.platos || c.platos.length === 0) return false;
        return c.platos.some(p => p.estado === "recoger");
      }).length}`);
      
      if (filteredComandas.length > 0 && enEspera.length === 0 && recoger.length === 0) {
        console.warn('⚠️ Hay comandas filtradas pero ninguna coincide con los estados esperados');
        console.log('📋 Ejemplo de comanda filtrada:', {
          numero: filteredComandas[0].comandaNumber,
          status: filteredComandas[0].status,
          platos: filteredComandas[0].platos?.map(p => ({
            estado: p.estado,
            nombre: p.plato?.nombre || p.nombre
          }))
        });
      }
    }
  }, [comandas, filteredComandas, enEspera.length, recoger.length]);

  // ========== FUNCIÓN HELPER: Obtener nombre de mesa con soporte para mesas juntadas ==========
  // Si la mesa tiene nombreCombinado (ej: "M5,6,7"), lo usa.
  // Si no, usa el formato tradicional "M{nummesa}".
  const obtenerNombreMesa = (mesa) => {
    if (!mesa) return 'N/A';
    // Si tiene nombreCombinado, usarlo (mesas juntadas)
    if (mesa.nombreCombinado) {
      return mesa.nombreCombinado;
    }
    // Fallback al número de mesa tradicional
    return mesa.nummesa ? `M${mesa.nummesa}` : 'N/A';
  };

  // Calcular tiempo transcurrido (mantener para compatibilidad)
  const calcularTiempoTranscurrido = (comanda) => {
    if (!comanda.createdAt) return { minutos: 0, texto: "0min", horas: 0, minutosRestantes: 0, segundos: 0 };
    
    const ahora = moment().tz("America/Lima");
    const creacion = moment(comanda.createdAt).tz("America/Lima");
    const diffSegundos = ahora.diff(creacion, "seconds");
    const diffMinutos = Math.floor(diffSegundos / 60);
    
    return {
      minutos: diffMinutos,
      horas: Math.floor(diffSegundos / 3600),
      minutosRestantes: Math.floor((diffSegundos % 3600) / 60),
      segundos: diffSegundos % 60,
      texto: diffMinutos < 60 ? `${diffMinutos}min` : `${Math.floor(diffMinutos / 60)}h ${diffMinutos % 60}min`
    };
  };

  // Actualizar tiempos formateados HH:MM:SS cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTiemposComandas(prev => {
        const nuevo = new Map(prev);
        comandas.forEach(comanda => {
          if (!comanda.createdAt) {
            nuevo.set(comanda._id, "00:00:00");
            return;
          }
          const ahora = moment().tz("America/Lima");
          const creacion = moment(comanda.createdAt).tz("America/Lima");
          const diffSegundos = ahora.diff(creacion, "seconds");
          
          const horas = Math.floor(diffSegundos / 3600);
          const minutos = Math.floor((diffSegundos % 3600) / 60);
          const segundos = diffSegundos % 60;
          
          const tiempoFormateado = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
          nuevo.set(comanda._id, tiempoFormateado);
        });
        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [comandas]);

  // Obtener color de alerta por tiempo (SICAR)
  const getColorAlerta = (minutos) => {
    if (minutos < config.alertYellowMinutes) {
      return "bg-white text-gray-900"; // Normal
    } else if (minutos < config.alertRedMinutes) {
      return "bg-yellow-400 text-gray-900"; // Alerta amarilla
    } else {
      return "bg-red-500 text-white animate-pulse"; // Urgente rojo (parpadea)
    }
  };

  // Toggle expandir comanda
  const toggleExpandir = (comandaId) => {
    setExpandedComandas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(comandaId)) {
        nuevo.delete(comandaId);
      } else {
        nuevo.add(comandaId);
      }
      return nuevo;
    });
  };

  // Avanzar estado de comanda completa
  const avanzarEstadoComanda = async (comandaId, estadoActual) => {
    try {
      let nuevoEstado;
      
      if (estadoActual === "en_espera" || estadoActual === "ingresante") {
        // EN ESPERA → RECOGER: Cambiar todos los platos en_espera directamente a recoger
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda) {
          for (const plato of comanda.platos) {
            if (plato.estado === "en_espera" || plato.estado === "ingresante") {
              try {
                // 🔥 CORREGIDO: Usar plato._id (subdocumento único) para distinguir platos duplicados
                await axios.put(
                  `${getApiUrl()}/${comandaId}/plato/${plato._id || plato.plato?._id}/estado`,
                  { nuevoEstado: "recoger" }
                );
              } catch (error) {
                console.error(`Error actualizando plato ${plato._id || plato.plato?._id}:`, error);
                // Continuar con los demás platos aunque uno falle
              }
            }
          }
        }
      }
      // REGLA COCINA: No se maneja 'entregado' aquí (exclusivo de mozos)
      // Si estadoActual === "recoger", la comanda ya está lista para que mozos la recojan
      // No hacer cambios adicionales desde cocina
      
      obtenerComandas();
    } catch (error) {
      console.error("Error al avanzar estado:", error);
      // Mostrar notificación de error sin crash
      if (error.response) {
        const message = error.response.data?.message || error.response.data?.error || 'Error al actualizar el estado';
        console.warn("⚠️ Error del servidor:", message);
      } else {
        console.warn("⚠️ Error de conexión al actualizar estado");
      }
    }
  };

  // Marcar plato como sin stock
  const marcarSinStock = async (comandaId, platoId) => {
    try {
      const comanda = comandas.find(c => c._id === comandaId);
      if (!comanda) {
        console.warn("⚠️ Comanda no encontrada");
        return;
      }
      
      // Encontrar el índice del plato en la lista original
      const platoIndex = comanda.platos.findIndex(
        p => (p.plato?._id || p._id) === platoId
      );
      
      if (platoIndex === -1) {
        console.warn("⚠️ Plato no encontrado en la comanda");
        return;
      }
      
      const updatedComanda = { ...comanda };
      updatedComanda.platos.splice(platoIndex, 1);
      updatedComanda.cantidades.splice(platoIndex, 1);
      
      if (updatedComanda.platos.length === 0) {
        await axios.delete(`${getApiUrl()}/${comandaId}`);
      } else {
        await axios.put(
          `${getApiUrl()}/${comandaId}`,
          updatedComanda
        );
      }
      
      obtenerComandas();
    } catch (error) {
      console.error("Error al marcar sin stock:", error);
      // Mostrar notificación de error sin crash
      if (error.response) {
        const message = error.response.data?.message || error.response.data?.error || 'Error al eliminar el plato';
        console.warn("⚠️ Error del servidor:", message);
      } else {
        console.warn("⚠️ Error de conexión al eliminar plato");
      }
    }
  };

  // Calcular total de comanda
  const calcularTotal = (comanda) => {
    return comanda.platos?.reduce((sum, p, idx) => {
      const precio = parseFloat(p.plato?.precio || 0);
      const cantidad = parseInt(comanda.cantidades?.[idx] || 1);
      return sum + (precio * cantidad);
    }, 0) || 0;
  };

  // Contadores (solo en_espera - ya no mostramos recoger)
  const totalComandas = enEspera.length;

  // PARRAFO 4 - REORDEN: Sort prioritario v5.5 - prioridadOrden primero (más reciente arriba), luego por createdAt
  const todasComandas = [...enEspera].sort((a, b) => {
    const prioA = a.prioridadOrden || 0;
    const prioB = b.prioridadOrden || 0;
    if (prioA !== prioB) return prioB - prioA; // Mayor prioridadOrden arriba
    const tiempoA = a.createdAt ? moment(a.createdAt).valueOf() : 0;
    const tiempoB = b.createdAt ? moment(b.createdAt).valueOf() : 0;
    return tiempoA - tiempoB; // Más antiguas primero si igual prioridad
  });

  // Paginación: basada en configuración de diseño (cols * rows)
  const COMANDAS_POR_PAGINA = (config.design?.cols || 5) * (config.design?.rows || 1);
  const totalPages = Math.ceil(todasComandas.length / COMANDAS_POR_PAGINA);
  const comandasPagina = todasComandas.slice(
    currentPage * COMANDAS_POR_PAGINA,
    (currentPage + 1) * COMANDAS_POR_PAGINA
  );

  // Toggle selección de comanda - Solo permite UNA comanda seleccionada a la vez
  // v7.4.3: Si seleccionas una comanda distinta, se desmarca la anterior
  const toggleSelectOrder = (comandaId) => {
    setSelectedOrders(prev => {
      // Si ya está seleccionada, deseleccionar
      if (prev.has(comandaId)) {
        return new Set();
      }
      // Si no está seleccionada, reemplazar cualquier selección anterior con esta
      return new Set([comandaId]);
    });
  };

  // Toggle checkbox de plato individual - Ciclo de 3 estados según contexto
  // v7.2: Ciclo diferente según si el plato está tomado por el cocinero actual
  // - Plato sin tomar: Normal → Procesando (amarillo) → Seleccionado (verde) → Normal
  // - Plato tomado por mí: Normal → Dejar (rojo) → Seleccionado (verde) → Normal
  // - Plato tomado por otro: NO se puede interactuar (ignorar click)
  const togglePlatoCheck = useCallback((comandaId, platoIndex) => {
    const key = `${comandaId}-${platoIndex}`;
    const miUsuarioId = userId?.toString();
    
    // Buscar el plato para verificar si está tomado por mí o por otro
    const comanda = comandas.find(c => c._id === comandaId);
    const plato = comanda?.platos?.[platoIndex];
    
    // 🔥 FIX: Si el plato está tomado por OTRO cocinero, ignorar el click
    const tomadoPorOtro = plato?.procesandoPor?.cocineroId && 
                          plato.procesandoPor.cocineroId.toString() !== miUsuarioId;
    if (tomadoPorOtro) {
      console.log(`[togglePlatoCheck] Plato ${platoIndex} tomado por otro cocinero, ignorando click`);
      return; // No hacer nada
    }
    
    const tomadoPorMi = plato?.procesandoPor?.cocineroId?.toString() === miUsuarioId;
    
    setPlatoStates(prev => {
      const nuevo = new Map(prev);
      const estadoActual = nuevo.get(key) || 'normal';
      
      let nuevoEstado;
      if (tomadoPorMi) {
        // Ciclo para platos que YO tomé: Normal → Dejar (rojo) → Seleccionado (verde) → Normal
        if (estadoActual === 'normal') {
          nuevoEstado = 'dejar'; // → Rojo ↩️ (para liberar)
        } else if (estadoActual === 'dejar') {
          nuevoEstado = 'seleccionado'; // → Verde ✓ (para finalizar)
        } else {
          nuevoEstado = 'normal'; // Reset
        }
      } else {
        // Ciclo normal: Normal → Procesando (amarillo) → Seleccionado (verde) → Normal
        if (estadoActual === 'normal') {
          nuevoEstado = 'procesando'; // → Amarillo ⏳
        } else if (estadoActual === 'procesando') {
          nuevoEstado = 'seleccionado'; // → Verde ✓
        } else {
          nuevoEstado = 'normal'; // Reset
        }
      }
      
      nuevo.set(key, nuevoEstado);
      
      // SYNC: Sincronizar platoStates 'seleccionado' → platosChecked true (para batch)
      if (nuevoEstado === 'seleccionado') {
        setPlatosChecked(prev => {
          const nuevoChecks = new Map(prev);
          nuevoChecks.set(key, true);
          return nuevoChecks;
        });
      } else {
        // Reset check cuando no está seleccionado
        setPlatosChecked(prev => {
          const nuevoChecks = new Map(prev);
          nuevoChecks.delete(key);
          return nuevoChecks;
        });
      }
      
      return nuevo;
    });
  }, [comandas, userId]);

  // Obtener total de platos marcados
  const getTotalPlatosMarcados = useCallback(() => {
    let total = 0;
    platosChecked.forEach((checked) => {
      if (checked) total++;
    });
    return total;
  }, [platosChecked]);

  // Verificar si una comanda tiene todos los platos listos (solo "recoger" - cocina nunca maneja "entregado")
  const comandaTieneTodosPlatosListos = useCallback((comandaId) => {
    const comanda = comandas.find(c => c._id === comandaId);
    if (!comanda || !comanda.platos || comanda.platos.length === 0) return false;
    
    // Filtrar solo platos no eliminados
    const platosActivos = comanda.platos.filter(p => !p.eliminado);
    if (platosActivos.length === 0) return false;
    
    // REGLA COCINA: Solo considerar 'recoger', nunca 'entregado' (exclusivo de mozos)
    return platosActivos.every(plato => {
      const estado = plato.estado;
      return estado === "recoger";
    });
  }, [comandas]);

  // Contar platos listos (solo "recoger" - cocina nunca maneja "entregado") vs total por comanda
  const getPlatosListosCount = useCallback((comandaId) => {
    const comanda = comandas.find(c => c._id === comandaId);
    if (!comanda || !comanda.platos || comanda.platos.length === 0) return { listos: 0, total: 0 };
    
    const platosActivos = comanda.platos.filter(p => !p.eliminado);
    // REGLA COCINA: Solo contar 'recoger', nunca 'entregado' (exclusivo de mozos)
    const listos = platosActivos.filter(p => {
      const estado = p.estado;
      return estado === "recoger";
    }).length;
    
    return { listos, total: platosActivos.length };
  }, [comandas]);

  // Verificar si las comandas seleccionadas tienen todos los platos listos
  const comandasSeleccionadasTienenTodosPlatosListos = useCallback(() => {
    if (selectedOrders.size === 0) return false;
    
    const comandasSeleccionadas = Array.from(selectedOrders).map(id => 
      comandas.find(c => c._id === id)
    ).filter(Boolean);
    
    if (comandasSeleccionadas.length === 0) return false;
    
    // Todas las comandas seleccionadas deben tener todos los platos listos
    return comandasSeleccionadas.every(comanda => comandaTieneTodosPlatosListos(comanda._id));
  }, [selectedOrders, comandas, comandaTieneTodosPlatosListos]);

  // AUTO-TRIGGER: Monitorear cuando todos los platos están en 'recoger' y auto-cambiar comanda.status
  useEffect(() => {
    const verificarYAutoCompletar = async () => {
      // Iterar sobre todas las comandas visibles
      for (const comanda of comandas) {
        // Solo procesar comandas en 'en_espera' que no hayan sido auto-completadas
        if (comanda.status !== 'en_espera' && comanda.status !== 'ingresante') continue;
        if (comandasAutoCompletadas.has(comanda._id)) continue;
        
        // Verificar si todos los platos están en 'recoger'
        const platosActivos = (comanda.platos || []).filter(p => !p.eliminado);
        if (platosActivos.length === 0) continue;
        
        const todosRecoger = platosActivos.every(p => {
          const estado = p.estado || 'en_espera';
          return estado === 'recoger';
        });
        
        if (todosRecoger) {
          // Chequeo adicional: Si ya está en 'recoger', skip (idempotente)
          if (comanda.status === 'recoger') {
            // Ya completada, marcar como procesada para evitar futuros intentos
            setComandasAutoCompletadas(prev => new Set(prev).add(comanda._id));
            return; // Early return, no hacer PUT redundante
          }
          
          // Auto-completar: cambiar comanda.status a 'recoger'
          try {
            const apiUrl = getApiUrl();
            await axios.put(`${apiUrl}/${comanda._id}/status`, { nuevoStatus: "recoger" });
            
            // Marcar como auto-completada para evitar loops
            setComandasAutoCompletadas(prev => new Set(prev).add(comanda._id));
            
            // Toast notification
            setToastMessage({
              type: 'success',
              message: `✅ Comanda #${comanda.comandaNumber} lista para recoger`,
              duration: 3000
            });
            
            // Sonido de confirmación
            if (config.soundEnabled) {
              playNotificationSound();
            }
          } catch (error) {
            // Manejar error idempotente silenciosamente (ya está en 'recoger')
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '';
            if (errorMessage.includes('Transición inválida') && errorMessage.includes('recoger')) {
              // Error idempotente: comanda ya está en 'recoger', marcar como procesada silenciosamente
              setComandasAutoCompletadas(prev => new Set(prev).add(comanda._id));
              return; // Silencioso, no mostrar error
            }
            
            // Otros errores: mostrar toast de error
            console.error(`❌ AUTO-TRIGGER: Error al auto-completar comanda #${comanda.comandaNumber}:`, error);
            setToastMessage({
              type: 'error',
              message: `⚠️ Error al completar comanda #${comanda.comandaNumber}`,
              duration: 3000
            });
          }
        }
      }
    };
    
    // Ejecutar verificación después de un pequeño delay para evitar ejecuciones excesivas
    const timeoutId = setTimeout(() => {
      verificarYAutoCompletar();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [comandas, comandasAutoCompletadas, config.soundEnabled]);

  // Limpiar comandas auto-completadas cuando cambian (para permitir re-procesamiento si es necesario)
  useEffect(() => {
    // Si una comanda ya no está en 'en_espera', removerla del set de auto-completadas
    setComandasAutoCompletadas(prev => {
      const nuevo = new Set();
      prev.forEach(comandaId => {
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda && (comanda.status === 'en_espera' || comanda.status === 'ingresante')) {
          nuevo.add(comandaId);
        }
      });
      return nuevo;
    });
  }, [comandas]);

  // Auto-ocultar toast después de duración
  useEffect(() => {
    if (toastMessage) {
      const timeoutId = setTimeout(() => {
        setToastMessage(null);
      }, toastMessage.duration || 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [toastMessage]);

  // ============================================================
  // SISTEMA MULTI-COCINERO v7.2: Funciones auxiliares
  // ============================================================

  /**
   * Obtiene información detallada de los platos seleccionados
   * Considera estados visuales y procesandoPor
   */
  const obtenerPlatosSeleccionadosInfo = useCallback(() => {
    const platosInfo = [];
    const miUsuarioId = userId?.toString();
    
    // Recorrer platoStates para encontrar platos con interacción
    platoStates.forEach((estadoVisual, key) => {
      // Solo considerar platos con estado 'procesando' (amarillo) o 'seleccionado' (verde) o 'dejar' (rojo)
      if (estadoVisual !== 'procesando' && estadoVisual !== 'seleccionado' && estadoVisual !== 'dejar') return;
      
      // Parsear key: formato es ${comandaId}-${platoIndex}
      const lastDashIndex = key.lastIndexOf('-');
      if (lastDashIndex === -1) return;
      
      const comandaId = key.substring(0, lastDashIndex);
      const platoIndexStr = key.substring(lastDashIndex + 1);
      const platoIndex = parseInt(platoIndexStr, 10);
      
      if (isNaN(platoIndex)) return;
      
      const comanda = comandas.find(c => c._id === comandaId);
      if (!comanda) return;
      
      const plato = comanda.platos?.[platoIndex];
      if (!plato) return;
      
      const platoId = plato._id?.toString() || plato.platoId?.toString();
      
      // Solo incluir si está pendiente de preparacion
      if (plato.estado === "en_espera" || plato.estado === "ingresante" || plato.estado === "pedido") {
        platosInfo.push({
          comandaId,
          platoId,
          platoIndex,
          plato,
          nombre: plato.plato?.nombre || plato.nombre || 'Plato',
          procesandoPor: plato.procesandoPor,
          estadoVisual // 'procesando' | 'seleccionado' | 'dejar'
        });
      }
    });
    
    return platosInfo;
  }, [comandas, platoStates, userId]);

  /**
   * Determina que accion debe mostrar el boton principal de la barra inferior
   * REGLAS v7.2:
   * - Si algun plato esta tomado por otro cocinero -> SIN_ACCION con mensaje
   * - Si tengo platos en estado 'dejar' (rojo) -> DEJAR_PLATO (liberar)
   * - Si tengo platos en estado 'seleccionado' (verde) y tomados por mi -> FINALIZAR_PLATO
   * - Si tengo platos en amarillo sin tomar -> TOMAR_PLATO
   * - Mixto (algunos tomados por mi, algunos sin tomar) -> TOMAR_PLATO para los restantes
   * 
   * @returns {{modo: string, platos: Array, mensaje: string, subMensaje: string}}
   */
  const determinarAccionBoton = useCallback(() => {
    const platosSeleccionados = obtenerPlatosSeleccionadosInfo();
    
    if (platosSeleccionados.length === 0) {
      return { 
        modo: 'SIN_ACCION', 
        platos: [], 
        mensaje: 'Selecciona platos',
        subMensaje: ''
      };
    }
    
    const miUsuarioId = userId?.toString();
    if (!miUsuarioId) {
      return { 
        modo: 'SIN_ACCION', 
        platos: [], 
        mensaje: 'Sin usuario',
        subMensaje: 'Recarga la pagina'
      };
    }
    
    // Analizar estados de procesamiento y visual
    const analisis = platosSeleccionados.map(p => {
      const procesandoPor = p.procesandoPor;
      const tomadoPorMi = procesandoPor?.cocineroId?.toString() === miUsuarioId;
      const tomadoPorOtro = procesandoPor?.cocineroId && !tomadoPorMi;
      const sinTomar = !procesandoPor?.cocineroId;
      const quiereDejar = p.estadoVisual === 'dejar';
      const quiereFinalizar = p.estadoVisual === 'seleccionado';
      
      return { 
        ...p, 
        tomadoPorMi, 
        tomadoPorOtro, 
        sinTomar,
        quiereDejar,
        quiereFinalizar,
        nombreCocinero: procesandoPor?.alias || procesandoPor?.nombre || 'otro'
      };
    });
    
    // CASO 1: Algun plato tomado por otro cocinero -> BLOQUEAR
    const platosAjenos = analisis.filter(p => p.tomadoPorOtro);
    if (platosAjenos.length > 0) {
      const nombres = [...new Set(platosAjenos.map(p => p.nombreCocinero))].join(', ');
      return {
        modo: 'SIN_ACCION',
        platos: [],
        mensaje: 'Plato ocupado',
        subMensaje: `Tomado por: ${nombres}`
      };
    }
    
    // CASO 2: Platos en estado 'dejar' (rojo) -> DEJAR_PLATO (liberar)
    const platosADejar = analisis.filter(p => p.quiereDejar && p.tomadoPorMi);
    if (platosADejar.length > 0) {
      return {
        modo: 'DEJAR_PLATO',
        platos: platosADejar,
        mensaje: `Dejar ${platosADejar.length} Plato${platosADejar.length > 1 ? 's' : ''}`,
        subMensaje: 'Liberar para otros cocineros'
      };
    }
    
    // CASO 3: Platos en estado 'seleccionado' (verde) tomados por mi -> FINALIZAR
    const platosAFinalizar = analisis.filter(p => p.quiereFinalizar && p.tomadoPorMi);
    if (platosAFinalizar.length > 0) {
      return {
        modo: 'FINALIZAR_PLATO',
        platos: platosAFinalizar,
        mensaje: `Finalizar ${platosAFinalizar.length} Plato${platosAFinalizar.length > 1 ? 's' : ''}`,
        subMensaje: 'Marcar como listos para recoger'
      };
    }
    
    // CASO 4: Platos sin tomar -> TOMAR
    const platosSinTomar = analisis.filter(p => p.sinTomar);
    if (platosSinTomar.length > 0) {
      return {
        modo: 'TOMAR_PLATO',
        platos: platosSinTomar,
        mensaje: `Tomar ${platosSinTomar.length} Plato${platosSinTomar.length > 1 ? 's' : ''}`,
        subMensaje: 'Asignarte la preparacion'
      };
    }
    
    return { 
      modo: 'SIN_ACCION', 
      platos: [], 
      mensaje: 'Sin accion disponible',
      subMensaje: ''
    };
  }, [userId, obtenerPlatosSeleccionadosInfo]);

  /**
   * Handler para TOMAR platos seleccionados
   * Marca los platos como "en preparacion" por el cocinero actual
   */
  const handleTomarPlatos = useCallback(async (platos) => {
    if (!platos || platos.length === 0) return;
    
    setIsFinalizandoPlatos(true);
    console.log(`[TomarPlatos] Tomando ${platos.length} plato(s)...`);
    
    try {
      const resultados = await Promise.allSettled(
        platos.map(({ comandaId, platoId }) => 
          tomarPlato(comandaId, platoId, userId)
        )
      );
      
      const exitosos = resultados.filter(r => 
        r.status === 'fulfilled' && r.value?.success
      ).length;
      const fallidos = resultados.length - exitosos;
      
      if (exitosos > 0) {
        setToastMessage({
          type: 'success',
          message: `👨‍🍳 Tomaste ${exitosos} plato${exitosos > 1 ? 's' : ''} para preparar`,
          duration: 3000
        });
        
        if (config.soundEnabled) {
          playNotificationSound();
        }
      }
      
      if (fallidos > 0) {
        console.warn(`[TomarPlatos] ${fallidos} plato(s) fallaron`);
      }
      
    } catch (error) {
      console.error('[TomarPlatos] Error:', error);
      setToastMessage({
        type: 'error',
        message: '❌ Error al tomar platos',
        duration: 4000
      });
    } finally {
      setIsFinalizandoPlatos(false);
    }
  }, [userId, tomarPlato, config.soundEnabled]);

  /**
   * Handler para DEJAR (liberar) platos que el cocinero actual habia tomado
   * Muestra modal para ingresar motivo antes de liberar (para auditoría)
   */
  const handleDejarPlatos = useCallback(async (platos) => {
    if (!platos || platos.length === 0) return;
    
    // Guardar platos pendientes y mostrar modal de motivo
    setPlatosPendientesDejar(platos);
    setDejarMotivo('');
    setShowDejarModal(true);
  }, []);

  /**
   * Ejecuta la liberación de platos después de confirmar el motivo
   * @param {string} motivoConfirmado - Motivo ingresado en el modal
   */
  const ejecutarDejarPlatos = useCallback(async (motivoConfirmado) => {
    if (!motivoConfirmado || platosPendientesDejar.length === 0) return;
    
    setShowDejarModal(false);
    setIsFinalizandoPlatos(true);
    setDejarLoading(true);
    console.log(`[DejarPlatos] Liberando ${platosPendientesDejar.length} plato(s) con motivo: ${motivoConfirmado}`);
    
    try {
      const resultados = await Promise.allSettled(
        platosPendientesDejar.map(({ comandaId, platoId }) => 
          liberarPlato(comandaId, platoId, userId, motivoConfirmado)
        )
      );
      
      const exitosos = resultados.filter(r => 
        r.status === 'fulfilled' && r.value?.success
      ).length;
      
      if (exitosos > 0) {
        // Limpiar estado visual de los platos liberados
        platosPendientesDejar.forEach(({ comandaId, platoIndex }) => {
          const key = `${comandaId}-${platoIndex}`;
          setPlatoStates(prev => {
            const nuevo = new Map(prev);
            nuevo.set(key, 'normal');
            return nuevo;
          });
        });
        
        setToastMessage({
          type: 'info',
          message: `Plato${exitosos > 1 ? 's liberados' : ' liberado'} - disponible para otros`,
          duration: 3000
        });
      }
      
      // Limpiar estado
      setPlatosPendientesDejar([]);
      setDejarMotivo('');
      
    } catch (error) {
      console.error('[DejarPlatos] Error:', error);
      setToastMessage({
        type: 'error',
        message: '❌ Error al liberar platos',
        duration: 4000
      });
    } finally {
      setIsFinalizandoPlatos(false);
      setDejarLoading(false);
    }
  }, [userId, liberarPlato, platosPendientesDejar]);

  // Función genérica para batch finalizar platos (unifica lógica FinalizarPlatos y FinalizarComanda)
  // REGLA COCINA: Siempre usa 'recoger', nunca 'entregado' (exclusivo de mozos)
  const batchFinalizarPlatos = useCallback(async (platosParaProcesar) => {
    if (platosParaProcesar.length === 0) {
      return { exitosos: 0, fallidos: 0, resultados: [] };
    }

    const apiUrl = getApiUrl();
    
    // Procesar en paralelo - SOLO API de platos, NO tocar comanda.status directamente
    // Backend auto-cambiará comanda.status a 'recoger' cuando TODOS los platos estén en 'recoger'
    const resultados = await Promise.allSettled(
      platosParaProcesar.map(async ({ comandaId, platoId, platoIndex }) => {
        try {
          const comanda = comandas.find(c => c._id === comandaId);
          if (!comanda) {
            console.error(`❌ [batchFinalizarPlatos] Comanda ${comandaId} no encontrada`);
            return { comandaId, platoId, platoIndex, exito: false, error: 'Comanda no encontrada' };
          }
          
          // Si tenemos platoIndex, usarlo; si no, buscar por platoId
          let plato;
          if (platoIndex !== undefined && comanda.platos?.[platoIndex]) {
            plato = comanda.platos[platoIndex];
          } else {
            // 🔥 FIX: Buscar PRIORITARIAMENTE por _id del subdocumento (único)
            plato = comanda.platos?.find(p => {
              const pId = p._id?.toString() || p.plato?._id?.toString() || p.platoId?.toString();
              return pId === platoId?.toString();
            });
          }
          
          if (!plato) {
            console.error(`❌ [batchFinalizarPlatos] Plato ${platoId} no encontrado en comanda ${comandaId}`);
            console.error(`   Platos disponibles:`, comanda.platos?.map(p => ({
              _id: p._id?.toString(),
              platoId: p.platoId,
              estado: p.estado
            })));
            return { comandaId, platoId, platoIndex, exito: false, error: 'Plato no encontrado' };
          }
          
          // 🔥 FIX CRÍTICO: Priorizar SIEMPRE plato._id (subdocumento único)
          // Esto es crucial cuando hay 2+ platos del mismo tipo con complementos diferentes
          const platoIdFinal = plato._id?.toString() || plato.plato?._id?.toString() || platoId?.toString();
          
          if (!platoIdFinal) {
            console.error(`❌ [batchFinalizarPlatos] No se pudo obtener ID del plato`);
            return { comandaId, platoId, platoIndex, exito: false, error: 'ID de plato no disponible' };
          }
          
          console.log(`🔄 [batchFinalizarPlatos] Finalizando plato ${platoIdFinal} (subdocumento _id único)`);
          
          // REGLA COCINA: Solo cambiar a 'recoger', nunca 'entregado'
          const response = await axios.put(
            `${apiUrl}/${comandaId}/plato/${platoIdFinal}/estado`,
            { nuevoEstado: "recoger" }
          );
          
          console.log(`✅ [batchFinalizarPlatos] Plato ${platoIdFinal} actualizado exitosamente`);
          return { 
            comandaId, 
            platoId: platoIdFinal, 
            platoIndex, 
            exito: true,
            nombre: plato.plato?.nombre || plato.nombre || 'Plato'
          };
        } catch (error) {
          // 🔥 FIX: Log detallado y mensaje de error específico
          const errorMsg = error.response?.data?.error || error.message || 'Error desconocido';
          console.error(`❌ [batchFinalizarPlatos] Error finalizando plato ${platoId}:`);
          console.error(`   Error: ${errorMsg}`);
          console.error(`   Status: ${error.response?.status}`);
          console.error(`   Data:`, error.response?.data);
          
          // Obtener nombre del plato para el mensaje de error
          const comanda = comandas.find(c => c._id === comandaId);
          const platoNombre = comanda?.platos?.[platoIndex]?.plato?.nombre || 
                              comanda?.platos?.find(p => p._id?.toString() === platoId?.toString())?.plato?.nombre ||
                              `Plato ${platoIndex !== undefined ? `#${platoIndex + 1}` : platoId}`;
          
          return { 
            comandaId, 
            platoId, 
            platoIndex, 
            exito: false, 
            error: errorMsg,
            nombre: platoNombre
          };
        }
      })
    );

    const exitosos = resultados.filter(r => r.status === 'fulfilled' && r.value.exito).length;
    const fallidos = resultados.length - exitosos;
    
    // 🔥 FIX: Mostrar Toast específico por cada plato fallido
    resultados.forEach(result => {
      if (result.status === 'fulfilled' && !result.value.exito) {
        const { nombre, error } = result.value;
        console.error(`⚠️ Plato "${nombre}" falló: ${error}`);
        // Aquí se podría agregar un toast.error si está disponible
        // toast.error(`Plato "${nombre}": ${error}`);
      }
    });

    return { exitosos, fallidos, resultados };
  }, [comandas]);

  // Handler para finalizar platos marcados con checkboxes
  const handleFinalizarPlatosGlobal = useCallback(async () => {
    // Prevenir double-submit
    if (isFinalizandoPlatos) {
      console.warn('⚠️ Ya se están finalizando platos, por favor espera...');
      return;
    }

    const totalMarcados = getTotalPlatosMarcados();
    if (totalMarcados === 0) {
      console.warn('⚠️ No hay platos seleccionados');
      return;
    }

    setIsFinalizandoPlatos(true);

    try {
      // DEBUG: Verificar estados antes de procesar
      const visualVerdes = Array.from(platoStates.entries()).filter(([k, v]) => v === 'seleccionado');
      console.log('🔍 DEBUG Batch Finalizar:', {
        totalChecked: platosChecked.size,
        visualVerdes: visualVerdes.length,
        visualVerdesKeys: visualVerdes.map(([k]) => k)
      });
      
      // Recopilar TODOS los platos finalizables:
      // 1. Platos con estado visual 'seleccionado' (verde ✓)
      // 2. Platos con check boolean activo (compatibilidad legacy)
      const platosProcesados = [];
      const platosProcesadosSet = new Set(); // Para deduplicar
      
      // Método 1: Platos con estado visual 'seleccionado' (verde ✓)
      platoStates.forEach((estado, key) => {
        if (estado !== 'seleccionado') return;
        
        // Parsear key: formato es ${comandaId}-${platoIndex} (índice, NO ID)
        const lastDashIndex = key.lastIndexOf('-');
        if (lastDashIndex === -1) return;
        
        const comandaId = key.substring(0, lastDashIndex);
        const platoIndexStr = key.substring(lastDashIndex + 1);
        const platoIndex = parseInt(platoIndexStr, 10);
        
        if (isNaN(platoIndex)) return;
        
        const uniqueKey = `${comandaId}-${platoIndex}`;
        if (platosProcesadosSet.has(uniqueKey)) return;
        platosProcesadosSet.add(uniqueKey);
        
        const comanda = comandas.find(c => c._id === comandaId);
        if (!comanda) return;
        
        // Obtener plato por ÍNDICE
        const plato = comanda.platos?.[platoIndex];
        if (!plato) return;
        
        // 🔥 CORREGIDO: Priorizar plato._id (subdocumento único) sobre plato.plato._id (compartido entre duplicados)
        const platoId = plato._id?.toString() || plato.plato?._id?.toString() || plato.platoId?.toString();
        if (!platoId) return;
        
        // Solo procesar platos que no estén ya en 'recoger'
        if (plato.estado === "en_espera" || plato.estado === "ingresante" || plato.estado === "pedido") {
          platosProcesados.push({ comandaId, platoId, platoIndex });
        }
      });
      
      // Método 2: Platos con check boolean activo (compatibilidad legacy)
      platosChecked.forEach((checked, key) => {
        if (!checked) return;
        
        // Parsear key: formato es ${comandaId}-${platoIndex} (índice, NO ID)
        const lastDashIndex = key.lastIndexOf('-');
        if (lastDashIndex === -1) return;
        
        const comandaId = key.substring(0, lastDashIndex);
        const platoIndexStr = key.substring(lastDashIndex + 1);
        const platoIndex = parseInt(platoIndexStr, 10);
        
        if (isNaN(platoIndex)) return;
        
        const uniqueKey = `${comandaId}-${platoIndex}`;
        if (platosProcesadosSet.has(uniqueKey)) return; // Ya incluido
        platosProcesadosSet.add(uniqueKey);
        
        const comanda = comandas.find(c => c._id === comandaId);
        if (!comanda) return;
        
        // Obtener plato por ÍNDICE
        const plato = comanda.platos?.[platoIndex];
        if (!plato) return;
        
        // 🔥 CORREGIDO: Priorizar plato._id (subdocumento único) sobre plato.plato._id (compartido entre duplicados)
        const platoId = plato._id?.toString() || plato.plato?._id?.toString() || plato.platoId?.toString();
        if (!platoId) return;
        
        // Solo procesar platos que no estén ya en 'recoger'
        if (plato.estado === "en_espera" || plato.estado === "ingresante" || plato.estado === "pedido") {
          platosProcesados.push({ comandaId, platoId, platoIndex });
        }
      });

      if (platosProcesados.length === 0) {
        console.warn('⚠️ No hay platos válidos para finalizar');
        console.warn('🔍 DEBUG: Verificar que platos estén en estado "seleccionado" (verde ✓)');
        return;
      }

      console.log(`🔄 Finalizando ${platosProcesados.length} plato(s)...`, platosProcesados);

      // Usar función genérica batch
      const { exitosos, fallidos, resultados } = await batchFinalizarPlatos(platosProcesados);

      // Resetear estados de platos exitosos a 'normal' (post-success) + limpiar checks
      setPlatoStates(prev => {
        const nuevo = new Map(prev);
        resultados.forEach(result => {
          if (result.status === 'fulfilled' && result.value.exito) {
            const { comandaId, platoIndex } = result.value;
            // Usar platoIndex para el key (igual que en togglePlatoCheck)
            const key = `${comandaId}-${platoIndex}`;
            nuevo.set(key, 'normal'); // Reset a normal después de finalizar
          }
        });
        return nuevo;
      });
      
      // Limpiar checks boolean también
      setPlatosChecked(prev => {
        const nuevo = new Map(prev);
        resultados.forEach(result => {
          if (result.status === 'fulfilled' && result.value.exito) {
            const { comandaId, platoIndex } = result.value;
            // Usar platoIndex para el key
            const key = `${comandaId}-${platoIndex}`;
            nuevo.delete(key);
          }
        });
        return nuevo;
      });
      
      // PARRAFO 6 - RESET UX v5.5: Resetear prioridadOrden=0 cuando todos los platos estén en recoger
      const comandasAResetear = new Set();
      resultados.forEach(result => {
        if (result.status === 'fulfilled' && result.value.exito) {
          comandasAResetear.add(result.value.comandaId);
        }
      });
      comandasAResetear.forEach(async (comandaId) => {
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda && comanda.prioridadOrden > 0) {
          try {
            await axios.put(`${getApiUrl()}/${comandaId}/prioridad`, { prioridadOrden: 0 });
          } catch (err) {
            console.warn('⚠️ No se pudo resetear prioridad:', err);
          }
        }
      });
      
      if (exitosos > 0) {
        console.log(`✅ ${exitosos} plato(s) finalizado(s) exitosamente - Estado: 'recoger'`);
        console.log(`ℹ️ La comanda permanecerá en 'en_espera' hasta que TODOS los platos estén listos`);
      }
      if (fallidos > 0) {
        console.warn(`⚠️ ${fallidos} plato(s) fallaron al finalizar`);
        
        // 🔥 FIX: Mostrar alert con detalles de platos fallidos
        const platosFallidos = resultados
          .filter(r => r.status === 'fulfilled' && !r.value.exito)
          .map(r => {
            const { nombre, error } = r.value;
            return `• ${nombre}: ${error}`;
          })
          .join('\n');
        
        if (platosFallidos) {
          alert(`⚠️ ${fallidos} plato(s) no pudieron ser finalizados:\n\n${platosFallidos}\n\nRevisa la consola para más detalles.`);
        }
      }
    } finally {
      setIsFinalizandoPlatos(false);
    }
  }, [platoStates, comandas, getTotalPlatosMarcados, isFinalizandoPlatos, batchFinalizarPlatos]);

  /**
   * Handler unificado para el boton contextual de la barra inferior
   * Decide la accion basandose en el modo calculado
   * IMPORTANTE: Este handler debe definirse DESPUES de handleFinalizarPlatosGlobal
   */
  const handleBotonContextual = useCallback(async () => {
    const { modo, platos } = determinarAccionBoton();
    
    switch (modo) {
      case 'TOMAR_PLATO':
        await handleTomarPlatos(platos);
        break;
      case 'DEJAR_PLATO':
        await handleDejarPlatos(platos);
        break;
      case 'FINALIZAR_PLATO':
        await handleFinalizarPlatosGlobal();
        break;
      case 'SIN_ACCION':
      default:
        console.log('[BotonContextual] Sin accion disponible');
        break;
    }
  }, [determinarAccionBoton, handleTomarPlatos, handleDejarPlatos, handleFinalizarPlatosGlobal]);

  // Handler para finalizar comanda completa - REGLA: Solo batch platos a 'recoger', nunca 'entregado'
  const handleFinalizarComandaCompletaGlobal = useCallback(async () => {
    if (selectedOrders.size === 0) {
      alert('⚠️ Por favor, selecciona al menos una comanda para finalizar.');
      return;
    }

    // Obtener comandas seleccionadas
    const comandasParaFinalizar = Array.from(selectedOrders).map(comandaId => {
      return comandas.find(c => c._id === comandaId);
    }).filter(Boolean);

    if (comandasParaFinalizar.length === 0) {
      alert('⚠️ No se encontraron comandas seleccionadas.');
      return;
    }

    // Mostrar confirmación
    const comandaPrincipal = comandasParaFinalizar[0];
    const textoConfirmacion = comandasParaFinalizar.length === 1
      ? `¿Finalizar Orden #${comandaPrincipal.comandaNumber}? Todos los platos se marcarán como listos para recoger.`
      : `¿Finalizar ${comandasParaFinalizar.length} comandas? Todos los platos se marcarán como listos para recoger.`;

    if (!window.confirm(textoConfirmacion)) {
      return;
    }

    // REGLA COCINA: Extraer TODOS los platos 'en_espera' de todas las comandas seleccionadas
    const platosParaProcesar = [];
    comandasParaFinalizar.forEach(comanda => {
      const platosActivos = (comanda.platos || []).filter(p => !p.eliminado);
      platosActivos.forEach((plato, idx) => {
        const estado = plato.estado || 'en_espera';
        // Solo procesar platos que no estén ya en 'recoger'
        if (estado === 'en_espera' || estado === 'ingresante' || estado === 'pedido') {
          // 🔥 CORREGIDO: Usar plato._id (subdocumento único) para distinguir platos duplicados
          const platoId = plato._id || plato.plato?._id || plato.platoId;
          if (platoId) {
            // 🔥 CORREGIDO: Buscar el índice por subdocumento _id (único) para mayor precisión
            const realIndex = comanda.platos.findIndex(p => 
              p._id?.toString() === plato._id?.toString()
            );
            platosParaProcesar.push({ comandaId: comanda._id, platoId, platoIndex: realIndex >= 0 ? realIndex : idx });
          }
        }
      });
    });

    if (platosParaProcesar.length === 0) {
      alert('⚠️ No hay platos para finalizar en las comandas seleccionadas.');
      return;
    }

    console.log(`🔄 Finalizando ${platosParaProcesar.length} plato(s) de ${comandasParaFinalizar.length} comanda(s)...`);

    // Usar función genérica batch (misma lógica que FinalizarPlatos)
    const { exitosos, fallidos, resultados } = await batchFinalizarPlatos(platosParaProcesar);

    // Limpiar selección y checks de comandas exitosas
    if (exitosos > 0) {
      const comandasExitosas = new Set();
      resultados.forEach(result => {
        if (result.status === 'fulfilled' && result.value.exito) {
          comandasExitosas.add(result.value.comandaId);
        }
      });

      // PARRAFO 6 - RESET UX v5.5: Resetear prioridadOrden=0 al finalizar
      comandasExitosas.forEach(async (comandaId) => {
        try {
          await axios.put(`${getApiUrl()}/${comandaId}/prioridad`, { prioridadOrden: 0 });
        } catch (err) {
          console.warn('⚠️ No se pudo resetear prioridad:', err);
        }
      });

      // Limpiar selección
      setSelectedOrders(prev => {
        const nuevo = new Set(prev);
        comandasExitosas.forEach(id => nuevo.delete(id));
        return nuevo;
      });

      // Limpiar checks de comandas exitosas
      setPlatosChecked(prev => {
        const nuevo = new Map(prev);
        comandasExitosas.forEach(comandaId => {
          nuevo.forEach((checked, key) => {
            if (key.startsWith(`${comandaId}-`)) {
              nuevo.delete(key);
            }
          });
        });
        return nuevo;
      });

      // Toast de éxito
      const mensaje = comandasParaFinalizar.length === 1
        ? `✅ Comanda #${comandaPrincipal.comandaNumber} lista para recoger`
        : `✅ ${comandasParaFinalizar.length} comandas listas para recoger`;
      
      setToastMessage({
        type: 'success',
        message: mensaje,
        duration: 3000
      });

      if (config.soundEnabled) {
        playNotificationSound();
      }

      console.log(`✅ ${exitosos} plato(s) finalizado(s) exitosamente - Estado: 'recoger'`);
      console.log(`ℹ️ Backend auto-cambiará comanda.status a 'recoger' cuando TODOS los platos estén listos`);
    }

    if (fallidos > 0) {
      console.warn(`⚠️ ${fallidos} plato(s) fallaron al finalizar`);
      setToastMessage({
        type: 'error',
        message: `⚠️ ${fallidos} plato(s) no se pudieron finalizar`,
        duration: 3000
      });
    }
  }, [comandas, selectedOrders, batchFinalizarPlatos, config.soundEnabled]);

  // ============================================================
  // v7.4: HANDLERS PARA EL SISTEMA DE 3 ESTADOS DE COMANDA
  // ============================================================

  /**
   * Handler para tomar una comanda completa
   * v7.4.1: Después de tomar, la comanda queda sin selección visual.
   * El usuario debe hacer click en la tarjeta para activar el ciclo de 2 estados.
   */
  const handleTomarComanda = useCallback(async (comandaId) => {
    if (!userId) {
      setToastMessage({ type: 'error', message: '⚠️ Usuario no identificado', duration: 3000 });
      return;
    }
    
    console.log(`[TomarComanda] Tomando comanda ${comandaId}`);
    const result = await tomarComanda(comandaId, userId);
    
    if (result.success) {
      // IMPORTANTE: Deseleccionar la comanda para que el usuario pueda interactuar
      // con el ciclo de 2 estados sin interferencia de la selección en lote
      setSelectedOrders(new Set());
      
      // Eliminar cualquier estado previo de la comanda (queda sin selección)
      setComandaStates(prev => {
        const nuevo = new Map(prev);
        nuevo.delete(comandaId);
        return nuevo;
      });
      
      // Actualizar estados visuales de los platos
      setPlatoStates(prev => {
        const nuevo = new Map(prev);
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda && comanda.platos) {
          comanda.platos.forEach((plato, index) => {
            const key = `${comandaId}-${index}`;
            nuevo.set(key, 'procesando');
          });
        }
        return nuevo;
      });
      
      setToastMessage({
        type: 'success',
        message: '👨‍🍳 Comanda tomada - Click en la tarjeta para opciones',
        duration: 3000
      });
    }
  }, [userId, tomarComanda, comandas, setPlatoStates, setComandaStates]);

  /**
   * Handler para cambiar el estado visual de una comanda (ciclar entre dejar y finalizar)
   * Solo 2 estados de selección: dejar (rojo) → finalizar (verde) → deseleccionar
   * v7.4.3: Solo permite UNA comanda seleccionada a la vez
   */
  const handleComandaCardClick = useCallback((comandaId) => {
    const comanda = comandas.find(c => c._id === comandaId);
    if (!comanda) return;
    
    const tomadaPorMi = comanda.procesandoPor?.cocineroId?.toString() === userId?.toString();
    if (!tomadaPorMi) return;
    
    // v7.4.3: Limpiar selección de comandas NO tomadas (selectedOrders)
    setSelectedOrders(new Set());
    
    // Ciclar entre estados: dejar → finalizar → deseleccionar (eliminar del mapa)
    setComandaStates(prev => {
      const currentState = prev.get(comandaId);
      const nuevo = new Map();
      
      if (!currentState || currentState === 'normal') {
        // Sin selección → 1er click: dejar (rojo)
        // Solo esta comanda queda seleccionada
        nuevo.set(comandaId, 'dejar');
      } else if (currentState === 'dejar') {
        // 1er estado → 2do click: finalizar (verde)
        nuevo.set(comandaId, 'finalizar');
      }
      // else: 2do estado → 3er click: deseleccionar (mapa vacío)
      
      return nuevo;
    });
  }, [comandas, userId, setComandaStates, setSelectedOrders]);

  /**
   * Handler para dejar una comanda (liberar)
   * v7.4.1: Muestra modal para ingresar motivo antes de liberar (para auditoría)
   */
  const handleDejarComanda = useCallback((comandaId) => {
    if (!userId) {
      setToastMessage({ type: 'error', message: '⚠️ Usuario no identificado', duration: 3000 });
      return;
    }
    
    // Guardar comanda pendiente y mostrar modal de motivo
    setComandaPendienteDejar(comandaId);
    setDejarComandaMotivo('');
    setShowDejarComandaModal(true);
  }, [userId]);
  
  /**
   * Ejecuta la liberación de la comanda después de confirmar el motivo
   */
  const ejecutarDejarComanda = useCallback(async () => {
    if (!dejarComandaMotivo.trim()) {
      alert('Debe ingresar un motivo para dejar la comanda');
      return;
    }
    
    if (!comandaPendienteDejar || !userId) return;
    
    setShowDejarComandaModal(false);
    setDejarComandaLoading(true);
    
    const comandaId = comandaPendienteDejar;
    console.log(`[DejarComanda] Liberando comanda ${comandaId} con motivo: ${dejarComandaMotivo}`);
    
    // Resetear estado visual de la comanda
    setComandaStates(prev => {
      const nuevo = new Map(prev);
      nuevo.delete(comandaId);
      return nuevo;
    });
    
    const result = await liberarComanda(comandaId, userId, dejarComandaMotivo.trim());
    
    if (result.success) {
      // Resetear estados visuales de los platos
      setPlatoStates(prev => {
        const nuevo = new Map(prev);
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda && comanda.platos) {
          comanda.platos.forEach((plato, index) => {
            const key = `${comandaId}-${index}`;
            nuevo.delete(key);
          });
        }
        return nuevo;
      });
      
      setToastMessage({
        type: 'info',
        message: 'Comanda liberada - disponible para otros',
        duration: 3000
      });
    }
    
    // Limpiar estado
    setComandaPendienteDejar(null);
    setDejarComandaMotivo('');
    setDejarComandaLoading(false);
  }, [userId, liberarComanda, dejarComandaMotivo, comandaPendienteDejar, comandas, setComandaStates, setPlatoStates]);

  /**
   * Handler para finalizar una comanda completa
   */
  const handleFinalizarComandaCard = useCallback(async (comandaId) => {
    if (!userId) {
      setToastMessage({ type: 'error', message: '⚠️ Usuario no identificado', duration: 3000 });
      return;
    }
    
    const comanda = comandas.find(c => c._id === comandaId);
    if (!comanda) return;
    
    // Confirmar antes de finalizar
    const confirmMessage = `¿Finalizar Orden #${comanda.comandaNumber}? Todos los platos se marcarán como listos para recoger.`;
    if (!window.confirm(confirmMessage)) return;
    
    console.log(`[FinalizarComanda] Finalizando comanda ${comandaId}`);
    
    // Resetear estado visual de la comanda
    setComandaStates(prev => {
      const nuevo = new Map(prev);
      nuevo.delete(comandaId);
      return nuevo;
    });
    
    const result = await finalizarComanda(comandaId, userId);
    
    if (result.success) {
      // Resetear estados visuales de los platos
      setPlatoStates(prev => {
        const nuevo = new Map(prev);
        if (comanda.platos) {
          comanda.platos.forEach((plato, index) => {
            const key = `${comandaId}-${index}`;
            nuevo.set(key, 'normal');
          });
        }
        return nuevo;
      });
      
      // Limpiar checks
      setPlatosChecked(prev => {
        const nuevo = new Map(prev);
        nuevo.forEach((_, key) => {
          if (key.startsWith(`${comandaId}-`)) {
            nuevo.delete(key);
          }
        });
        return nuevo;
      });
      
      // Limpiar selección
      setSelectedOrders(prev => {
        const nuevo = new Set(prev);
        nuevo.delete(comandaId);
        return nuevo;
      });
      
      if (config.soundEnabled) {
        playNotificationSound();
      }
    }
  }, [userId, finalizarComanda, comandas, setPlatoStates, setPlatosChecked, setSelectedOrders, config.soundEnabled]);

  // PARRAFO 3 - HANDLER: Prioridad Alta v5.5 - Toggle: asigna o quita prioridadOrden
  const handlePrioridadAlta = useCallback(async () => {
    // El rol viene del contexto de autenticación, no de localStorage
    // Buscar comanda: seleccionada o primera en espera
    let comanda = null;
    if (selectedOrders.size === 1) {
      comanda = comandas.find(c => c._id === Array.from(selectedOrders)[0]);
    } else {
      comanda = comandas.find(c => c.status === 'enespera' || c.status === 'en_espera');
    }
    if (!comanda) {
      setToastMessage({ type: 'error', message: '⚠️ No hay comanda para priorizar' });
      return;
    }
    try {
      // TOGGLE: Si ya tiene prioridad, quitarla; si no, asignarla
      const tienePrioridad = comanda.prioridadOrden > 0;
      const nuevaPrioridad = tienePrioridad ? 0 : Date.now();
      await axios.put(`${getApiUrl()}/${comanda._id}/prioridad`, { prioridadOrden: nuevaPrioridad });
      setSelectedOrders(new Set());
      setToastMessage({ 
        type: 'success', 
        message: tienePrioridad 
          ? `✅ #${comanda.comandaNumber} prioridad cancelada` 
          : `✅ #${comanda.comandaNumber} priorizada`
      });
      if (config.soundEnabled) playNotificationSound();
    } catch (err) {
      console.error('Error al priorizar:', err);
      setToastMessage({ type: 'error', message: '⚠️ Error al priorizar' });
    }
  }, [comandas, selectedOrders, config.soundEnabled]);

  // Finalizar comandas seleccionadas (marcar como preparadas)
  const handleFinalizar = async () => {
    if (selectedOrders.size === 0) return;
    
    try {
      const comandasParaFinalizar = Array.from(selectedOrders);
      
      for (const comandaId of comandasParaFinalizar) {
        const comanda = todasComandas.find(c => c._id === comandaId);
        if (!comanda) continue;

        // Cambiar todos los platos a "recoger"
        for (const plato of comanda.platos) {
          if (plato.estado !== "recoger" && plato.estado !== "entregado") {
            try {
              // 🔥 CORREGIDO: Usar plato._id (subdocumento único) para distinguir platos duplicados
              await axios.put(
                `${getApiUrl()}/${comandaId}/plato/${plato._id || plato.plato?._id}/estado`,
                { nuevoEstado: "recoger" }
              );
            } catch (error) {
              console.error(`Error actualizando plato ${plato._id || plato.plato?._id}:`, error);
            }
          }
        }

        // Actualizar status de comanda a "recoger" (preparado)
        try {
          await axios.put(
            `${getApiUrl()}/${comandaId}/status`,
            { nuevoStatus: "recoger" }
          );
        } catch (error) {
          console.error("Error actualizando status de comanda:", error);
        }
      }

      // Limpiar selección y refrescar
      setSelectedOrders(new Set());
      obtenerComandas();
      
      // Mostrar notificación de éxito
      console.log(`✅ ${comandasParaFinalizar.length} comanda(s) marcada(s) como PREPARADA(S)`);
    } catch (error) {
      console.error("Error al finalizar comandas:", error);
      alert("Error al finalizar comandas. Por favor, intente nuevamente.");
    }
  };

  // 🔥 NUEVO: Función para anular plato individual desde cocina
  const handleAnularPlato = useCallback(async () => {
    if (selectedOrders.size !== 1) {
      alert('Seleccione una sola comanda para anular un plato');
      return;
    }
    
    const comandaId = Array.from(selectedOrders)[0];
    const platosMarcados = [];
    
    platosChecked.forEach((checked, key) => {
      if (checked) {
        const [cid, platoIdx] = key.split('-');
        if (cid === comandaId) {
          platosMarcados.push(parseInt(platoIdx));
        }
      }
    });
    
    if (platosMarcados.length === 0) {
      alert('Seleccione al menos un plato para anular');
      return;
    }
    
    if (!anularMotivo) {
      alert('Seleccione un motivo de anulación');
      return;
    }
    
    setAnularLoading(true);
    
    try {
      // Anular cada plato marcado
      for (const platoIndex of platosMarcados) {
        await axios.put(
          `${getApiUrl()}/${comandaId}/anular-plato/${platoIndex}`,
          {
            motivo: anularMotivo,
            observaciones: anularObservaciones,
            sourceApp: 'cocina'
          }
        );
      }
      
      // Limpiar estados
      setAnularMotivo('');
      setAnularObservaciones('');
      setShowAnularModal(false);
      setPlatosChecked(new Map());
      setSelectedOrders(new Set());
      
      // Refrescar comandas
      obtenerComandas();
      
      console.log(`✅ ${platosMarcados.length} plato(s) anulado(s) correctamente`);
      
    } catch (error) {
      console.error('Error al anular plato:', error);
      alert(error.response?.data?.message || 'Error al anular el plato');
    } finally {
      setAnularLoading(false);
    }
  }, [selectedOrders, platosChecked, anularMotivo, anularObservaciones, obtenerComandas]);

  // 🔥 NUEVO: Función para anular toda la comanda
  const handleAnularComandaCompleta = useCallback(async () => {
    if (selectedOrders.size !== 1) {
      alert('Seleccione una sola comanda para anular');
      return;
    }
    
    if (!anularMotivo) {
      alert('Seleccione un motivo de anulación');
      return;
    }
    
    const comandaId = Array.from(selectedOrders)[0];
    const comanda = comandas.find(c => c._id === comandaId);
    
    if (!comanda) {
      alert('Comanda no encontrada');
      return;
    }
    
    const confirmar = window.confirm(
      `¿Está seguro de anular TODA la comanda #${comanda.comandaNumber}?\n` +
      `Esto anulará todos los platos y la comanda pasará a estado CANCELADO.`
    );
    
    if (!confirmar) return;
    
    setAnularLoading(true);
    
    try {
      await axios.put(
        `${getApiUrl()}/${comandaId}/anular-todo`,
        {
          motivo: anularMotivo,
          observaciones: anularObservaciones,
          sourceApp: 'cocina'
        }
      );
      
      // Limpiar estados
      setAnularMotivo('');
      setAnularObservaciones('');
      setShowAnularModal(false);
      setSelectedOrders(new Set());
      
      // Refrescar comandas
      obtenerComandas();
      
      console.log(`✅ Comanda #${comanda.comandaNumber} anulada completamente`);
      
    } catch (error) {
      console.error('Error al anular comanda:', error);
      alert(error.response?.data?.message || 'Error al anular la comanda');
    } finally {
      setAnularLoading(false);
    }
  }, [selectedOrders, anularMotivo, anularObservaciones, comandas, obtenerComandas]);

  // REGLA COCINA: Esta función fue eliminada - Cocina nunca maneja 'entregado' (exclusivo de mozos)
  // La función marcarEntregadas ya no existe en cocina

  // Resetear página cuando cambian las comandas o la configuración de diseño
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [todasComandas.length, totalPages, config.design?.cols, config.design?.rows]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log("Error al entrar en fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Detectar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Estadísticas para reportes
  const estadisticas = {
    totalComandas: comandas.length,
    comandasEntregadas: comandas.filter(c => c.status === "entregado").length,
    totalVentas: comandas.reduce((sum, c) => {
      return sum + (c.platos?.reduce((platoSum, p, idx) => {
        const precio = parseFloat(p.plato?.precio || 0);
        const cantidad = parseInt(c.cantidades?.[idx] || 1);
        return platoSum + (precio * cantidad);
      }, 0) || 0);
    }, 0),
    ventasPorMozo: {},
    platosMasPedidos: {}
  };

  comandas.forEach(comanda => {
    const mozoName = comanda.mozos?.name || "Sin mozo";
    const venta = calcularTotal(comanda);
    estadisticas.ventasPorMozo[mozoName] = (estadisticas.ventasPorMozo[mozoName] || 0) + venta;
    
    comanda.platos?.forEach((p, idx) => {
      const nombrePlato = p.plato?.nombre || "Sin nombre";
      const cantidad = parseInt(comanda.cantidades?.[idx] || 1);
      estadisticas.platosMasPedidos[nombrePlato] = 
        (estadisticas.platosMasPedidos[nombrePlato] || 0) + cantidad;
    });
  });

  // Variables de modo nocturno
  const nightMode = config.nightMode !== false; // Default true
  const bgMain = nightMode ? 'bg-black' : 'bg-gray-50';
  const bgHeader = nightMode ? 'bg-black' : 'bg-white';
  const bgGrid = nightMode ? 'bg-gray-950' : 'bg-gray-100';
  const bgSearch = nightMode ? 'bg-gray-900' : 'bg-gray-200';
  const bgButton = nightMode ? 'bg-gray-800' : 'bg-gray-200';
  const bgButtonHover = nightMode ? 'hover:bg-gray-700' : 'hover:bg-gray-300';
  const textMain = nightMode ? 'text-white' : 'text-gray-900';
  const textSecondary = nightMode ? 'text-gray-400' : 'text-gray-600';
  const borderMain = nightMode ? 'border-gray-700' : 'border-gray-300';
  const borderSearch = nightMode ? 'border-gray-800' : 'border-gray-300';
  const textButton = nightMode ? 'text-white' : 'text-gray-900';
  const bgBottomBar = nightMode ? 'bg-gray-900' : 'bg-white';
  const borderBottomBar = nightMode ? 'border-gray-700' : 'border-gray-300';

  return (
    <div className={`w-full ${isFullscreen ? 'h-screen' : 'min-h-screen'} flex flex-col ${bgMain} ${textMain} overflow-hidden`}>
      {/* Header fijo estilo SICAR - Mejorado con indicadores de Vista */}
      <header className={`h-16 ${bgHeader} border-b-2 ${borderMain} flex items-center justify-between px-6 flex-shrink-0 z-50 relative shadow-lg`}>
        {/* Título centrado */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 className={`text-2xl font-bold ${textMain} tracking-wide`} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '1px' }}>
            COCINA LAS GAMBUSINAS
          </h1>
        </div>
        
        {/* Hora actual a la izquierda */}
        <div className="flex flex-col items-start">
          <div className={`text-2xl font-bold ${textMain}`} style={{ fontFamily: 'Arial, sans-serif' }}>
            {horaActual.format("HH:mm")}
          </div>
          <div className={`text-xs ${textSecondary}`}>{fechaActual.format("DD/MM/YYYY")}</div>
        </div>

        {/* Contador y botones a la derecha */}
        <div className="flex items-center gap-4">
          {/* Indicador de Vista Personalizada (fijo, sin toggle) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600 rounded text-white text-xs font-semibold">
              <FaFilter className="text-xs" />
              <span>Vista Personalizada</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-xs ${textSecondary}`}>Comandas Pendientes:</div>
            <div className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Arial, sans-serif' }}>
              {totalComandas}
            </div>
          </div>
          
          {/* Indicador de conexión Socket.io */}
          <div className="flex items-center gap-2">
            {socketConnectionStatus === 'conectado' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-600 rounded text-white text-xs font-semibold">
                <span>●</span> Realtime
              </div>
            )}
            {socketConnectionStatus === 'desconectado' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded text-white text-xs font-semibold">
                <span>●</span> Desconectado
              </div>
            )}
            {socketConnectionStatus === 'auth_error' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-600 rounded text-white text-xs font-semibold" title={socketAuthError}>
                <span>●</span> Error Auth
              </div>
            )}
          </div>
          
          {/* Botones pequeños arriba derecha - Orden: Regresar → Buscar → Reportes → Config → Revertir */}
          <div className="flex gap-2">
            {/* Botón Regresar al Menú */}
            <button
              onClick={handleGoToMenu}
              className={`px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded text-white text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md flex items-center gap-1`}
              title="Volver al Menú Principal"
            >
              <FaArrowLeft /> Menú
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`px-3 py-1.5 ${bgButton} ${bgButtonHover} active:${nightMode ? 'bg-gray-600' : 'bg-gray-400'} rounded ${textButton} text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md`}
              title="Buscar"
            >
              🔍 Buscar
            </button>
            <button
              onClick={() => setShowReports(true)}
              className={`px-3 py-1.5 ${bgButton} ${bgButtonHover} active:${nightMode ? 'bg-gray-600' : 'bg-gray-400'} rounded ${textButton} text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md`}
              title="Reportes"
            >
              📊 Reportes
            </button>
            <button
              onClick={() => setShowConfig(true)}
              className={`px-3 py-1.5 ${bgButton} ${bgButtonHover} active:${nightMode ? 'bg-gray-600' : 'bg-gray-400'} rounded ${textButton} text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md`}
              title="Configuración"
            >
              ⚙️ Config
            </button>
            <button
              onClick={() => setShowRevertir(true)}
              className={`px-3 py-1.5 ${bgButton} ${bgButtonHover} active:${nightMode ? 'bg-gray-600' : 'bg-gray-400'} rounded ${textButton} text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md`}
              title="Revertir"
            >
              ↩️ Revertir
            </button>
            <button
              onClick={toggleFullscreen}
              className={`px-3 py-1.5 ${bgButton} ${bgButtonHover} active:${nightMode ? 'bg-gray-600' : 'bg-gray-400'} rounded ${textButton} text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md`}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        </div>
      </header>

      {/* Barra de búsqueda (opcional, se puede ocultar) */}
      {showSearch && (
        <div className={`${bgSearch} border-b ${borderSearch} px-6 py-2 flex-shrink-0`}>
          <SearchBar onSearch={setSearchTerm} />
        </div>
      )}

      {/* ==================== BARRA DE INFO DE COCINERO Y ZONAS (VISTA PERSONALIZADA) ==================== */}
      <div className={`${bgMain} border-b ${borderMain} px-6 py-2 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          {/* Estado de carga de configuración */}
          {configLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
              <span className={`text-sm ${textSecondary}`}>Cargando tu configuración personalizada...</span>
            </div>
          ) : (
            <>
              {/* Info del cocinero y zonas */}
              <CocineroInfo
                aliasCocinero={cocineroConfig?.aliasCocinero}
                userName={userName}
                zonasAsignadas={cocineroConfig?.zonasAsignadas}
                zonaActivaId={zonaActivaId}
                onZonaChange={setZonaActiva}
                nightMode={nightMode}
              />
              
              {/* Badge de filtros activos */}
              {estadisticasFiltrado && estadisticasFiltrado.comandasOcultas > 0 && (
                <FilterStatusBadge
                  comandasOriginales={estadisticasFiltrado.comandasOriginales}
                  comandasVisibles={estadisticasFiltrado.comandasVisibles}
                  platosOcultos={estadisticasFiltrado.platosOcultos}
                  filtrosActivos={true}
                  zonaActivaId={zonaActivaId}
                  nightMode={nightMode}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Grid principal estilo SICAR - Configurable, mejor espaciado */}
      {/* Padding inferior para la barra sticky */}
      <div className={`flex-1 overflow-hidden ${bgGrid} p-3 flex flex-col pb-24`}>
        {todasComandas.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-center ${textSecondary}`}>
              <p className={`text-2xl font-bold mb-2 ${textMain}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                {estadisticasFiltrado?.comandasOcultas > 0
                  ? 'No hay comandas que cumplan tus filtros'
                  : 'No hay comandas activas'}
              </p>
              {estadisticasFiltrado?.comandasOcultas > 0 && (
                <p className={`text-sm ${textSecondary} mb-4`}>
                  Zonas activas: {cocineroConfig?.zonasAsignadas?.filter(z => z.activo !== false).map(z => z.nombre).join(', ') || 'Ninguna'}
                </p>
              )}
              <p className={`text-sm ${textSecondary}`}>Las comandas aparecerán aquí cuando los mozos las envíen</p>
            </div>
          </div>
        ) : (
          <>
            {/* Grid configurable: cuadrados altos 300x500px - CSS Grid pixel-perfect */}
            <motion.div 
              className="flex-1 overflow-y-auto p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="grid gap-5"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 300px))',
                  gridAutoRows: '520px',
                  gap: '20px',
                  justifyContent: 'center',
                  alignContent: 'start'
                }}
              >
                <AnimatePresence>
                  {comandasPagina.map((comanda, index) => {
                const tiempo = calcularTiempoTranscurrido(comanda);
                const isNew = newComandasRef.current.has(comanda._id);
                // Todas las comandas mostradas están en "en_espera" (ya filtramos las de recoger y mesas pedido)
                const estadoColumna = "en_espera";
                const isSelected = selectedOrders.has(comanda._id);
                // Número de posición de la tarjeta (1, 2, 3, 4, 5...)
                const cardNumber = (currentPage * COMANDAS_POR_PAGINA) + index + 1;
                // Obtener tiempo formateado HH:MM:SS
                const tiempoFormateado = tiemposComandas.get(comanda._id) || "00:00:00";
                return (
                  <SicarComandaCard
                    key={comanda._id}
                    comanda={comanda}
                    tiempo={tiempo}
                    tiempoFormateado={tiempoFormateado}
                    getColorAlerta={getColorAlerta}
                    onListo={() => avanzarEstadoComanda(comanda._id, "recoger")}
                    estadoColumna={estadoColumna}
                    comandaId={comanda._id}
                    isNew={isNew}
                    alertYellowMinutes={config.alertYellowMinutes}
                    alertRedMinutes={config.alertRedMinutes}
                    isSelected={isSelected}
                    onToggleSelect={() => {
                      const tomadaPorMi = comanda.procesandoPor?.cocineroId?.toString() === userId?.toString();
                      if (tomadaPorMi) {
                        // Comanda tomada por mí: solo ciclar estados (dejar → finalizar → normal)
                        handleComandaCardClick(comanda._id);
                      } else {
                        // Comanda no tomada: limpiar comandaStates primero (para selección única)
                        setComandaStates(new Map());
                        // Luego usar sistema de selección normal
                        toggleSelectOrder(comanda._id);
                      }
                    }}
                    fontSize={config.design?.fontSize || 15}
                    platoStates={platoStates}
                    setPlatoStates={setPlatoStates}
                    cardNumber={cardNumber}
                    nightMode={nightMode}
                    platosEliminados={platosEliminados.get(comanda._id) || []}
                    platosChecked={platosChecked}
                    togglePlatoCheck={togglePlatoCheck}
                    usuarioActualId={userId}
                    // v7.4: Props para el sistema de 3 estados de comanda
                    comandaStates={comandaStates}
                    setComandaStates={setComandaStates}
                    onTomarComanda={handleTomarComanda}
                    onDejarComanda={handleDejarComanda}
                    onFinalizarComanda={handleFinalizarComandaCard}
                    obtenerNombreMesa={obtenerNombreMesa}
                  />
                  );
                })}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Barra inferior sticky: Boton Contextual (Tomar/Dejar/Finalizar) → Finalizar Comanda → Revertir → Paginado */}
            <div className={`fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 ${bgBottomBar} border-t ${borderBottomBar} z-50`} style={{ boxShadow: '0 -4px 6px rgba(0,0,0,0.1)' }}>
              {/* Orden: Botón Contextual → Finalizar Comanda → Revertir → Paginado */}
              <div className="flex items-center gap-3">
                {/* 1. BOTÓN CONTEXTUAL MULTI-COCINERO v7.2
                    - TOMAR PLATO (Azul): Cuando hay platos sin tomar
                    - DEJAR PLATO (Amarillo): Cuando tengo platos tomados
                    - FINALIZAR PLATO (Verde): Cuando todos los seleccionados estan tomados por mi
                    - SIN_ACCION (Gris): Cuando no hay seleccion o conflicto
                */}
                {(() => {
                  const { modo, platos, mensaje, subMensaje } = determinarAccionBoton();
                  // v7.2: Contar platos con interaccion (amarillo O verde O rojo)
                  const platosConInteraccion = obtenerPlatosSeleccionadosInfo();
                  const hayPlatosSeleccionados = platosConInteraccion.length > 0;
                  const isLoading = isFinalizandoPlatos || procesamientoLoading;
                  
                  // Determinar estilos segun el modo
                  const getButtonStyles = () => {
                    if (!hayPlatosSeleccionados || modo === 'SIN_ACCION') {
                      return nightMode 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-300 text-gray-400 cursor-not-allowed';
                    }
                    switch (modo) {
                      case 'TOMAR_PLATO':
                        return 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer';
                      case 'DEJAR_PLATO':
                        return 'bg-red-500 text-white hover:bg-red-600 cursor-pointer';
                      case 'FINALIZAR_PLATO':
                        return 'bg-green-600 text-white hover:bg-green-700 cursor-pointer';
                      default:
                        return nightMode 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-400 cursor-not-allowed';
                    }
                  };
                  
                  // Determinar efecto hover segun el modo
                  const getHoverEffect = () => {
                    if (!hayPlatosSeleccionados || modo === 'SIN_ACCION' || isLoading) return {};
                    const colors = {
                      'TOMAR_PLATO': 'rgba(59, 130, 246, 0.7)',
                      'DEJAR_PLATO': 'rgba(239, 68, 68, 0.7)',
                      'FINALIZAR_PLATO': 'rgba(34, 197, 94, 0.7)'
                    };
                    return { 
                      scale: 1.05, 
                      boxShadow: `0 0 30px ${colors[modo] || 'rgba(107, 114, 128, 0.7)'}` 
                    };
                  };
                  
                  // Icono segun el modo
                  const getIcon = () => {
                    if (isLoading) {
                      return (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          ⏳
                        </motion.span>
                      );
                    }
                    switch (modo) {
                      case 'TOMAR_PLATO':
                        return <span>👆</span>;
                      case 'DEJAR_PLATO':
                        return <span>↩️</span>;
                      case 'FINALIZAR_PLATO':
                        return (
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                          >
                            ✓
                          </motion.span>
                        );
                      default:
                        return null;
                    }
                  };
                  
                  return (
                    <div className="flex flex-col gap-0">
                      <motion.button
                        onClick={handleBotonContextual}
                        disabled={!hayPlatosSeleccionados || modo === 'SIN_ACCION' || isLoading}
                        className={`px-6 py-3 font-bold rounded-lg text-lg shadow-lg flex items-center gap-2 ${getButtonStyles()}`}
                        whileHover={getHoverEffect()}
                        whileTap={hayPlatosSeleccionados && modo !== 'SIN_ACCION' && !isLoading ? { scale: 0.95 } : {}}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        title={subMensaje || ''}
                      >
                        {getIcon()}
                        <span>{isLoading ? 'Procesando...' : mensaje}</span>
                      </motion.button>
                      {subMensaje && hayPlatosSeleccionados && !isLoading && (
                        <span className="text-xs text-gray-400 mt-0.5 pl-1">{subMensaje}</span>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Botón ACCIÓN COMANDA (3 estados: Tomar/Dejar/Finalizar) */}
                {(() => {
                  const todasListas = comandasSeleccionadasTienenTodosPlatosListos();
                  
                  // v7.4.1: Obtener la comanda relevante para el botón
                  // Prioridad:
                  // 1. Si hay una comanda seleccionada, usar esa
                  // 2. Si no hay selección, buscar la primera comanda tomada por el usuario actual
                  let comandaPrincipal = null;

                  // 1. Prioridad: comanda con estado activo en comandaStates (tomada por mí)
                  const comandaConEstado = Array.from(comandaStates.entries())
                    .find(([id, state]) => state === 'dejar' || state === 'finalizar');
                  if (comandaConEstado) {
                    comandaPrincipal = comandas.find(c => c._id === comandaConEstado[0]);
                  }

                  // 2. Si no hay estado activo, buscar en selectedOrders (comandas no tomadas)
                  if (!comandaPrincipal && selectedOrders.size === 1) {
                    comandaPrincipal = comandas.find(c => c._id === Array.from(selectedOrders)[0]);
                  }
                  
                  const progressInfo = comandaPrincipal 
                    ? getPlatosListosCount(comandaPrincipal._id)
                    : { listos: 0, total: 0 };
                  
                  // REGLA: Si todos los platos están listos, el auto-trigger ya cambió el status
                  if (todasListas && selectedOrders.size > 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-6 py-3 font-bold rounded-lg text-lg bg-green-500 text-white flex items-center gap-2"
                      >
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                        >
                          ✓
                        </motion.span>
                        ¡Listo! Esperando mozos...
                      </motion.div>
                    );
                  }
                  
                  // v7.4: Determinar el estado de la comanda
                  const tomadaPorMi = comandaPrincipal?.procesandoPor?.cocineroId?.toString() === userId?.toString();
                  const tomadaPorOtro = comandaPrincipal?.procesandoPor?.cocineroId && 
                    comandaPrincipal.procesandoPor.cocineroId.toString() !== userId?.toString();
                  const comandaState = comandaPrincipal ? (comandaStates.get(comandaPrincipal._id) || 'normal') : 'normal';
                  
                  // Determinar la acción y estilo del botón
                  let buttonConfig = {
                    label: 'Finalizar Comanda',
                    color: 'bg-blue-600 hover:bg-blue-700',
                    action: handleFinalizarComandaCompletaGlobal,
                    visible: selectedOrders.size > 0 // Solo visible si hay selección para el modo batch
                  };
                  
                  // v7.4.1: Nueva lógica para el botón
                  if (comandaPrincipal) {
                    if (tomadaPorOtro) {
                      // Comanda tomada por otro - no mostrar botón
                      buttonConfig = {
                        label: `Tomada por ${comandaPrincipal.procesandoPor?.alias || 'otro'}`,
                        color: 'bg-gray-600 cursor-not-allowed',
                        action: () => {},
                        visible: true
                      };
                    } else if (!comandaPrincipal.procesandoPor?.cocineroId) {
                      // Comanda no tomada → "Tomar Comanda"
                      buttonConfig = {
                        label: `Tomar Comanda #${comandaPrincipal.comandaNumber}`,
                        color: 'bg-blue-600 hover:bg-blue-700',
                        action: () => handleTomarComanda(comandaPrincipal._id),
                        visible: true
                      };
                    } else if (tomadaPorMi) {
                      // Comanda tomada por mí - usar los 3 estados
                      if (comandaState === 'dejar') {
                        // Estado "dejar" (1er click): contorno rojo → botón "Dejar Comanda"
                        buttonConfig = {
                          label: `Dejar Comanda #${comandaPrincipal.comandaNumber}`,
                          color: 'bg-red-500 hover:bg-red-600',
                          action: () => handleDejarComanda(comandaPrincipal._id),
                          visible: true
                        };
                      } else if (comandaState === 'finalizar') {
                        // Estado "finalizar" (2do click): contorno verde → botón "Finalizar"
                        buttonConfig = {
                          label: `Finalizar #${comandaPrincipal.comandaNumber}`,
                          color: 'bg-green-600 hover:bg-green-700',
                          action: () => handleFinalizarComandaCard(comandaPrincipal._id),
                          visible: true
                        };
                      } else {
                        // Estado "normal" (inicial/3er click): sin contorno especial → SIN botón
                        // El usuario debe hacer click en la tarjeta para ciclar estados
                        buttonConfig = {
                          label: '',
                          color: '',
                          action: () => {},
                          visible: false
                        };
                      }
                    }
                  }
                  
                  // Si no hay comanda relevante y no hay selección, no mostrar el botón
                  if (!buttonConfig.visible) {
                    return null;
                  }
                  
                  const isDisabled = tomadaPorOtro;
                  
                  return (
                    <motion.button
                      onClick={buttonConfig.action}
                      disabled={isDisabled}
                      className={`px-6 py-3 font-bold rounded-lg text-lg shadow-lg flex items-center gap-2 ${
                        isDisabled
                          ? (nightMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed')
                          : `${buttonConfig.color} text-white cursor-pointer`
                      }`}
                      whileHover={!isDisabled ? { 
                        scale: 1.05, 
                        boxShadow: "0 0 30px rgba(59, 130, 246, 0.7)" 
                      } : {}}
                      whileTap={!isDisabled ? { scale: 0.95 } : {}}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <span>{buttonConfig.label}</span>
                    </motion.button>
                  );
                })()}

                {/* 3. Botón REVERTIR v5.5 - Texto dinámico con conteo de platos en RECOGER */}
                {(() => {
                  // Solo platos en estado RECOGER - SIN límite de tiempo
                  // EXCLUIR platos eliminados y ANULADOS (irreversibles desde cocina)
                  const platosReversibles = comandas.flatMap(c => 
                    (c.platos || [])
                      .filter(p => {
                        // EXCLUIR platos eliminados (soft delete técnico)
                        if (p.eliminado === true) return false;
                        // EXCLUIR platos ANULADOS (acción de mozo - IRREVERSIBLE)
                        if (p.anulado === true) return false;
                        const estado = p.estado || 'en_espera';
                        // SOLO platos en estado 'recoger' son reversibles
                        return estado === 'recoger';
                      })
                      .map(p => ({
                        comandaId: c._id,
                        comandaNumber: c.comandaNumber,
                        platoId: p.plato?._id || p._id || p.platoId,
                        nombre: p.plato?.nombre || p.nombre || 'Sin nombre',
                        estado: p.estado,
                        mozo: c.mozos?.name || 'Sin mozo',
                        mesa: obtenerNombreMesa(c.mesas)
                      }))
                  );
                  const totalReversibles = platosReversibles.length;
                  return (
                    <motion.button
                      onClick={() => {
                        setPlatosChecked(new Map());
                        setShowRevertir(true);
                      }}
                      className={`px-4 py-2 ${bgButton} ${bgButtonHover} ${textButton} font-semibold rounded-lg text-sm shadow-md flex items-center gap-1`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaUndo className="text-sm" />
                      REVERTIR{totalReversibles > 0 ? ` (${totalReversibles})` : ''}
                    </motion.button>
                  );
                })()}

                {/* 🔥 NUEVO: Botón ANULAR - Anular platos desde cocina */}
                {(() => {
                  const platosMarcados = getTotalPlatosMarcados();
                  const hasSelection = selectedOrders.size === 1;
                  const comandaSeleccionada = hasSelection 
                    ? comandas.find(c => c._id === Array.from(selectedOrders)[0])
                    : null;
                  const platosAnuladosEnComanda = comandaSeleccionada?.platos?.filter(p => p.anulado).length || 0;
                  
                  return (
                    <motion.button
                      onClick={() => setShowAnularModal(true)}
                      disabled={!hasSelection}
                      className={`px-4 py-2 font-semibold rounded-lg text-sm shadow-md flex items-center gap-1 ${
                        hasSelection
                          ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                          : nightMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      whileHover={hasSelection ? { scale: 1.05 } : {}}
                      whileTap={hasSelection ? { scale: 0.95 } : {}}
                    >
                      ❌ ANULAR{platosMarcados > 0 ? ` (${platosMarcados})` : ''}
                    </motion.button>
                  );
                })()}

                {/* PARRAFO 2 - BOTÓN TOOLBAR v5.5: Prioridad Alta - Toggle según estado actual */}
                {(() => {
                  // El rol viene del contexto de autenticación, no de localStorage
                  const hayEnEspera = enEspera.length > 0;
                  const isEnabled = hayEnEspera;
                  // Determinar si la comanda seleccionada ya tiene prioridad
                  let comandaSeleccionada = null;
                  if (selectedOrders.size === 1) {
                    comandaSeleccionada = comandas.find(c => c._id === Array.from(selectedOrders)[0]);
                  }
                  const tienePrioridad = comandaSeleccionada?.prioridadOrden > 0;
                  const bgColorDynamic = tienePrioridad 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700';
                  return (
                    <motion.button
                      onClick={handlePrioridadAlta}
                      disabled={!isEnabled}
                      className={`px-4 py-2 font-semibold rounded-lg text-sm shadow-md flex items-center gap-1 ${
                        isEnabled
                          ? `${bgColorDynamic} text-white cursor-pointer`
                          : nightMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      whileHover={isEnabled ? { scale: 1.05 } : {}}
                      whileTap={isEnabled ? { scale: 0.95 } : {}}
                    >
                      {tienePrioridad 
                        ? '❌ Quitar Prioridad' 
                        : `🚀 Prioridad ${selectedOrders.size === 1 ? '(1)' : hayEnEspera ? '(Auto)' : ''}`
                      }
                    </motion.button>
                  );
                })()}
              </div>

              {/* 3. Paginación - Siempre visible si hay más de 1 página */}
              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className={`px-4 py-2 ${bgButton} ${bgButtonHover} ${currentPage === 0 ? (nightMode ? 'disabled:bg-gray-900 disabled:text-gray-600' : 'disabled:bg-gray-400 disabled:text-gray-500') : ''} disabled:cursor-not-allowed ${textButton} font-semibold rounded-lg text-sm shadow-md`}
                    whileHover={{ scale: currentPage === 0 ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ← PÁGINA {currentPage + 1}
                  </motion.button>
                  <div className={`${textMain} font-semibold text-sm`}>
                    de {totalPages}
                  </div>
                  <motion.button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className={`px-4 py-2 ${bgButton} ${bgButtonHover} ${currentPage >= totalPages - 1 ? (nightMode ? 'disabled:bg-gray-900 disabled:text-gray-600' : 'disabled:bg-gray-400 disabled:text-gray-500') : ''} disabled:cursor-not-allowed ${textButton} font-semibold rounded-lg text-sm shadow-md`}
                    whileHover={{ scale: currentPage >= totalPages - 1 ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    PÁGINA {currentPage + 2} →
                  </motion.button>
                </div>
              )}
              {totalPages <= 1 && (
                <div className={`${textSecondary} text-sm`}>
                  Página 1
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      {showConfig && (
        <ConfigModal
          config={config}
          nightMode={nightMode}
          onClose={() => setShowConfig(false)}
          onSave={(newConfig) => {
            setConfig(newConfig);
            setShowConfig(false);
          }}
        />
      )}

      {showReports && (
        <ReportsModal
          estadisticas={estadisticas}
          comandas={comandas}
          nightMode={nightMode}
          onClose={() => setShowReports(false)}
        />
      )}

      {showRevertir && (
        <RevertirModal
          nightMode={nightMode}
          onClose={() => setShowRevertir(false)}
          onRevertir={obtenerComandas}
        />
      )}

      {/* 🔥 NUEVO: Modal de Dejar Plato con motivo para auditoría */}
      <DejarPlatoModal
        isOpen={showDejarModal}
        onClose={() => {
          setShowDejarModal(false);
          setDejarMotivo('');
          setPlatosPendientesDejar([]);
        }}
        onConfirm={(motivo) => {
          ejecutarDejarPlatos(motivo);
        }}
        platos={platosPendientesDejar}
        nightMode={nightMode}
        loading={dejarLoading}
      />

      {/* 🔥 NUEVO: Modal de Anulación desde Cocina */}
      <AnimatePresence>
        {showAnularModal && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowAnularModal(false)}
          >
            <motion.div 
              className={`${nightMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border ${borderMain}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`text-xl font-bold ${textMain} mb-4 flex items-center gap-2`}>
                ❌ Anular Plato(s) desde Cocina
              </h2>
              
              {/* Motivo de anulación */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Motivo de anulación *
                </label>
                <select
                  value={anularMotivo}
                  onChange={(e) => setAnularMotivo(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${nightMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Seleccione un motivo...</option>
                  <option value="producto_roto">Producto roto/deteriorado</option>
                  <option value="insumo_agotado">Insumo agotado</option>
                  <option value="error_preparacion">Error de preparación</option>
                  <option value="cliente_cancelo">Cliente canceló el pedido</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              {/* Observaciones */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Observaciones (opcional)
                </label>
                <textarea
                  value={anularObservaciones}
                  onChange={(e) => setAnularObservaciones(e.target.value)}
                  placeholder="Detalles adicionales..."
                  maxLength={200}
                  rows={3}
                  className={`w-full p-3 rounded-lg border ${nightMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  {anularObservaciones.length}/200 caracteres
                </p>
              </div>
              
              {/* Resumen de platos a anular */}
              {(() => {
                const platosMarcados = [];
                platosChecked.forEach((checked, key) => {
                  if (checked && selectedOrders.size === 1) {
                    const comandaId = Array.from(selectedOrders)[0];
                    const [cid, platoIdx] = key.split('-');
                    if (cid === comandaId) {
                      const comanda = comandas.find(c => c._id === comandaId);
                      const plato = comanda?.platos?.[parseInt(platoIdx)];
                      if (plato) {
                        platosMarcados.push({
                          nombre: plato.plato?.nombre || 'Sin nombre',
                          cantidad: comanda?.cantidades?.[parseInt(platoIdx)] || 1
                        });
                      }
                    }
                  }
                });
                
                if (platosMarcados.length > 0) {
                  return (
                    <div className={`mb-4 p-3 rounded-lg ${nightMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                      <p className={`text-sm font-medium ${nightMode ? 'text-orange-300' : 'text-orange-700'} mb-2`}>
                        Platos seleccionados para anular:
                      </p>
                      <ul className={`text-sm ${nightMode ? 'text-orange-200' : 'text-orange-800'}`}>
                        {platosMarcados.map((p, i) => (
                          <li key={i}>• {p.cantidad}x {p.nombre}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={handleAnularPlato}
                  disabled={!anularMotivo || anularLoading}
                  className={`flex-1 font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 ${
                    anularMotivo && !anularLoading
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {anularLoading ? 'Procesando...' : 'Anular Plato(s)'}
                </button>
                <button
                  onClick={handleAnularComandaCompleta}
                  disabled={!anularMotivo || anularLoading}
                  className={`flex-1 font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 ${
                    anularMotivo && !anularLoading
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {anularLoading ? 'Procesando...' : 'Anular Toda la Comanda'}
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowAnularModal(false);
                  setAnularMotivo('');
                  setAnularObservaciones('');
                }}
                className={`w-full mt-3 py-2 px-4 rounded-lg ${nightMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} font-medium transition-colors`}
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 NUEVO: Modal de Dejar Plato con motivo para auditoría */}
      <AnimatePresence>
        {showDejarModal && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowDejarModal(false)}
          >
            <motion.div 
              className={`${nightMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-yellow-500`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">↩️</span>
                <h2 className={`text-xl font-bold ${textMain}`}>Dejar Plato</h2>
              </div>
              
              <p className={`${textSecondary} text-sm mb-4`}>
                Vas a liberar <span className="font-bold text-yellow-400">{platosPendientesDejar.length}</span> plato{platosPendientesDejar.length > 1 ? 's' : ''} para que otro cocinero pueda tomarlo{platosPendientesDejar.length > 1 ? 's' : ''}.
              </p>
              
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-300">
                  ⚠️ Esta acción quedará registrada en auditoría con el motivo que indiques.
                </p>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-semibold ${textMain} mb-2`}>
                  Motivo para dejar el plato <span className="text-red-400">*</span>
                </label>
                <select
                  value={dejarMotivo}
                  onChange={(e) => setDejarMotivo(e.target.value)}
                  className={`w-full p-3 rounded-lg ${nightMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} border ${nightMode ? 'border-gray-600' : 'border-gray-300'} focus:border-yellow-500 focus:outline-none`}
                >
                  <option value="">Seleccione un motivo...</option>
                  <option value="cambio_orden">Cambio de orden/prioridad</option>
                  <option value="falta_insumos">Falta de insumos</option>
                  <option value="error_toma">Error al tomar el plato</option>
                  <option value="solicitud_cliente">Solicitud del cliente</option>
                  <option value="emergencia">Emergencia</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>
              
              {dejarMotivo.startsWith('otro') && (
                <div className="mb-4">
                  <label className={`block text-sm font-semibold ${textMain} mb-2`}>
                    Especifique el motivo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={dejarMotivo === 'otro' ? '' : dejarMotivo.replace('otro: ', '')}
                    onChange={(e) => setDejarMotivo(`otro: ${e.target.value}`)}
                    placeholder="Describa el motivo..."
                    className={`w-full p-3 rounded-lg ${nightMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} border ${nightMode ? 'border-gray-600' : 'border-gray-300'} focus:border-yellow-500 focus:outline-none`}
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDejarModal(false);
                    setDejarMotivo('');
                    setPlatosPendientesDejar([]);
                  }}
                  className={`flex-1 font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 ${nightMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarDejarPlatos}
                  disabled={!dejarMotivo || dejarLoading}
                  className={`flex-1 font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 ${
                    dejarMotivo && !dejarLoading
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {dejarLoading ? 'Procesando...' : 'Dejar Plato'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 v7.4.1: Modal de Dejar Comanda con motivo para auditoría */}
      <AnimatePresence>
        {showDejarComandaModal && (() => {
          // Obtener la comanda y sus platos tomados por el usuario actual
          const comanda = comandas.find(c => c._id === comandaPendienteDejar);
          const platosTomados = comanda?.platos?.filter(p => 
            p.procesandoPor?.cocineroId?.toString() === userId?.toString() && !p.eliminado && !p.anulado
          ) || [];
          const totalPlatos = platosTomados.length;
          
          return (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowDejarComandaModal(false)}
          >
            <motion.div 
              className={`${nightMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl border-2 border-red-500 max-h-[80vh] overflow-y-auto`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">↩️</span>
                <h2 className={`text-xl font-bold ${textMain}`}>Dejar Comanda</h2>
                {comanda && (
                  <span className={`ml-auto text-sm font-semibold ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    #{comanda.comandaNumber}
                  </span>
                )}
              </div>
              
              <p className={`${textSecondary} text-sm mb-4`}>
                Vas a liberar <span className="font-bold text-red-400">{totalPlatos}</span> plato{totalPlatos !== 1 ? 's' : ''} para que otro cocinero pueda tomarlo{totalPlatos !== 1 ? 's' : ''}.
              </p>
              
              {/* Lista de platos a liberar */}
              {platosTomados.length > 0 && (
                <div className="mb-4">
                  <label className={`block text-sm font-semibold ${textMain} mb-2`}>
                    Platos que se liberarán:
                  </label>
                  <div className={`rounded-lg border ${nightMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} max-h-40 overflow-y-auto`}>
                    {platosTomados.map((plato, idx) => {
                      const nombre = plato.plato?.nombre || plato.nombre || 'Plato sin nombre';
                      const cantidad = comanda?.cantidades?.[comanda.platos.indexOf(plato)] || 1;
                      return (
                        <div 
                          key={idx}
                          className={`flex items-center justify-between px-3 py-2 ${idx < platosTomados.length - 1 ? `border-b ${nightMode ? 'border-gray-700' : 'border-gray-200'}` : ''}`}
                        >
                          <span className={`text-sm ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {nombre}
                          </span>
                          {cantidad > 1 && (
                            <span className={`text-xs font-semibold ${nightMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              x{cantidad}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-300">
                  ⚠️ Esta acción quedará registrada en auditoría con el motivo que indiques.
                </p>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-semibold ${textMain} mb-2`}>
                  Motivo para dejar la comanda <span className="text-red-400">*</span>
                </label>
                <select
                  value={dejarComandaMotivo}
                  onChange={(e) => setDejarComandaMotivo(e.target.value)}
                  className={`w-full p-3 rounded-lg ${nightMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} border ${nightMode ? 'border-gray-600' : 'border-gray-300'} focus:border-red-500 focus:outline-none`}
                >
                  <option value="">Seleccione un motivo...</option>
                  <option value="cambio_prioridad">Cambio de prioridad</option>
                  <option value="falta_insumos">Falta de insumos</option>
                  <option value="error_toma">Error al tomar la comanda</option>
                  <option value="solicitud_cliente">Solicitud del cliente</option>
                  <option value="emergencia">Emergencia</option>
                  <option value="cambio_turno">Cambio de turno</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>
              
              {dejarComandaMotivo === 'otro' && (
                <div className="mb-4">
                  <label className={`block text-sm font-semibold ${textMain} mb-2`}>
                    Especifique el motivo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={dejarComandaMotivo === 'otro' ? '' : dejarComandaMotivo}
                    onChange={(e) => setDejarComandaMotivo(`otro: ${e.target.value}`)}
                    placeholder="Describa el motivo..."
                    className={`w-full p-3 rounded-lg ${nightMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} border ${nightMode ? 'border-gray-600' : 'border-gray-300'} focus:border-red-500 focus:outline-none`}
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDejarComandaModal(false);
                    setDejarComandaMotivo('');
                    setComandaPendienteDejar(null);
                  }}
                  className={`flex-1 font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 ${nightMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarDejarComanda}
                  disabled={!dejarComandaMotivo || dejarComandaLoading}
                  className={`flex-1 font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 ${
                    dejarComandaMotivo && !dejarComandaLoading
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {dejarComandaLoading ? 'Procesando...' : 'Dejar Comanda'}
                </button>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Modal de confirmación ENTREGADO - Mejorado con Framer Motion */}
      <AnimatePresence>
        {showEntregadoConfirm && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowEntregadoConfirm(false)}
          >
            <motion.div 
              className={`${nightMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border ${borderMain}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
            <h2 className={`text-xl font-bold ${textMain} mb-3`}>¿Marcar como entregado?</h2>
            <p className={`${textSecondary} text-sm mb-6`}>
              Se marcarán <span className="font-bold text-yellow-400">{selectedOrders.size}</span> comanda(s) como entregada(s). Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={marcarEntregadas}
                className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowEntregadoConfirm(false)}
                className={`flex-1 ${nightMode ? 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800' : 'bg-gray-300 hover:bg-gray-400 active:bg-gray-500'} text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg active:scale-95`}
              >
                Cancelar
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-2xl ${
              toastMessage.type === 'success' 
                ? 'bg-green-500 text-white' 
                : toastMessage.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            <div className="flex items-center gap-3">
              {toastMessage.type === 'success' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="text-2xl"
                >
                  ✓
                </motion.span>
              )}
              <span className="font-bold text-lg">{toastMessage.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

// Componente de tarjeta de comanda estilo SICAR (Grid 5x2)
const SicarComandaCard = ({ 
  comanda, 
  tiempo, 
  tiempoFormateado = "00:00:00",
  getColorAlerta, 
  onListo,
  estadoColumna,
  comandaId,
  isNew,
  alertYellowMinutes,
  alertRedMinutes,
  isSelected,
  onToggleSelect,
  fontSize = 15,
  platoStates,
  setPlatoStates,
  cardNumber = 1,
  nightMode = true,
  platosEliminados = [], // Mantener para compatibilidad, pero usar historialPlatos
  platosChecked = new Map(),
  togglePlatoCheck = () => {},
  usuarioActualId = null, // Para el sistema multi-cocinero
  // v7.4: Props para el sistema de 3 estados de comanda
  comandaStates,
  setComandaStates,
  onTomarComanda,
  onDejarComanda,
  onFinalizarComanda,
  obtenerNombreMesa // Función helper para obtener nombre de mesa
}) => {
  // 🔥 AUDITORÍA: Obtener platos eliminados del historialPlatos de la comanda
  // CORREGIDO: Excluir platos que fueron anulados desde cocina (se muestran en sección separada)
  const platosEliminadosHistorial = React.useMemo(() => {
    if (!comanda.historialPlatos || !Array.isArray(comanda.historialPlatos)) {
      return [];
    }
    
    // Obtener IDs de platos anulados para excluirlos de la lista de eliminados
    const platosAnuladosIds = new Set(
      (comanda.platos || [])
        .filter(p => p.anulado === true)
        .map(p => p.platoId?.toString())
    );
    
    return comanda.historialPlatos
      .filter(h => h.estado === 'eliminado' && !platosAnuladosIds.has(h.platoId?.toString()))
      .map(h => {
        // Intentar obtener el nombre desde diferentes fuentes
        let nombre = h.nombreOriginal;
        
        // Si no hay nombreOriginal o es un placeholder, intentar desde otros campos
        if (!nombre || nombre === 'Plato desconocido' || nombre === 'Sin nombre' || nombre === 'Plato eliminado' || nombre.startsWith('Plato #')) {
          // Intentar buscar en el plato original si está disponible
          if (h.plato && typeof h.plato === 'object' && h.plato.nombre) {
            nombre = h.plato.nombre;
          } else if (h.nombre) {
            nombre = h.nombre;
          } else {
            // Si aún no hay nombre, intentar buscarlo desde la API
            // Por ahora, mostrar un mensaje indicando que se está cargando
            nombre = null; // Marcar como pendiente de carga
          }
        }
        
        // Obtener nombre del mozo desde usuario (puede ser ObjectId o objeto populado)
        let nombreMozo = null;
        if (h.usuario) {
          if (typeof h.usuario === 'object' && h.usuario.name) {
            nombreMozo = h.usuario.name;
          } else if (typeof h.usuario === 'object' && h.usuario.nombre) {
            nombreMozo = h.usuario.nombre;
          } else if (h.nombreMozo) {
            nombreMozo = h.nombreMozo;
          }
        }
        
        return {
          platoId: h.platoId,
          nombre: nombre, // Puede ser null si no se encontró
          cantidad: h.cantidadOriginal || h.cantidad || 1,
          motivo: h.motivo || 'Eliminado',
          timestamp: h.timestamp || new Date(),
          usuario: h.usuario,
          nombreMozo: nombreMozo || 'Mozo',
          necesitaBuscarNombre: !nombre || nombre.startsWith('Plato #')
        };
      });
  }, [comanda.historialPlatos, comanda.platos]);
  
  // 🔥 AUDITORÍA: Buscar nombres faltantes desde la API si es necesario
  const [nombresPlatos, setNombresPlatos] = React.useState(new Map());
  
  React.useEffect(() => {
    const buscarNombresFaltantes = async () => {
      const platosSinNombre = platosEliminadosHistorial.filter(p => p.necesitaBuscarNombre && p.platoId);
      
      if (platosSinNombre.length === 0) return;
      
      // Buscar nombres desde la API
      for (const plato of platosSinNombre) {
        if (nombresPlatos.has(plato.platoId)) continue; // Ya se buscó
        
        try {
          // Usar getApiUrl importado al inicio del archivo
          const apiUrl = getApiUrl();
          const baseUrl = apiUrl.replace('/api/comanda', '');
          
          // Buscar el plato por ID
          const response = await fetch(`${baseUrl}/api/platos/${plato.platoId}`);
          if (response.ok) {
            const platoData = await response.json();
            if (platoData && platoData.nombre) {
              setNombresPlatos(prev => new Map(prev).set(plato.platoId, platoData.nombre));
              console.log(`✅ Nombre obtenido desde API: platoId=${plato.platoId}, nombre=${platoData.nombre}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ No se pudo obtener nombre del plato ${plato.platoId}:`, error);
        }
      }
    };
    
    buscarNombresFaltantes();
  }, [platosEliminadosHistorial, nombresPlatos]);
  
  // Combinar nombres obtenidos con los platos eliminados
  const platosEliminadosConNombres = platosEliminadosHistorial.map(p => ({
    ...p,
    nombre: p.nombre || nombresPlatos.get(p.platoId) || `Plato #${p.platoId || 'N/A'}`
  }));
  
  // Usar historialPlatos si está disponible, sino usar el prop platosEliminados
  const platosEliminadosFinal = platosEliminadosConNombres.length > 0 
    ? platosEliminadosConNombres 
    : platosEliminados;
  // Calcular color de fondo según tiempo (actualizado en tiempo real) - Colores mejorados
  const [minutosActuales, setMinutosActuales] = useState(tiempo.minutos);
  const [bgColor, setBgColor] = useState("bg-gray-500");
  const [borderColor, setBorderColor] = useState("border-gray-500");

  useEffect(() => {
    const interval = setInterval(() => {
      if (!comanda.createdAt) return;
      const ahora = moment().tz("America/Lima");
      const creacion = moment(comanda.createdAt).tz("America/Lima");
      const diffMinutos = ahora.diff(creacion, "minutes");
      setMinutosActuales(diffMinutos);
      
      // Actualizar colores según tiempo - Borde y encabezado con el mismo color
      if (diffMinutos >= alertRedMinutes) {
        setBgColor("bg-red-700");
        setBorderColor("border-red-700");
      } else if (diffMinutos >= alertYellowMinutes) {
        setBgColor("bg-yellow-600");
        setBorderColor("border-yellow-600");
      } else {
        setBgColor("bg-gray-500");
        setBorderColor("border-gray-500");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [comanda.createdAt, alertYellowMinutes, alertRedMinutes]);

  // Inicializar colores - Borde y encabezado con el mismo color
  useEffect(() => {
    if (minutosActuales >= alertRedMinutes) {
      setBgColor("bg-red-700");
      setBorderColor("border-red-700");
    } else if (minutosActuales >= alertYellowMinutes) {
      setBgColor("bg-yellow-600");
      setBorderColor("border-yellow-600");
    } else {
      setBgColor("bg-gray-500");
      setBorderColor("border-gray-500");
    }
  }, [minutosActuales, alertYellowMinutes, alertRedMinutes]);


  // Agrupar platos en dos secciones: EN PREPARACIÓN y PLATOS LISTOS
  // 🔥 NUEVO: También filtrar platos anulados
  const { platosPreparacion, platosListos, platosAnulados, totalPlatos } = React.useMemo(() => {
    const platosConNombre = (comanda.platos || []).filter(p => {
      const platoObj = p.plato || p;
      const nombre = platoObj?.nombre || p?.nombre;
      return nombre && nombre.trim().length > 0 && !p.eliminado && !p.anulado;
    });

    const preparacion = platosConNombre.filter(p => {
      const estado = p.estado || "en_espera";
      return estado === "en_espera" || estado === "ingresante" || estado === "pedido";
    });

    // REGLA COCINA: Solo platos en "recoger" (listos para que mozo recoga). No mostrar entregado/pagado.
    const listos = platosConNombre.filter(p => {
      const estado = (p.estado || "en_espera").toLowerCase();
      return estado === "recoger";
    });

    // 🔥 NUEVO: Platos anulados desde cocina
    const anulados = (comanda.platos || []).filter(p => {
      return p.anulado === true;
    });

    return {
      platosPreparacion: preparacion,
      platosListos: listos,
      platosAnulados: anulados,
      totalPlatos: platosConNombre.length
    };
  }, [comanda.platos]);

  // Filtrar platos por estado según columna (mantener para compatibilidad)
  const platosFiltrados = comanda.platos?.filter(p => {
    // VALIDACIÓN CRÍTICA: Solo incluir platos que tengan nombre cargado completamente
    const platoObj = p.plato || p;
    const nombre = platoObj?.nombre || p?.nombre;
    const tieneNombre = nombre && nombre.trim().length > 0;
    
    if (!tieneNombre) {
      console.warn(`⚠️ Plato sin nombre filtrado en comanda #${comanda.comandaNumber}`);
      return false;
    }
    
    // Filtrar por estado
    const estado = p.estado || "en_espera";
    if (estadoColumna === "en_espera") return estado === "en_espera" || estado === "ingresante";
    if (estadoColumna === "recoger") return estado === "recoger";
    return true;
  }) || [];

  // Obtener el estado visual actual de un plato: 'normal' | 'procesando' | 'seleccionado'
  const getPlatoStatus = (platoId) => {
    const platoKey = `${comandaId}-${platoId}`;
    return platoStates.get(platoKey) || 'normal';
  };

  // Variables de color según modo nocturno para el área de platos
  // En modo nocturno: fondo oscuro, texto claro
  // En modo claro: fondo claro, texto oscuro
  const bgPlatos = nightMode ? "bg-gray-800" : "bg-white";
  const textPlatos = nightMode ? "text-white" : "text-gray-900";
  const textPlatosHover = nightMode ? "hover:bg-gray-700" : "hover:bg-gray-100";
  // Colores para estado preparando (amarillo)
  const textPlatosPreparing = nightMode ? "text-yellow-300" : "text-yellow-700";
  // Colores para estado completado (verde)
  const textPlatosCompleted = nightMode ? "text-green-400" : "text-green-700";
  const bgBadgeEspera = nightMode ? "bg-gray-700" : "bg-white";
  const textBadgeEspera = nightMode ? "text-white" : "text-black";

  // Los botones PREPARAR y SIN STOCK fueron eliminados
  // Ahora se usa la función FINALIZAR de la barra inferior

  // v7.4: Determinar el estado visual de la comanda para el contorno
  const tomadaPorMi = comanda.procesandoPor?.cocineroId?.toString() === usuarioActualId?.toString();
  const comandaState = comandaStates?.get(comandaId) || 'normal';
  
  // Determinar el color del contorno según el estado
  let borderStyle = '2px solid';
  let shadowStyle = '0 8px 32px rgba(0, 0, 0, 0.3)';
  let backgroundStyle = undefined;
  
  if (tomadaPorMi) {
    if (comandaState === 'dejar') {
      // Estado DEJAR: contorno rojo
      borderStyle = '4px solid #ef4444';
      shadowStyle = '0 8px 32px rgba(239, 68, 68, 0.5)';
      backgroundStyle = `linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))`;
    } else if (comandaState === 'finalizar') {
      // Estado FINALIZAR: contorno verde
      borderStyle = '4px solid #22c55e';
      shadowStyle = '0 8px 32px rgba(34, 197, 94, 0.5)';
      backgroundStyle = `linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))`;
    }
  } else if (isSelected) {
    // Comanda seleccionada (no tomada por mí)
    borderStyle = '4px solid #22c55e';
    shadowStyle = '0 8px 32px rgba(34, 197, 94, 0.4)';
    backgroundStyle = `linear-gradient(135deg, rgba(34,197,94,0.4), rgba(0,255,0,0.2))`;
  }

  return (
    <motion.div 
      layoutId={`order-${comandaId}`}
      className={`${bgColor} ${borderColor} flex flex-col relative cursor-pointer`}
      style={{
        fontFamily: 'Arial, sans-serif',
        width: '300px',
        height: '500px',
        borderRadius: '12px',
        boxShadow: shadowStyle,
        border: borderStyle,
        background: backgroundStyle
      }}
      initial={{ opacity: 0, scale: 0.8, y: 100 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: 0
      }}
      exit={{ opacity: 0, scale: 0.8, y: -50 }}
      whileHover={{ scale: 1.03, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 24
      }}
    >
      {/* Header con fondo que cambia según tiempo (gris/amarillo/rojo) - Zona Click 1 */}
      <div className={`relative p-3 ${bgColor} group cursor-pointer hover:shadow-xl transition-all duration-200`} onClick={onToggleSelect}>
        {/* Checkmark grande absolute overlay centrado exacto barra roja - Zero espacio */}
        {/* Solo mostrar cuando está en estado 'finalizar' (contorno verde) */}
        <AnimatePresence>
          {tomadaPorMi && comandaState === 'finalizar' && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 15 
              }}
            >
              <div 
                className="text-white text-4xl font-bold" 
                style={{ 
                  textShadow: '0 0 20px rgba(34, 197, 94, 0.8), 2px 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: 'Arial, sans-serif',
                  filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.8))',
                  animation: 'glow 2s ease-in-out infinite'
                }}
              >
                ✓
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-start justify-between mb-2">
          {/* Izquierda: Orden # y número de tarjeta */}
          <div>
            <div className="text-white font-bold text-xl mb-1" style={{ 
              fontFamily: 'Arial, sans-serif'
            }}>
              Orden #{comanda.comandaNumber || "N/A"}
            </div>
            <div className="text-white font-semibold text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
              {cardNumber}
            </div>
          </div>

          {/* Derecha: Mesa # y Cronómetro */}
          <div className="flex flex-col items-end">
            <div className="text-white font-semibold text-lg mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              {obtenerNombreMesa ? obtenerNombreMesa(comanda.mesas) : (comanda.mesas?.nombreCombinado || `M${comanda.mesas?.nummesa || 'N/A'}`)}
            </div>
            <div className="flex items-center gap-1">
              <FaClock className="text-white text-sm" />
              <div className={`text-white font-bold text-base ${minutosActuales >= alertRedMinutes ? 'text-red-200' : minutosActuales >= alertYellowMinutes ? 'text-yellow-200' : 'text-white'}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                {tiempoFormateado}
              </div>
            </div>
          </div>
        </div>
        {/* Mozo y badges inline en header - Compacto */}
        <div className="flex items-center justify-between text-white text-xs flex-wrap gap-1">
          <span className="font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>
            👤 {comanda.mozos?.name || comanda.mozos?.nombre || 'admin'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* v7.4: Badge del cocinero que está procesando la comanda */}
            {comanda.procesandoPor?.cocineroId && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  comanda.procesandoPor.cocineroId?.toString() === usuarioActualId?.toString()
                    ? 'bg-yellow-500 text-black' // Mi comanda - amarillo
                    : 'bg-gray-600 text-white' // Comanda de otro
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                👨‍🍳 {comanda.procesandoPor.alias || comanda.procesandoPor.nombre || 'Cocinero'}
              </motion.span>
            )}
            {/* Badge Espera X/Total (Y elim) */}
            {platosPreparacion.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-1.5 py-0.5 bg-gray-600/70 rounded text-xs font-semibold"
                style={{ fontFamily: 'Arial, sans-serif' }}
                title={platosEliminadosFinal.length > 0 ? `Prep ${platosPreparacion.length}/${totalPlatos} (${platosEliminadosFinal.length} elim)` : `Prep ${platosPreparacion.length}/${totalPlatos}`}
              >
                Prep {platosPreparacion.length}/{totalPlatos}
                {platosEliminadosFinal.length > 0 && ` (${platosEliminadosFinal.length} elim)`}
              </motion.span>
            )}
            {/* Badge Listos Y */}
            {platosListos.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-1.5 py-0.5 bg-green-500 rounded text-xs font-bold"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                Listos {platosListos.length}
              </motion.span>
            )}
            {/* Badge urgente si >20min */}
            {minutosActuales >= alertRedMinutes && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="px-1.5 py-0.5 bg-red-600 rounded text-xs font-bold"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                ¡Urgente!
              </motion.span>
            )}
            {/* PARRAFO 5 - ICONO 🚀 rojo v5.5: Si comanda tiene prioridadOrden > 0 */}
            {comanda.prioridadOrden > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="ml-2 text-red-500 text-base font-bold"
                title="Prioridad Alta"
              >
                🚀
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Badges movidos al header - ya no hay sección "EN ESPERA" separada */}
      {estadoColumna === "recoger" && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white font-bold text-base py-2 text-center rounded-t-lg" style={{ 
          fontFamily: 'Arial, sans-serif',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        }}>
          LISTO
        </div>
      )}

      {/* Lista de platos vertical */}
      <div className={`flex-1 overflow-y-auto ${bgPlatos}`}>
        <div className="flex flex-col h-full">
          {/* NUEVA SECCIÓN EN PREPARACIÓN - Arquitectura limpia, zero bubbling */}
          {platosPreparacion.length > 0 && (
            <div className="flex-shrink-0 cursor-default">
              <div
                role="button"
                tabIndex={0}
                onClick={onToggleSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleSelect();
                  }
                }}
                className={`h-8 px-3 flex items-center gap-2 cursor-pointer transition-colors border-b ${nightMode ? 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 border-gray-600' : 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 border-gray-300'}`}
              >
                <span className={`font-medium text-xs uppercase tracking-wider ${nightMode ? 'text-gray-200' : 'text-gray-800'}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                  📋 EN PREPARACIÓN
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${nightMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-800'}`}>
                  {platosPreparacion.length}/{totalPlatos}
                </span>
              </div>
              <div className="px-2 py-2 space-y-1">
                {platosPreparacion.map((plato, index) => {
                  const platoObj = plato.plato || plato;
                  const cantidad = comanda.cantidades?.[comanda.platos.indexOf(plato)] || 1;
                  const platoId = platoObj?._id || plato._id || index;
                  // 🔥 CORREGIDO: Obtener el índice real del plato en comanda.platos
                  const platoIndex = comanda.platos.indexOf(plato);
                  const platoKey = `${comandaId}-${platoIndex}`;
                  const estadoVisualLocal = platoStates.get(platoKey) || 'normal';
                  
                  // v7.2: Si el plato tiene procesandoPor y está en estado local normal/procesando,
                  // mostrar 'procesando' visualmente (amarillo) para indicar que alguien lo está trabajando
                  // Si está en 'seleccionado' (verde), mantener ese estado
                  let estadoVisual = estadoVisualLocal;
                  if (plato.procesandoPor?.cocineroId && estadoVisualLocal === 'normal') {
                    estadoVisual = 'procesando';
                  }
                  
                  return (
                    <PlatoPreparacion
                      key={platoKey}
                      plato={plato}
                      comandaId={comandaId}
                      platoId={platoId}
                      platoIndex={platoIndex}
                      cantidad={cantidad}
                      nombre={platoObj?.nombre || plato?.nombre || 'Sin nombre'}
                      estadoVisual={estadoVisual}
                      nightMode={nightMode}
                      isEliminado={plato.eliminado === true}
                      onToggle={togglePlatoCheck}
                      complementosSeleccionados={plato.complementosSeleccionados || []}
                      // v7.2: Props para multi-cocinero
                      procesandoPor={plato.procesandoPor}
                      usuarioActualId={usuarioActualId}
                    />
                  );
                })}
                {platosEliminadosFinal.map((platoEliminado, index) => {
                  const timestamp = platoEliminado.timestamp ? moment(platoEliminado.timestamp).tz("America/Lima").format('HH:mm') : '';
                  const nombreMozo = platoEliminado.nombreMozo || 'Mozo';
                  const tooltipText = `Eliminado por ${nombreMozo} ${timestamp ? `a las ${timestamp}` : ''}`;
                  return (
                    <div
                      key={`eliminado-${platoEliminado.platoId}-${index}`}
                      className="font-semibold leading-tight px-3 py-2 rounded-lg flex items-center gap-3 bg-red-500/15 text-red-400 line-through opacity-60 cursor-not-allowed"
                      style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px' }}
                      title={tooltipText}
                    >
                      <div className="w-8 h-8 border-2 rounded flex items-center justify-center bg-gray-800 border-gray-500 opacity-50 flex-shrink-0">
                        <span className="text-red-500 text-xs">🗑️</span>
                      </div>
                      <span className="flex-1">{platoEliminado.cantidad} {platoEliminado.nombre}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/30 text-red-400 border border-red-500/50">
                        🔴 {nombreMozo}{timestamp ? ` ${timestamp}` : ''}
                      </span>
                    </div>
                  );
                })}
                {/* 🔥 NUEVO: Platos anulados desde cocina */}
                {platosAnulados.map((plato, index) => {
                  const platoObj = plato.plato || plato;
                  const cantidad = comanda.cantidades?.[comanda.platos.indexOf(plato)] || 1;
                  const nombre = platoObj?.nombre || 'Plato desconocido';
                  const timestamp = plato.anuladoAt ? moment(plato.anuladoAt).tz("America/Lima").format('HH:mm') : '';
                  const motivo = plato.anuladoRazon || plato.tipoAnulacion || 'Sin motivo';
                  const tipoAnulacion = plato.tipoAnulacion || '';
                  const tooltipText = `Anulado por Cocina - ${motivo}${timestamp ? ` a las ${timestamp}` : ''}`;
                  return (
                    <div
                      key={`anulado-${plato.platoId}-${index}`}
                      className="font-semibold leading-tight px-3 py-2 rounded-lg flex items-center gap-3 bg-orange-500/15 text-orange-400 line-through opacity-60 cursor-not-allowed"
                      style={{ fontFamily: 'Arial, sans-serif', fontSize: '18px' }}
                      title={tooltipText}
                    >
                      <div className="w-8 h-8 border-2 rounded flex items-center justify-center bg-gray-800 border-orange-500/50 opacity-50 flex-shrink-0">
                        <span className="text-orange-500 text-xs">❌</span>
                      </div>
                      <span className="flex-1">{cantidad} {nombre}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/30 text-orange-400 border border-orange-500/50">
                        ❌ ANULADO{timestamp ? ` ${timestamp}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Separador visual entre secciones */}
          {platosPreparacion.length > 0 && platosListos.length > 0 && (
            <div className={`h-px ${nightMode ? 'bg-gray-600' : 'bg-gray-300'} mx-4 my-2`} />
          )}

          {/* Sección 2: PREPARADOS - Zona Click 3 (Wrapper Preparados) */}
          {platosListos.length > 0 && (
            <div className="flex-shrink-0 cursor-pointer hover:bg-opacity-80 hover:shadow-md hover:scale-[1.01] transition-all" onClick={onToggleSelect}>
              {/* Header de sección PREPARADOS - Compacto h-8 */}
              <div className={`h-8 px-3 flex items-center gap-2 ${nightMode ? 'bg-green-900/50' : 'bg-green-100'} border-b ${nightMode ? 'border-green-700' : 'border-green-300'}`}>
                <span className={`font-medium text-xs uppercase tracking-wider ${nightMode ? 'text-green-300' : 'text-green-700'}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                  ✅ PREPARADOS
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${nightMode ? 'bg-green-800 text-green-200' : 'bg-green-200 text-green-800'}`}>
                  {platosListos.length}/{totalPlatos}
                </span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-sm ml-auto"
                >
                  🏆
                </motion.span>
              </div>
              {/* Lista de platos listos */}
              <div className={`px-4 py-2 space-y-1.5 ${nightMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <AnimatePresence>
                  {platosListos.map((plato, index) => {
                    const platoObj = plato.plato || plato;
                    const cantidad = comanda.cantidades?.[comanda.platos.indexOf(plato)] || 1;
                    // FIX: revertir multi-plato similar - Priorizar plato._id (subdocumento único)
                    const platoIdUnico = plato._id?.toString() || platoObj?._id || index;
                    const platoIndex = comanda.platos.indexOf(plato);
                    const estadoRealPlato = plato.estado || 'recoger';
                    
                    return (
                      <motion.div
                        key={`listo-${platoIdUnico}-${platoIndex}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.3 }}
                        className={`font-semibold leading-tight px-2 py-1 rounded transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                          nightMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                        }`}
                        whileHover={{ scale: 1.02, x: 4 }}
                        style={{ 
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '18px'
                        }}
                        title="Click para seleccionar comanda"
                      >
                        {/* Check verde bold (no interactivo) */}
                        <div 
                          className={`w-6 h-6 border-2 rounded flex items-center justify-center pointer-events-none ${
                            nightMode ? 'bg-green-600 border-green-500' : 'bg-green-500 border-green-600'
                          }`}
                        >
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="w-4 h-4 text-white font-bold"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </motion.svg>
                        </div>
                        
                        <span className="flex items-center gap-2 flex-1 font-bold pointer-events-none">
                          <span className={nightMode ? 'text-green-300' : 'text-green-700'}>
                            ✓
                          </span>
                          <span>
                            {cantidad} {platoObj?.nombre || "Sin nombre"}
                          </span>
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Platos eliminados ahora se muestran inline en Preparación con strike-through rojo */}
        </div>
      </div>

    </motion.div>
  );
};

export default ComandaStylePerso;
