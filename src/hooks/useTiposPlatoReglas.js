import { useEffect, useState } from 'react';
import { apiGet } from '../config/apiClient';
import { parseReglasTiposMenu } from '../utils/tipoPlatoReglasCocina';

const VACIO = { soloContador: new Set(), contadorGuarnicion: new Set(), particion: new Set(), particionGuarnicion: new Set(), particionNombres: [], particionGuarnicionNombres: [] };

/**
 * Carga reglas de tipos de plato para Ver cocina completo.
 */
export default function useTiposPlatoReglas() {
  const [reglas, setReglas] = useState(VACIO);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/tipos-plato/menu')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.data || data?.tipos || []);
        setReglas(parseReglasTiposMenu(list));
      })
      .catch(() => {
        if (!cancelled) setReglas(VACIO);
      });
    return () => { cancelled = true; };
  }, []);

  return reglas;
}
