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
    pollingInterval: 3000,
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
      
      console.log('✅ Comandas recibidas:', response.data.length);
      if (response.data.length > 0) {
        console.log('📋 Primera comanda:', {
          _id: response.data[0]._id,
          numero: response.data[0].comandaNumber,
          status: response.data[0].status,
          IsActive: response.data[0].IsActive,
          platos: response.data[0].platos?.length,
          createdAt: response.data[0].createdAt,
          estadosPlatos: response.data[0].platos?.map(p => ({
            estado: p.estado,
            nombre: p.plato?.nombre || p.nombre || 'Sin nombre'
          })) || []
        });
        
        // Verificar si hay comandas sin platos
        const comandasSinPlatos = response.data.filter(c => !c.platos || c.platos.length === 0);
        if (comandasSinPlatos.length > 0) {
          console.warn(`⚠️ ${comandasSinPlatos.length} comandas sin platos:`, comandasSinPlatos.map(c => c.comandaNumber));
        }
      } else {
        console.warn('⚠️ No se recibieron comandas del servidor');
      }
      
      // Detectar nuevas comandas para reproducir sonido y animación
      if (config.soundEnabled && previousComandasRef.current.length > 0) {
        const nuevasComandas = response.data.filter(
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
      
      previousComandasRef.current = response.data;
      setComandas(response.data);
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

  const handleComandaActualizada = useCallback((comandaActualizada) => {
    console.log('📥 Comanda actualizada vía Socket.io:', comandaActualizada.comandaNumber || comandaActualizada._id);
    
    // Actualizar comanda en la lista
    setComandas(prev => {
      const index = prev.findIndex(c => c._id === comandaActualizada._id);
      if (index !== -1) {
        const nuevas = [...prev];
        nuevas[index] = comandaActualizada;
        return nuevas;
      }
      // Si no existe, refrescar todas las comandas
      obtenerComandas();
      return prev;
    });
  }, [obtenerComandas]);

  const handlePlatoActualizado = useCallback((data) => {
    console.log('📥 Plato actualizado vía Socket.io:', data.platoId, data.nuevoEstado);
    
    // Refrescar comanda específica o todas las comandas
    if (data.comanda) {
      handleComandaActualizada(data.comanda);
    } else {
      obtenerComandas();
    }
  }, [handleComandaActualizada, obtenerComandas]);

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
    return c.status === "en_espera";
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

  // Calcular tiempo transcurrido
  const calcularTiempoTranscurrido = (comanda) => {
    if (!comanda.createdAt) return { minutos: 0, texto: "0min" };
    
    const ahora = moment().tz("America/Lima");
    const creacion = moment(comanda.createdAt).tz("America/Lima");
    const diff = ahora.diff(creacion, "minutes");
    
    return {
      minutos: diff,
      texto: diff < 60 ? `${diff}min` : `${Math.floor(diff / 60)}h ${diff % 60}min`
    };
  };

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
            {socketConnectionStatus === 'polling' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500 rounded text-white text-xs font-semibold">
                <span>●</span> Polling
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
      <div className={`flex-1 overflow-hidden ${bgGrid} p-3 flex flex-col`}>
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
                return (
                  <SicarComandaCard
                    key={comanda._id}
                    comanda={comanda}
                    tiempo={tiempo}
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
                  />
                  );
                })}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Barra inferior: Finalizar → Revertir → Paginado (siempre visible) */}
            <div className={`mt-4 flex items-center justify-between px-4 py-3 ${bgBottomBar} border-t ${borderBottomBar}`}>
              {/* Orden: Finalizar → Revertir → Paginado */}
              <div className="flex items-center gap-3">
                {/* 1. Botón FINALIZAR - Siempre visible, deshabilitado si no hay selección */}
                <motion.button
                  onClick={handleFinalizar}
                  disabled={selectedOrders.size === 0}
                  className={`px-6 py-3 font-bold rounded-lg text-lg shadow-lg flex items-center gap-2 ${
                    selectedOrders.size > 0
                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                      : nightMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={selectedOrders.size > 0 ? { 
                    scale: 1.05, 
                    boxShadow: "0 0 30px rgba(34, 197, 94, 0.7)" 
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
                  FINALIZAR {selectedOrders.size > 0 && `(${selectedOrders.size})`}
                </motion.button>

                {/* 2. Botón REVERTIR */}
                <motion.button
                  onClick={() => setShowRevertir(true)}
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
  nightMode = true
}) => {
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

  // Formatear tiempo como MM:SS (actualizado en tiempo real)
  const [tiempoDisplay, setTiempoDisplay] = useState(() => {
    const horas = Math.floor(minutosActuales / 60);
    const minsRestantes = minutosActuales % 60;
    if (horas > 0) {
      return `${horas}:${minsRestantes.toString().padStart(2, '0')}`;
    }
    return `${minutosActuales.toString().padStart(2, '0')}:00`;
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (!comanda.createdAt) return;
      const ahora = moment().tz("America/Lima");
      const creacion = moment(comanda.createdAt).tz("America/Lima");
      const diffMinutos = ahora.diff(creacion, "minutes");
      
      const horas = Math.floor(diffMinutos / 60);
      const minsRestantes = diffMinutos % 60;
      if (horas > 0) {
        setTiempoDisplay(`${horas}:${minsRestantes.toString().padStart(2, '0')}`);
      } else {
        setTiempoDisplay(`${diffMinutos.toString().padStart(2, '0')}:00`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [comanda.createdAt]);

  // Filtrar platos por estado según columna
  const platosFiltrados = comanda.platos?.filter(p => {
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
        <div className="flex items-start justify-between">
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
              <div className="text-white font-bold text-base" style={{ fontFamily: 'Arial, sans-serif' }}>
                {tiempoDisplay}
              </div>
            </div>
          </div>
        </div>
      </div>

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
              
              // Determinar colores según el estado
              let backgroundColor = 'transparent';
              let textColor = nightMode ? '#ffffff' : '#111827';
              let bgClass = '';
              let textClass = textPlatos;
              
              if (isPreparing) {
                backgroundColor = 'rgba(234, 179, 8, 0.3)'; // Amarillo con transparencia
                textColor = nightMode ? '#fde047' : '#a16207'; // Amarillo claro/oscuro
                bgClass = 'bg-yellow-500/30';
                textClass = textPlatosPreparing;
              } else if (isCompleted) {
                backgroundColor = 'rgba(34, 197, 94, 0.3)'; // Verde con transparencia
                textColor = nightMode ? '#86efac' : '#15803d'; // Verde claro/oscuro
                bgClass = 'bg-green-500/30';
                textClass = textPlatosCompleted;
              }
              
              return (
                <motion.div
                  key={platoId}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: backgroundColor,
                    color: textColor
                  }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlatoStatus(platoId);
                  }}
                  className={`font-semibold leading-tight px-2 py-1 rounded cursor-pointer transition-all duration-200 ${
                    isPreparing || isCompleted ? `${bgClass} ${textClass}` : `${textPlatos} ${textPlatosHover}`
                  }`}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                    style={{ 
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '18px'
                    }}
                >
                  <span className="flex items-center gap-2">
                    {isPreparing && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className={textPlatosPreparing}
                      >
                        ⏳
                      </motion.span>
                    )}
                    {isCompleted && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className={textPlatosCompleted}
                      >
                        ✓
                      </motion.span>
                    )}
                    <span>{cantidad} {platoObj?.nombre || "Sin nombre"}</span>
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
