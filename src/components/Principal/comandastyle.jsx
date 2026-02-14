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
  FaSearch
} from "react-icons/fa";
import ConfigModal from "./ConfigModal";
import ReportsModal from "./ReportsModal";
import RevertirModal from "./RevertirModal";
import useSocketCocina from "../../hooks/useSocketCocina";
import { getApiUrl } from "../../config/apiConfig";

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

const ComandaStyle = () => {
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
  const [expandedComandas, setExpandedComandas] = useState(new Set());
  const [horaActual, setHoraActual] = useState(moment().tz("America/Lima"));
  const [fechaActual, setFechaActual] = useState(moment().tz("America/Lima"));
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showEntregadoConfirm, setShowEntregadoConfirm] = useState(false);
  const [platoStates, setPlatoStates] = useState(new Map()); // Trackear estados de platos: 'preparing' (amarillo) o 'completed' (verde)
  const [platosEliminados, setPlatosEliminados] = useState(new Map()); // Trackear platos eliminados: { comandaId: [{ platoId, nombre, cantidad, timestamp }] }
  // Estado para checkboxes de platos individuales: Map<`${comandaId}-${platoId}`, boolean>
  const [platosChecked, setPlatosChecked] = useState(new Map());
  // Estado para tiempos formateados HH:MM:SS por comanda: Map<comandaId, string>
  const [tiemposComandas, setTiemposComandas] = useState(new Map());
  const previousComandasRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const lastSuccessTimeRef = useRef(Date.now());
  const newComandasRef = useRef(new Set());
  
  // Estado de conexión Socket.io
  const [socketConnectionStatus, setSocketConnectionStatus] = useState('desconectado');

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

  const obtenerComandas = useCallback(async () => {
    try {
      const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
      const apiUrl = `${getApiUrl()}/fechastatus/${fechaActual}`;
      
      console.log('🔍 Obteniendo comandas desde:', apiUrl);
      console.log('📅 Fecha buscada:', fechaActual);
      
      const response = await axios.get(apiUrl, { timeout: 5000 });
      
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
          const platoObj = plato.plato || plato;
          const nombre = platoObj?.nombre || plato?.nombre;
          return nombre && nombre.trim().length > 0;
        });
        
        if (!todosPlatosConNombre) {
          console.warn(`⚠️ Comanda #${c.comandaNumber} filtrada: tiene platos sin nombre cargado`);
          return false;
        }
        
        return true;
      });
      
      console.log('✅ Comandas recibidas:', response.data.length);
      console.log(`✅ Comandas válidas (con nombres cargados): ${comandasValidas.length}`);
      
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
      setComandas(comandasValidas);
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
    console.log('📥 Nueva comanda recibida vía Socket.io:', nuevaComanda.comandaNumber);
    
    // VALIDACIÓN: Verificar que todos los platos tengan nombre antes de agregar
    if (nuevaComanda.platos && nuevaComanda.platos.length > 0) {
      const todosPlatosConNombre = nuevaComanda.platos.every(plato => {
        const platoObj = plato.plato || plato;
        const nombre = platoObj?.nombre || plato?.nombre;
        return nombre && nombre.trim().length > 0;
      });
      
      if (!todosPlatosConNombre) {
        console.warn(`⚠️ Comanda #${nuevaComanda.comandaNumber} recibida vía Socket.io pero tiene platos sin nombre. Esperando a que se carguen...`);
        // No agregar la comanda todavía, esperar a que llegue actualizada con los nombres
        return;
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
      const existe = prev.find(c => c._id === nuevaComanda._id);
      if (existe) {
        // Actualizar comanda existente
        return prev.map(c => c._id === nuevaComanda._id ? nuevaComanda : c);
      } else {
        // Agregar nueva comanda al inicio
        return [nuevaComanda, ...prev];
      }
    });
    
    // Actualizar referencia
    previousComandasRef.current = [...previousComandasRef.current, nuevaComanda];
  }, [config.soundEnabled]);

  const handleComandaActualizada = useCallback((data) => {
    // Validar que data existe
    if (!data) {
      console.warn('⚠️ handleComandaActualizada recibió data null/undefined');
      return;
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
        
        if (platosEliminadosData && platosEliminadosData.length > 0) {
          // Usar datos del historial del backend (más confiables, tienen nombres correctos)
          platosEliminadosData.forEach(h => {
            if (h.estado === 'eliminado') {
              eliminados.push({
                platoId: h.platoId,
                nombre: h.nombreOriginal || 'Plato eliminado',
                cantidad: h.cantidadOriginal || 1,
                timestamp: h.timestamp || new Date().toISOString()
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
    setTimeout(() => {
      console.log('🔄 Forzando actualización de filtros después de actualizar comanda');
    }, 100);
  }, [obtenerComandas]);

  // FASE 3: Actualización granular de plato (solo actualiza 1 plato, no toda la comanda)
  const handlePlatoActualizado = useCallback((data) => {
    console.log('📥 FASE3: Plato actualizado granular vía Socket.io:', {
      comandaId: data.comandaId,
      platoId: data.platoId,
      nuevoEstado: data.nuevoEstado,
      estadoAnterior: data.estadoAnterior
    });
    
    // Validar datos mínimos requeridos
    if (!data.comandaId || !data.platoId || !data.nuevoEstado) {
      console.warn('⚠️ FASE3: Datos incompletos en plato-actualizado, refrescando todas las comandas');
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
      
      // Actualizar estado del plato
      platoActualizado.estado = data.nuevoEstado;
      
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
      
      // FASE 3: Animación visual - Marcar plato como actualizado
      const platoKey = `${data.comandaId}-${data.platoId}`;
      setPlatoStates(prev => {
        const nuevo = new Map(prev);
        nuevo.set(platoKey, {
          estado: data.nuevoEstado,
          timestamp: Date.now(),
          animando: true
        });
        // Limpiar animación después de 2 segundos
        setTimeout(() => {
          setPlatoStates(prev => {
            const limpio = new Map(prev);
            const estado = limpio.get(platoKey);
            if (estado) {
              limpio.set(platoKey, { ...estado, animando: false });
            }
            return limpio;
          });
        }, 2000);
        return nuevo;
      });
      
      console.log(`✅ FASE3: Plato ${data.platoId} actualizado a "${data.nuevoEstado}" en comanda ${data.comandaId} (sin recargar comanda completa)`);
      
      // Limpiar checkbox del plato actualizado si cambió a "recoger" o "entregado"
      if (data.nuevoEstado === "recoger" || data.nuevoEstado === "entregado") {
        setPlatosChecked(prev => {
          const nuevo = new Map(prev);
          const key = `${data.comandaId}-${data.platoId}`;
          nuevo.delete(key);
          return nuevo;
        });
      }
      
      return nuevasComandas;
    });
  }, [config.soundEnabled, obtenerComandas]);

  // Hook Socket.io - REEMPLAZA EL POLLING
  const { connected, connectionStatus } = useSocketCocina({
    onNuevaComanda: handleNuevaComanda,
    onComandaActualizada: handleComandaActualizada,
    onPlatoActualizado: handlePlatoActualizado,
    obtenerComandas: obtenerComandas
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
  // Cuando se finaliza, el status cambia a "recoger" y desaparecen automáticamente
  const enEspera = filteredComandas.filter(c => {
    // Si no tiene platos, no mostrar
    if (!c.platos || c.platos.length === 0) return false;
    
    // SOLO mostrar comandas con status "en_espera"
    // NO mostrar comandas con status "recoger" o "entregado"
    if (c.status !== "en_espera") return false;
    
    // VALIDACIÓN CRÍTICA: Solo mostrar comandas donde TODOS los platos tengan nombre cargado
    // Esto evita mostrar tarjetas con platos sin nombre que luego se cargan
    const todosPlatosConNombre = c.platos.every(plato => {
      const platoObj = plato.plato || plato;
      const nombre = platoObj?.nombre || plato?.nombre;
      // Verificar que el nombre existe, no está vacío y no es solo espacios
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
                await axios.put(
                  `${getApiUrl()}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
                  { nuevoEstado: "recoger" }
                );
              } catch (error) {
                console.error(`Error actualizando plato ${plato.plato?._id || plato._id}:`, error);
                // Continuar con los demás platos aunque uno falle
              }
            }
          }
        }
      } else if (estadoActual === "recoger") {
        // RECOGER → MOZOS: Cambiar todos los platos recoger a entregado
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda) {
          for (const plato of comanda.platos) {
            if (plato.estado === "recoger") {
              try {
                await axios.put(
                  `${getApiUrl()}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
                  { nuevoEstado: "entregado" }
                );
              } catch (error) {
                console.error(`Error actualizando plato ${plato.plato?._id || plato._id}:`, error);
                // Continuar con los demás platos aunque uno falle
              }
            }
          }
          // Actualizar status de comanda
          try {
            await axios.put(
              `${getApiUrl()}/${comandaId}/status`,
              { nuevoStatus: "entregado" }
            );
          } catch (error) {
            console.error("Error actualizando status de comanda:", error);
            // No bloquear si falla la actualización del status
          }
        }
      }
      
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

  // Combinar y ordenar comandas por tiempo (más antiguas primero) - estilo SICAR
  // Solo mostramos comandas en espera
  const todasComandas = enEspera.sort((a, b) => {
    const tiempoA = a.createdAt ? moment(a.createdAt).valueOf() : 0;
    const tiempoB = b.createdAt ? moment(b.createdAt).valueOf() : 0;
    return tiempoA - tiempoB; // Más antiguas primero
  });

  // Paginación: basada en configuración de diseño (cols * rows)
  const COMANDAS_POR_PAGINA = (config.design?.cols || 5) * (config.design?.rows || 1);
  const totalPages = Math.ceil(todasComandas.length / COMANDAS_POR_PAGINA);
  const comandasPagina = todasComandas.slice(
    currentPage * COMANDAS_POR_PAGINA,
    (currentPage + 1) * COMANDAS_POR_PAGINA
  );

  // Toggle selección de comanda
  const toggleSelectOrder = (comandaId) => {
    setSelectedOrders(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(comandaId)) {
        nuevo.delete(comandaId);
      } else {
        nuevo.add(comandaId);
      }
      return nuevo;
    });
  };

  // Toggle checkbox de plato individual
  const togglePlatoCheck = useCallback((comandaId, platoId) => {
    setPlatosChecked(prev => {
      const nuevo = new Map(prev);
      const key = `${comandaId}-${platoId}`;
      nuevo.set(key, !(nuevo.get(key) || false));
      return nuevo;
    });
    // Auto-seleccionar comanda cuando se marca un plato
    setSelectedOrders(prev => {
      const nuevo = new Set(prev);
      nuevo.add(comandaId);
      return nuevo;
    });
  }, []);

  // Obtener total de platos marcados
  const getTotalPlatosMarcados = useCallback(() => {
    let total = 0;
    platosChecked.forEach((checked) => {
      if (checked) total++;
    });
    return total;
  }, [platosChecked]);

  // Verificar si una comanda tiene todos los platos listos (en "recoger" o "entregado")
  const comandaTieneTodosPlatosListos = useCallback((comandaId) => {
    const comanda = comandas.find(c => c._id === comandaId);
    if (!comanda || !comanda.platos || comanda.platos.length === 0) return false;
    
    return comanda.platos.every(plato => {
      const estado = plato.estado;
      return estado === "recoger" || estado === "entregado";
    });
  }, [comandas]);

  // Handler para finalizar platos marcados con checkboxes
  const handleFinalizarPlatosGlobal = useCallback(async () => {
    const totalMarcados = getTotalPlatosMarcados();
    if (totalMarcados === 0) {
      console.warn('⚠️ No hay platos seleccionados');
      return;
    }

    // Recopilar todos los platos marcados
    const platosProcesados = [];
    platosChecked.forEach((checked, key) => {
      if (!checked) return;
      
      const [comandaId, platoId] = key.split('-');
      const comanda = comandas.find(c => c._id === comandaId);
      if (!comanda) return;
      
      const plato = comanda.platos?.find(p => {
        const pId = p.plato?._id?.toString() || p._id?.toString() || p.platoId?.toString();
        return pId === platoId;
      });
      
      if (plato && (plato.estado === "en_espera" || plato.estado === "ingresante")) {
        platosProcesados.push({ comandaId, platoId });
      }
    });

    if (platosProcesados.length === 0) {
      console.warn('⚠️ No hay platos válidos para finalizar');
      return;
    }

    // Procesar en paralelo
    const resultados = await Promise.allSettled(
      platosProcesados.map(async ({ comandaId, platoId }) => {
        try {
          const comanda = comandas.find(c => c._id === comandaId);
          if (!comanda) return { comandaId, platoId, exito: false, error: 'Comanda no encontrada' };
          
          const plato = comanda.platos?.find(p => {
            const pId = p.plato?._id?.toString() || p._id?.toString() || p.platoId?.toString();
            return pId === platoId;
          });
          
          if (!plato) return { comandaId, platoId, exito: false, error: 'Plato no encontrado' };
          
          const platoIdFinal = plato.plato?._id || plato._id || platoId;
          
          await axios.put(
            `${getApiUrl()}/${comandaId}/plato/${platoIdFinal}/estado`,
            { nuevoEstado: "recoger" }
          );
          return { comandaId, platoId, exito: true };
        } catch (error) {
          console.error(`Error finalizando plato ${platoId}:`, error);
          return { comandaId, platoId, exito: false, error: error.message };
        }
      })
    );

    // Limpiar checkboxes exitosos
    setPlatosChecked(prev => {
      const nuevo = new Map(prev);
      resultados.forEach(result => {
        if (result.status === 'fulfilled' && result.value.exito) {
          const { comandaId, platoId } = result.value;
          const key = `${comandaId}-${platoId}`;
          nuevo.delete(key);
        }
      });
      return nuevo;
    });

    const exitosos = resultados.filter(r => r.status === 'fulfilled' && r.value.exito).length;
    const fallidos = resultados.length - exitosos;
    
    if (exitosos > 0) {
      console.log(`✅ ${exitosos} plato(s) finalizado(s) exitosamente`);
    }
    if (fallidos > 0) {
      console.warn(`⚠️ ${fallidos} plato(s) fallaron al finalizar`);
    }
  }, [platosChecked, comandas, getTotalPlatosMarcados]);

  // Handler para finalizar comanda completa
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

    // Advertencia opcional si hay platos en preparación (no bloquea, solo informa)
    const comandasConPlatosEnPreparacion = comandasParaFinalizar.filter(comanda => {
      if (!comanda.platos || comanda.platos.length === 0) return false;
      return comanda.platos.some(plato => {
        const estado = plato.estado;
        return estado === "en_espera" || estado === "ingresante";
      });
    });

    if (comandasConPlatosEnPreparacion.length > 0) {
      const numeros = comandasConPlatosEnPreparacion.map(c => `#${c.comandaNumber || c._id}`).join(', ');
      const continuar = window.confirm(
        `⚠️ ${comandasConPlatosEnPreparacion.length} comanda(s) tiene(n) platos aún en preparación: ${numeros}\n\n` +
        `¿Deseas continuar? Todos los platos se marcarán como entregados automáticamente.`
      );
      if (!continuar) {
        return;
      }
    }

    // Mostrar modal de confirmación
    const comandaPrincipal = comandasParaFinalizar[0];
    const textoConfirmacion = comandasParaFinalizar.length === 1
      ? `¿Finalizar Orden #${comandaPrincipal.comandaNumber}? Todos los platos se marcarán como entregados.`
      : `¿Finalizar ${comandasParaFinalizar.length} comandas? Todos los platos se marcarán como entregados.`;

    if (!window.confirm(textoConfirmacion)) {
      return;
    }

    // Batch API para todas las comandas
    const resultados = await Promise.allSettled(
      comandasParaFinalizar.map(async (comanda) => {
        try {
          await axios.put(`${getApiUrl()}/${comanda._id}/status`, { nuevoStatus: "entregado" });
          return { comandaId: comanda._id, exito: true };
        } catch (error) {
          console.error(`Error finalizando comanda ${comanda._id}:`, error);
          return { comandaId: comanda._id, exito: false, error: error.message };
        }
      })
    );

    // Limpiar selección y checks
    setSelectedOrders(new Set());
    setPlatosChecked(new Map());
    
    const exitosos = resultados.filter(r => r.status === 'fulfilled' && r.value.exito).length;
    const fallidos = resultados.length - exitosos;
    
    if (exitosos > 0) {
      console.log(`✅ ${exitosos} comanda(s) finalizada(s) exitosamente`);
    }
    if (fallidos > 0) {
      console.warn(`⚠️ ${fallidos} comanda(s) fallaron al finalizar`);
      alert(`⚠️ ${fallidos} comanda(s) no se pudieron finalizar. Por favor, inténtalo de nuevo.`);
    }
  }, [comandas, selectedOrders]);

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
              await axios.put(
                `${getApiUrl()}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
                { nuevoEstado: "recoger" }
              );
            } catch (error) {
              console.error(`Error actualizando plato ${plato.plato?._id || plato._id}:`, error);
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

  // Marcar comandas seleccionadas como entregadas
  const marcarEntregadas = async () => {
    if (selectedOrders.size === 0) return;
    
    try {
      const comandasParaEntregar = Array.from(selectedOrders);
      
      for (const comandaId of comandasParaEntregar) {
        const comanda = todasComandas.find(c => c._id === comandaId);
        if (!comanda) continue;

        // Cambiar todos los platos a entregado
        for (const plato of comanda.platos) {
          if (plato.estado !== "entregado") {
            try {
              await axios.put(
                `${getApiUrl()}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
                { nuevoEstado: "entregado" }
              );
            } catch (error) {
              console.error(`Error actualizando plato ${plato.plato?._id || plato._id}:`, error);
            }
          }
        }

        // Actualizar status de comanda a entregado
        try {
          await axios.put(
            `${getApiUrl()}/${comandaId}/status`,
            { nuevoStatus: "entregado" }
          );
        } catch (error) {
          console.error("Error actualizando status de comanda:", error);
        }
      }

      // Limpiar selección y refrescar
      setSelectedOrders(new Set());
      setShowEntregadoConfirm(false);
      obtenerComandas();
    } catch (error) {
      console.error("Error al marcar comandas como entregadas:", error);
      alert("Error al marcar comandas como entregadas. Por favor, intente nuevamente.");
    }
  };

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
      {/* Header fijo estilo SICAR - Mejorado */}
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
          </div>
          
          {/* Botones pequeños arriba derecha - Orden: Buscar → Reportes → Config → Revertir */}
          <div className="flex gap-2">
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

      {/* Grid principal estilo SICAR - Configurable, mejor espaciado */}
      {/* Padding inferior para la barra sticky */}
      <div className={`flex-1 overflow-hidden ${bgGrid} p-3 flex flex-col pb-24`}>
        {todasComandas.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-center ${textSecondary}`}>
              <p className={`text-2xl font-bold mb-2 ${textMain}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                No hay comandas activas
              </p>
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
                    onToggleSelect={() => toggleSelectOrder(comanda._id)}
                    fontSize={config.design?.fontSize || 15}
                    platoStates={platoStates}
                    setPlatoStates={setPlatoStates}
                    cardNumber={cardNumber}
                    nightMode={nightMode}
                    platosEliminados={platosEliminados.get(comanda._id) || []}
                    platosChecked={platosChecked}
                    togglePlatoCheck={togglePlatoCheck}
                  />
                  );
                })}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Barra inferior sticky: Finalizar Platos → Finalizar Comanda → Revertir → Paginado */}
            <div className={`fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 ${bgBottomBar} border-t ${borderBottomBar} z-50`} style={{ boxShadow: '0 -4px 6px rgba(0,0,0,0.1)' }}>
              {/* Orden: Finalizar Platos → Finalizar Comanda → Revertir → Paginado */}
              <div className="flex items-center gap-3">
                {/* 1. Botón FINALIZAR PLATOS (Verde) - Finaliza platos marcados con checkboxes */}
                <motion.button
                  onClick={handleFinalizarPlatosGlobal}
                  disabled={getTotalPlatosMarcados() === 0}
                  className={`px-6 py-3 font-bold rounded-lg text-lg shadow-lg flex items-center gap-2 ${
                    getTotalPlatosMarcados() > 0
                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                      : nightMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={getTotalPlatosMarcados() > 0 ? { 
                    scale: 1.05, 
                    boxShadow: "0 0 30px rgba(34, 197, 94, 0.7)" 
                  } : {}}
                  whileTap={getTotalPlatosMarcados() > 0 ? { scale: 0.95 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {getTotalPlatosMarcados() > 0 && (
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                    >
                      ✓
                    </motion.span>
                  )}
                  Finalizar {getTotalPlatosMarcados() > 0 ? `${getTotalPlatosMarcados()} ` : ''}Platos
                </motion.button>

                {/* 2. Botón FINALIZAR COMANDA (Azul) - Finaliza comanda(s) seleccionada(s) completa(s) */}
                <motion.button
                  onClick={handleFinalizarComandaCompletaGlobal}
                  disabled={selectedOrders.size === 0}
                  className={`px-6 py-3 font-bold rounded-lg text-lg shadow-lg flex items-center gap-2 ${
                    selectedOrders.size > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : nightMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={selectedOrders.size > 0 ? { 
                    scale: 1.05, 
                    boxShadow: "0 0 30px rgba(59, 130, 246, 0.7)" 
                  } : {}}
                  whileTap={selectedOrders.size > 0 ? { scale: 0.95 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {selectedOrders.size > 0 && (
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                    >
                      ✓
                    </motion.span>
                  )}
                  {selectedOrders.size === 0 
                    ? 'Finalizar Comanda' 
                    : selectedOrders.size === 1
                      ? `Finalizar #${comandas.find(c => c._id === Array.from(selectedOrders)[0])?.comandaNumber || ''} ✓`
                      : `Finalizar ${selectedOrders.size} Comandas ✓`
                  }
                </motion.button>

                {/* 3. Botón REVERTIR (Gris) - Limpia checks */}
                <motion.button
                  onClick={() => {
                    setPlatosChecked(new Map());
                    setShowRevertir(true);
                  }}
                  className={`px-4 py-2 ${bgButton} ${bgButtonHover} ${textButton} font-semibold rounded-lg text-sm shadow-md`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  REVERTIR
                </motion.button>
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
  togglePlatoCheck = () => {}
}) => {
  // 🔥 AUDITORÍA: Obtener platos eliminados del historialPlatos de la comanda
  const platosEliminadosHistorial = React.useMemo(() => {
    if (!comanda.historialPlatos || !Array.isArray(comanda.historialPlatos)) {
      return [];
    }
    
    return comanda.historialPlatos
      .filter(h => h.estado === 'eliminado')
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
        
        return {
          platoId: h.platoId,
          nombre: nombre, // Puede ser null si no se encontró
          cantidad: h.cantidadOriginal || h.cantidad || 1,
          motivo: h.motivo || 'Eliminado',
          timestamp: h.timestamp || new Date(),
          usuario: h.usuario,
          necesitaBuscarNombre: !nombre || nombre.startsWith('Plato #')
        };
      });
  }, [comanda.historialPlatos]);
  
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


  // Filtrar platos por estado según columna
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

  // Obtener el estado actual de un plato: null (normal), 'preparing' (amarillo), 'completed' (verde)
  const getPlatoStatus = (platoId) => {
    const platoKey = `${comandaId}-${platoId}`;
    return platoStates.get(platoKey) || null;
  };

  // Toggle plato: normal → preparing (amarillo) → completed (verde) → normal
  const togglePlatoStatus = (platoId) => {
    setPlatoStates(prev => {
      const nuevo = new Map(prev);
      const platoKey = `${comandaId}-${platoId}`;
      const estadoActual = nuevo.get(platoKey);
      
      // Ciclo: null → 'preparing' → 'completed' → null
      if (!estadoActual) {
        nuevo.set(platoKey, 'preparing');
      } else if (estadoActual === 'preparing') {
        nuevo.set(platoKey, 'completed');
      } else {
        nuevo.delete(platoKey); // Volver a normal
      }
      
      return nuevo;
    });
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

  return (
    <motion.div 
      layoutId={`order-${comandaId}`}
      className={`${bgColor} ${borderColor} flex flex-col relative cursor-pointer`}
      style={{
        fontFamily: 'Arial, sans-serif',
        width: '300px',
        height: '500px',
        borderRadius: '12px',
        boxShadow: isSelected 
          ? '0 8px 32px rgba(34, 197, 94, 0.4)' 
          : '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: isSelected ? '4px solid #22c55e' : '2px solid',
        background: isSelected 
          ? `linear-gradient(135deg, rgba(34,197,94,0.4), rgba(0,255,0,0.2)), ${bgColor.replace('bg-', '')}`
          : undefined
      }}
      initial={{ opacity: 0, scale: 0.8, y: 100 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: 0
      }}
      exit={{ opacity: 0, scale: 0.8, y: -50 }}
      whileHover={{ scale: 1.03, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 24
      }}
      onClick={onToggleSelect}
    >
      {/* Checkmark grande animado cuando está seleccionada */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 15 
            }}
          >
            <div className="text-white text-5xl font-bold" style={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              fontFamily: 'Arial, sans-serif'
            }}>
              ✓
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header con fondo que cambia según tiempo (gris/amarillo/rojo) */}
      <div className={`p-4 ${isSelected ? "pt-16" : "pt-4"} ${bgColor}`}>
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
              M{comanda.mesas?.nummesa || "N/A"}
            </div>
            <div className="flex items-center gap-1">
              <FaClock className="text-white text-sm" />
              <div className={`text-white font-bold text-base ${minutosActuales >= alertRedMinutes ? 'text-red-200' : minutosActuales >= alertYellowMinutes ? 'text-yellow-200' : 'text-white'}`} style={{ fontFamily: 'Arial, sans-serif' }}>
                {tiempoFormateado}
              </div>
            </div>
          </div>
        </div>
        {/* Mozo y tiempo en una línea */}
        <div className="flex items-center justify-between text-white text-sm">
          <span className="font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>
            👤 {comanda.mozos?.name || comanda.mozos?.nombre || 'admin'}
          </span>
        </div>
      </div>

      {/* 🔥 AUDITORÍA: Panel de auditoría (activos vs eliminados del historial) */}
      {(() => {
        // Contar platos activos (los que están en el array platos)
        const platosActivos = comanda.platos?.length || 0;
        // Contar platos eliminados del historial
        const platosEliminadosCount = platosEliminadosFinal.length;
        if (platosEliminadosCount > 0) {
          return (
            <div className={`px-4 py-2 ${nightMode ? 'bg-blue-900/30' : 'bg-blue-100'} border-b ${nightMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <div className="flex items-center justify-center gap-3 text-sm font-semibold">
                <span className={nightMode ? 'text-green-400' : 'text-green-700'}>
                  ✅ {platosActivos}
                </span>
                <span className={nightMode ? 'text-gray-400' : 'text-gray-600'}>|</span>
                <span className="text-red-500">
                  ❌ {platosEliminadosCount}
                </span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Badge de estado - EN ESPERA (abajo del header, fondo según modo) */}
      {estadoColumna === "en_espera" && (
        <div className={`${bgBadgeEspera} ${textBadgeEspera} font-bold text-base py-2 text-center`} style={{ 
          fontFamily: 'Arial, sans-serif'
        }}>
          EN ESPERA
        </div>
      )}
      {estadoColumna === "recoger" && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white font-bold text-base py-2 text-center rounded-t-lg" style={{ 
          fontFamily: 'Arial, sans-serif',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        }}>
          LISTO
        </div>
      )}

      {/* Lista de platos vertical - Fuente 18px, mejor espaciado, con interacción - Fondo según modo */}
      <div className={`flex-1 px-4 py-2 overflow-y-auto ${bgPlatos}`}>
        <div className="space-y-1.5">
          <AnimatePresence>
            {platosFiltrados.map((plato, index) => {
              const platoObj = plato.plato || plato;
              const cantidad = comanda.cantidades?.[comanda.platos.indexOf(plato)] || 1;
              const platoId = platoObj?._id || plato._id || index;
              const platoStatus = getPlatoStatus(platoId);
              const isPreparing = platoStatus === 'preparing';
              const isCompleted = platoStatus === 'completed';
              
              // FASE 3: Obtener estado granular del plato (desde WebSocket o estado local)
              const platoKey = `${comandaId}-${platoId}`;
              const platoStateData = platoStates.get(platoKey);
              const isAnimando = platoStateData?.animando === true;
              const estadoRealPlato = plato.estado || 'pedido'; // Estado real del backend
              
              // 🔥 AUDITORÍA: Verificar si el plato está eliminado
              const isEliminado = plato.eliminado === true;
              
              // Determinar colores según el estado
              let backgroundColor = 'transparent';
              let textColor = nightMode ? '#ffffff' : '#111827';
              let bgClass = '';
              let textClass = textPlatos;
              
              // FASE 3: Mapear estados del backend a colores visuales
              // 'pedido'/'en_espera' → normal, 'recoger' → amarillo (preparando), 'entregado' → verde (completado)
              const estadoVisual = estadoRealPlato === 'recoger' ? 'preparing' : 
                                   estadoRealPlato === 'entregado' ? 'completed' : 
                                   null;
              
              // 🔥 AUDITORÍA: Si está eliminado, usar rojo tachado
              if (isEliminado) {
                backgroundColor = 'rgba(239, 68, 68, 0.15)'; // Rojo con transparencia
                textColor = '#ef4444'; // Rojo #FF3B30 equivalente
                bgClass = 'bg-red-500/15';
                textClass = 'text-red-500';
              } else if (estadoVisual === 'preparing' || isPreparing) {
                // FASE 3: Amarillo cuando está en 'recoger' o marcado como preparando
                backgroundColor = isAnimando ? 'rgba(234, 179, 8, 0.5)' : 'rgba(234, 179, 8, 0.3)'; // Más intenso si está animando
                textColor = nightMode ? '#fde047' : '#a16207'; // Amarillo claro/oscuro
                bgClass = isAnimando ? 'bg-yellow-500/50' : 'bg-yellow-500/30';
                textClass = textPlatosPreparing;
              } else if (estadoVisual === 'completed' || isCompleted) {
                // FASE 3: Verde cuando está en 'entregado' o marcado como completado
                backgroundColor = isAnimando ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)'; // Más intenso si está animando
                textColor = nightMode ? '#86efac' : '#15803d'; // Verde claro/oscuro
                bgClass = isAnimando ? 'bg-green-500/50' : 'bg-green-500/30';
                textClass = textPlatosCompleted;
              }
              
              // Obtener estado del checkbox
              const checkKey = `${comandaId}-${platoId}`;
              const isChecked = platosChecked.get(checkKey) || false;
              
              return (
                <motion.div
                  key={platoId}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: isChecked ? 'rgba(34, 197, 94, 0.3)' : backgroundColor,
                    color: isChecked ? (nightMode ? '#86efac' : '#15803d') : textColor,
                    // FASE 3: Animación cuando el plato cambia de estado vía WebSocket
                    scale: isAnimando ? [1, 1.05, 1] : 1,
                    boxShadow: isAnimando ? [
                      '0 0 0px rgba(34, 197, 94, 0)',
                      '0 0 20px rgba(34, 197, 94, 0.6)',
                      '0 0 0px rgba(34, 197, 94, 0)'
                    ] : 'none'
                  }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ 
                    duration: isAnimando ? 0.3 : 0.2,
                    type: isAnimando ? "spring" : "tween",
                    stiffness: isAnimando ? 300 : undefined,
                    damping: isAnimando ? 20 : undefined
                  }}
                  className={`font-semibold leading-tight px-2 py-1 rounded transition-all duration-200 flex items-center gap-2 ${
                    isEliminado ? `${bgClass} ${textClass} line-through cursor-not-allowed` : `cursor-pointer ${isPreparing || isCompleted || isChecked ? `${bgClass} ${textClass}` : `${textPlatos} ${textPlatosHover}`}`
                  }`}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '18px'
                  }}
                >
                  {/* Checkbox cuadrado 24x24px */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEliminado) {
                        togglePlatoCheck(comandaId, platoId);
                      }
                    }}
                    className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                      isChecked 
                        ? 'bg-green-500 border-green-600' 
                        : nightMode 
                          ? 'border-gray-500 bg-gray-800 hover:border-gray-400' 
                          : 'border-gray-400 bg-white hover:border-gray-500'
                    } ${isEliminado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}`}
                  >
                    {isChecked && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </motion.svg>
                    )}
                  </div>
                  
                  <span className="flex items-center gap-2 flex-1">
                    {isPreparing && !isChecked && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className={textPlatosPreparing}
                      >
                        ⏳
                      </motion.span>
                    )}
                    {isCompleted && !isChecked && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className={textPlatosCompleted}
                      >
                        ✓
                      </motion.span>
                    )}
                    <span className={isEliminado ? 'line-through' : ''}>
                      {cantidad} {platoObj?.nombre || "Sin nombre"}
                    </span>
                    {/* 🔥 AUDITORÍA: Badge de razón si está eliminado */}
                    {isEliminado && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444'
                        }}
                      >
                        🗑️ {plato.eliminadoRazon || 'Eliminado'}
                      </motion.span>
                    )}
                  </span>
                </motion.div>
              );
            })}
            
            {/* 🔥 AUDITORÍA: Mostrar platos eliminados del historial en tachado y rojo */}
            {platosEliminadosFinal.map((platoEliminado, index) => {
              const motivo = platoEliminado.motivo || 'Eliminado';
              const timestamp = platoEliminado.timestamp 
                ? moment(platoEliminado.timestamp).tz("America/Lima").format('HH:mm')
                : '';
              
              return (
                <motion.div
                  key={`eliminado-${platoEliminado.platoId}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="font-semibold leading-tight px-2 py-1 rounded transition-all duration-200 bg-red-500/15 text-red-500"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '18px',
                    textDecoration: 'line-through',
                    opacity: 0.8
                  }}
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-red-500">🗑️</span>
                    <span style={{ textDecoration: 'line-through' }}>
                      {platoEliminado.cantidad} {platoEliminado.nombre}
                    </span>
                    {motivo && motivo !== 'Eliminado' && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.3)',
                          color: '#ef4444'
                        }}
                        title={timestamp ? `Eliminado a las ${timestamp}` : ''}
                      >
                        {motivo}
                        {timestamp && ` (${timestamp})`}
                      </motion.span>
                    )}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Espacio inferior - Los botones PREPARAR y SIN STOCK fueron eliminados, ahora se usa FINALIZAR */}

    </motion.div>
  );
};

export default ComandaStyle;
