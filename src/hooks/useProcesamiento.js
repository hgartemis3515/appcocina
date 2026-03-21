/**
 * useProcesamiento - Hook para manejar el flujo de "Tomar/Liberar/Finalizar" platos y comandas
 * 
 * TEMA 5: Hook que centraliza las llamadas al backend para el sistema de procesamiento
 * con identificación de cocinero, incluyendo toasts y notificaciones.
 * 
 * @module useProcesamiento
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl, getServerBaseUrl } from '../config/apiConfig';

/**
 * Hook para manejar el flujo de procesamiento de platos y comandas
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.getToken - Función para obtener el token JWT
 * @param {Function} options.showToast - Función para mostrar notificaciones
 * @param {Function} options.onProcesamientoChange - Callback cuando cambia el estado de procesamiento
 * @returns {Object} Estado y funciones para el procesamiento
 */
const useProcesamiento = ({
  getToken,
  showToast = () => {},
  onProcesamientoChange = () => {}
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Tomar un plato para preparación
   */
  const tomarPlato = useCallback(async (comandaId, platoId, cocineroId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await axios.put(
        `${getServerBaseUrl()}/api/comanda/${comandaId}/plato/${platoId}/procesando`,
        { cocineroId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      showToast({
        type: 'success',
        message: '👨‍🍳 Plato tomado para preparación',
        duration: 3000
      });
      
      onProcesamientoChange({
        type: 'PLATO_TOMADO',
        comandaId,
        platoId,
        procesandoPor: response.data?.data?.procesandoPor
      });
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al tomar el plato';
      
      // Error de conflicto (ya tomado por otro)
      if (err.response?.status === 409) {
        showToast({
          type: 'warning',
          message: `⚠️ ${errorMsg}`,
          duration: 4000
        });
        
        onProcesamientoChange({
          type: 'PLATO_OCUPADO',
          comandaId,
          platoId,
          procesandoPor: err.response?.data?.procesandoPor
        });
      } else {
        showToast({
          type: 'error',
          message: `❌ ${errorMsg}`,
          duration: 4000
        });
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast, onProcesamientoChange]);

  /**
   * Liberar un plato que se había tomado
   */
  const liberarPlato = useCallback(async (comandaId, platoId, cocineroId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await axios.delete(
        `${getServerBaseUrl()}/api/comanda/${comandaId}/plato/${platoId}/procesando`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { cocineroId }
        }
      );
      
      showToast({
        type: 'info',
        message: 'Plato liberado',
        duration: 3000
      });
      
      onProcesamientoChange({
        type: 'PLATO_LIBERADO',
        comandaId,
        platoId
      });
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al liberar el plato';
      showToast({
        type: 'error',
        message: `❌ ${errorMsg}`,
        duration: 4000
      });
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast, onProcesamientoChange]);

  /**
   * Finalizar un plato (marcar como recoger)
   */
  const finalizarPlato = useCallback(async (comandaId, platoId, cocineroId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await axios.put(
        `${getServerBaseUrl()}/api/comanda/${comandaId}/plato/${platoId}/finalizar`,
        { cocineroId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      showToast({
        type: 'success',
        message: '✅ Plato finalizado',
        duration: 3000
      });
      
      onProcesamientoChange({
        type: 'PLATO_FINALIZADO',
        comandaId,
        platoId,
        procesadoPor: response.data?.data?.procesadoPor,
        comandaLista: response.data?.data?.comandaLista
      });
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al finalizar el plato';
      showToast({
        type: 'error',
        message: `❌ ${errorMsg}`,
        duration: 4000
      });
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast, onProcesamientoChange]);

  /**
   * Tomar una comanda completa
   */
  const tomarComanda = useCallback(async (comandaId, cocineroId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await axios.put(
        `${getServerBaseUrl()}/api/comanda/${comandaId}/procesando`,
        { cocineroId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      showToast({
        type: 'success',
        message: '👨‍🍳 Comanda tomada para preparación',
        duration: 3000
      });
      
      onProcesamientoChange({
        type: 'COMANDA_TOMADA',
        comandaId,
        procesandoPor: response.data?.data?.procesandoPor
      });
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al tomar la comanda';
      
      if (err.response?.status === 409) {
        showToast({
          type: 'warning',
          message: `⚠️ ${errorMsg}`,
          duration: 4000
        });
      } else {
        showToast({
          type: 'error',
          message: `❌ ${errorMsg}`,
          duration: 4000
        });
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast, onProcesamientoChange]);

  /**
   * Liberar una comanda
   */
  const liberarComanda = useCallback(async (comandaId, cocineroId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      await axios.delete(
        `${getServerBaseUrl()}/api/comanda/${comandaId}/procesando`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { cocineroId }
        }
      );
      
      showToast({
        type: 'info',
        message: 'Comanda liberada',
        duration: 3000
      });
      
      onProcesamientoChange({
        type: 'COMANDA_LIBERADA',
        comandaId
      });
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al liberar la comanda';
      showToast({
        type: 'error',
        message: `❌ ${errorMsg}`,
        duration: 4000
      });
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getToken, showToast, onProcesamientoChange]);

  return {
    loading,
    error,
    tomarPlato,
    liberarPlato,
    finalizarPlato,
    tomarComanda,
    liberarComanda
  };
};

export default useProcesamiento;
