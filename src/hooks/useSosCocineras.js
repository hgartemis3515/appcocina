import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../config/apiClient';

const EVENT = 'sos-cocineras';

/**
 * Flag global SOS Cocineras (Ver Cocina en cantidades).
 * GET al montar + CustomEvent desde useSocketCocina (mismo socket /cocina).
 */
export default function useSosCocineras({ canToggle = false, enabled = true } = {}) {
  const [activo, setActivo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    apiGet('/api/cocina/sos')
      .then((data) => {
        if (!cancelled && typeof data?.cocineras === 'boolean') {
          setActivo(data.cocineras);
        }
      })
      .catch(() => {
        /* El snapshot de socket cubre TVs si el GET falla */
      });
    return () => { cancelled = true; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onEvt = (e) => {
      if (typeof e.detail?.activo === 'boolean') setActivo(e.detail.activo);
    };
    window.addEventListener(EVENT, onEvt);
    return () => window.removeEventListener(EVENT, onEvt);
  }, [enabled]);

  const aplicarCocineras = async (next) => {
    if (!canToggle) return false;
    setSaving(true);
    setError(null);
    try {
      const data = await apiPut('/api/cocina/sos', { cocineras: !!next });
      const val = !!data?.cocineras;
      setActivo(val);
      return true;
    } catch (err) {
      setError(err.userMessage || 'No se pudo cambiar SOS Cocineras');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { activo, saving, error, aplicarCocineras, setError };
}
