import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import moment from "moment-timezone";
import { FaTimes, FaFilePdf } from "react-icons/fa";

const ReportsModal = ({ estadisticas, comandas, onClose, nightMode = true }) => {
  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const inputText = nightMode ? "text-white" : "text-gray-900";
  const [filtroMozo, setFiltroMozo] = useState("");
  const [filtroMesa, setFiltroMesa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Listas únicas para selects
  const mozos = useMemo(
    () => [...new Set(comandas.map(c => c.mozoNombre || c.mozos?.name).filter(Boolean))],
    [comandas]
  );
  const mesas = useMemo(
    () => [...new Set(comandas.map(c => c.mesas?.nummesa).filter(Boolean))].sort((a, b) => a - b),
    [comandas]
  );

  // F4: Filtrado real de comandas según los selects
  const comandasFiltradas = useMemo(() => {
    return comandas.filter(c => {
      if (filtroMozo) {
        const m = c.mozoNombre || c.mozos?.name;
        if (m !== filtroMozo) return false;
      }
      if (filtroMesa && String(c.mesas?.nummesa) !== String(filtroMesa)) return false;
      if (filtroEstado) {
        // Mapear el estado del select a cómo lo maneja la comanda
        const status = String(c.status || "").toLowerCase();
        if (filtroEstado === "entregado" && status !== "entregado") return false;
        if (filtroEstado === "recoger" && status !== "recoger") return false;
        if (filtroEstado === "preparacion" && !["en_espera", "pedido", "pendiente"].includes(status)) return false;
        if (filtroEstado === "ingresante" && status !== "pendiente_aprobar") return false;
      }
      return true;
    });
  }, [comandas, filtroMozo, filtroMesa, filtroEstado]);

  // Recalcular estadísticas en base a las comandas filtradas
  const statsFiltradas = useMemo(() => {
    const totalComandas = comandasFiltradas.length;
    const comandasEntregadas = comandasFiltradas.filter(c => c.status === "entregado").length;
    const totalVentas = comandasFiltradas.reduce((sum, c) => {
      return sum + (c.platos?.reduce((platoSum, p, idx) => {
        const precio = parseFloat(p.plato?.precio || p.precioBase || 0);
        const cantidad = parseInt(c.cantidades?.[idx] || 1);
        return platoSum + (precio * cantidad);
      }, 0) || 0);
    }, 0);
    const ventasPorMozo = {};
    const platosMasPedidos = {};
    comandasFiltradas.forEach(comanda => {
      const mozoName = comanda.mozoNombre || comanda.mozos?.name || "Sin mozo";
      let venta = 0;
      (comanda.platos || []).forEach((p, idx) => {
        const precio = parseFloat(p.plato?.precio || p.precioBase || 0);
        const cantidad = parseInt(comanda.cantidades?.[idx] || 1);
        venta += precio * cantidad;
        const nombre = p.plato?.nombre || p.nombre || "Plato";
        platosMasPedidos[nombre] = (platosMasPedidos[nombre] || 0) + cantidad;
      });
      ventasPorMozo[mozoName] = (ventasPorMozo[mozoName] || 0) + venta;
    });
    return { totalComandas, comandasEntregadas, totalVentas, ventasPorMozo, platosMasPedidos };
  }, [comandasFiltradas]);

  const calcularTiempoPromedio = () => {
    const comandasEntregadas = comandasFiltradas.filter(c => c.status === "entregado");
    if (comandasEntregadas.length === 0) return 0;
    let totalMinutos = 0;
    comandasEntregadas.forEach(comanda => {
      if (comanda.createdAt && comanda.updatedAt) {
        const inicio = moment(comanda.createdAt);
        const fin = moment(comanda.updatedAt);
        totalMinutos += fin.diff(inicio, "minutes");
      }
    });
    return Math.round(totalMinutos / comandasEntregadas.length);
  };

  const platosMasPedidos = Object.entries(statsFiltradas.platosMasPedidos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const generarPDF = () => {
    const doc = new jsPDF();
    const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
    const pdfWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    const titleText = "REPORTE DE VENTAS - LAS GAMBUSINAS";
    const titleWidth = (doc.getStringUnitWidth(titleText) * doc.internal.getFontSize()) / doc.internal.scaleFactor;
    doc.text(titleText, (pdfWidth - titleWidth) / 2, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Fecha: ${fechaActual}`, pdfWidth - 60, y);
    y += 15;

    // Indicar filtros aplicados
    const filtrosActivos = [];
    if (filtroMozo) filtrosActivos.push(`Mozo: ${filtroMozo}`);
    if (filtroMesa) filtrosActivos.push(`Mesa: ${filtroMesa}`);
    if (filtroEstado) filtrosActivos.push(`Estado: ${filtroEstado}`);
    if (filtrosActivos.length > 0) {
      doc.setFontSize(10);
      doc.text(`Filtros: ${filtrosActivos.join(" | ")}`, 15, y);
      y += 10;
    }

    doc.setFontSize(16);
    doc.text("RESUMEN GENERAL", 10, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Total de Comandas: ${statsFiltradas.totalComandas}`, 15, y);
    y += 7;
    doc.text(`Comandas Entregadas: ${statsFiltradas.comandasEntregadas}`, 15, y);
    y += 7;
    doc.text(`Total de Ventas: S/.${statsFiltradas.totalVentas.toFixed(2)}`, 15, y);
    y += 7;
    doc.text(`Tiempo Promedio de Preparación: ${calcularTiempoPromedio()} minutos`, 15, y);
    y += 10;

    if (Object.keys(statsFiltradas.ventasPorMozo).length > 0) {
      if (y > doc.internal.pageSize.height - 30) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.text("VENTAS POR MOZO", 10, y);
      y += 10;
      doc.setFontSize(12);
      Object.entries(statsFiltradas.ventasPorMozo)
        .sort((a, b) => b[1] - a[1])
        .forEach(([mozo, venta]) => {
          if (y > doc.internal.pageSize.height - 20) { doc.addPage(); y = 20; }
          doc.text(`${mozo}: S/.${venta.toFixed(2)}`, 15, y);
          y += 7;
        });
      y += 5;
    }

    if (platosMasPedidos.length > 0) {
      if (y > doc.internal.pageSize.height - 30) { doc.addPage(); y = 20; }
      doc.setFontSize(16);
      doc.text("PLATOS MÁS PEDIDOS", 10, y);
      y += 10;
      doc.setFontSize(12);
      platosMasPedidos.forEach(([plato, cantidad]) => {
        if (y > doc.internal.pageSize.height - 20) { doc.addPage(); y = 20; }
        doc.text(`${plato}: ${cantidad} unidades`, 15, y);
        y += 7;
      });
    }

    if (y > doc.internal.pageSize.height - 40) { doc.addPage(); y = 20; }
    doc.setFontSize(16);
    doc.text("RESUMEN FINANCIERO", 10, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total de Ventas: S/.${statsFiltradas.totalVentas.toFixed(2)}`, 15, y);
    y += 7;
    doc.text(`Promedio por Comanda: S/.${(statsFiltradas.totalVentas / statsFiltradas.totalComandas || 0).toFixed(2)}`, 15, y);

    doc.save(`reporte_ventas_${fechaActual}.pdf`);
  };

  const limpiarFiltros = () => {
    setFiltroMozo("");
    setFiltroMesa("");
    setFiltroEstado("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`${bgModal} rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl sm:text-2xl font-bold ${textModal}`}>Reportes y Estadísticas</h2>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-gray-700/50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center ${textSecondary} hover:${textModal} text-2xl`}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        {/* Filtros — F4: ahora aplican de verdad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>Filtrar por Mozo</label>
            <select
              value={filtroMozo}
              onChange={(e) => setFiltroMozo(e.target.value)}
              className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal} min-h-[44px]`}
            >
              <option value="">Todos los mozos</option>
              {mozos.map(mozo => (
                <option key={mozo} value={mozo}>{mozo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>Filtrar por Mesa</label>
            <select
              value={filtroMesa}
              onChange={(e) => setFiltroMesa(e.target.value)}
              className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal} min-h-[44px]`}
            >
              <option value="">Todas las mesas</option>
              {mesas.map(mesa => (
                <option key={mesa} value={mesa}>Mesa {mesa}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>Filtrar por Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal} min-h-[44px]`}
            >
              <option value="">Todos los estados</option>
              <option value="ingresante">Ingresante</option>
              <option value="preparacion">Preparación</option>
              <option value="recoger">Recoger</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>
        </div>
        {(filtroMozo || filtroMesa || filtroEstado) && (
          <div className="mb-4 flex items-center gap-2">
            <span className={`text-xs ${textSecondary}`}>
              Mostrando {comandasFiltradas.length} de {comandas.length} comandas
            </span>
            <button
              onClick={limpiarFiltros}
              className={`text-xs px-3 py-1 rounded ${inputBg} ${inputText} min-h-[36px]`}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Estadísticas (filtradas) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`${inputBg} p-4 rounded-lg`}>
            <div className={`${textSecondary} text-sm`}>Total Comandas</div>
            <div className={`text-2xl font-bold ${textModal}`}>{statsFiltradas.totalComandas}</div>
          </div>
          <div className={`${inputBg} p-4 rounded-lg`}>
            <div className={`${textSecondary} text-sm`}>Comandas Entregadas</div>
            <div className="text-2xl font-bold text-green-400">{statsFiltradas.comandasEntregadas}</div>
          </div>
          <div className={`${inputBg} p-4 rounded-lg`}>
            <div className={`${textSecondary} text-sm`}>Total Ventas</div>
            <div className="text-2xl font-bold text-yellow-400">S/.{statsFiltradas.totalVentas.toFixed(2)}</div>
          </div>
          <div className={`${inputBg} p-4 rounded-lg`}>
            <div className={`${textSecondary} text-sm`}>Tiempo Promedio</div>
            <div className="text-2xl font-bold text-blue-400">{calcularTiempoPromedio()} min</div>
          </div>
        </div>

        {/* Ventas por Mozo (filtradas) */}
        <div className="mb-6">
          <h3 className={`text-xl font-bold ${textModal} mb-3`}>Ventas por Mozo</h3>
          <div className={`${inputBg} rounded-lg p-4`}>
            {Object.keys(statsFiltradas.ventasPorMozo).length === 0 ? (
              <div className={`text-center py-4 ${textSecondary}`}>Sin datos con los filtros actuales</div>
            ) : (
              Object.entries(statsFiltradas.ventasPorMozo)
                .sort((a, b) => b[1] - a[1])
                .map(([mozo, venta]) => (
                  <div key={mozo} className={`flex justify-between items-center py-2 border-b ${borderModal} last:border-0`}>
                    <span className={textModal}>{mozo}</span>
                    <span className="text-yellow-400 font-bold">S/.{venta.toFixed(2)}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Platos más pedidos (filtrados) */}
        <div className="mb-6">
          <h3 className={`text-xl font-bold ${textModal} mb-3`}>Platos Más Pedidos</h3>
          <div className={`${inputBg} rounded-lg p-4`}>
            {platosMasPedidos.length === 0 ? (
              <div className={`text-center py-4 ${textSecondary}`}>Sin datos con los filtros actuales</div>
            ) : (
              platosMasPedidos.map(([plato, cantidad], index) => (
                <div key={plato} className={`flex justify-between items-center py-2 border-b ${borderModal} last:border-0`}>
                  <span className={textModal}>
                    {index + 1}. {plato}
                  </span>
                  <span className="text-green-400 font-bold">{cantidad} unidades</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botón de generar PDF */}
        <div className="flex justify-end">
          <button
            onClick={generarPDF}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors min-h-[44px]"
          >
            <FaFilePdf /> Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
