import React from "react";
import moment from "moment-timezone";
import { FaTimes, FaUtensils, FaUser, FaClipboardList } from "react-icons/fa";
import HistorialPlatoRow from "./HistorialPlatoRow";
import { classifyComandaHistorial } from "../../utils/historialComandaRules";
import { obtenerNombrePlato } from "../../utils/platoHelpers";

/**
 * HistorialComandaDetalle — Panel que muestra una comanda completa del Historial.
 * Muestra TODOS los platos (entregados + pendientes en gris) + metadatos.
 */
const HistorialComandaDetalle = ({ comanda, onClose, nightMode = true }) => {
  if (!comanda) return null;

  const textMain = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const bgPanel = nightMode ? "bg-gray-900" : "bg-gray-50";
  const borderPanel = nightMode ? "border-gray-700" : "border-gray-300";
  const bgHeader = nightMode ? "bg-gray-800" : "bg-gray-100";

  const clasif = classifyComandaHistorial(comanda);
  const platos = Array.isArray(comanda.platos) ? comanda.platos : [];
  const cantidades = comanda.cantidades || [];

  const mesa = comanda.mesaNumero ?? comanda.mesas?.nummesa ?? comanda.mesa?.numero ?? comanda.mesa ?? comanda.numeroMesa ?? "—";
  const orden = comanda.comandaNumber ?? comanda.orden ?? comanda.numeroOrden ?? "—";
  const mozo = comanda.mozoNombre || comanda.mozos?.name || "Sin mozo";
  const createdAt = comanda.createdAt
    ? moment(comanda.createdAt).tz("America/Lima").format("HH:mm")
    : "—";

  const badgeTipo =
    clasif.tipo === "finalizada"
      ? "bg-green-600 text-white"
      : "bg-yellow-500 text-white";

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4`}
      onClick={onClose}
    >
      <div
        className={`w-full sm:max-w-2xl ${bgPanel} ${textMain} border ${borderPanel} sm:rounded-lg shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${bgHeader} px-4 py-3 border-b ${borderPanel} flex items-center justify-between flex-shrink-0`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badgeTipo}`}>
                {clasif.tipo === "finalizada" ? "Finalizada" : "Parcial"} · {clasif.entregados}/{clasif.total}
              </span>
              <span className="font-bold text-lg">Mesa {mesa}</span>
              <span className={`text-sm ${textSecondary}`}>Orden #{orden}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        {/* Metadata */}
        <div className={`px-4 py-2 border-b ${borderPanel} flex items-center gap-4 text-xs ${textSecondary} flex-shrink-0 flex-wrap`}>
          <span className="flex items-center gap-1">
            <FaClipboardList /> {createdAt}
          </span>
          <span className="flex items-center gap-1">
            <FaUser /> {mozo}
          </span>
          {comanda.observaciones && (
            <span className="italic truncate max-w-[200px]">"{comanda.observaciones}"</span>
          )}
        </div>

        {/* Platos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className={`text-xs font-semibold ${textSecondary} mb-1 flex items-center gap-1`}>
            <FaUtensils /> Platos de la comanda
          </div>
          {platos.length === 0 ? (
            <div className={`text-center py-8 ${textSecondary}`}>Sin platos</div>
          ) : (
            platos.map((p, idx) => (
              <HistorialPlatoRow
                key={p._id || idx}
                plato={p}
                cantidad={cantidades[idx] ?? 1}
                nightMode={nightMode}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialComandaDetalle;
