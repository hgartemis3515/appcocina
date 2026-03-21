import React, { useState, useEffect } from "react";
import { 
  FaTimes, 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaPalette,
  FaClock,
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
  TIEMPOS_ALERTA,
  DISENO_GRID,
  MODO_VISTA,
  TAMANO_TARJETA,
  ORDENAMIENTO,
  ejecutarLimpieza,
  KDS_CONFIG_VERSION
} from "../../config/kdsConfigConstants";

/**
 * ConfigModal - Modal de configuración del sistema KDS v7.2
 * 
 * Características:
 * - Sistema de tabs para organizar opciones
 * - Gestión de limpieza de estados locales
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
      <div className={`${bgModal} rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
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
            { key: 'vista', label: 'Vista', icon: '🎨' },
            { key: 'alertas', label: 'Alertas', icon: '⏰' },
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
                    Reproduce un sonido cuando llegue una nueva comanda
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

          {/* ==================== TAB: VISTA ==================== */}
          {activeTab === 'vista' && (
            <div>
              <h3 className={`text-xl font-bold ${textModal} mb-4 flex items-center gap-2`}>
                <FaPalette className="text-purple-500" />
                Diseño de Comandas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tamaño de Fuente */}
                <div>
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    Tamaño de Fuente
                  </label>
                  <select
                    value={config.tamanoFuente}
                    onChange={(e) => updateConfig({ tamanoFuente: parseInt(e.target.value) })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  >
                    {Array.from(
                      { length: DISENO_GRID.FUENTE_MAX - DISENO_GRID.FUENTE_MIN + 1 },
                      (_, i) => DISENO_GRID.FUENTE_MIN + i
                    ).map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>

                {/* Tamaño de Tarjeta */}
                <div>
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    Tamaño de Tarjeta
                  </label>
                  <select
                    value={config.tamanoTarjeta}
                    onChange={(e) => updateConfig({ tamanoTarjeta: e.target.value })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  >
                    <option value={TAMANO_TARJETA.COMPACTO}>Compacto</option>
                    <option value={TAMANO_TARJETA.MEDIANO}>Mediano</option>
                    <option value={TAMANO_TARJETA.EXPANDIDO}>Expandido</option>
                  </select>
                </div>

                {/* Columnas */}
                <div>
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    Columnas del Grid
                  </label>
                  <input
                    type="number"
                    min={DISENO_GRID.COLUMNAS_MIN}
                    max={DISENO_GRID.COLUMNAS_MAX}
                    value={config.columnasGrid}
                    onChange={(e) => updateConfig({ 
                      columnasGrid: Math.max(DISENO_GRID.COLUMNAS_MIN, Math.min(DISENO_GRID.COLUMNAS_MAX, parseInt(e.target.value) || DISENO_GRID.COLUMNAS_DEFAULT))
                    })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  />
                </div>

                {/* Filas */}
                <div>
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    Filas del Grid
                  </label>
                  <input
                    type="number"
                    min={DISENO_GRID.FILAS_MIN}
                    max={DISENO_GRID.FILAS_MAX}
                    value={config.filasGrid}
                    onChange={(e) => updateConfig({ 
                      filasGrid: Math.max(DISENO_GRID.FILAS_MIN, Math.min(DISENO_GRID.FILAS_MAX, parseInt(e.target.value) || DISENO_GRID.FILAS_DEFAULT))
                    })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  />
                </div>

                {/* Ordenamiento */}
                <div>
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    Ordenamiento por Defecto
                  </label>
                  <select
                    value={config.ordenamientoDefault}
                    onChange={(e) => updateConfig({ ordenamientoDefault: e.target.value })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  >
                    <option value={ORDENAMIENTO.TIEMPO}>Por tiempo (más antiguo)</option>
                    <option value={ORDENAMIENTO.PRIORIDAD}>Por prioridad</option>
                    <option value={ORDENAMIENTO.MESA}>Por mesa</option>
                    <option value={ORDENAMIENTO.CREACION}>Por creación</option>
                  </select>
                </div>

                {/* Modo de Vista */}
                <div>
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    Modo de Vista
                  </label>
                  <select
                    value={config.modoVista}
                    onChange={(e) => updateConfig({ modoVista: e.target.value })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  >
                    <option value={MODO_VISTA.TARJETAS}>Tarjetas (Kanban)</option>
                    <option value={MODO_VISTA.TABLA}>Tabla compacta</option>
                  </select>
                </div>
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
                    gridTemplateColumns: `repeat(${config.columnasGrid}, 1fr)`,
                    gridTemplateRows: `repeat(${config.filasGrid}, auto)`,
                    gap: '1rem',
                    minHeight: '150px'
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
                    <div className="text-red-500 font-black text-xl mb-1" style={{ fontSize: `${config.tamanoFuente}px` }}>
                      ORDEN #1
                    </div>
                    <div className="text-white font-bold mb-2">
                      MESA #2
                    </div>
                    <div className="flex-1 mt-2">
                      <div className="text-white font-black" style={{ fontSize: `${config.tamanoFuente}px` }}>
                        3 Paella Huancaina
                      </div>
                    </div>
                  </div>
                  
                  {/* Slots vacíos */}
                  {Array.from({ length: (config.columnasGrid * config.filasGrid) - 1 }).map((_, idx) => (
                    <div key={idx} className="bg-gray-900 border-2 border-gray-800 rounded-lg min-h-[80px]" />
                  ))}
                </div>
                <p className={`${textSecondary} text-sm mt-2`}>
                  {config.columnasGrid} columnas x {config.filasGrid} filas = {config.columnasGrid * config.filasGrid} slots
                </p>
              </div>
            </div>
          )}

          {/* ==================== TAB: ALERTAS ==================== */}
          {activeTab === 'alertas' && (
            <div>
              <h3 className={`text-xl font-bold ${textModal} mb-4 flex items-center gap-2`}>
                <FaClock className="text-yellow-500" />
                Tiempos y Alertas
              </h3>

              <div className="space-y-6">
                {/* Alerta Amarilla */}
                <div className="p-4 rounded-lg bg-yellow-500 bg-opacity-10 border border-yellow-500">
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    ⚠️ Alerta Amarilla (Precaución)
                  </label>
                  <input
                    type="number"
                    min={TIEMPOS_ALERTA.AMARILLA_MIN}
                    max={TIEMPOS_ALERTA.AMARILLA_MAX}
                    value={config.alertYellowMinutes}
                    onChange={(e) => updateConfig({ 
                      alertYellowMinutes: Math.max(TIEMPOS_ALERTA.AMARILLA_MIN, Math.min(TIEMPOS_ALERTA.AMARILLA_MAX, parseInt(e.target.value) || TIEMPOS_ALERTA.AMARILLA_DEFAULT))
                    })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  />
                  <p className={`${textSecondary} text-sm mt-1`}>
                    Los pedidos que superen este tiempo mostrarán fondo amarillo ({TIEMPOS_ALERTA.AMARILLA_MIN}-{TIEMPOS_ALERTA.AMARILLA_MAX} min)
                  </p>
                </div>

                {/* Alerta Roja */}
                <div className="p-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500">
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    🚨 Alerta Roja (Urgente)
                  </label>
                  <input
                    type="number"
                    min={TIEMPOS_ALERTA.ROJA_MIN}
                    max={TIEMPOS_ALERTA.ROJA_MAX}
                    value={config.alertRedMinutes}
                    onChange={(e) => updateConfig({ 
                      alertRedMinutes: Math.max(TIEMPOS_ALERTA.ROJA_MIN, Math.min(TIEMPOS_ALERTA.ROJA_MAX, parseInt(e.target.value) || TIEMPOS_ALERTA.ROJA_DEFAULT))
                    })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  />
                  <p className={`${textSecondary} text-sm mt-1`}>
                    Los pedidos que superen este tiempo mostrarán fondo rojo urgente ({TIEMPOS_ALERTA.ROJA_MIN}-{TIEMPOS_ALERTA.ROJA_MAX} min)
                  </p>
                </div>

                {/* Alerta Crítica */}
                <div className="p-4 rounded-lg bg-purple-500 bg-opacity-10 border border-purple-500">
                  <label className={`block ${textModal} font-semibold mb-2`}>
                    🔔 Alerta Crítica (Sonido adicional)
                  </label>
                  <input
                    type="number"
                    min={TIEMPOS_ALERTA.CRITICA_MIN}
                    max={TIEMPOS_ALERTA.CRITICA_MAX}
                    value={config.alertCriticalMinutes}
                    onChange={(e) => updateConfig({ 
                      alertCriticalMinutes: Math.max(TIEMPOS_ALERTA.CRITICA_MIN, Math.min(TIEMPOS_ALERTA.CRITICA_MAX, parseInt(e.target.value) || TIEMPOS_ALERTA.CRITICA_DEFAULT))
                    })}
                    className={`w-full ${inputBg} ${inputText} p-2 rounded border ${borderModal}`}
                  />
                  <p className={`${textSecondary} text-sm mt-1`}>
                    Reproduce sonido adicional cuando un pedido supera este tiempo
                  </p>
                </div>

                {/* Validación visual */}
                {config.alertRedMinutes <= config.alertYellowMinutes && (
                  <div className="p-3 rounded-lg bg-red-500 bg-opacity-20 border border-red-500">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <FaExclamationTriangle />
                      La alerta roja debe ser mayor que la alerta amarilla
                    </p>
                  </div>
                )}
              </div>
            </div>
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
