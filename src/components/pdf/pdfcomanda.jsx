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
      const url = `${getApiUrl()}/fecha/${currentDate}`;

      try {
        const response = await fetch(url);
        const responseData = await response.json();
        setData(responseData);
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
      doc.save("pdfcomanda.pdf");
      return;
    }

    doc.setFontSize(18);
    const titleText = "Comandas del Día";
    const pdfWidth = doc.internal.pageSize.getWidth();
    const titleWidth =
      (doc.getStringUnitWidth(titleText) * doc.internal.getFontSize()) /
      doc.internal.scaleFactor;
    const titleX = (pdfWidth - titleWidth) / 2;
    doc.text(titleText, titleX, 20);

    doc.setFontSize(12);
    doc.text(currentDate, pdfWidth - 50, 10);

    let y = 35;
    data.forEach((comanda, index) => {
      if (index !== 0) {
        y += 0.5;
        doc.setLineWidth(0.5);
        doc.line(10, y, pdfWidth - 10, y);
        y += 10;
      }

      doc.text(`Comanda Número: ${comanda.comandaNumber}`, 10, y);
      y += 10;
      doc.text(`Mozo: ${comanda.mozos.name}`, 10, y);
      y += 10;
      doc.text(`Mesa: ${comanda.mesas.nummesa}`, 10, y);
      y += 10;
      doc.text(`Platos:`, 10, y);
      y += 10;

      comanda.platos.forEach((platoObj, platoIndex) => {
        const plato = platoObj.plato;
        const cantidad = comanda.cantidades[platoIndex];
        if (y + 10 > doc.internal.pageSize.height - 10) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${cantidad} x ${plato.nombre} - S/.${plato.precio}`, 20, y);
        y += 10;
      });

      y += 2;
    });

    doc.save("pdfcomanda.pdf");
  };

  return (
    <button onClick={generatePDF}>
      <FaFilePdf size={26} />
    </button>
  );
};

export default PDFButton;
