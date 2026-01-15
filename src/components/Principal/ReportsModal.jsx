import React, { useState } from "react";
import jsPDF from "jspdf";
import moment from "moment-timezone";
import { FaTimes, FaFilePdf } from "react-icons/fa";

const ReportsModal = ({ estadisticas, comandas, onClose }) => {
  const [filtroMozo, setFiltroMozo] = useState("");
  const [filtroMesa, setFiltroMesa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Obtener lista única de mozos
  const mozos = [...new Set(comandas.map(c => c.mozos?.name).filter(Boolean))];
  
  // Obtener lista única de mesas
  const mesas = [...new Set(comandas.map(c => c.mesas?.nummesa).filter(Boolean))].sort((a, b) => a - b);

  // Calcular tiempo promedio de preparación
  const calcularTiempoPromedio = () => {
    const comandasEntregadas = comandas.filter(c => c.status === "entregado");
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

  // Obtener platos más pedidos
  const platosMasPedidos = Object.entries(estadisticas.platosMasPedidos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Generar PDF de reporte
  const generarPDF = () => {
    const doc = new jsPDF();
    const fechaActual = moment().tz("America/Lima").format("YYYY-MM-DD");
    const pdfWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Título
    doc.setFontSize(20);
    const titleText = "REPORTE DE VENTAS - LAS GAMBUSINAS";
    const titleWidth = (doc.getStringUnitWidth(titleText) * doc.internal.getFontSize()) / doc.internal.scaleFactor;
    doc.text(titleText, (pdfWidth - titleWidth) / 2, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Fecha: ${fechaActual}`, pdfWidth - 60, y);
    y += 15;

    // Resumen general
    doc.setFontSize(16);
    doc.text("RESUMEN GENERAL", 10, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Total de Comandas: ${estadisticas.totalComandas}`, 15, y);
    y += 7;
    doc.text(`Comandas Entregadas: ${estadisticas.comandasEntregadas}`, 15, y);
    y += 7;
    doc.text(`Total de Ventas: S/.${estadisticas.totalVentas.toFixed(2)}`, 15, y);
    y += 7;
    doc.text(`Tiempo Promedio de Preparación: ${calcularTiempoPromedio()} minutos`, 15, y);
    y += 10;

    // Ventas por Mozo
    if (Object.keys(estadisticas.ventasPorMozo).length > 0) {
      if (y > doc.internal.pageSize.height - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(16);
      doc.text("VENTAS POR MOZO", 10, y);
      y += 10;

      doc.setFontSize(12);
      Object.entries(estadisticas.ventasPorMozo)
        .sort((a, b) => b[1] - a[1])
        .forEach(([mozo, venta]) => {
          if (y > doc.internal.pageSize.height - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${mozo}: S/.${venta.toFixed(2)}`, 15, y);
          y += 7;
        });
      y += 5;
    }

    // Platos más pedidos
    if (platosMasPedidos.length > 0) {
      if (y > doc.internal.pageSize.height - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(16);
      doc.text("PLATOS MÁS PEDIDOS", 10, y);
      y += 10;

      doc.setFontSize(12);
      platosMasPedidos.forEach(([plato, cantidad]) => {
        if (y > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${plato}: ${cantidad} unidades`, 15, y);
        y += 7;
      });
    }

    // Resumen financiero
    if (y > doc.internal.pageSize.height - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(16);
    doc.text("RESUMEN FINANCIERO", 10, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Total de Ventas del Día: S/.${estadisticas.totalVentas.toFixed(2)}`, 15, y);
    y += 7;
    doc.text(`Promedio por Comanda: S/.${(estadisticas.totalVentas / estadisticas.totalComandas || 0).toFixed(2)}`, 15, y);

    doc.save(`reporte_ventas_${fechaActual}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">📊 Reportes y Estadísticas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-white font-semibold mb-2">Filtrar por Mozo</label>
            <select
              value={filtroMozo}
              onChange={(e) => setFiltroMozo(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
            >
              <option value="">Todos los mozos</option>
              {mozos.map(mozo => (
                <option key={mozo} value={mozo}>{mozo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Filtrar por Mesa</label>
            <select
              value={filtroMesa}
              onChange={(e) => setFiltroMesa(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
            >
              <option value="">Todas las mesas</option>
              {mesas.map(mesa => (
                <option key={mesa} value={mesa}>Mesa {mesa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Filtrar por Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
            >
              <option value="">Todos los estados</option>
              <option value="ingresante">Ingresante</option>
              <option value="preparacion">Preparación</option>
              <option value="recoger">Recoger</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Comandas</div>
            <div className="text-2xl font-bold text-white">{estadisticas.totalComandas}</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Comandas Entregadas</div>
            <div className="text-2xl font-bold text-green-400">{estadisticas.comandasEntregadas}</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Ventas</div>
            <div className="text-2xl font-bold text-yellow-400">S/.{estadisticas.totalVentas.toFixed(2)}</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Tiempo Promedio</div>
            <div className="text-2xl font-bold text-blue-400">{calcularTiempoPromedio()} min</div>
          </div>
        </div>

        {/* Ventas por Mozo */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-3">Ventas por Mozo</h3>
          <div className="bg-gray-700 rounded-lg p-4">
            {Object.entries(estadisticas.ventasPorMozo)
              .sort((a, b) => b[1] - a[1])
              .map(([mozo, venta]) => (
                <div key={mozo} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                  <span className="text-white">{mozo}</span>
                  <span className="text-yellow-400 font-bold">S/.{venta.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Platos más pedidos */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-3">Platos Más Pedidos</h3>
          <div className="bg-gray-700 rounded-lg p-4">
            {platosMasPedidos.map(([plato, cantidad], index) => (
              <div key={plato} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                <span className="text-white">
                  {index + 1}. {plato}
                </span>
                <span className="text-green-400 font-bold">{cantidad} unidades</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botón de generar PDF */}
        <div className="flex justify-end">
          <button
            onClick={generarPDF}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaFilePdf /> Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;

