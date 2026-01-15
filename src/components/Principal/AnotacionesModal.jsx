import React, { useState } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import axios from "axios";

const AnotacionesModal = ({ comanda, onClose }) => {
  const [anotaciones, setAnotaciones] = useState(comanda.observaciones || "");

  const guardarAnotaciones = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_COMANDA}/${comanda._id}`,
        {
          ...comanda,
          observaciones: anotaciones
        }
      );
      onClose();
    } catch (error) {
      console.error("Error al guardar anotaciones:", error);
      // Manejar errores sin crash
      if (error.response) {
        const message = error.response.data?.message || error.response.data?.error || 'Error al guardar las anotaciones';
        alert(`Error: ${message}`);
      } else {
        alert("Error de conexión al guardar las anotaciones");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            📝 Anotaciones - Comanda #{comanda.comandaNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-white font-semibold mb-2">
            Observaciones y Notas
          </label>
          <textarea
            value={anotaciones}
            onChange={(e) => setAnotaciones(e.target.value)}
            className="w-full bg-gray-700 text-white p-4 rounded border border-gray-600 min-h-[200px] resize-none"
            placeholder="Escribe aquí las anotaciones especiales para esta comanda..."
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={guardarAnotaciones}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <FaSave /> Guardar Anotaciones
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnotacionesModal;

