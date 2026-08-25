import React, { useState, useEffect } from "react";
import { 
  FaTimes, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaCog,
  FaTrash,
  FaUndo
} from "react-icons/fa";
import moment from "moment-timezone";
import { 
  getRawApiUrl, 
  setApiUrl, 
  getApiUrl, 
  validateApiUrl,
  getAllowedHosts 
} from "../../config/apiConfig";
import { useConfig } from "../../contexts/ConfigContext";
import { 
  ejecutarLimpieza,
  KDS_CONFIG_VERSION
} from "../../config/kdsConfigConstants";
import ConfigVistaAlertasTab from "./ConfigVistaAlertasTab";

/**
 * ConfigModal - Modal de configuración del sistema KDS
 *
 * Tab Vista y alertas: tipografía, paginación, badge guarnición, umbrales y perfiles.
 */
const ConfigModal = ({ onClose, nightMode = true }) => {
  // Usar ConfigContext
  const {
    config,
    updateConfig,
    resetConfig,
  } = useConfig();

  // Estado para tabs
  const [activeTab, setActiveTab] = useState('general');
  
  // Estado para URL del servidor
  const [apiUrl, setApiUrlLocal] = useState('');
  const [apiUrlError, setApiUrlError] = useState('');
  const [apiUrlWarning, setApiUrlWarning] = useState('');
  const [apiUrlValid, setApiUrlValid] = useState(false);
  
  // Estado para limpieza
  const [cleanupResult, setCleanupResult] = useState(null);

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
   * Guarda toda la configuración
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
    
    onClose();
  };

  /**
   * Ejecuta limpieza manual de estados
   */
  const handleCleanup = (tipo = 'manual') => {
    const resultado = ejecutarLimpieza(tipo);
    setCleanupResult(resultado);
    setTimeout(() => setCleanupResult(null), 3000);
  };

  /**
   * Resetea la configuración
   */
  const handleReset = () => {
    if (window.confirm('¿Está seguro de resetear toda la configuración a valores por defecto?')) {
      resetConfig();
    }
  };

  // Estilos condicionales
  const bgModal = nightMode ? "bg-gray-800" : "bg-white";
  const textModal = nightMode ? "text-white" : "text-gray-900";
  const textSecondary = nightMode ? "text-gray-400" : "text-gray-600";
  const borderModal = nightMode ? "border-gray-600" : "border-gray-300";
  const inputBg = nightMode ? "bg-gray-700" : "bg-gray-100";
  const inputText = nightMode ? "text-white" : "text-gray-900";
  const tabActive = nightMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white";
  const tabInactive = nightMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700";

  // Hosts permitidos
  const allowedHosts = getAllowedHosts();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${bgModal} rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[92vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className={`text-2xl font-bold ${textModal}`}>Configuración del Sistema</h2>
            <p className={`${textSecondary} text-sm`}>Versión {KDS_CONFIG_VERSION}</p>
          </div>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textModal} text-2xl`}
          >
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-600 pb-2">
          {[
            { key: 'general', label: 'General', icon: '⚙️' },
            { key: 'vista', label: 'Vista y alertas', icon: '🎨' },
            { key: 'avanzado', label: 'Avanzado', icon: '🔧' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                activeTab === tab.key ? tabActive : tabInactive
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* ==================== TAB: GENERAL ==================== */}
          {activeTab === 'general' && (
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
                  
                  {allowedHosts.length > 0 && (
                    <div className={`${textSecondary} text-xs mt-2`}>
                      <span className="font-semibold">Hosts permitidos:</span>{' '}
                      {allowedHosts.join(', ')}
                    </div>
                  )}
                  
                  <div className={`mt-3 p-2 rounded ${inputBg} ${textSecondary} text-xs`}>
                    <span className="font-semibold">URL actual:</span>{' '}
                    {getApiUrl() || 'No configurada'}
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className={`border-t ${borderModal}`}></div>

              {/* Opciones Generales */}
              <div>
                <h3 className={`text-xl font-bold ${textModal} mb-4`}>Opciones Generales</h3>
                
                {/* Sonido */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.soundEnabled}
                      onChange={(e) => updateConfig({ soundEnabled: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className={`${textModal} font-semibold`}>
                      Activar sonido de notificación
                    </span>
                  </label>
                  <p className={`${textSecondary} text-sm mt-1 ml-8`}>
                    Reproduce un sonido cuando llegue una nueva comanda.
                    El timbre y el volumen se eligen en la pestaña Vista y alertas.
                  </p>
                </div>

                {/* Repetir sonido */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.repetirSonido}
                      onChange={(e) => updateConfig({ repetirSonido: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className={`${textModal} font-semibold`}>
                      Repetir sonido si no se atiende
                    </span>
                  </label>
                </div>

                {/* Modo Nocturno */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.nightMode}
                      onChange={(e) => updateConfig({ nightMode: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className={`${textModal} font-semibold`}>
                      Activar modo nocturno
                    </span>
                  </label>
                  <p className={`${textSecondary} text-sm mt-1 ml-8`}>
                    {config.nightMode 
                      ? "Interfaz con fondo oscuro (recomendado para cocinas)" 
                      : "Interfaz con fondo claro"}
                  </p>
                </div>

                {/* Auto Print */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoPrint}
                      onChange={(e) => updateConfig({ autoPrint: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className={`${textModal} font-semibold`}>
                      Impresión automática de tickets
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: VISTA + ALERTAS ==================== */}
          {activeTab === 'vista' && (
            <ConfigVistaAlertasTab nightMode={nightMode} />
          )}

          {/* ==================== TAB: AVANZADO ==================== */}
          {activeTab === 'avanzado' && (
            <div>
              <h3 className={`text-xl font-bold ${textModal} mb-4 flex items-center gap-2`}>
                <FaCog className="text-gray-400" />
                Opciones Avanzadas
              </h3>

              <div className="space-y-6">
                {/* Información del Sistema */}
                <div className={`p-4 rounded-lg ${nightMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <h4 className={`${textModal} font-semibold mb-3`}>Información del Sistema</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={textSecondary}>Versión:</div>
                    <div className={textModal}>{KDS_CONFIG_VERSION}</div>
                    
                    <div className={textSecondary}>Última modificación:</div>
                    <div className={textModal}>
                      {config.ultimaModificacion 
                        ? moment(config.ultimaModificacion).format('DD/MM/YYYY HH:mm')
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Limpieza de Estados */}
                <div>
                  <h4 className={`${textModal} font-semibold mb-3`}>Limpieza de Estados Locales</h4>
                  <p className={`${textSecondary} text-sm mb-3`}>
                    Los estados locales de platos pueden acumularse con el tiempo. 
                    Se recomienda limpiarlos periódicamente o cuando la app funcione lentamente.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleCleanup('manual')}
                      className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white font-semibold flex items-center gap-2`}
                    >
                      <FaTrash />
                      Limpiar Estados de Platos
                    </button>
                  </div>
                  
                  {cleanupResult && (
                    <div className={`mt-3 p-3 rounded-lg ${nightMode ? 'bg-green-900 bg-opacity-30' : 'bg-green-100'} border border-green-500`}>
                      <p className="text-green-400 text-sm">
                        ✓ Limpieza completada: {cleanupResult.limpiado.length} elementos eliminados
                      </p>
                    </div>
                  )}
                </div>

                {/* Reset de Configuración */}
                <div className={`p-4 rounded-lg border border-red-500`}>
                  <h4 className="text-red-400 font-semibold mb-2">Zona de Peligro</h4>
                  <p className={`${textSecondary} text-sm mb-3`}>
                    Resetear la configuración eliminará todas las preferencias guardadas.
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2"
                  >
                    <FaUndo />
                    Resetear a Valores por Defecto
                  </button>
                </div>

                {/* Debug Info */}
                <details className={`${textSecondary}`}>
                  <summary className="cursor-pointer font-semibold mb-2">
                    Información de Debug
                  </summary>
                  <pre className={`p-4 rounded-lg overflow-auto text-xs ${inputBg}`}>
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
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
