/**
 * Nombre del mozo en el header de tarjetas KDS (Vista y alerta)
 * y en tablas de tickets / pagos adelantados.
 */

import { ORDEN_COLA_FUENTES, hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const MOZO_NOMBRE_DEFAULT = {
  mozoNombreFuente: 'arial',
  mozoNombreTamano: 12,
  mozoNombreColor: '#ffffff',
  mozoNombreFondo: '#1e3a8a',
};

export const MOZO_NOMBRE_TAMANO_MIN = 8;
export const MOZO_NOMBRE_TAMANO_MAX = 24;

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** Color de perfil del mozo poblado en un ticket. */
export function colorPerfilDeTicket(ticket) {
  const m = ticket?.mozo;
  if (m && typeof m === 'object' && m.colorPerfil) return m.colorPerfil;
  return ticket?.colorPerfilMozo || null;
}

/** Color de perfil del mozo poblado en una comanda KDS. */
export function colorPerfilDeComanda(comanda) {
  const m = comanda?.mozos;
  if (m && typeof m === 'object' && m.colorPerfil) return m.colorPerfil;
  return comanda?.colorPerfilMozo || null;
}

/**
 * Fondo del recuadro detrás del nombre:
 * - forzarColorMozoUnico → colorMozoForzado
 * - si no → colorPerfil del usuario (solo si eligió uno)
 * - si no hay y hay vista KDS → fondo de vista (como antes)
 * - si no hay vista → null (tickets: sin recuadro)
 */
export function resolverFondoNombreMozo({
  colorPerfil,
  configCocina = {},
  configVista = {},
} = {}) {
  if (configCocina.forzarColorMozoUnico === true) {
    return hexValidoOrdenCola(configCocina.colorMozoForzado)
      ? configCocina.colorMozoForzado
      : MOZO_NOMBRE_DEFAULT.mozoNombreFondo;
  }
  if (hexValidoOrdenCola(colorPerfil)) return colorPerfil;
  if (hexValidoOrdenCola(configVista.mozoNombreFondo)) return configVista.mozoNombreFondo;
  return null;
}

export function estiloMozoNombreKds(config = {}, opts = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.mozoNombreFuente)
    || ORDEN_COLA_FUENTES.find((f) => f.id === MOZO_NOMBRE_DEFAULT.mozoNombreFuente)
    || ORDEN_COLA_FUENTES[0];
  const tam = clampInt(
    config.mozoNombreTamano,
    MOZO_NOMBRE_TAMANO_MIN,
    MOZO_NOMBRE_TAMANO_MAX,
    MOZO_NOMBRE_DEFAULT.mozoNombreTamano
  );
  const color = hexValidoOrdenCola(config.mozoNombreColor)
    ? config.mozoNombreColor
    : MOZO_NOMBRE_DEFAULT.mozoNombreColor;
  const fondo = hexValidoOrdenCola(opts.fondoOverride)
    ? opts.fondoOverride
    : (hexValidoOrdenCola(config.mozoNombreFondo)
      ? config.mozoNombreFondo
      : MOZO_NOMBRE_DEFAULT.mozoNombreFondo);
  const padX = Math.max(6, Math.round(tam * 0.4));
  const padY = Math.max(2, Math.round(tam * 0.15));
  return {
    color,
    backgroundColor: fondo,
    fontSize: `${tam}px`,
    fontFamily: fuente.css,
    fontWeight: 600,
    lineHeight: 1.2,
    display: 'inline-flex',
    alignItems: 'center',
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    paddingTop: `${padY}px`,
    paddingBottom: `${padY}px`,
    borderRadius: '6px',
    boxSizing: 'border-box',
  };
}
