import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import moment from "moment-timezone";

const ConfigModal = ({ config, onClose, onSave, nightMode = true }) => {
  const [localConfig, setLocalConfig] = useState({
    ...config,
    design: config.design || { fontSize: 15, cols: 5, rows: 1 },
    nightMode: config.nightMode !== undefined ? config.nightMode : true
  });

  const handleSave = () => {
    onSave(localConfig);
  };

  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const inputText = nightMode ? "text-white" : "text-gray-900";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${bgModal} rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${textModal}`}>⚙️ Configuración del Sistema</h2>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textModal} text-2xl`}
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6">
          {/* Intervalo de Polling */}
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>
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
              className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
            >
              <option value={3}>3 segundos</option>
              <option value={5}>5 segundos</option>
              <option value={10}>10 segundos</option>
              <option value={15}>15 segundos</option>
              <option value={30}>30 segundos</option>
            </select>
            <p className={`${textSecondary} text-sm mt-1`}>
              Frecuencia con la que se actualizan las comandas desde el servidor
            </p>
          </div>

          {/* Tiempo de Alerta Amarilla */}
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>
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
              className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
            />
            <p className={`${textSecondary} text-sm mt-1`}>
              Los pedidos que superen este tiempo mostrarán fondo amarillo
            </p>
          </div>

          {/* Tiempo de Alerta Roja */}
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>
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
              className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
            />
            <p className={`${textSecondary} text-sm mt-1`}>
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
              <span className={`${textModal} font-semibold`}>
                Activar sonido de notificación
              </span>
            </label>
            <p className={`${textSecondary} text-sm mt-1 ml-8`}>
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
              <span className={`${textModal} font-semibold`}>
                Auto-imprimir tickets (próximamente)
              </span>
            </label>
            <p className={`${textSecondary} text-sm mt-1 ml-8`}>
              Imprime automáticamente los tickets cuando las comandas estén listas
            </p>
          </div>

          {/* Separador */}
          <div className={`border-t ${borderModal} my-6`}></div>

          {/* Modo Nocturno */}
          <div>
            <h3 className={`text-xl font-bold ${textModal} mb-4`}>🌙 MODO NOCTURNO</h3>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.nightMode}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      nightMode: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded"
                />
                <span className={`${textModal} font-semibold`}>
                  Activar modo nocturno
                </span>
              </label>
              <p className={`${textSecondary} text-sm mt-1 ml-8`}>
                  {localConfig.nightMode 
                    ? "Interfaz con fondo oscuro (recomendado para cocinas)" 
                    : "Interfaz con fondo claro (modo día)"}
              </p>
            </div>
          </div>

          {/* Separador */}
          <div className={`border-t ${borderModal} my-6`}></div>

          {/* Sección DISEÑAR COMANDAS */}
          <div>
            <h3 className={`text-xl font-bold ${textModal} mb-4`}>🎨 DISEÑAR COMANDAS</h3>
            
            {/* Fuente */}
            <div className="mb-4">
              <label className={`block ${textModal} font-semibold mb-2`}>
                Tamaño de Fuente (px)
              </label>
              <select
                value={localConfig.design.fontSize}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    design: {
                      ...localConfig.design,
                      fontSize: parseInt(e.target.value) || 15,
                    },
                  })
                }
                className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
              >
                {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
              <p className={`${textSecondary} text-sm mt-1`}>
                Tamaño de fuente para los nombres de platos en las tarjetas
              </p>
            </div>

            {/* Columnas */}
            <div className="mb-4">
              <label className={`block ${textModal} font-semibold mb-2`}>
                Columnas del Grid
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={localConfig.design.cols}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    design: {
                      ...localConfig.design,
                      cols: Math.max(1, Math.min(8, parseInt(e.target.value) || 5)),
                    },
                  })
                }
                className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
              />
              <p className={`${textSecondary} text-sm mt-1`}>
                Número de columnas en el grid (1-8)
              </p>
            </div>

            {/* Filas */}
            <div className="mb-4">
              <label className={`block ${textModal} font-semibold mb-2`}>
                Filas del Grid
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={localConfig.design.rows}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    design: {
                      ...localConfig.design,
                      rows: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)),
                    },
                  })
                }
                className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
              />
              <p className={`${textSecondary} text-sm mt-1`}>
                Número de filas visibles en el grid (1-4)
              </p>
            </div>

            {/* Preview en vivo */}
            <div className="mt-6">
              <label className={`block ${textModal} font-semibold mb-3`}>
                Preview en Vivo
              </label>
              <div 
                className={`${nightMode ? 'bg-gray-900' : 'bg-gray-100'} p-4 rounded-lg border-2 ${borderModal}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${localConfig.design.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${localConfig.design.rows}, auto)`,
                  gap: '1rem',
                  minHeight: '200px'
                }}
              >
                {/* Tarjeta de ejemplo */}
                <div className="bg-gray-800 border-4 border-gray-700 rounded-lg p-4 flex flex-col relative">
                  <div className="bg-red-600 text-white font-black text-lg py-1 text-center mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                    ESPERA
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <input type="checkbox" className="w-4 h-4" />
                  </div>
                  <div className="text-red-500 font-black text-2xl mb-1" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                    ORDEN #1
                  </div>
                  <div className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                    MESA #2
                  </div>
                  <div className="absolute top-4 right-4 bg-black bg-opacity-70 px-2 py-1 rounded">
                    <div className="text-white font-black text-sm" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                      00:15
                    </div>
                  </div>
                  <div className="flex-1 mt-2 pt-8">
                    <div 
                      className="text-white font-black"
                      style={{ 
                        fontFamily: 'Arial Black, sans-serif',
                        fontSize: `${localConfig.design.fontSize}px`
                      }}
                    >
                      3 Paella Huancaína
                    </div>
                    <div 
                      className="text-white font-black"
                      style={{ 
                        fontFamily: 'Arial Black, sans-serif',
                        fontSize: `${localConfig.design.fontSize}px`
                      }}
                    >
                      1 Tamal a la criolla
                    </div>
                  </div>
                  <div className="mt-2">
                    <button className="w-full bg-green-600 text-white font-bold py-2 rounded text-sm">
                      PREPARAR
                    </button>
                  </div>
                </div>
                
                {/* Slots vacíos de ejemplo */}
                {Array.from({ length: (localConfig.design.cols * localConfig.design.rows) - 1 }).map((_, idx) => (
                  <div key={idx} className="bg-gray-900 border-2 border-gray-800 rounded-lg" />
                ))}
              </div>
              <p className={`${textSecondary} text-sm mt-2`}>
                Vista previa del diseño: {localConfig.design.cols} columnas × {localConfig.design.rows} filas = {localConfig.design.cols * localConfig.design.rows} slots
              </p>
            </div>
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
            className={`flex-1 ${nightMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} text-white font-bold py-3 px-6 rounded-lg transition-colors`}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;

