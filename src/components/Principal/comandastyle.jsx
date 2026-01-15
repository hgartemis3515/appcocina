import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import moment from "moment-timezone";
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
  FaUserFriends
} from "react-icons/fa";
import ConfigModal from "./ConfigModal";
import ReportsModal from "./ReportsModal";
import RevertirModal from "./RevertirModal";

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
    autoPrint: false
  });
  const [showConfig, setShowConfig] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showRevertir, setShowRevertir] = useState(false);
  const [expandedComandas, setExpandedComandas] = useState(new Set());
  const [horaActual, setHoraActual] = useState(moment().tz("America/Lima"));
  const [fechaActual, setFechaActual] = useState(moment().tz("America/Lima"));
  const previousComandasRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const lastSuccessTimeRef = useRef(Date.now());

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
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('kdsConfig', JSON.stringify(config));
  }, [config]);

  const obtenerComandas = useCallback(async () => {
    try {
      const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
      const apiUrl = `${process.env.REACT_APP_API_COMANDA}/fechastatus/${fechaActual}`;
      
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
      
      // Detectar nuevas comandas para reproducir sonido
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

  // Polling con intervalo configurable
  useEffect(() => {
    obtenerComandas();
    
    const intervalId = setInterval(() => {
      obtenerComandas();
    }, config.pollingInterval);
    
    return () => {
      clearInterval(intervalId);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [obtenerComandas, config.pollingInterval]);

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

  // Filtrar comandas por estado (SICAR.MX) - Solo se muestran: en_espera y recoger
  const enEspera = filteredComandas.filter(c => {
    // Si no tiene platos, no mostrar
    if (!c.platos || c.platos.length === 0) return false;
    
    const tieneEnEspera = c.platos.some(p => {
      const estado = p?.estado || "en_espera";
      return estado === "en_espera" || estado === "ingresante" || estado === "pendiente";
    });
    return tieneEnEspera;
  });

  const recoger = filteredComandas.filter(c => {
    // Si no tiene platos, no mostrar
    if (!c.platos || c.platos.length === 0) return false;
    
    return c.platos.some(p => {
      const estado = p?.estado || "en_espera";
      return estado === "recoger";
    });
  });

  // Ya no mostramos comandas entregadas en el panel principal
  // Solo se muestran en_espera y recoger

  // Debug logs
  useEffect(() => {
    if (comandas.length > 0) {
      console.log('📊 Estadísticas de comandas:');
      console.log(`  - Total recibidas: ${comandas.length}`);
      console.log(`  - Filtradas: ${filteredComandas.length}`);
      console.log(`  - En espera: ${enEspera.length}`);
      console.log(`  - Recoger: ${recoger.length}`);
      
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
              await axios.put(
                `${process.env.REACT_APP_API_COMANDA}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
                { nuevoEstado: "recoger" }
              );
            }
          }
        }
      } else if (estadoActual === "recoger") {
        // RECOGER → MOZOS: Cambiar todos los platos recoger a entregado
        const comanda = comandas.find(c => c._id === comandaId);
        if (comanda) {
          for (const plato of comanda.platos) {
            if (plato.estado === "recoger") {
              await axios.put(
                `${process.env.REACT_APP_API_COMANDA}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
                { nuevoEstado: "entregado" }
              );
            }
          }
          // Actualizar status de comanda
          await axios.put(
            `${process.env.REACT_APP_API_COMANDA}/${comandaId}/status`,
            { nuevoStatus: "entregado" }
          );
        }
      }
      
      obtenerComandas();
    } catch (error) {
      console.error("Error al avanzar estado:", error);
    }
  };

  // Marcar plato como sin stock
  const marcarSinStock = async (comandaId, platoId) => {
    try {
      const comanda = comandas.find(c => c._id === comandaId);
      if (!comanda) return;
      
      // Encontrar el índice del plato en la lista original
      const platoIndex = comanda.platos.findIndex(
        p => (p.plato?._id || p._id) === platoId
      );
      
      if (platoIndex === -1) return;
      
      const updatedComanda = { ...comanda };
      updatedComanda.platos.splice(platoIndex, 1);
      updatedComanda.cantidades.splice(platoIndex, 1);
      
      if (updatedComanda.platos.length === 0) {
        await axios.delete(`${process.env.REACT_APP_API_COMANDA}/${comandaId}`);
      } else {
        await axios.put(
          `${process.env.REACT_APP_API_COMANDA}/${comandaId}`,
          updatedComanda
        );
      }
      
      obtenerComandas();
    } catch (error) {
      console.error("Error al marcar sin stock:", error);
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

  // Contadores (solo en_espera y recoger)
  const totalComandas = enEspera.length + recoger.length;

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

  return (
    <div className="w-full h-screen flex flex-col bg-[#1A1A1A] text-white overflow-hidden">
      {/* Encabezado fijo superior */}
      <header className="h-[60px] bg-[#1A1A1A] border-b-2 border-gray-700 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-50">
        <div className="flex items-center gap-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            🍳 COCINA LAS GAMBUSINAS
          </h1>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-base sm:text-lg md:text-xl">
          <div className="flex flex-col items-end">
            <div className="font-bold">{horaActual.format("HH:mm:ss")}</div>
            <div className="text-xs sm:text-sm text-gray-400">{fechaActual.format("DD/MM/YYYY")}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400">Activos</div>
              <div className="font-bold text-orange-400">{totalComandas}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Total Día</div>
              <div className="font-bold text-green-400">{comandas.length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Barra de búsqueda y controles */}
      <div className="bg-[#1A1A1A] border-b border-gray-700 px-3 sm:px-6 py-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <SearchBar onSearch={setSearchTerm} />
          </div>
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={() => setShowReports(true)}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors text-sm sm:text-base"
            >
              <FaFilePdf /> <span className="hidden sm:inline">Reportes</span>
            </button>
            <button
              onClick={() => setShowConfig(true)}
              className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors text-sm sm:text-base"
            >
              <FaCog /> <span className="hidden sm:inline">Config</span>
            </button>
            <button
              onClick={obtenerComandas}
              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors text-sm sm:text-base"
            >
              <FaSync /> <span className="hidden sm:inline">{config.pollingInterval / 1000}s</span>
            </button>
            <button
              onClick={() => setShowRevertir(true)}
              className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors text-sm sm:text-base"
            >
              <FaUndo /> <span className="hidden sm:inline">Revertir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cuerpo principal con 2 columnas: EN ESPERA y RECOGER */}
      <div className="flex-1 overflow-hidden">
        <div className={`h-full grid gap-4 p-4 overflow-y-auto ${
          (enEspera.length > 0 ? 1 : 0) + (recoger.length > 0 ? 1 : 0) === 1 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2'
        }`}>
          {/* Columna EN ESPERA (NUEVAS 🟠) */}
          {enEspera.length > 0 && (
            <div className="flex flex-col h-full min-h-0">
              <div className="bg-[#FF9500] text-white p-3 rounded-t-lg font-bold text-lg text-center sticky top-0 z-10">
                EN ESPERA (NUEVAS 🟠) ({enEspera.length})
              </div>
              <div className="flex-1 bg-gray-800 rounded-b-lg p-3 overflow-y-auto space-y-3 min-h-0">
                {enEspera.map((comanda) => {
                  const tiempo = calcularTiempoTranscurrido(comanda);
                  const isExpanded = expandedComandas.has(comanda._id);
                  return (
                    <ComandaCard
                      key={comanda._id}
                      comanda={comanda}
                      tiempo={tiempo}
                      getColorAlerta={getColorAlerta}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpandir(comanda._id)}
                      onPreparar={() => avanzarEstadoComanda(comanda._id, "en_espera")}
                      onSinStock={marcarSinStock}
                      calcularTotal={calcularTotal}
                      estadoColumna="en_espera"
                      comandaId={comanda._id}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Columna RECOGER (LISTAS 🟡) */}
          {recoger.length > 0 && (
            <div className="flex flex-col h-full min-h-0">
              <div className="bg-[#FFD500] text-gray-900 p-3 rounded-t-lg font-bold text-lg text-center sticky top-0 z-10">
                RECOGER (LISTAS 🟡) ({recoger.length})
              </div>
              <div className="flex-1 bg-gray-800 rounded-b-lg p-3 overflow-y-auto space-y-3 min-h-0">
                {recoger.map((comanda) => {
                  const tiempo = calcularTiempoTranscurrido(comanda);
                  const isExpanded = expandedComandas.has(comanda._id);
                  return (
                    <ComandaCard
                      key={comanda._id}
                      comanda={comanda}
                      tiempo={tiempo}
                      getColorAlerta={getColorAlerta}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpandir(comanda._id)}
                      onMozos={() => avanzarEstadoComanda(comanda._id, "recoger")}
                      onPausa={() => {}}
                      calcularTotal={calcularTotal}
                      estadoColumna="recoger"
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Mensaje si no hay comandas */}
          {enEspera.length === 0 && recoger.length === 0 && (
            <div className="col-span-3 flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-2xl font-bold mb-4">No hay comandas activas</p>
                <p className="text-lg">Las comandas aparecerán aquí cuando los mozos las envíen</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {showConfig && (
        <ConfigModal
          config={config}
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
          onClose={() => setShowReports(false)}
        />
      )}

      {showRevertir && (
        <RevertirModal
          onClose={() => setShowRevertir(false)}
          onRevertir={obtenerComandas}
        />
      )}
    </div>
  );
};

// Componente de tarjeta de comanda (SICAR style)
const ComandaCard = ({ 
  comanda, 
  tiempo, 
  getColorAlerta, 
  isExpanded,
  onToggleExpand,
  onPreparar,
  onMozos,
  onPausa,
  onListo,
  onRegresar,
  onSinStock,
  calcularTotal,
  estadoColumna,
  comandaId
}) => {
  const colorAlerta = getColorAlerta(tiempo.minutos);
  const horaCreacion = comanda.createdAt 
    ? moment(comanda.createdAt).tz("America/Lima").format("HH:mm")
    : "N/A";

  // Filtrar platos por estado según columna
  const platosFiltrados = comanda.platos?.filter(p => {
    const estado = p.estado || "en_espera";
    if (estadoColumna === "en_espera") return estado === "en_espera" || estado === "ingresante";
    if (estadoColumna === "recoger") return estado === "recoger";
    return true;
  }) || [];

  const getEstadoColor = (estado) => {
    const estadoNormalizado = estado || "en_espera";
    switch(estadoNormalizado) {
      case "en_espera":
      case "ingresante": return "🟠";
      case "recoger": return "🟡";
      case "entregado": return "🟢";
      default: return "⚪";
    }
  };

  return (
    <div 
      className={`${colorAlerta} rounded-lg border-2 border-gray-600 shadow-lg cursor-pointer transition-all`}
      onClick={onToggleExpand}
    >
      {/* Encabezado compacto */}
      <div className="p-3">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold text-2xl sm:text-3xl">#{comanda.comandaNumber || "N/A"}</div>
          <div className="text-right text-sm">
            <div className="font-semibold">{comanda.mozos?.name || "Sin mozo"}</div>
            <div className="flex items-center gap-1 text-xs">
              <FaClock className="text-xs" />
              {horaCreacion} ({tiempo.texto})
            </div>
          </div>
        </div>
        <div className="text-sm font-semibold mb-2">
          Mesa {comanda.mesas?.nummesa || "N/A"}
        </div>

        {/* Lista de platos compacta */}
        <div className="space-y-1 mb-2">
          {platosFiltrados.slice(0, isExpanded ? platosFiltrados.length : 3).map((plato, index) => {
            const platoObj = plato.plato || plato;
            const cantidad = comanda.cantidades?.[comanda.platos.indexOf(plato)] || 1;
            const estadoPlato = plato.estado || "en_espera";
            
            return (
              <div
                key={plato._id || index}
                className="text-sm font-semibold flex items-center gap-2"
              >
                <span>{getEstadoColor(estadoPlato)}</span>
                <span className="flex-1">{platoObj?.nombre || "Sin nombre"} x{cantidad}</span>
                {(estadoPlato === "en_espera" || estadoPlato === "ingresante") && <span>⏳</span>}
                {estadoPlato === "entregado" && <span>✓</span>}
              </div>
            );
          })}
          {!isExpanded && platosFiltrados.length > 3 && (
            <div className="text-xs text-gray-600 italic">
              +{platosFiltrados.length - 3} más...
            </div>
          )}
        </div>

        {/* Detalles expandidos */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t-2 border-gray-400 space-y-2">
            <div className="text-sm">
              <strong>Total:</strong> S/. {calcularTotal(comanda).toFixed(2)}
            </div>
            {comanda.observaciones && comanda.observaciones.trim() !== "" && (
              <div className="text-sm bg-blue-100 text-blue-900 p-2 rounded">
                <strong>Nota:</strong> {comanda.observaciones}
              </div>
            )}
            {platosFiltrados.length > 3 && (
              <div className="space-y-1">
                {platosFiltrados.slice(3).map((plato, index) => {
                  const platoObj = plato.plato || plato;
                  const cantidad = comanda.cantidades?.[comanda.platos.indexOf(plato)] || 1;
                  const estadoPlato = plato.estado || "en_espera";
                  return (
                    <div key={plato._id || index} className="text-sm font-semibold flex items-center gap-2">
                      <span>{getEstadoColor(estadoPlato)}</span>
                      <span className="flex-1">{platoObj?.nombre || "Sin nombre"} x{cantidad}</span>
                      {(estadoPlato === "en_espera" || estadoPlato === "ingresante") && <span>⏳</span>}
                      {estadoPlato === "entregado" && <span>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones según columna (SICAR) */}
      <div className="p-3 pt-0 border-t-2 border-gray-400" onClick={(e) => e.stopPropagation()}>
        {estadoColumna === "en_espera" && (
          <div className="flex gap-2">
            <button
              onClick={onPreparar}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <FaChevronRight /> PREPARAR
            </button>
            {onSinStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Encontrar el primer plato en estado en_espera
                  const platoIngresante = comanda.platos?.find(p => p.estado === "en_espera" || p.estado === "ingresante");
                  if (platoIngresante && comandaId) {
                    const platoId = platoIngresante.plato?._id || platoIngresante._id;
                    onSinStock(comandaId, platoId);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <FaTimes /> STOCK
              </button>
            )}
          </div>
        )}

        {estadoColumna === "recoger" && (
          <div className="flex gap-2">
            <button
              onClick={onMozos}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <FaUserFriends /> MOZOS
            </button>
            <button
              onClick={onPausa}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <FaPause /> PAUSA
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ComandaStyle;
