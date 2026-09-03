import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiPost } from '../config/apiClient';

const LOCK_KEY = 'cocinaPantallaBloqueada';
const PantallaBloqueoContext = createContext(null);

export function PantallaBloqueoProvider({ children }) {
  const { isAuthenticated, isMonitorMode, user } = useAuth();
  const [bloqueada, setBloqueada] = useState(() => {
    try {
      return sessionStorage.getItem(LOCK_KEY) === '1';
    } catch (_) {
      return false;
    }
  });

  const hasPinCocina = user?.hasPinCocina !== false;

  useEffect(() => {
    if (!isAuthenticated || isMonitorMode) {
      setBloqueada(false);
      try { sessionStorage.removeItem(LOCK_KEY); } catch (_) { /* noop */ }
    }
  }, [isAuthenticated, isMonitorMode]);

  const bloquear = useCallback(() => {
    if (isMonitorMode) return { ok: false, error: 'El monitor TV no usa bloqueo' };
    if (user?.hasPinCocina === false) {
      return { ok: false, error: 'Este usuario no tiene clave de 6 dígitos. Configúrala en Usuarios.' };
    }
    setBloqueada(true);
    try { sessionStorage.setItem(LOCK_KEY, '1'); } catch (_) { /* noop */ }
    return { ok: true };
  }, [user?.hasPinCocina, isMonitorMode]);

  const verificarPin = useCallback(async (pin) => {
    const digits = String(pin || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(digits)) {
      return { ok: false, error: 'La clave debe tener 6 dígitos' };
    }
    try {
      const data = await apiPost('/api/admin/cocina/desbloquear-pantalla', { pin: digits });
      if (data?.success) {
        setBloqueada(false);
        try { sessionStorage.removeItem(LOCK_KEY); } catch (_) { /* noop */ }
        return { ok: true };
      }
      return { ok: false, error: data?.error || 'Clave incorrecta' };
    } catch (err) {
      return { ok: false, error: err.userMessage || err.message || 'Clave incorrecta' };
    }
  }, []);

  const value = useMemo(() => ({
    bloqueada: !!(isAuthenticated && !isMonitorMode && bloqueada),
    hasPinCocina,
    bloquear,
    verificarPin,
  }), [bloqueada, isAuthenticated, isMonitorMode, hasPinCocina, bloquear, verificarPin]);

  return (
    <PantallaBloqueoContext.Provider value={value}>
      {children}
    </PantallaBloqueoContext.Provider>
  );
}

export function usePantallaBloqueo() {
  const ctx = useContext(PantallaBloqueoContext);
  if (!ctx) {
    return {
      bloqueada: false,
      hasPinCocina: false,
      bloquear: () => ({ ok: false, error: 'No disponible' }),
      verificarPin: async () => ({ ok: false, error: 'No disponible' }),
    };
  }
  return ctx;
}
