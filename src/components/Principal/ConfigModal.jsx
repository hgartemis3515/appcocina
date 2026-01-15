import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";

const ConfigModal = ({ config, onClose, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onSave(localConfig);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">⚙️ Configuración del Sistema</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6">
          {/* Intervalo de Polling */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Intervalo de Actualización (segundos)
            </label>
            <select
              value={localConfig.pollingInterval / 1000}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  pollingInterval: parseInt(e.target.value) * 1000,
                })
              }
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
            >
              <option value={3}>3 segundos</option>
              <option value={5}>5 segundos</option>
              <option value={10}>10 segundos</option>
              <option value={15}>15 segundos</option>
              <option value={30}>30 segundos</option>
            </select>
            <p className="text-gray-400 text-sm mt-1">
              Frecuencia con la que se actualizan las comandas desde el servidor
            </p>
          </div>

          {/* Tiempo de Alerta Amarilla */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Tiempo de Alerta Amarilla (minutos)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={localConfig.alertYellowMinutes}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  alertYellowMinutes: parseInt(e.target.value) || 15,
                })
              }
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
            />
            <p className="text-gray-400 text-sm mt-1">
              Los pedidos que superen este tiempo mostrarán fondo amarillo
            </p>
          </div>

          {/* Tiempo de Alerta Roja */}
          <div>
            <label className="block text-white font-semibold mb-2">
              Tiempo de Alerta Roja (minutos)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={localConfig.alertRedMinutes}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  alertRedMinutes: parseInt(e.target.value) || 20,
                })
              }
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
            />
            <p className="text-gray-400 text-sm mt-1">
              Los pedidos que superen este tiempo mostrarán fondo rojo urgente
            </p>
          </div>

          {/* Sonido de Notificación */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.soundEnabled}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    soundEnabled: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded"
              />
              <span className="text-white font-semibold">
                Activar sonido de notificación
              </span>
            </label>
            <p className="text-gray-400 text-sm mt-1 ml-8">
              Reproduce un sonido cuando llegue una nueva comanda
            </p>
          </div>

          {/* Auto-impresión */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.autoPrint}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    autoPrint: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded"
              />
              <span className="text-white font-semibold">
                Auto-imprimir tickets (próximamente)
              </span>
            </label>
            <p className="text-gray-400 text-sm mt-1 ml-8">
              Imprime automáticamente los tickets cuando las comandas estén listas
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Guardar Configuración
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

export default ConfigModal;

