import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { FaFilePdf } from "react-icons/fa6";
import moment from "moment-timezone";
import { getApiUrl } from "../../config/apiConfig";

const PDFButton = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const currentDate = moment().tz('America/Lima').format('YYYY-MM-DD');
      const url = `${getApiUrl()}/fecha/${currentDate}?status=entregado`;

      try {
        const response = await fetch(url);
        const responseData = await response.json();
        const entregadoComandas = responseData.filter(comanda => comanda.status === "entregado");
        setData(entregadoComandas);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const generatePDF = () => {
    const doc = new jsPDF();
    const currentDate = moment().tz('America/Lima').format('YYYY-MM-DD');

    if (!data || data.length === 0) {
      doc.setFontSize(12);
      doc.text("No hay datos disponibles", 10, 20);
      doc.text(currentDate, doc.internal.pageSize.getWidth() - 50, 10);
      doc.save("informe_ventas.pdf");
      return;
    }

    let totalPlatos = 0;
    const dineroPorMesa = {};
    let dineroTotal = 0;
    const ventasPorMozo = {};
    const cantidadesPorCategoria = {};
    const montoPorCategoria = {};

    data.forEach((comanda) => {
      let totalComanda = 0;

      comanda.cantidades.forEach((cantidad, index) => {
        totalPlatos += cantidad;
        const plato = comanda.platos[index].plato;
        if (plato && plato.categoria) {
          const categoria = plato.categoria;
          if (!cantidadesPorCategoria[categoria]) {
            cantidadesPorCategoria[categoria] = {};
          }
          cantidadesPorCategoria[categoria][plato.nombre] =
            (cantidadesPorCategoria[categoria][plato.nombre] || 0) + cantidad;
          if (!montoPorCategoria[categoria]) {
            montoPorCategoria[categoria] = {};
          }
          const precioTotal = (montoPorCategoria[categoria][plato.nombre] || 0) + (cantidad * plato.precio);
          montoPorCategoria[categoria][plato.nombre] = precioTotal;
        }
      });

      comanda.platos.forEach((platoObj, index) => {
        const precio = parseFloat(platoObj.plato.precio) || 0;
        const cantidad = parseInt(comanda.cantidades[index]) || 0;
        totalComanda += precio * cantidad;
      });

      const mesa = comanda.mesas.nummesa;
      dineroPorMesa[mesa] = (dineroPorMesa[mesa] || 0) + totalComanda;
      dineroTotal += totalComanda;

      const mozoId = comanda.mozos.id;
      ventasPorMozo[mozoId] = (ventasPorMozo[mozoId] || 0) + totalComanda;
    });

    const pdfWidth = doc.internal.pageSize.getWidth();

    const addCantidadesPorCategoriaToPDF = (cantidadesPorCategoria, montoPorCategoria, startY) => {
      let y = startY;
      Object.keys(cantidadesPorCategoria).forEach((categoria) => {
        doc.text(`${categoria}:`, 10, y);
        y += 10;
        Object.keys(cantidadesPorCategoria[categoria]).forEach((plato) => {
          if (y + 13 > doc.internal.pageSize.height - 10) {
            doc.addPage();
            y = 20;
          }
          const cantidad = cantidadesPorCategoria[categoria][plato];
          const monto = montoPorCategoria[categoria][plato].toFixed(2);
          doc.text(
            `${cantidad} : ${plato} - S/.${monto}`,
            20,
            y
          );
          y += 13;
        });
        y += 5;
      });
      return y;
    };

    // Agregar los datos al PDF
    doc.setFontSize(18);
    const titleText = "Informe de Ventas";
    const titleWidth =
      (doc.getStringUnitWidth(titleText) * doc.internal.getFontSize()) /
      doc.internal.scaleFactor;
    const titleX = (pdfWidth - titleWidth) / 2;
    doc.text(titleText, titleX, 20);

    doc.setFontSize(12);
    doc.text(currentDate, pdfWidth - 50, 10);

    let y = 35;

    y = addCantidadesPorCategoriaToPDF(cantidadesPorCategoria, montoPorCategoria, y);

    y += 5;
    doc.text("Ventas por Mozo:", 10, y);
    y += 10;
    Object.keys(ventasPorMozo).forEach((mozoId) => {
      const mozoName = data.find(
        (comanda) => comanda.mozos.id === parseInt(mozoId)
      ).mozos.name;
      if (y + 10 > doc.internal.pageSize.height - 10) {
        doc.addPage();
        y = 20;
      }
      doc.text(`Mozo ${mozoName}: S/.${ventasPorMozo[mozoId].toFixed(2)}`, 20, y);
      y += 10;
    });

    y += 5;
    doc.text(
      `Dinero Total de Todas las Comandas: S/.${dineroTotal.toFixed(2)}`,
      10,
      y
    );
    y += 10;

    Object.keys(dineroPorMesa).forEach((mesa) => {
      if (y + 10 > doc.internal.pageSize.height - 10) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `Dinero Total por Mesa ${mesa}: S/.${dineroPorMesa[mesa].toFixed(2)}`,
        20,
        y
      );
      y += 10;
    });
    doc.save("informe_ventas.pdf");
  };

  return <button className={`${window.innerWidth > 1536 ? 'text-2xl' : ''}`} onClick={generatePDF}><FaFilePdf size={26} /></button>;
};

export default PDFButton;
