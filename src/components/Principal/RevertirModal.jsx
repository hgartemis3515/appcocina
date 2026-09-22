import React, { useState, useEffect, useMemo } from "react";
import moment from "moment-timezone";
import { FaTimes, FaUndo, FaCheckSquare, FaSquare, FaTrash, FaBan, FaExclamationTriangle, FaUserSlash, FaUserClock, FaDesktop, FaTruck } from "react-icons/fa";
import { apiGet, apiPut } from "../../config/apiClient";
import { MOTIVOS_RAPIDOS_COCINA, combinarMotivoRapido } from "../../utils/motivosRapidosCocina";
import BadgeNombreMozo from "../common/BadgeNombreMozo";
import { getFechaOperativa } from "../../utils/ticketAprobacionUi";
import {
  colorPerfilDeComanda,
  colorLetraDeComanda,
} from "../../utils/estiloMozoNombreKds";
import {
  esPlatoReversibleKds,
  todosPlatosActivosReversiblesKds,
  filtrarComandasReversiblesKds,
  filtrarComandasHoyOperativo,
  ymdsCalendarioDiaOperativo,
  listarMozosRevertir,
  listarMesasRevertir,
  filtrarComandasRevertirVista,
  nombreMozoComandaRevertir,
  numeroMesaComandaRevertir,
  ESTILO_NOMBRE_PLATO_REVERTIR,
  ESTADO_DESTINO_REVERTIR_KDS,
} from "../../utils/kdsRevertirPlatos";

function listaComandasDesdeApi(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.comandas)) return raw.comandas;
  return [];
}

function NombrePlatoRevertir({ cantidad, nombre }) {
  return (
    <span style={ESTILO_NOMBRE_PLATO_REVERTIR}>
      {cantidad}x {nombre || "Sin nombre"}
    </span>
  );
}

async function fetchComandasReversibles() {
  const fechas = ymdsCalendarioDiaOperativo();
  const listas = await Promise.all(
    fechas.map((f) => apiGet(`/api/comanda/cocina/${f}`, { incluirEntregadas: 1 }))
  );
  const byId = new Map();
  for (const raw of listas) {
    for (const c of listaComandasDesdeApi(raw)) {
      if (c?._id) byId.set(String(c._id), c);
    }
  }
  return filtrarComandasReversiblesKds(filtrarComandasHoyOperativo([...byId.values()]));
}

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
  const [filtroMozo, setFiltroMozo] = useState("");
  const [filtroMesa, setFiltroMesa] = useState("");
  const etiquetaHoy = getFechaOperativa();

  useEffect(() => {
    const obtenerComandasConPlatosReversibles = async () => {
      setCargando(true);
      try {
        setComandasFinalizadas(await fetchComandasReversibles());
      } catch (error) {
        console.error("Error al obtener comandas:", error);
        setToastMsg("❌ No se pudieron cargar los platos para revertir");
        setTimeout(() => setToastMsg(null), 4000);
      } finally {
        setCargando(false);
      }
    };

    obtenerComandasConPlatosReversibles();
  }, []);

  const mozosFiltro = useMemo(() => listarMozosRevertir(comandasFinalizadas), [comandasFinalizadas]);
  const mesasFiltro = useMemo(() => listarMesasRevertir(comandasFinalizadas), [comandasFinalizadas]);
  const comandasVisibles = useMemo(
    () => filtrarComandasRevertirVista(comandasFinalizadas, { mozo: filtroMozo, mesa: filtroMesa }),
    [comandasFinalizadas, filtroMozo, filtroMesa]
  );

  useEffect(() => {
    if (filtroMozo && !mozosFiltro.includes(filtroMozo)) setFiltroMozo("");
  }, [filtroMozo, mozosFiltro]);
  useEffect(() => {
    if (filtroMesa && !mesasFiltro.includes(filtroMesa)) setFiltroMesa("");
  }, [filtroMesa, mesasFiltro]);

  const togglePlatoSeleccion = (comandaId, platoId) => {
    // FIX: revertir multi-plato similar - Usar delimitador único "::" para evitar colisiones
    const key = `${comandaId}::${platoId}`;
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
  const ejecutarReversion = async (motivoTexto) => {
    const motivoFinal = String(motivoTexto ?? motivo).trim();
    if (!motivoFinal) {
      alert("Debe elegir un motivo para la reversión");
      return;
    }
    
    setShowConfirmModal(false);
    setLoading(true);
    
    try {
      if (revertirType === 'plato') {
        await revertirPlatoIndividual(revertirData, motivoFinal);
      } else if (revertirType === 'seleccionados') {
        await revertirPlatosSeleccionados(motivoFinal);
      } else if (revertirType === 'todo') {
        await revertirComandaCompleta(revertirData, motivoFinal);
      }
    } catch (error) {
      console.error("Error en reversión:", error);
      setToastMsg(error.userMessage || error.response?.data?.message || "❌ Error al revertir");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Revertir un plato individual - CON AUDITORÍA
  const revertirPlatoIndividual = async (data, motivoTexto) => {
    const { comandaId, platoId, platoNombre } = data;
    
    await apiPut(
      `/api/comanda/${comandaId}/plato/${platoId}/estado`,
      { nuevoEstado: ESTADO_DESTINO_REVERTIR_KDS, motivo: motivoTexto }
    );

    setToastMsg(`✅ "${platoNombre}" revertido a pedido`);
    setTimeout(() => setToastMsg(null), 3000);
    
    // FIX: revertir multi-plato similar - Usar delimitador único "::"
    const key = `${comandaId}::${platoId}`;
    setPlatosSeleccionados(prev => {
      const nuevo = new Set(prev);
      nuevo.delete(key);
      return nuevo;
    });
    
    if (onRevertir) onRevertir();
    await recargarLista();
  };

  // Revertir múltiples platos seleccionados - CON AUDITORÍA
  const revertirPlatosSeleccionados = async (motivoTexto) => {
    const promesas = [];
    platosSeleccionados.forEach(key => {
      const [comandaId, platoId] = key.split("::");
      promesas.push(
        apiPut(
          `/api/comanda/${comandaId}/plato/${platoId}/estado`,
          { nuevoEstado: ESTADO_DESTINO_REVERTIR_KDS, motivo: motivoTexto }
        )
      );
    });
    await Promise.all(promesas);

    setToastMsg(`✅ ${platosSeleccionados.size} plato(s) revertido(s) a pedido`);
    setTimeout(() => setToastMsg(null), 3000);
    setPlatosSeleccionados(new Set());
    if (onRevertir) onRevertir();
    await recargarLista();
  };

  // Revertir comanda completa - CON AUDITORÍA
  const revertirComandaCompleta = async (data, motivoTexto) => {
    const { comandaId } = data;
    const comanda = comandasFinalizadas.find(c => c._id === comandaId);
    
    if (!comanda) {
      alert("Comanda no encontrada");
      return;
    }
    
    const platosARevertir = (comanda.platos || []).filter(esPlatoReversibleKds);

    for (const plato of platosARevertir) {
      const platoIdUnico = plato._id?.toString() || plato.plato?._id;
      await apiPut(
        `/api/comanda/${comandaId}/plato/${platoIdUnico}/estado`,
        { nuevoEstado: ESTADO_DESTINO_REVERTIR_KDS, motivo: motivoTexto }
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
    try {
      setComandasFinalizadas(await fetchComandasReversibles());
    } catch (error) {
      console.error("Error al recargar comandas:", error);
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    return moment(fecha).tz("America/Lima").format("DD/MM/YYYY HH:mm");
  };

  return (
    <>
      {/* Modal principal */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[11000]">
        <div className={`${bgModal} rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${textModal}`}>
              ↩️ REVERTIR PLATOS A PEDIDO
            </h2>
            <button onClick={onClose} className={`${textSecondary} hover:${textModal} text-2xl`}>
              <FaTimes />
            </button>
          </div>

          {/* Info banner */}
          <div className={`mb-4 p-3 rounded-lg ${nightMode ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-blue-100 border border-blue-300'}`}>
            <p className={`text-sm ${textTertiary}`}>
              <strong>📌 Se pueden revertir platos en RECOGER, SALIÓ o ENTREGADO (vuelven a pedido)</strong>
              <br />
              Solo comandas de <strong>Hoy</strong> ({etiquetaHoy}, ciclo 04:00–04:00).
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

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={`block text-sm font-semibold mb-1 ${textModal}`}>Mozo</span>
              <select
                value={filtroMozo}
                onChange={(e) => setFiltroMozo(e.target.value)}
                className={`w-full ${inputBg} ${textModal} p-2 rounded-lg border ${borderModal}`}
              >
                <option value="">Todos los mozos</option>
                {mozosFiltro.map((mozo) => (
                  <option key={mozo} value={mozo}>{mozo}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={`block text-sm font-semibold mb-1 ${textModal}`}>Mesa</span>
              <select
                value={filtroMesa}
                onChange={(e) => setFiltroMesa(e.target.value)}
                className={`w-full ${inputBg} ${textModal} p-2 rounded-lg border ${borderModal}`}
              >
                <option value="">Todas las mesas</option>
                {mesasFiltro.map((mesa) => (
                  <option key={mesa} value={mesa}>Mesa {mesa}</option>
                ))}
              </select>
            </label>
          </div>
          {(filtroMozo || filtroMesa) && (
            <div className="mb-3 flex items-center gap-2">
              <span className={`text-xs ${textSecondary}`}>
                Mostrando {comandasVisibles.length} de {comandasFinalizadas.length} comandas de hoy
              </span>
              <button
                type="button"
                onClick={() => { setFiltroMozo(""); setFiltroMesa(""); }}
                className={`text-xs px-3 py-1 rounded ${inputBg} ${textModal}`}
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {cargando ? (
            <div className={`text-center ${textSecondary} py-8`}>
              <p className="text-xl">Cargando platos...</p>
            </div>
          ) : comandasVisibles.length === 0 ? (
            <div className={`text-center ${textSecondary} py-8`}>
              <p className="text-xl">No hay platos para revertir</p>
              <p className="text-sm mt-2">
                {comandasFinalizadas.length === 0
                  ? 'Solo se muestran comandas de hoy (recoger, salió o entregado; no pagados ni anulados)'
                  : 'Ninguna comanda coincide con el mozo o la mesa seleccionados'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comandasVisibles.map((comanda) => {
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
                const esComandaActiva = comanda.status === "en_espera";
                const puedeRevertirTodo = todosPlatosActivosReversiblesKds(comanda) && !esComandaActiva;
                
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
                        <div className={`text-sm ${textTertiary} mt-1 flex items-center gap-2 flex-wrap`}>
                          <span>Mesa {numeroMesaComandaRevertir(comanda) || "N/A"}</span>
                          <span>|</span>
                          <BadgeNombreMozo
                            nombre={nombreMozoComandaRevertir(comanda) || "Sin mozo"}
                            colorPerfil={colorPerfilDeComanda(comanda)}
                            colorLetra={colorLetraDeComanda(comanda)}
                          />
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
                        <strong>Platos (recoger, salió y entregado se pueden revertir a pedido):</strong>
                        <ul className="list-none mt-2 space-y-1">
                          {platosActivos.map((p, idx) => {
                            const plato = p.plato || p;
                            // FIX: revertir multi-plato similar - Priorizar p._id (subdocumento único) sobre plato._id (compartido entre duplicados)
                            // Esto es CRÍTICO cuando hay 2+ platos del mismo tipo con complementos diferentes
                            const platoId = p._id?.toString() || plato._id || p.platoId;
                            const cantidad = comanda.cantidades?.[idx] || 1;
                            const reversible = esPlatoReversibleKds(p);
                            // FIX: Usar delimitador único "::" para evitar colisiones con IDs que contengan "-"
                            const key = `${comanda._id}::${platoId}`;
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
                                  <NombrePlatoRevertir cantidad={cantidad} nombre={plato.nombre} />
                                  {(p.tipoServicio === 'para_llevar' || p.tipoServicio === 'extra_llevar') && (
                                    <span
                                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                                      title={p.tipoServicio === 'extra_llevar' ? 'Extra cliente' : 'Plato para llevar'}
                                    >
                                      {p.tipoServicio === 'extra_llevar' ? 'EXTRA CLIENTE' : '🥡 PARA LLEVAR'}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    p.estado === 'entregado' ? 'bg-green-600/30 text-green-300' :
                                    p.estado === 'salio' ? 'bg-purple-600/30 text-purple-300' :
                                    p.estado === 'recoger' ? 'bg-blue-600/30 text-blue-300' :
                                    p.estado === 'en_espera' || p.estado === 'pedido' ? 'bg-yellow-600/30 text-yellow-300' :
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
                                <NombrePlatoRevertir cantidad={cantidad} nombre={plato.nombre} />
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
                                <span className="line-through opacity-80">
                                  <NombrePlatoRevertir cantidad={cantidad} nombre={plato.nombre} />
                                </span>
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[11010]">
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
              } a estado "pedido".
              <br />
              <span className="text-xs text-yellow-400">⚠️ Esta acción quedará registrada en auditoría.</span>
            </p>
            
            <p className={`text-sm font-semibold ${textModal} mb-2`}>
              Elige un motivo. El texto extra es opcional; al pulsar se revierte y queda en auditoría.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {MOTIVOS_RAPIDOS_COCINA.map((m) => {
                const Icon = m.id === 'cliente_no_desea' ? FaUserSlash
                  : m.id === 'equivocacion_mozo' ? FaUserClock
                  : m.id === 'error_sistema' ? FaDesktop
                  : FaTruck;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={loading}
                    onClick={() => ejecutarReversion(combinarMotivoRapido(m.label, motivo))}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold min-h-[88px] ${buttonBg} ${textModal} hover:border-orange-400 disabled:opacity-50`}
                  >
                    <Icon className="text-lg text-orange-500" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="Motivo extra (opcional)"
              className={`w-full rounded-lg px-3 py-2 text-sm resize-none border mb-4 ${inputBg} ${textModal} ${borderModal}`}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className={`px-4 py-2 ${buttonBg} text-white font-semibold rounded-lg`}
              >
                {loading ? 'Procesando...' : 'Cancelar'}
              </button>
              <button
                type="button"
                disabled={loading || String(motivo || '').trim().length < 2}
                onClick={() => ejecutarReversion(motivo)}
                className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-40"
              >
                Revertir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RevertirModal;
