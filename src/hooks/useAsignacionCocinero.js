/**
 * useAsignacionCocinero - Hook para asignación de cocineros a platos
 * 
 * Solo usado en ComandaStyleSupervi.
 * Permite asignar, cambiar y quitar cocineros de platos o comandas.
 * 
 * @module useAsignacionCocinero
 */

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { getServerBaseUrl } from '../config/apiConfig';

/**
 * Hook para gestión de asignación de cocineros a platos/comandas
 * Solo usado en ComandaStyleSupervi
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.getToken - Función para obtener token JWT
 * @param {Function} options.showToast - Función para mostrar notificaciones
 * @param {Function} options.onAsignacionActualizada - Callback cuando se actualiza asignación
 * @returns {Object} Estado y funciones de asignación
 */
const useAsignacionCocinero = ({ getToken, showToast, onAsignacionActualizada }) => {
  const [cocineros, setCocineros] = useState([]);
  const [loadingCocineros, setLoadingCocineros] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [comandaSeleccionada, setComandaSeleccionada] = useState(null);
  
  // Ref para evitar cargas duplicadas
  const cargandoRef = useRef(false);

  /**
   * Carga la lista de cocineros disponibles desde el backend
   * Endpoint: GET /api/cocineros (requiere auth admin)
   */
  const cargarCocineros = useCallback(async () => {
    // Evitar carga duplicada
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    
    setLoadingCocineros(true);
    try {
      const baseUrl = getServerBaseUrl();
      const apiUrl = `${baseUrl}/api/cocineros`;
      const token = getToken?.();
      
      const response = await axios.get(apiUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 5000
      });

      // Esperamos un array de cocineros con: _id, nombre, alias, activo
      const cocinerosActivos = (response.data?.data || response.data || [])
        .filter(c => c.activo !== false);
      
      setCocineros(cocinerosActivos);
      console.log(`[useAsignacionCocinero] ${cocinerosActivos.length} cocineros cargados`);
    } catch (error) {
      console.error('[useAsignacionCocinero] Error cargando cocineros:', error.message);
      // Solo mostrar toast si no es un error de cancelación
      if (error.code !== 'ERR_CANCELED') {
        showToast?.({
          type: 'error',
          text: 'No se pudo cargar la lista de cocineros'
        });
      }
      setCocineros([]);
    } finally {
      setLoadingCocineros(false);
      cargandoRef.current = false;
    }
  }, [getToken, showToast]);

  /**
   * Abre el modal para asignar cocinero a un plato
   * 
   * @param {Object} plato - Plato a asignar
   * @param {Object} comanda - Comanda que contiene el plato
   */
  const abrirModalAsignacionPlato = useCallback((plato, comanda) => {
    setPlatoSeleccionado(plato);
    setComandaSeleccionada(comanda);
    setModalAbierto(true);
    
    // Cargar cocineros si no están cargados
    if (cocineros.length === 0) {
      cargarCocineros();
    }
  }, [cocineros.length, cargarCocineros]);

  /**
   * Abre el modal para asignar cocinero a toda una comanda
   * 
   * @param {Object} comanda - Comanda a asignar
   */
  const abrirModalAsignacionComanda = useCallback((comanda) => {
    setPlatoSeleccionado(null); // null indica asignación a toda la comanda
    setComandaSeleccionada(comanda);
    setModalAbierto(true);
    
    if (cocineros.length === 0) {
      cargarCocineros();
    }
  }, [cocineros.length, cargarCocineros]);

  /**
   * Cierra el modal de asignación
   */
  const cerrarModal = useCallback(() => {
    setModalAbierto(false);
    setPlatoSeleccionado(null);
    setComandaSeleccionada(null);
  }, []);

  /**
   * Asigna un cocinero al plato o comanda seleccionada
   * 
   * @param {string|null} cocineroId - ID del cocinero o null para quitar asignación
   */
  const asignarCocinero = useCallback(async (cocineroId) => {
    if (!comandaSeleccionada) return;

    setAsignando(true);
    try {
      const baseUrl = getServerBaseUrl();
      const apiUrl = `${baseUrl}/api/comanda/${comandaSeleccionada._id}/asignar`;
      const token = getToken?.();
      const cocinero = cocineroId ? cocineros.find(c => c._id === cocineroId) : null;

      const payload = platoSeleccionado
        ? { platoId: platoSeleccionado._id || platoSeleccionado.platoId, cocineroId }
        : { cocineroId }; // Sin platoId = asignar a toda la comanda

      await axios.put(apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      // Notificar éxito
      const mensaje = cocineroId
        ? platoSeleccionado
          ? `${cocinero?.nombre || cocinero?.alias || 'Cocinero'} asignado a ${platoSeleccionado.plato?.nombre || platoSeleccionado.nombre}`
          : `${cocinero?.nombre || cocinero?.alias || 'Cocinero'} asignado a Comanda #${comandaSeleccionada.comandaNumber}`
        : 'Asignación removida';

      showToast?.({
        type: 'success',
        text: mensaje
      });

      // Callback para actualizar estado local en el componente padre
      onAsignacionActualizada?.({
        comandaId: comandaSeleccionada._id,
        platoId: platoSeleccionado?._id || platoSeleccionado?.platoId,
        cocineroId,
        cocinero: cocinero ? { _id: cocinero._id, nombre: cocinero.nombre, alias: cocinero.alias } : null
      });

      cerrarModal();
    } catch (error) {
      console.error('[useAsignacionCocinero] Error asignando cocinero:', error);
      showToast?.({
        type: 'error',
        text: 'No se pudo asignar el cocinero'
      });
    } finally {
      setAsignando(false);
    }
  }, [comandaSeleccionada, platoSeleccionado, cocineros, getToken, showToast, onAsignacionActualizada, cerrarModal]);

  return {
    // Estado
    cocineros,
    loadingCocineros,
    asignando,
    modalAbierto,
    platoSeleccionado,
    comandaSeleccionada,
    
    // Acciones
    cargarCocineros,
    abrirModalAsignacionPlato,
    abrirModalAsignacionComanda,
    cerrarModal,
    asignarCocinero
  };
};

export default useAsignacionCocinero;
