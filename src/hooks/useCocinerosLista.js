/**
 * useCocinerosLista - Carga la lista de cocineros activos para el selector
 * de "Ver Cocina Completo".
 *
 * Endpoint: GET /api/cocina/cocineros (permiso ver-cocina-completo).
 * Respuesta: [{ _id, name, alias }]
 *
 * @module useCocinerosLista
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getServerBaseUrl } from '../config/apiConfig';

const useCocinerosLista = ({ getToken } = {}) => {
  const [cocineros, setCocineros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cargandoRef = useRef(false);

  const recargar = useCallback(async () => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setLoading(true);
    try {
      const baseUrl = getServerBaseUrl();
      const token = getToken?.();
      const res = await axios.get(`${baseUrl}/api/cocina/cocineros`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 5000,
      });
      const data = (res.data?.data || []).map(c => ({
        _id: c._id,
        name: c.name,
        alias: c.alias || c.name,
        fotoUrl: c.fotoUrl || '',
      }));
      data.sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name));
      setCocineros(data);
      setError(null);
    } catch (err) {
      console.warn('[useCocinerosLista] Error cargando cocineros:', err.message);
      setError(err.message || 'Error al obtener cocineros');
      setCocineros([]);
    } finally {
      setLoading(false);
      cargandoRef.current = false;
    }
  }, [getToken]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { cocineros, loading, error, recargar };
};

export default useCocinerosLista;