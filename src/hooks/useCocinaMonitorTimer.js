/**
 * useCocinaMonitorTimer - Hook de cronómetro para platos del monitor Ver Cocina
 *
 * Recalcula los segundos transcurridos por plato cada segundo.
 * Devuelve también el nivel de alerta (normal/amarillo/rojo) según los minutos
 * configurados en la Vista de Cocina o defaults.
 *
 * @module useCocinaMonitorTimer
 */

import { useState, useEffect } from 'react';

const DEFAULT_TIEMPO_AMARILLO = 5; // minutos
const DEFAULT_TIEMPO_ROJO = 20; // minutos

/**
 * Calcula segundos transcurridos desde tiempoInicio hasta ahora.
 * @param {string|number|null} tiempoInicio - ISO o timestamp
 * @returns {number} segundos transcurridos
 */
export function calcularSegundos(tiempoInicio) {
  if (!tiempoInicio) return 0;
  const inicio = new Date(tiempoInicio).getTime();
  if (isNaN(inicio)) return 0;
  const ahora = Date.now();
  return Math.max(0, Math.floor((ahora - inicio) / 1000));
}

/**
 * Formatea segundos en mm:ss.
 * @param {number} segundos
 * @returns {string}
 */
export function formatearCronometro(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Determina el nivel de alerta para un tiempo (segundos) y umbrales (minutos).
 * @param {number} segundos
 * @param {number} amarilloMin
 * @param {number} rojoMin
 * @returns {'normal'|'amarillo'|'rojo'}
 */
export function nivelAlerta(segundos, amarilloMin = DEFAULT_TIEMPO_AMARILLO, rojoMin = DEFAULT_TIEMPO_ROJO) {
  const minutos = segundos / 60;
  if (minutos >= rojoMin) return 'rojo';
  if (minutos >= amarilloMin) return 'amarillo';
  return 'normal';
}

/**
 * Hook que mantiene un "tick" cada segundo para forzar recálculo de cronómetros.
 * @returns {number} contador que incrementa cada segundo
 */
const useCocinaMonitorTimer = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return tick;
};

export default useCocinaMonitorTimer;