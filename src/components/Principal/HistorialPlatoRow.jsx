import React from "react";
import { obtenerNombrePlato, obtenerCodigoPlato } from "../../utils/platoHelpers";
import { classifyPlatoHistorial } from "../../utils/historialComandaRules";

/**
 * HistorialPlatoRow — Fila de un plato dentro del detalle de comanda del Historial.
 * Muestra el plato con estilo según su categoría:
 *  - entregado (salio/entregado): color normal / énfasis
 *  - en_pass: amarillo intermedio
 *  - pendiente: GRIS atenuado (requisito del plan)
 *  - anulado: tachado
 */
const HistorialPlatoRow = ({ plato, cantidad = 1, nightMode = true }) => {
  const clasif = classifyPlatoHistorial(plato);
  const nombre = obtenerNombrePlato(plato) || "Plato sin nombre";
  const codigo = obtenerCodigoPlato(plato);
  const estado = plato?.estado || "";

  // Estilos por categoría
  const base = "flex items-center justify-between gap-2 px-3 py-2 rounded text-sm";
  let estilo;
  let badgeClass;
  if (clasif.categoria === "entregado") {
    estilo = nightMode
      ? "bg-green-900/30 text-green-200"
      : "bg-green-100 text-green-800";
    badgeClass = "bg-green-600 text-white";
  } else if (clasif.categoria === "en_pass") {
    estilo = nightMode
      ? "bg-yellow-900/20 text-yellow-200"
      : "bg-yellow-100 text-yellow-800";
    badgeClass = "bg-yellow-500 text-white";
  } else if (clasif.categoria === "pendiente") {
    // GRIS atenuado — requisito del plan v1.1
    estilo = nightMode
      ? "bg-gray-800/40 text-gray-500"
      : "bg-gray-100 text-gray-400";
    badgeClass = "bg-gray-500 text-white";
  } else {
    // anulado
    estilo = nightMode
      ? "bg-red-900/20 text-red-400 line-through"
      : "bg-red-50 text-red-400 line-through";
    badgeClass = "bg-red-600 text-white";
  }

  // Hora del plato (si existe)
  const tiempo = plato?.tiempos?.salio || plato?.tiempos?.entregado;
  const horaStr = tiempo
    ? new Date(tiempo).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Cocinero
  const cocinero =
    plato?.procesadoPor?.alias ||
    plato?.procesadoPor?.nombre ||
    plato?.procesandoPor?.alias ||
    plato?.procesandoPor?.nombre ||
    "";

  return (
    <div className={`${base} ${estilo}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-semibold flex-shrink-0">
          {cantidad > 1 ? `${cantidad}×` : "•"}
        </span>
        <span className="truncate">
          {codigo && (
            <span className="opacity-60 mr-1 text-xs">[{codigo}]</span>
          )}
          {nombre}
        </span>
        {cocinero && (
          <span className={`text-[10px] opacity-60 hidden sm:inline`}>
            · {cocinero}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {horaStr && <span className="text-[10px] opacity-60">{horaStr}</span>}
        <span className={`text-[10px] px-2 py-0.5 rounded ${badgeClass} font-semibold`}>
          {clasif.etiqueta}
        </span>
      </div>
    </div>
  );
};

export default HistorialPlatoRow;
