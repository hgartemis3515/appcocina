import { hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const RESERVA_TEXTO_DEFAULT = {
  colorReservaTexto: '#ffffff',
  colorReservaHorario: '#ffffff',
  colorReservaCuadro: '#000000',
  colorReservaCronometro: '#111827',
  colorReservaCronometroFondo: '#fb923c',
  ocultarCohetePrioridadKds: false,
};

function hexO(value, fallback) {
  return hexValidoOrdenCola(value) ? value : fallback;
}

function chipBase() {
  return {
    fontFamily: 'Arial, sans-serif',
    fontWeight: 900,
    lineHeight: 1.15,
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '6px',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    padding: '2px 6px',
  };
}

/** Cuadro detrás de RESERVA + horarios (fondo configurable, negro por defecto). */
export function estiloCuadroReservaKds(config = {}) {
  return {
    ...chipBase(),
    gap: '6px',
    backgroundColor: hexO(config.colorReservaCuadro, RESERVA_TEXTO_DEFAULT.colorReservaCuadro),
  };
}

export function estiloLetraReservaKds(config = {}) {
  return {
    color: hexO(config.colorReservaTexto, RESERVA_TEXTO_DEFAULT.colorReservaTexto),
    fontSize: '1.05rem',
    fontWeight: 900,
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    lineHeight: 1,
  };
}

export function estiloLetraHorarioReservaKds(config = {}) {
  return {
    color: hexO(config.colorReservaHorario, RESERVA_TEXTO_DEFAULT.colorReservaHorario),
    fontSize: '1.05rem',
    fontWeight: 900,
    lineHeight: 1,
  };
}

export function estiloCronometroReservaKds(config = {}) {
  return {
    ...chipBase(),
    fontWeight: 700,
    fontSize: '0.85rem',
    color: hexO(config.colorReservaCronometro, RESERVA_TEXTO_DEFAULT.colorReservaCronometro),
    backgroundColor: hexO(
      config.colorReservaCronometroFondo,
      RESERVA_TEXTO_DEFAULT.colorReservaCronometroFondo
    ),
  };
}

export function ocultarCohetePrioridadKds(config = {}) {
  return config.ocultarCohetePrioridadKds === true;
}
