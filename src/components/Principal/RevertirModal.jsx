import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";
import { FaTimes, FaUndo, FaCheckSquare, FaSquare, FaTrash, FaBan, FaExclamationTriangle } from "react-icons/fa";
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
  const [platosSeleccionados, setPlatosSeleccionados] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  
  // Estado para modal de confirmación con motivo
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [revertirType, setRevertirType] = useState(null); // 'plato' | 'seleccionados' | 'todo'
  const [revertirData, setRevertirData] = useState(null); // datos para revertir

  useEffect(() => {
    const obtenerComandasConPlatosReversibles = async () => {
      setCargando(true);
      try {
        const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
        const apiUrl = `${getApiUrl()}/fecha/${fechaActual}`;
        const response = await axios.get(apiUrl, { timeout: 5000 });
        const ahora = moment().tz("America/Lima");
        
        // INCLUIR: comandas con platos en estado RECOGER
        // EXCLUIR: comandas con status "pagado" (nunca se revierten)
        // EXCLUIR: platos ANULADOS (anulado: true) - irreversibles desde cocina
        // SIN LÍMITE DE TIEMPO - cualquier plato en recoger es reversible
        const comandasParaRevertir = response.data.filter(c => {
          if (c.status === "pagado") return false;
          if (!c.platos || c.platos.length === 0) return false;
          
          // Verificar si tiene al menos un plato REVERSIBLE en estado RECOGER
          // Plato reversible = eliminado !== true AND anulado !== true AND estado === 'recoger'
          const tienePlatosReversibles = c.platos.some(p => {
            // EXCLUIR platos eliminados (soft delete técnico)
            if (p.eliminado === true) return false;
            // EXCLUIR platos anulados (acción de mozo - IRREVERSIBLE)
            if (p.anulado === true) return false;
            const estado = p.estado || 'en_espera';
            return estado === 'recoger';
          });
          
          if (!tienePlatosReversibles) return false;
          
          // Solo filtrar por fecha (últimas 24 horas)
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
        console.error("Error al obtener comandas:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerComandasConPlatosReversibles();
  }, []);

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

  // Abrir modal de confirmación con motivo
  const openConfirmModal = (type, data = null) => {
    setRevertirType(type);
    setRevertirData(data);
    setMotivo("");
    setShowConfirmModal(true);
  };

  // Ejecutar reversión después de confirmar motivo
  const ejecutarReversion = async () => {
    if (!motivo.trim()) {
      alert("Debe ingresar un motivo para la reversión");
      return;
    }
    
    setShowConfirmModal(false);
    setLoading(true);
    
    try {
      if (revertirType === 'plato') {
        await revertirPlatoIndividual(revertirData);
      } else if (revertirType === 'seleccionados') {
        await revertirPlatosSeleccionados();
      } else if (revertirType === 'todo') {
        await revertirComandaCompleta(revertirData);
      }
    } catch (error) {
      console.error("Error en reversión:", error);
      setToastMsg("❌ Error al revertir");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Revertir un plato individual - CON AUDITORÍA
  const revertirPlatoIndividual = async (data) => {
    const { comandaId, platoId, platoNombre, comandaStatus } = data;
    
    // Cambiar estado del plato con motivo (backend registra auditoría)
    await axios.put(
      `${getApiUrl()}/${comandaId}/plato/${platoId}/estado`,
      { nuevoEstado: "en_espera", motivo: motivo.trim() }
    );
    
    // Si la comanda no está en_espera, cambiar su status también
    if (comandaStatus !== "en_espera") {
      await axios.put(
        `${getApiUrl()}/${comandaId}/status`,
        { nuevoStatus: "en_espera", motivo: motivo.trim() }
      );
    }
    
    setToastMsg(`✅ "${platoNombre}" revertido a preparación`);
    setTimeout(() => setToastMsg(null), 3000);
    
    const key = `${comandaId}-${platoId}`;
    setPlatosSeleccionados(prev => {
      const nuevo = new Set(prev);
      nuevo.delete(key);
      return nuevo;
    });
    
    if (onRevertir) onRevertir();
    await recargarLista();
  };

  // Revertir múltiples platos seleccionados - CON AUDITORÍA
  const revertirPlatosSeleccionados = async () => {
    const comandasInfo = new Map();
    
    // Revertir cada plato con motivo (backend registra auditoría por cada uno)
    const promesas = [];
    platosSeleccionados.forEach(key => {
      const [comandaId, platoId] = key.split("-");
      const comanda = comandasFinalizadas.find(c => c._id === comandaId);
      const currentStatus = comanda?.status || 'en_espera';
      
      if (!comandasInfo.has(comandaId)) {
        comandasInfo.set(comandaId, currentStatus);
      }
      
      promesas.push(
        axios.put(
          `${getApiUrl()}/${comandaId}/plato/${platoId}/estado`,
          { nuevoEstado: "en_espera", motivo: motivo.trim() }
        )
      );
    });
    await Promise.all(promesas);
    
    // Actualizar status de comandas si es necesario
    const statusPromesas = [];
    comandasInfo.forEach((status, comandaId) => {
      if (status !== "en_espera") {
        statusPromesas.push(
          axios.put(
            `${getApiUrl()}/${comandaId}/status`,
            { nuevoStatus: "en_espera", motivo: motivo.trim() }
          )
        );
      }
    });
    await Promise.all(statusPromesas);
    
    setToastMsg(`✅ ${platosSeleccionados.size} plato(s) revertido(s) a preparación`);
    setTimeout(() => setToastMsg(null), 3000);
    setPlatosSeleccionados(new Set());
    if (onRevertir) onRevertir();
    await recargarLista();
  };

  // Revertir comanda completa - CON AUDITORÍA
  const revertirComandaCompleta = async (data) => {
    const { comandaId, comandaStatus } = data;
    const comanda = comandasFinalizadas.find(c => c._id === comandaId);
    
    if (!comanda) {
      alert("Comanda no encontrada");
      return;
    }
    
    // Cambiar status de la comanda con motivo
    if (comandaStatus !== "en_espera") {
      await axios.put(
        `${getApiUrl()}/${comandaId}/status`,
        { nuevoStatus: "en_espera", motivo: motivo.trim() }
      );
    }
    
    // Revertir cada plato REVERSIBLE (excluir eliminados y anulados)
    const platosARevertir = (comanda.platos || []).filter(p => 
      p.eliminado !== true && p.anulado !== true && p.estado === "recoger"
    );
    
    for (const plato of platosARevertir) {
      await axios.put(
        `${getApiUrl()}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
        { nuevoEstado: "en_espera", motivo: motivo.trim() }
      );
    }
    
    setToastMsg(`✅ Comanda #${comanda.comandaNumber} revertida completamente`);
    setTimeout(() => setToastMsg(null), 3000);
    if (onRevertir) onRevertir();
    
    setComandasFinalizadas(prev => prev.filter(c => c._id !== comandaId));
  };

  // Recargar lista de comandas
  const recargarLista = async () => {
    setCargando(true);
    const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
    const apiUrl = `${getApiUrl()}/fecha/${fechaActual}`;
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const ahora = moment().tz("America/Lima");
    
    const comandasParaRevertir = response.data.filter(c => {
      if (c.status === "pagado") return false;
      if (!c.platos || c.platos.length === 0) return false;
      const tienePlatosReversibles = c.platos.some(p => {
        // EXCLUIR eliminados Y anulados
        if (p.eliminado === true) return false;
        if (p.anulado === true) return false;
        const estado = p.estado || 'en_espera';
        return estado === 'recoger';
      });
      if (!tienePlatosReversibles) return false;
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
    setCargando(false);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    return moment(fecha).tz("America/Lima").format("DD/MM/YYYY HH:mm");
  };

  // FUNCIONES DE CLASIFICACIÓN DE PLATOS

  // Plato reversible: en estado 'recoger', NO eliminado, NO anulado
  const esPlatoReversible = (plato) => {
    if (plato.eliminado === true) return false;
    if (plato.anulado === true) return false;
    const estado = plato.estado || 'en_espera';
    return estado === 'recoger';
  };

  // Plato anulado: acción irreversible de mozo
  const esPlatoAnulado = (plato) => {
    return plato.anulado === true;
  };

  // Plato eliminado: soft delete técnico (reversible)
  const esPlatoEliminado = (plato) => {
    return plato.eliminado === true && plato.anulado !== true;
  };

  // Determinar si TODOS los platos activos están en recoger (para mostrar "Revertir Todo")
  // Excluyendo eliminados y anulados
  const todosPlatosEnRecoger = (comanda) => {
    const platosActivos = (comanda.platos || []).filter(p => 
      p.eliminado !== true && p.anulado !== true
    );
    if (platosActivos.length === 0) return false;
    return platosActivos.every(p => p.estado === 'recoger');
  };

  return (
    <>
      {/* Modal principal */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className={`${bgModal} rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${textModal}`}>
              ↩️ REVERTIR PLATOS A PREPARACIÓN
            </h2>
            <button onClick={onClose} className={`${textSecondary} hover:${textModal} text-2xl`}>
              <FaTimes />
            </button>
          </div>

          {/* Info banner */}
          <div className={`mb-4 p-3 rounded-lg ${nightMode ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-blue-100 border border-blue-300'}`}>
            <p className={`text-sm ${textTertiary}`}>
              <strong>📌 Solo se pueden revertir platos en estado "RECOGER"</strong>
              <br />
              <span className="text-red-400">🚫 Los platos ANULADOS por mozos NO se pueden revertir desde cocina.</span>
              <br />
              Todas las reversiones quedan registradas en auditoría con el motivo.
            </p>
          </div>

          {/* Toast notification */}
          {toastMsg && (
            <div className="mb-4 p-3 rounded-lg bg-green-600 text-white text-center font-semibold animate-pulse">
              {toastMsg}
            </div>
          )}

          {/* Botón revertir seleccionados */}
          {platosSeleccionados.size > 0 && (
            <div className="mb-4 flex gap-3 items-center">
              <span className={`${textTertiary} font-semibold`}>
                {platosSeleccionados.size} plato(s) seleccionado(s)
              </span>
              <button
                onClick={() => openConfirmModal('seleccionados')}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg flex items-center gap-2"
              >
                <FaUndo /> Revertir Seleccionados
              </button>
            </div>
          )}

          {cargando ? (
            <div className={`text-center ${textSecondary} py-8`}>
              <p className="text-xl">Cargando platos...</p>
            </div>
          ) : comandasFinalizadas.length === 0 ? (
            <div className={`text-center ${textSecondary} py-8`}>
              <p className="text-xl">No hay platos en "RECOGER" para revertir</p>
              <p className="text-sm mt-2">Se muestran platos en estado "recoger" (excluyendo anulados) de las últimas 24 horas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comandasFinalizadas.map((comanda) => {
                // Clasificar platos correctamente
                const platosActivos = (comanda.platos || []).filter(p => 
                  p.eliminado !== true && p.anulado !== true
                );
                const platosEliminados = (comanda.platos || []).filter(p => 
                  p.eliminado === true && p.anulado !== true
                );
                const platosAnulados = (comanda.platos || []).filter(p => 
                  p.anulado === true
                );
                const platosReversibles = platosActivos.filter(p => esPlatoReversible(p));
                const esComandaActiva = comanda.status === "en_espera";
                const puedeRevertirTodo = todosPlatosEnRecoger(comanda) && !esComandaActiva;
                
                return (
                  <div key={comanda._id} className={`${inputBg} rounded-lg p-4 border-2 ${esComandaActiva ? 'border-yellow-500/50' : 'border-blue-500/50'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-bold text-xl ${textModal} flex items-center gap-2`}>
                          #{comanda.comandaNumber || "N/A"}
                          {esComandaActiva && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/30 text-yellow-300">
                              ACTIVA
                            </span>
                          )}
                          {puedeRevertirTodo && (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-600/30 text-green-300">
                              REVERTIR TODO
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${textTertiary} mt-1`}>
                          Mesa {comanda.mesas?.nummesa || "N/A"} | {comanda.mozos?.name || "Sin mozo"}
                        </div>
                        <div className={`text-xs ${textSecondary} mt-1`}>
                          Estado: <span className={`font-medium ${esComandaActiva ? 'text-yellow-300' : 'text-blue-300'}`}>{comanda.status || "N/A"}</span> | {formatearFecha(comanda.updatedAt || comanda.createdAt)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* Solo mostrar "Revertir Todo" si TODOS los platos activos están en recoger */}
                        {puedeRevertirTodo && (
                          <button
                            onClick={() => openConfirmModal('todo', { comandaId: comanda._id, comandaStatus: comanda.status })}
                            disabled={loading}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <FaUndo /> Revertir Todo
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Lista de platos activos */}
                    {platosActivos.length > 0 && (
                      <div className={`text-sm ${textTertiary}`}>
                        <strong>Platos (solo RECOGER es reversible):</strong>
                        <ul className="list-none mt-2 space-y-1">
                          {platosActivos.map((p, idx) => {
                            const plato = p.plato || p;
                            const platoId = plato._id || p._id || p.platoId;
                            const cantidad = comanda.cantidades?.[idx] || 1;
                            const reversible = esPlatoReversible(p);
                            const key = `${comanda._id}-${platoId}`;
                            const seleccionado = platosSeleccionados.has(key);
                            
                            return (
                              <li key={idx} className={`flex items-center justify-between py-2 px-2 rounded ${reversible ? 'bg-blue-900/20 border border-blue-500/30' : 'opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                  {reversible ? (
                                    <button
                                      onClick={() => togglePlatoSeleccion(comanda._id, platoId)}
                                      className={`text-xl ${seleccionado ? 'text-orange-400' : 'text-blue-400'}`}
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
                                    p.estado === 'en_espera' ? 'bg-yellow-600/30 text-yellow-300' :
                                    'bg-gray-600/30'
                                  }`}>
                                    {p.estado || 'en_espera'}
                                  </span>
                                </div>
                                {reversible && (
                                  <button
                                    onClick={() => openConfirmModal('plato', { 
                                      comandaId: comanda._id, 
                                      platoId, 
                                      platoNombre: plato.nombre || 'Plato', 
                                      comandaStatus: comanda.status 
                                    })}
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
                    
                    {/* Platos ELIMINADOS (reversibles técnicamente, pero no mostramos aquí) */}
                    {platosEliminados.length > 0 && (
                      <div className={`text-sm ${textSecondary} mt-3 pt-3 border-t ${borderModal}`}>
                        <strong className="flex items-center gap-2 text-gray-400">
                          <FaTrash className="text-gray-500" /> Platos eliminados (no reversibles desde cocina):
                        </strong>
                        <ul className="list-none mt-2 space-y-1">
                          {platosEliminados.map((p, idx) => {
                            const plato = p.plato || p;
                            const cantidad = comanda.cantidades?.[idx] || 1;
                            return (
                              <li key={`elim-${idx}`} className="flex items-center gap-2 py-1 px-2 rounded bg-gray-700/30 line-through opacity-50">
                                <FaTrash className="text-gray-500 text-xs" />
                                {cantidad}x {plato.nombre || "Sin nombre"}
                                <span className="text-xs text-gray-500">(eliminado)</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Platos ANULADOS (IRREVERSIBLES - destacar visualmente) */}
                    {platosAnulados.length > 0 && (
                      <div className={`text-sm mt-3 pt-3 border-t border-red-500/30`}>
                        <strong className="flex items-center gap-2 text-red-400">
                          <FaBan className="text-red-500" /> Platos ANULADOS (irreversibles):
                        </strong>
                        <p className="text-xs text-red-400/70 mt-1 mb-2">
                          ⚠️ Estos platos fueron anulados por mozo y no pueden revertirse desde cocina.
                        </p>
                        <ul className="list-none space-y-1">
                          {platosAnulados.map((p, idx) => {
                            const plato = p.plato || p;
                            const cantidad = comanda.cantidades?.[idx] || 1;
                            const motivoAnulacion = p.anuladoRazon || p.motivoAnulacion || p.tipoAnulacion || 'Sin motivo';
                            const anuladoPor = p.anuladoPor?.name || p.anuladoPor?.nombre || 'Mozo';
                            
                            return (
                              <li key={`anulado-${idx}`} className="flex items-center gap-2 py-2 px-2 rounded bg-red-900/20 border border-red-500/20">
                                <FaBan className="text-red-500 text-sm" />
                                <span className="line-through text-red-400/80">{cantidad}x {plato.nombre || "Sin nombre"}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-red-600/40 text-red-300 font-semibold">
                                  ANULADO
                                </span>
                                <span className="text-xs text-red-400/60 ml-auto">
                                  Por: {anuladoPor} | {motivoAnulacion}
                                </span>
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

      {/* Modal de confirmación con motivo */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]">
          <div className={`${bgModal} rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-orange-500`}>
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-orange-500 text-2xl" />
              <h3 className={`text-xl font-bold ${textModal}`}>Confirmar Reversión</h3>
            </div>
            
            <p className={`${textTertiary} mb-4`}>
              Esta acción revertirá {
                revertirType === 'plato' ? 'el plato seleccionado' :
                revertirType === 'seleccionados' ? `${platosSeleccionados.size} platos` :
                'toda la comanda'
              } a estado "EN PREPARACIÓN".
              <br />
              <span className="text-xs text-yellow-400">⚠️ Esta acción quedará registrada en auditoría.</span>
            </p>
            
            <div className="mb-4">
              <label className={`block text-sm font-semibold ${textModal} mb-2`}>
                Motivo de la reversión <span className="text-red-400">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Error en la preparación, Cliente solicitó cambio..."
                className={`w-full p-3 rounded-lg ${inputBg} ${textModal} border ${borderModal} focus:border-orange-500 focus:outline-none resize-none`}
                rows={3}
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`px-4 py-2 ${buttonBg} text-white font-semibold rounded-lg`}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarReversion}
                disabled={!motivo.trim() || loading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg flex items-center gap-2"
              >
                {loading ? 'Procesando...' : 'Confirmar Reversión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RevertirModal;
