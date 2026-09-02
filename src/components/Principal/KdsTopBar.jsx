import React, { useState, useRef, useEffect } from "react";
import {
  FaEye,
  FaShoppingBag,
  FaArrowLeft,
  FaSearch,
  FaUndo,
  FaCog,
  FaExpand,
  FaCompress,
  FaHistory,
  FaEllipsisV,
  FaChartBar,
  FaCalendarAlt,
} from "react-icons/fa";
import BotonCandadoCocina from "../common/BotonCandadoCocina";

/**
 * KdsTopBar — Barra superior compartida por las 3 vistas KDS
 * (General, Personalizada, Supervisor).
 *
 * Plan: PLAN_KDS_BARRA_HISTORIAL_VISTA_RESPONSIVE.md (Fase F0)
 *
 * Objetivos:
 *  - Jerarquía clara: estado operativo (hora/pendientes/socket) | acciones.
 *  - Responsive automático (sin scroll horizontal en 360–412 px).
 *  - Overflow `⋮` en móvil para acciones secundarias.
 *  - PPA siempre visible en la fila primaria; badge si hay pendientes.
 *  - Botón Historial presente (F0: handler opcional; F1: abre HistorialModal).
 *
 * No contiene lógica de negocio: solo recibe props y renderiza.
 */

const VISTA_CONFIG = {
  general: { label: "Vista General", short: "G", color: "bg-blue-600" },
  personalizada: { label: "Vista Personalizada", short: "P", color: "bg-green-600" },
  supervisor: { label: "Supervisor", short: "S", color: "bg-purple-600" },
};

const SOCKET_CONFIG = {
  conectado: { color: "bg-green-600", text: "Realtime" },
  desconectado: { color: "bg-red-600", text: "Desconectado" },
  auth_error: { color: "bg-orange-600", text: "Error Auth" },
};

const KdsTopBar = ({
  vista = "general",
  horaActual,
  fechaActual,
  totalComandas = 0,
  socketConnectionStatus = "desconectado",
  socketAuthError,
  isFullscreen = false,
  ppaCount = 0,
  reservadasCount = 0,
  nightMode = true,
  onToggleSearch,
  onShowReports,
  onShowConfig,
  onShowRevertir,
  onShowHistorial,
  onToggleFullscreen,
  onGoToMenu,
  onTogglePpa,
  onToggleReserva,
  onShowReservadas,
}) => {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef(null);

  // Cerrar el menú overflow al hacer click fuera
  useEffect(() => {
    if (!overflowOpen) return undefined;
    const handleClickOutside = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [overflowOpen]);

  // Clases de tema (espejo de comandastyle.jsx)
  const bgHeader = nightMode ? "bg-black" : "bg-white";
  const textMain = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const borderMain = nightMode ? "border-gray-700" : "border-gray-300";
  const bgButton = nightMode ? "bg-gray-800" : "bg-gray-200";
  const bgButtonHover = nightMode ? "hover:bg-gray-700" : "hover:bg-gray-300";
  const textButton = nightMode ? "text-white" : "text-gray-900";
  const bgOverflowMenu = nightMode ? "bg-gray-900" : "bg-white";
  const borderOverflow = nightMode ? "border-gray-700" : "border-gray-300";

  const vistaCfg = VISTA_CONFIG[vista] || VISTA_CONFIG.general;
  const socketCfg = SOCKET_CONFIG[socketConnectionStatus] || SOCKET_CONFIG.desconectado;

  // Formateo defensivo (horaActual/fechaActual son moment)
  const horaStr =
    horaActual && typeof horaActual.format === "function"
      ? horaActual.format("HH:mm")
      : "--:--";
  const fechaStr =
    fechaActual && typeof fechaActual.format === "function"
      ? fechaActual.format("DD/MM/YYYY")
      : "";

  // Clases base para botones de acción
  const actionBtn =
    `inline-flex items-center justify-center gap-1.5 rounded text-xs font-medium ` +
    `transition-all duration-150 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px] ` +
    `px-3 py-2 ${bgButton} ${bgButtonHover} ${textButton} ` +
    `active:${nightMode ? "bg-gray-600" : "bg-gray-400"}`;

  const primaryBtn =
    `inline-flex items-center justify-center gap-1.5 rounded text-xs font-medium ` +
    `transition-all duration-150 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px] ` +
    `px-3 py-2 ${bgButton} ${bgButtonHover} ${textButton} ` +
    `active:${nightMode ? "bg-gray-600" : "bg-gray-400"}`;

  const closeOverflow = () => setOverflowOpen(false);

  const run = (fn) => () => {
    closeOverflow();
    if (typeof fn === "function") fn();
  };

  return (
    <header
      className={`${bgHeader} ${textMain} border-b-2 ${borderMain} flex items-center justify-between px-3 xs:px-4 sm:px-6 flex-shrink-0 z-50 relative shadow-lg`}
      style={{
        minHeight: "56px",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* === IZQUIERDA: hora + fecha + badge vista === */}
      <div className="flex items-center gap-2 xs:gap-3 min-w-0">
        <div className="flex flex-col items-start leading-tight">
          <span
            className={`text-lg sm:text-2xl font-bold ${textMain}`}
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {horaStr}
          </span>
          <span className={`text-[10px] sm:text-xs ${textSecondary}`}>{fechaStr}</span>
        </div>

        {/* Badge de vista: compacto en móvil, completo en sm+ */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded ${vistaCfg.color} text-white text-[10px] sm:text-xs font-semibold flex-shrink-0`}
          title={vistaCfg.label}
        >
          <FaEye className="text-[10px]" />
          <span className="hidden sm:inline">{vistaCfg.label}</span>
          <span className="sm:hidden">{vistaCfg.short}</span>
        </div>
      </div>

      {/* === CENTRO: título solo en lg+ (evita choque en móvil) === */}
      <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 pointer-events-none">
        <h1
          className="text-xl xl:text-2xl font-bold tracking-wide"
          style={{ fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}
        >
          COCINA SAN BENITO
        </h1>
      </div>

      {/* === DERECHA: métricas + acciones === */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Contador pendientes (compacto) */}
        <div className="flex items-center gap-1.5 flex-shrink-0" title="Comandas pendientes">
          <span
            className="text-yellow-400 text-lg sm:text-2xl font-bold"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {totalComandas}
          </span>
          <span className={`hidden md:inline text-xs ${textSecondary}`}>pendientes</span>
        </div>

        {/* Socket: punto de color + texto solo en md+ */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded ${socketCfg.color} text-white text-[10px] sm:text-xs font-semibold flex-shrink-0`}
          title={socketConnectionStatus === "auth_error" ? socketAuthError : socketCfg.text}
        >
          <span>●</span>
          <span className="hidden md:inline">{socketCfg.text}</span>
        </div>

        {/* --- Acciones PRIMARIAS (siempre visibles) --- */}

        <BotonCandadoCocina compact />

        {/* Buscar */}
        <button
          onClick={onToggleSearch}
          className={primaryBtn}
          title="Buscar"
          aria-label="Buscar"
        >
          <FaSearch />
          <span className="hidden sm:inline">Buscar</span>
        </button>

        {/* Historial (F0: handler opcional; F1: abre modal) */}
        <button
          onClick={onShowHistorial}
          className={primaryBtn}
          title={typeof onShowHistorial === "function" ? "Historial de comandas" : "Historial (próximamente)"}
          aria-label="Historial"
          disabled={typeof onShowHistorial !== "function"}
          style={typeof onShowHistorial !== "function" ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          <FaHistory />
          <span className="hidden sm:inline">Historial</span>
        </button>

        {/* PPA: siempre visible en la barra primaria (badge solo si hay pendientes) */}
        <button
          onClick={onTogglePpa}
          className="inline-flex items-center justify-center gap-1.5 rounded text-white text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px] px-3 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-800 relative"
          title="Tickets de Pagos Adelantados / Aprobaciones"
          aria-label="Pagos adelantados"
        >
          <FaShoppingBag className="text-xs" />
          <span className="hidden sm:inline">PPA</span>
          {ppaCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {ppaCount > 99 ? "99+" : ppaCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleReserva || onShowReservadas}
          className="inline-flex items-center justify-center gap-1.5 rounded text-white text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px] px-3 py-2 bg-pink-500 hover:bg-pink-400 active:bg-pink-700 relative"
          title="Reservas programadas (horario de habilitación KDS)"
          aria-label="Reserva"
        >
          <FaCalendarAlt className="text-xs" />
          <span className="hidden sm:inline">Reserva</span>
          {reservadasCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {reservadasCount > 99 ? "99+" : reservadasCount}
            </span>
          )}
        </button>

        {/* --- Acciones SECUNDARIAS: visibles en md+, overflow en móvil --- */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={onShowReports} className={actionBtn} title="Reportes" aria-label="Reportes">
            <FaChartBar />
            <span className="hidden lg:inline">Reportes</span>
          </button>
          <button onClick={onShowRevertir} className={actionBtn} title="Revertir" aria-label="Revertir">
            <FaUndo />
            <span className="hidden lg:inline">Revertir</span>
          </button>
          <button onClick={onShowConfig} className={actionBtn} title="Configuración" aria-label="Configuración">
            <FaCog />
            <span className="hidden lg:inline">Config</span>
          </button>
          <button
            onClick={onGoToMenu}
            className="inline-flex items-center justify-center gap-1.5 rounded text-white text-xs font-medium transition-all duration-150 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px] px-3 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800"
            title="Volver al Menú Principal"
            aria-label="Menú"
          >
            <FaArrowLeft />
            <span className="hidden lg:inline">Menú</span>
          </button>
          <button
            onClick={onToggleFullscreen}
            className={actionBtn}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>

        {/* --- Overflow `⋮` en móvil (< md) --- */}
        <div className="md:hidden relative" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen((v) => !v)}
            className={actionBtn}
            title="Más acciones"
            aria-label="Más acciones"
            aria-expanded={overflowOpen}
          >
            <FaEllipsisV />
          </button>

          {overflowOpen && (
            <div
              className={`absolute right-0 top-full mt-1 ${bgOverflowMenu} border ${borderOverflow} rounded-lg shadow-2xl py-1 min-w-[200px] z-50`}
              role="menu"
            >
              <OverflowItem onClick={run(onShowReports)} icon={<FaChartBar />} label="Reportes" />
              <OverflowItem onClick={run(onShowRevertir)} icon={<FaUndo />} label="Revertir" />
              <OverflowItem onClick={run(onShowConfig)} icon={<FaCog />} label="Configuración" />
              <OverflowItem
                onClick={run(onToggleFullscreen)}
                icon={isFullscreen ? <FaCompress /> : <FaExpand />}
                label={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
              />
              <OverflowItem
                onClick={run(onGoToMenu)}
                icon={<FaArrowLeft />}
                label="Volver al Menú"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/**
 * Ítem del menú overflow móvil.
 */
const OverflowItem = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    role="menuitem"
    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-700/50 min-h-[44px]"
  >
    <span className="w-5 flex justify-center">{icon}</span>
    <span>{label}</span>
  </button>
);

export default KdsTopBar;
