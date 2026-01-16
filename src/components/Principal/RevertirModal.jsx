import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";
import { FaTimes, FaUndo } from "react-icons/fa";

const RevertirModal = ({ onClose, onRevertir, nightMode = true }) => {
  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const textTertiary = nightMode ? "text-gray-300" : "text-gray-700";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const buttonBg = nightMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-300 hover:bg-gray-400";
  const [comandasFinalizadas, setComandasFinalizadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Obtener comandas entregadas desde el backend
    const obtenerComandasEntregadas = async () => {
      setCargando(true);
      try {
        const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
        // Obtener todas las comandas del día y filtrar las entregadas
        const apiUrl = `${process.env.REACT_APP_API_COMANDA}/fecha/${fechaActual}`;
        
        const response = await axios.get(apiUrl, { timeout: 5000 });
        
        const ahora = moment().tz("America/Lima");
        const comandasParaRevertir = response.data.filter(c => {
          // Mostrar comandas en estado "recoger" (preparadas) o "entregado"
          // Esto permite revertir comandas que fueron finalizadas por error
          if (c.status !== "recoger" && c.status !== "entregado") return false;
          if (!c.platos || c.platos.length === 0) return false;
          
          // Filtrar por fecha (últimas 24 horas)
          const fechaComanda = moment(c.updatedAt || c.createdAt).tz("America/Lima");
          const diffHoras = ahora.diff(fechaComanda, "hours");
          return diffHoras <= 24;
        });

        // Ordenar por fecha de actualización (más recientes primero)
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

  const revertirComanda = async (comandaId) => {
    setLoading(true);
    try {
      // Buscar la comanda en la lista local
      const comanda = comandasFinalizadas.find(c => c._id === comandaId);
      if (!comanda) {
        alert("Comanda no encontrada");
        setLoading(false);
        return;
      }

      // Cambiar status de comanda a "en_espera"
      await axios.put(
        `${process.env.REACT_APP_API_COMANDA}/${comandaId}/status`,
        { nuevoStatus: "en_espera" }
      );
      
      // Cambiar todos los platos en estado "recoger" o "entregado" a "en_espera"
      for (const plato of comanda.platos) {
        if (plato.estado === "recoger" || plato.estado === "entregado") {
          await axios.put(
            `${process.env.REACT_APP_API_COMANDA}/${comandaId}/plato/${plato.plato?._id || plato._id}/estado`,
            { nuevoEstado: "en_espera" }
          );
        }
      }

      // Refrescar comandas
      if (onRevertir) {
        onRevertir();
      }
      
      // Remover de la lista
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${bgModal} rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${textModal}`}>
            ↩️ REVERTIR COMANDAS PREPARADAS (Últimas 24h)
          </h2>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textModal} text-2xl`}
          >
            <FaTimes />
          </button>
        </div>

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
            {comandasFinalizadas.map((comanda) => (
              <div
                key={comanda._id}
                className={`${inputBg} rounded-lg p-4 border-2 ${borderModal}`}
              >
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
                      <FaUndo /> Revertir a En Espera
                    </button>
                  </div>
                </div>
                
                {/* Lista de platos */}
                <div className={`text-sm ${textTertiary}`}>
                  <strong>Platos:</strong>
                  <ul className="list-disc list-inside mt-1 ml-2">
                    {comanda.platos?.map((p, idx) => {
                      const plato = p.plato || p;
                      const cantidad = comanda.cantidades?.[idx] || 1;
                      return (
                        <li key={idx}>
                          {cantidad}x {plato.nombre || "Sin nombre"}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
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

