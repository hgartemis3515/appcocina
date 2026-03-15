import React, { useState, useEffect } from "react";
import { FaTimes, FaShieldAlt, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import moment from "moment-timezone";
import { 
  getRawApiUrl, 
  setApiUrl, 
  getApiUrl, 
  validateApiUrl,
  getAllowedHosts 
} from "../../config/apiConfig";

/**
 * ConfigModal - Modal de configuración del sistema KDS
 * 
 * Seguridad:
 * - Valida URLs contra lista blanca de hosts permitidos
 * - No permite IPs arbitrarias
 */
const ConfigModal = ({ config, onClose, onSave, nightMode = true }) => {
  const [localConfig, setLocalConfig] = useState({
    ...config,
    design: config.design || { fontSize: 15, cols: 5, rows: 1 },
    nightMode: config.nightMode !== undefined ? config.nightMode : true
  });
  
  // Estado para URL del servidor
  const [apiUrl, setApiUrlLocal] = useState('');
  const [apiUrlError, setApiUrlError] = useState('');
  const [apiUrlWarning, setApiUrlWarning] = useState('');
  const [apiUrlValid, setApiUrlValid] = useState(false);

  // Cargar URL inicial
  useEffect(() => {
    const rawUrl = getRawApiUrl();
    setApiUrlLocal(rawUrl || '');
    validateUrl(rawUrl || '');
  }, []);

  /**
   * Valida la URL y actualiza el estado
   */
  const validateUrl = (url) => {
    if (!url || url.trim() === '') {
      setApiUrlError('');
      setApiUrlWarning('');
      setApiUrlValid(false);
      return;
    }

    const validation = validateApiUrl(url);
    
    if (!validation.valid) {
      setApiUrlError(validation.error);
      setApiUrlWarning('');
      setApiUrlValid(false);
    } else {
      setApiUrlError('');
      setApiUrlValid(true);
      
      // Mostrar información sobre hosts permitidos
      const allowedHosts = getAllowedHosts();
      if (allowedHosts.length > 0) {
        setApiUrlWarning(`Host permitido: ${validation.host}`);
      } else {
        setApiUrlWarning('');
      }
    }
  };

  /**
   * Maneja cambios en el input de URL
   */
  const handleApiUrlChange = (e) => {
    const newUrl = e.target.value;
    setApiUrlLocal(newUrl);
    setApiUrlError('');
    validateUrl(newUrl);
  };

  /**
   * Guarda la configuración
   */
  const handleSave = () => {
    // Validar y guardar URL del backend si se proporcionó
    if (apiUrl && apiUrl.trim() !== '') {
      const result = setApiUrl(apiUrl.trim());
      
      if (!result.success) {
        setApiUrlError(result.error);
        return;
      }
    }
    
    onSave(localConfig);
  };

  // Estilos condicionales
  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const inputText = nightMode ? "text-white" : "text-gray-900";

  // Hosts permitidos para mostrar al usuario
  const allowedHosts = getAllowedHosts();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${bgModal} rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${textModal}`}>Configuración del Sistema</h2>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textModal} text-2xl`}
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6">
          {/* Configuración del Servidor */}
          <div>
            <h3 className={`text-xl font-bold ${textModal} mb-4 flex items-center gap-2`}>
              <FaShieldAlt className="text-green-500" />
              Configuración del Servidor
            </h3>
            
            <div>
              <label className={`block ${textModal} font-semibold mb-2`}>
                URL del Servidor Backend
              </label>
              
              <input
                type="text"
                value={apiUrl}
                onChange={handleApiUrlChange}
                placeholder="http://localhost:3000"
                className={`w-full ${inputBg} ${inputText} p-3 rounded border ${
                  apiUrlError ? 'border-red-500' : apiUrlValid ? 'border-green-500' : borderModal
                }`}
              />
              
              {/* Indicador de estado */}
              {apiUrlError && (
                <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                  <FaExclamationTriangle />
                  <span>{apiUrlError}</span>
                </div>
              )}
              
              {apiUrlValid && (
                <div className="flex items-center gap-2 mt-2 text-green-500 text-sm">
                  <FaCheckCircle />
                  <span>URL válida</span>
                </div>
              )}
              
              {/* Hosts permitidos */}
              {allowedHosts.length > 0 && (
                <div className={`mt-2 ${textSecondary} text-xs`}>
                  <span className="font-semibold">Hosts permitidos:</span>{' '}
                  {allowedHosts.join(', ')}
                </div>
              )}
              
              <p className={`${textSecondary} text-sm mt-2`}>
                Solo se permiten hosts autorizados por el administrador del sistema.
              </p>
              
              {/* URL actual */}
              <div className={`mt-3 p-2 rounded ${inputBg} ${textSecondary} text-xs`}>
                <span className="font-semibold">URL actual en uso:</span>{' '}
                {getApiUrl() || 'No configurada'}
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className={`border-t ${borderModal} my-6`}></div>

          {/* Información WebSocket */}
          <div>
            <label className={`block ${textModal} font-semibold mb-2`}>
              Sistema de Actualización
            </label>
            <div className={`${inputBg} ${inputText} p-3 rounded border ${borderModal}`}>
              <p className={`${textModal} font-semibold mb-2`}>WebSocket en Tiempo Real</p>
              <p className={`${textSecondary} text-sm`}>
                El sistema usa WebSocket con Redis Adapter para actualizaciones instantáneas.
                Conexión autenticada con token JWT.
              </p>
            </div>
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
              Los pedidos que superen este tiempo mostraran fondo amarillo
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
              Los pedidos que superen este tiempo mostraran fondo rojo urgente
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

          {/* Separador */}
          <div className={`border-t ${borderModal} my-6`}></div>

          {/* Modo Nocturno */}
          <div>
            <h3 className={`text-xl font-bold ${textModal} mb-4`}>Modo Nocturno</h3>
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
            <h3 className={`text-xl font-bold ${textModal} mb-4`}>Diseñar Comandas</h3>
            
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
            </div>

            {/* Preview */}
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
                  <div className="bg-red-600 text-white font-black text-lg py-1 text-center mb-2">
                    ESPERA
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <input type="checkbox" className="w-4 h-4" />
                  </div>
                  <div className="text-red-500 font-black text-2xl mb-1">
                    ORDEN #1
                  </div>
                  <div className="text-white font-bold text-lg mb-2">
                    MESA #2
                  </div>
                  <div className="absolute top-4 right-4 bg-black bg-opacity-70 px-2 py-1 rounded">
                    <div className="text-white font-black text-sm">
                      00:15
                    </div>
                  </div>
                  <div className="flex-1 mt-2 pt-8">
                    <div 
                      className="text-white font-black"
                      style={{ fontSize: `${localConfig.design.fontSize}px` }}
                    >
                      3 Paella Huancaina
                    </div>
                  </div>
                  <div className="mt-2">
                    <button className="w-full bg-green-600 text-white font-bold py-2 rounded text-sm">
                      PREPARAR
                    </button>
                  </div>
                </div>
                
                {/* Slots vacíos */}
                {Array.from({ length: (localConfig.design.cols * localConfig.design.rows) - 1 }).map((_, idx) => (
                  <div key={idx} className="bg-gray-900 border-2 border-gray-800 rounded-lg" />
                ))}
              </div>
              <p className={`${textSecondary} text-sm mt-2`}>
                {localConfig.design.cols} columnas x {localConfig.design.rows} filas = {localConfig.design.cols * localConfig.design.rows} slots
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSave}
            disabled={apiUrl && !apiUrlValid}
            className={`flex-1 font-bold py-3 px-6 rounded-lg transition-colors ${
              apiUrl && !apiUrlValid
                ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Guardar Configuracion
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
