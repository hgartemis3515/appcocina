import React, { useState } from "react";
import moment from "moment-timezone";
import {
  FaTimes,
  FaSearch,
  FaHistory,
  FaCalendarDay,
  FaFilter,
} from "react-icons/fa";
import useHistorialCocina from "../../hooks/useHistorialCocina";
import HistorialComandaDetalle from "./HistorialComandaDetalle";
import { classifyComandaHistorial, ultimaHoraEntregado } from "../../utils/historialComandaRules";

/**
 * HistorialModal — Modal principal del Historial de cocina.
 *
 * Plan KDS v1.1, Fase F1.
 * - Default: día actual (America/Lima).
 * - Lista comandas con ≥ 1 plato `salio`/`entregado` (incluye parciales).
 * - Pendientes en gris.
 * - Filtros: fecha, mozo, cocinero, mesa, progreso, búsqueda.
 * - Modo lista: por comanda (default) o por plato entregado.
 */
const HistorialModal = ({
  onClose,
  getToken,
  socket,
  nightMode = true,
  cocineroPreselectId,
}) => {
  const [modoLista, setModoLista] = useState("comanda"); // 'comanda' | 'plato'
  const [comandaSeleccionada, setComandaSeleccionada] = useState(null);

  const {
    fecha,
    setFecha,
    esHoy,
    comandas,
    loading,
    error,
    filtros,
    setFiltros,
    resetFiltros,
    setFechaHoy,
    setFechaAyer,
    mozosUnicos,
    cocinerosUnicos,
    recargar,
    classifyComandaHistorial: classify,
  } = useHistorialCocina({ getToken, socket });

  // Tema
  const textMain = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const bgPanel = nightMode ? "bg-gray-900" : "bg-gray-50";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const inputText = nightMode ? "text-white" : "text-gray-900";

  const fmtHora = (t) =>
    t
      ? new Date(t).toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  // Modo por plato: aplanar platos entregados
  const platosEntregados = modoLista === "plato" ? comandas.flatMap((c) => {
    const mesa = c.mesaNumero ?? c.mesas?.nummesa ?? c.mesa?.numero ?? c.mesa ?? "—";
    const orden = c.comandaNumber ?? c.orden ?? c.numeroOrden ?? "—";
    const mozo = c.mozoNombre || c.mozos?.name || "Sin mozo";
    return (c.platos || [])
      .filter((p) => !p.eliminado && !p.anulado && ["salio", "entregado", "pagado"].includes(String(p.estado).toLowerCase()))
      .map((p, idx) => ({
        key: `${c._id}-${p._id || idx}`,
        comanda: c,
        plato: p,
        mesa,
        orden,
        mozo,
      }));
  }) : [];

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full sm:max-w-4xl ${bgModal} ${textMain} border ${borderModal} sm:rounded-lg shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 border-b ${borderModal} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <FaHistory className="text-purple-500 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold truncate">Historial de comandas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        {/* Barra de filtros */}
        <div className={`px-4 py-3 border-b ${borderModal} ${bgPanel} flex-shrink-0 space-y-2`}>
          {/* Fila 1: fecha + chips rápidos + modo */}
          <div className="flex items-center gap-2 flex-wrap">
            <FaCalendarDay className={textSecondary} />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value || moment().tz("America/Lima").format("YYYY-MM-DD"))}
              className={`px-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-sm min-h-[40px]`}
            />
            <button
              onClick={setFechaHoy}
              className={`px-3 py-1 rounded text-xs font-semibold min-h-[40px] ${esHoy ? "bg-blue-600 text-white" : `${inputBg} ${inputText}`}`}
            >
              Hoy
            </button>
            <button
              onClick={setFechaAyer}
              className={`px-3 py-1 rounded text-xs font-semibold min-h-[40px] ${inputBg} ${inputText}`}
            >
              Ayer
            </button>
            <div className="ml-auto flex items-center gap-1">
              <span className={`text-xs ${textSecondary} hidden sm:inline`}>Modo:</span>
              <select
                value={modoLista}
                onChange={(e) => setModoLista(e.target.value)}
                className={`px-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-xs min-h-[40px]`}
              >
                <option value="comanda">Por comanda</option>
                <option value="plato">Por plato entregado</option>
              </select>
            </div>
          </div>

          {/* Fila 2: selects de filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <FaFilter className={textSecondary} />
            <select
              value={filtros.mozo}
              onChange={(e) => setFiltros({ ...filtros, mozo: e.target.value })}
              className={`px-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-xs min-h-[40px]`}
            >
              <option value="todos">Todos los mozos</option>
              {mozosUnicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <select
              value={filtros.cocinero}
              onChange={(e) => setFiltros({ ...filtros, cocinero: e.target.value })}
              className={`px-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-xs min-h-[40px]`}
            >
              <option value="todos">Todos los cocineros</option>
              {cocinerosUnicos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              value={filtros.progreso}
              onChange={(e) => setFiltros({ ...filtros, progreso: e.target.value })}
              className={`px-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-xs min-h-[40px]`}
            >
              <option value="todas">Parciales + Finalizadas</option>
              <option value="parcial">Solo parciales</option>
              <option value="finalizada">Solo finalizadas</option>
            </select>
            <input
              type="text"
              placeholder="Mesa"
              value={filtros.mesa}
              onChange={(e) => setFiltros({ ...filtros, mesa: e.target.value })}
              className={`w-20 px-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-xs min-h-[40px]`}
            />
            <div className="relative flex-1 min-w-[140px]">
              <FaSearch className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${textSecondary}`} />
              <input
                type="text"
                placeholder="Buscar plato, orden, mozo…"
                value={filtros.q}
                onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                className={`w-full pl-7 pr-2 py-1 rounded border ${borderModal} ${inputBg} ${inputText} text-xs min-h-[40px]`}
              />
            </div>
            <button
              onClick={resetFiltros}
              className={`px-2 py-1 rounded text-xs ${inputBg} ${inputText} min-h-[40px]`}
              title="Limpiar filtros"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className={`text-center py-12 ${textSecondary}`}>Cargando…</div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">Error: {error}</div>
          ) : comandas.length === 0 ? (
            <div className={`text-center py-12 ${textSecondary}`}>
              <FaHistory className="text-4xl mx-auto mb-2 opacity-40" />
              <p className="font-semibold">Sin entregas registradas{esHoy ? " hoy" : ` para ${fecha}`}</p>
              <p className="text-xs mt-1">Las comandas aparecerán aquí cuando se entregue un plato.</p>
            </div>
          ) : modoLista === "comanda" ? (
            <div className="space-y-2">
              {comandas.map((c) => {
                const cl = classify(c);
                const ultima = ultimaHoraEntregado(c);
                const mesa = c.mesaNumero ?? c.mesas?.nummesa ?? c.mesa?.numero ?? c.mesa ?? "—";
                const orden = c.comandaNumber ?? c.orden ?? c.numeroOrden ?? "—";
                const mozo = c.mozoNombre || c.mozos?.name || "Sin mozo";
                return (
                  <button
                    key={c._id}
                    onClick={() => setComandaSeleccionada(c)}
                    className={`w-full text-left p-3 rounded-lg border ${borderModal} ${inputBg} hover:border-blue-500 transition-colors min-h-[44px]`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${cl.tipo === "finalizada" ? "bg-green-600 text-white" : "bg-yellow-500 text-white"}`}>
                          {cl.tipo === "finalizada" ? "Finalizada" : "Parcial"} {cl.entregados}/{cl.total}
                        </span>
                        <span className="font-bold">Mesa {mesa}</span>
                        <span className={`text-sm ${textSecondary}`}>#{orden}</span>
                        <span className={`text-xs ${textSecondary} hidden sm:inline`}>· {mozo}</span>
                      </div>
                      <span className={`text-xs ${textSecondary}`}>{fmtHora(ultima)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {platosEntregados.length === 0 ? (
                <div className={`text-center py-12 ${textSecondary}`}>Sin platos entregados con los filtros actuales.</div>
              ) : (
                platosEntregados.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setComandaSeleccionada(item.comanda)}
                    className={`w-full text-left p-3 rounded-lg border ${borderModal} ${inputBg} hover:border-blue-500 transition-colors min-h-[44px]`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {item.plato.plato?.codigo ? `[${item.plato.plato.codigo}] ` : ""}
                          {item.plato.plato?.nombre || item.plato.nombre || "Plato"}
                        </div>
                        <div className={`text-xs ${textSecondary}`}>
                          Mesa {item.mesa} · #{item.orden} · {item.mozo}
                        </div>
                      </div>
                      <span className={`text-xs ${textSecondary} flex-shrink-0`}>
                        {fmtHora(item.plato.tiempos?.salio || item.plato.tiempos?.entregado)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 border-t ${borderModal} ${bgPanel} flex items-center justify-between text-xs ${textSecondary} flex-shrink-0`}>
          <span>{comandas.length} comanda(s)</span>
          <button
            onClick={recargar}
            className="px-3 py-1 rounded hover:bg-gray-700/50 min-h-[40px]"
          >
            Recargar
          </button>
        </div>
      </div>

      {/* Detalle de comanda */}
      {comandaSeleccionada && (
        <HistorialComandaDetalle
          comanda={comandaSeleccionada}
          onClose={() => setComandaSeleccionada(null)}
          nightMode={nightMode}
        />
      )}
    </div>
  );
};

export default HistorialModal;
