/** Sin hora: MM:SS. Con hora contada: H:MM:SS. */
export function textoCronometroComanda(totalSegundos) {
  const s = Math.max(0, Math.floor(Number(totalSegundos) || 0));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const segundos = s % 60;
  const mm = String(minutos).padStart(2, '0');
  const ss = String(segundos).padStart(2, '0');
  if (horas > 0) return `${horas}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export const TEXTO_CRONOMETRO_CERO = '00:00';
