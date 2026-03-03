import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";
import { FaTimes, FaUndo, FaCheckSquare, FaSquare, FaTrash } from "react-icons/fa";
import { getApiUrl } from "../../config/apiConfig";

const RevertirModal = ({ onClose, onRevertir, nightMode = true }) => {
  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const textTertiary = nightMode ? "text-gray-300" : "text-gray-700";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const buttonBg = nightMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-300 hover:bg-gray-400";
  const [comandasFinalizadas, setComandasFinalizadas] = useState([]);
  // PARRAFO 3: Estado para checkboxes de platos individuales
  const [platosSeleccionados, setPlatosSeleccionados] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    const obtenerComandasEntregadas = async () => {
      setCargando(true);
      try {
        const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
        const apiUrl = `${getApiUrl()}/fecha/${fechaActual}`;
        const response = await axios.get(apiUrl, { timeout: 5000 });
        const ahora = moment().tz("America/Lima");
        
        const comandasParaRevertir = response.data.filter(c => {
          if (c.status !== "recoger" && c.status !== "entregado") return false;
          if (!c.platos || c.platos.length === 0) return false;
          const fechaComanda = moment(c.updatedAt || c.createdAt).tz("America/Lima");
          const diffHoras = ahora.diff(fechaComanda, "hours");
          return diffHoras <= 24;
        });

        const ordenadas = comandasParaRevertir.sort((a, b) => {
          const fechaA = moment(a.updatedAt || a.createdAt).tz("America/Lima");
          const fechaB = moment(b.updatedAt || b.createdAt).tz("America/Lima");
          return fechaB.diff(fechaA);
        });

        setComandasFinalizadas(ordenadas);
      } catch (error) {
        console.error("Error al obtener comandas entregadas:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerComandasEntregadas();
  }, []);

  // PARRAFO 3: Toggle checkbox de plato individual
  const togglePlatoSeleccion = (comandaId, platoId) => {
    const key = `${comandaId}-${platoId}`;
    setPlatosSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(key)) {
        nuevo.delete(key);
      } else {
        nuevo.add(key);
      }
      return nuevo;
    });
  };

  // PARRAFO 4: Handler granular para revertir plato individual
  const handleRevertirPlato = async (comandaId, platoId, platoNombre) => {
    setLoading(true);
    try {
      // Actualizar estado del plato a en_espera
      await axios.put(
        `${getApiUrl()}/${comandaId}/plato/${platoId}/estado`,
        { nuevoEstado: "en_espera" }
      );
      
      // Actualizar status de la comanda a en_espera para que vuelva a aparecer en cocina
      await axios.put(
        `${getApiUrl()}/${comandaId}/status`,
        { nuevoStatus: "en_espera" }
      );
      
      // Toast de confirmación
      setToastMsg(`✅ "${platoNombre}" revertido a preparación`);
      setTimeout(() => setToastMsg(null), 3000);
      
      // Limpiar checkbox
      const key = `${comandaId}-${platoId}`;
      setPlatosSeleccionados(prev => {
        const nuevo = new Set(prev);
        nuevo.delete(key);
        return nuevo;
      });
      
      // Refrescar comandas
      if (onRevertir) onRevertir();
      
      // Remover comanda de la lista local si ya no tiene platos reversibles
      setComandasFinalizadas(prev => prev.filter(c => c._id !== comandaId));
    } catch (error) {
      console.error("Error al revertir plato:", error);
      setToastMsg("❌ Error al revertir plato");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // PARRAFO 3: Revertir múltiples platos seleccionados
  const handleRevertirSeleccionados = async () => {
    if (platosSeleccionados.size === 0) return;
    setLoading(true);
    try {
      // Agrupar por comanda para actualizar status
      const comandasAfectadas = new Set();
      
      const promesas = [];
      platosSeleccionados.forEach(key => {
        const [comandaId, platoId] = key.split("-");
        comandasAfectadas.add(comandaId);
        promesas.push(
          axios.put(
            `${getApiUrl()}/${comandaId}/plato/${platoId}/estado`,
            { nuevoEstado: "en_espera" }
          )
        );
      });
      await Promise.all(promesas);
      
      // Actualizar status de todas las comandas afectadas a en_espera
      const statusPromesas = Array.from(comandasAfectadas).map(comandaId =>
        axios.put(
          `${getApiUrl()}/${comandaId}/status`,
          { nuevoStatus: "en_espera" }
        )
      );
      await Promise.all(statusPromesas);
      
      setToastMsg(`✅ ${platosSeleccionados.size} plato(s) revertido(s) a preparación`);
      setTimeout(() => setToastMsg(null), 3000);
      setPlatosSeleccionados(new Set());
      if (onRevertir) onRevertir();
      
      // Remover comandas afectadas de la lista local
      setComandasFinalizadas(prev => prev.filter(c => !comandasAfectadas.has(c._id)));
    } catch (error) {
      console.error("Error al revertir platos:", error);
      setToastMsg("❌ Error al revertir algunos platos");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Revertir comanda completa (existente)
  const revertirComanda = async (comandaId) => {
    setLoading(true);
    try {
      const comanda = comandasFinalizadas.find(c => c._id === comandaId);
      if (!comanda) {
        alert("Comanda no encontrada");
        setLoading(false);
        return;
      }
      
      // Actualizar status de la comanda
      await axios.put(
        `${getApiUrl()}/${comandaId}/status`,
        { nuevoStatus: "en_espera" }
      );
      
      // Revertir solo platos NO eliminados
      const platosActivos = (comanda.platos || []).filter(p => p.eliminado !== true);
      for (const plato of platosActivos) {
        if (plato.estado === "recoger" || plato.estado === "entregado") {
          await axios.put(
            `${getApiUrl()}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
            { nuevoEstado: "en_espera" }
          );
        }
      }
      
      if (onRevertir) onRevertir();
      setComandasFinalizadas(prev => prev.filter(c => c._id !== comandaId));
    } catch (error) {
      console.error("Error al revertir comanda:", error);
      alert("Error al revertir la comanda. Por favor, intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    return moment(fecha).tz("America/Lima").format("DD/MM/YYYY HH:mm");
  };

  // PARRAFO 6: Filtrar platos reversibles (últimos 30min, NO eliminados)
  const ahora = moment().tz("America/Lima");
  const esPlatoReversible = (plato, comanda) => {
    // EXCLUIR platos eliminados
    if (plato.eliminado === true) return false;
    
    const estado = plato.estado || 'en_espera';
    if (estado !== 'recoger' && estado !== 'entregado') return false;
    const tiempo = plato.tiempos?.[estado] || comanda.updatedAt || comanda.createdAt;
    const diffMin = ahora.diff(moment(tiempo), 'minutes');
    return diffMin <= 30;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${bgModal} rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${textModal}`}>
            ↩️ REVERTIR PLATOS/COMANDAS (Últimas 24h)
          </h2>
          <button onClick={onClose} className={`${textSecondary} hover:${textModal} text-2xl`}>
            <FaTimes />
          </button>
        </div>

        {/* Toast notification */}
        {toastMsg && (
          <div className="mb-4 p-3 rounded-lg bg-green-600 text-white text-center font-semibold animate-pulse">
            {toastMsg}
          </div>
        )}

        {/* PARRAFO 3: Botón revertir seleccionados */}
        {platosSeleccionados.size > 0 && (
          <div className="mb-4 flex gap-3 items-center">
            <span className={`${textTertiary} font-semibold`}>
              {platosSeleccionados.size} plato(s) seleccionado(s)
            </span>
            <button
              onClick={handleRevertirSeleccionados}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg flex items-center gap-2"
            >
              <FaUndo /> Revertir Seleccionados
            </button>
          </div>
        )}

        {cargando ? (
          <div className={`text-center ${textSecondary} py-8`}>
            <p className="text-xl">Cargando comandas preparadas...</p>
          </div>
        ) : comandasFinalizadas.length === 0 ? (
          <div className={`text-center ${textSecondary} py-8`}>
            <p className="text-xl">No hay comandas preparadas para revertir</p>
            <p className="text-sm mt-2">Solo se muestran comandas en estado "Preparado" (recoger) o "Entregado" de las últimas 24 horas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comandasFinalizadas.map((comanda) => {
              // Filtrar platos NO eliminados para mostrar
              const platosMostrar = (comanda.platos || []).filter(p => p.eliminado !== true);
              const platosEliminados = (comanda.platos || []).filter(p => p.eliminado === true);
              const platosReversibles = platosMostrar.filter(p => esPlatoReversible(p, comanda));
              
              return (
                <div key={comanda._id} className={`${inputBg} rounded-lg p-4 border-2 ${borderModal}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className={`font-bold text-xl ${textModal}`}>
                        #{comanda.comandaNumber || "N/A"}
                      </div>
                      <div className={`text-sm ${textTertiary} mt-1`}>
                        Mesa {comanda.mesas?.nummesa || "N/A"} | {comanda.mozos?.name || "Sin mozo"}
                      </div>
                      <div className={`text-xs ${textSecondary} mt-1`}>
                        Estado: {comanda.status || "N/A"} | {formatearFecha(comanda.updatedAt || comanda.createdAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => revertirComanda(comanda._id)}
                        disabled={loading}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <FaUndo /> Revertir Todo
                      </button>
                    </div>
                  </div>
                  
                  {/* PARRAFO 3: Lista de platos con checkboxes - SOLO NO ELIMINADOS */}
                  {platosMostrar.length > 0 && (
                    <div className={`text-sm ${textTertiary}`}>
                      <strong>Platos activos (✓ = revertible en últimos 30min):</strong>
                      <ul className="list-none mt-2 space-y-1">
                        {platosMostrar.map((p, idx) => {
                          const plato = p.plato || p;
                          const platoId = plato._id || p._id || p.platoId;
                          const cantidad = comanda.cantidades?.[idx] || 1;
                          const reversible = esPlatoReversible(p, comanda);
                          const key = `${comanda._id}-${platoId}`;
                          const seleccionado = platosSeleccionados.has(key);
                          
                          return (
                            <li key={idx} className={`flex items-center justify-between py-2 px-2 rounded ${reversible ? 'bg-gray-600/30' : 'opacity-50'}`}>
                              <div className="flex items-center gap-3">
                                {/* Checkbox solo para platos reversibles */}
                                {reversible ? (
                                  <button
                                    onClick={() => togglePlatoSeleccion(comanda._id, platoId)}
                                    className={`text-xl ${seleccionado ? 'text-orange-400' : textSecondary}`}
                                  >
                                    {seleccionado ? <FaCheckSquare /> : <FaSquare />}
                                  </button>
                                ) : (
                                  <span className="text-xl opacity-30"><FaSquare /></span>
                                )}
                                <span className={reversible ? 'font-medium' : ''}>
                                  {cantidad}x {plato.nombre || "Sin nombre"}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  p.estado === 'entregado' ? 'bg-green-600/30 text-green-300' :
                                  p.estado === 'recoger' ? 'bg-blue-600/30 text-blue-300' :
                                  'bg-gray-600/30'
                                }`}>
                                  {p.estado || 'en_espera'}
                                </span>
                              </div>
                              {/* Botón individual para platos reversibles */}
                              {reversible && (
                                <button
                                  onClick={() => handleRevertirPlato(comanda._id, platoId, plato.nombre || 'Plato')}
                                  disabled={loading}
                                  className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-1"
                                >
                                  <FaUndo /> Revertir
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {/* Mostrar platos eliminados (solo lectura, no reversibles) */}
                  {platosEliminados.length > 0 && (
                    <div className={`text-sm ${textSecondary} mt-3 pt-3 border-t ${borderModal}`}>
                      <strong className="flex items-center gap-2">
                        <FaTrash className="text-red-400" /> Platos eliminados (no reversibles):
                      </strong>
                      <ul className="list-none mt-2 space-y-1">
                        {platosEliminados.map((p, idx) => {
                          const plato = p.plato || p;
                          const cantidad = comanda.cantidades?.[idx] || 1;
                          return (
                            <li key={`elim-${idx}`} className="flex items-center gap-2 py-1 px-2 rounded bg-red-900/20 line-through opacity-60">
                              <FaTrash className="text-red-400 text-xs" />
                              {cantidad}x {plato.nombre || "Sin nombre"}
                              <span className="text-xs text-red-400">(eliminado)</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-3 ${buttonBg} text-white font-bold rounded-lg transition-colors`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevertirModal;
