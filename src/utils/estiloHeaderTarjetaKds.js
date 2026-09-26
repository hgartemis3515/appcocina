/**
 * Cómo se ordenan los 6 datos del encabezado de la tarjeta de comanda KDS:
 * orden (posición en el tablero), número de comanda, mesa, cronómetro, mozo, Prep.
 * Letras: tamaño, color, contorno y fondo del recuadro (Vista y alertas).
 */

import { ORDEN_COLA_FUENTES, hexValidoOrdenCola } from './estiloNumeroOrdenKds';

export const HEADER_TARJETA_ESTILOS = [
  {
    id: 'compacto',
    label: 'Compacto (una fila)',
    desc: 'Los 6 datos en una sola línea. Ahorra el hueco de la barra superior.',
  },
  {
    id: 'dosFilas',
    label: 'Dos filas',
    desc: 'Orden, comanda, mesa y reloj arriba; mozo y Prep abajo, sin columnas altas.',
  },
  {
    id: 'clasico',
    label: 'Clásico (2 columnas)',
    desc: 'Orden y mesa en columnas, mozo y Prep en otra fila. Más alto.',
  },
  {
    id: 'aprovechador',
    label: 'Aprovechador',
    desc: 'Las comandas van en cuadros pegados, sin hueco entre tarjetas. El encabezado sigue en una fila.',
  },
];

export const HEADER_TARJETA_DEFAULT = 'compacto';

export const HEADER_TARJETA_LETRAS_DEFAULT = {
  headerTarjetaOcultarPrep: false,
  headerTarjetaFuente: 'arial',
  headerTarjetaTamano: 14,
  headerTarjetaColor: '#ffffff',
  headerTarjetaContorno: '#4b5563',
  headerTarjetaFondo: '#111827',
};

export const HEADER_TARJETA_TAMANO_MIN = 10;
export const HEADER_TARJETA_TAMANO_MAX = 32;
export const HEADER_NUMERO_TAMANO_MAX = 64;

export const HEADER_DATOS_CONFIG = [
  { id: 'numero', label: 'Número de comanda', ocultar: 'headerOcultarNumeroComanda', tamano: 'headerTamanoNumeroComanda', doble: true },
  { id: 'mesa', label: 'Mesa', ocultar: 'headerOcultarMesa', tamano: 'headerTamanoMesa' },
  { id: 'mozo', label: 'Mozo', ocultar: 'headerOcultarMozo', tamano: 'headerTamanoMozo' },
  { id: 'reloj', label: 'Cronómetro', ocultar: 'headerOcultarCronometro', tamano: 'headerTamanoCronometro' },
];

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function resolverHeaderTarjetaEstilo(config) {
  const id = String(config?.headerTarjetaEstilo || '').trim();
  if (HEADER_TARJETA_ESTILOS.some((e) => e.id === id)) return id;
  return HEADER_TARJETA_DEFAULT;
}

/** Platos con kdsEstiloCompacto fuerzan la fila única aunque el perfil sea clásico. */
export function esEstiloAprovechadorKds(config) {
  return resolverHeaderTarjetaEstilo(config) === 'aprovechador';
}

export function resolverEstiloHeaderTarjetaComanda(config, { forzarCompacto } = {}) {
  if (forzarCompacto) return 'compacto';
  const id = resolverHeaderTarjetaEstilo(config);
  if (id === 'aprovechador') return 'compacto';
  return id;
}

export function paddingHeaderTarjetaKds(estilo) {
  return estilo === 'clasico' ? 'p-3' : 'px-2 py-1.5';
}

export function ocultarPrepHeaderTarjeta(config) {
  return config?.headerTarjetaOcultarPrep === true;
}

/**
 * Fondo de la barra superior (número, mesa, mozo, cronómetro).
 * Solo el color de perfil del mozo, o el color forzado de cocina.
 * null = seguir gris / amarillo / rojo del cronómetro.
 */
export function colorBarraSuperiorMozo({ config, configCocina, colorPerfil } = {}) {
  if (config?.headerBarraFondoColorMozo !== true) return null;
  if (configCocina?.forzarColorMozoUnico === true) {
    return hexValidoOrdenCola(configCocina.colorMozoForzado)
      ? configCocina.colorMozoForzado
      : null;
  }
  return hexValidoOrdenCola(colorPerfil) ? colorPerfil : null;
}

export function tamanoLetraHeaderTarjetaKds(config = {}) {
  return clampInt(
    config.headerTarjetaTamano,
    HEADER_TARJETA_TAMANO_MIN,
    HEADER_TARJETA_TAMANO_MAX,
    HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaTamano
  );
}

export function ocultarDatoHeaderTarjeta(config, clave) {
  return config?.[clave] === true;
}

/** Tamaño propio del dato. Sin valor, usa el tamaño general (el número de comanda, el doble). */
export function tamanoDatoHeaderTarjeta(config = {}, clave, { doble = false } = {}) {
  const base = tamanoLetraHeaderTarjetaKds(config);
  const fallback = doble ? Math.min(HEADER_NUMERO_TAMANO_MAX, Math.round(base * 2)) : base;
  const max = doble ? HEADER_NUMERO_TAMANO_MAX : HEADER_TARJETA_TAMANO_MAX;
  const n = Number(config?.[clave]);
  if (!Number.isFinite(n) || n < HEADER_TARJETA_TAMANO_MIN) return fallback;
  return Math.min(max, Math.round(n));
}

export function colorRelojHeaderTarjeta(minutosActuales, alertYellowMinutes, alertRedMinutes, config = {}) {
  const amarillo = Number(alertYellowMinutes) || 0;
  const rojo = Number(alertRedMinutes) || 0;
  if (rojo > 0 && minutosActuales >= rojo) return '#fecaca';
  if (amarillo > 0 && minutosActuales >= amarillo) return '#fde68a';
  return hexValidoOrdenCola(config.headerTarjetaColor)
    ? config.headerTarjetaColor
    : HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaColor;
}

/** Recuadro fijo del número de serie (N/S) en la tarjeta KDS. */
export const ESTILO_SERIE_KDS = {
  fondo: '#facc15',
  color: '#111827',
};

export function estiloNumeroSerieHeaderTarjetaKds(config = {}) {
  return estiloDatoHeaderTarjetaKds(config, {
    fondoOverride: ESTILO_SERIE_KDS.fondo,
    colorOverride: ESTILO_SERIE_KDS.color,
  });
}

/** Recuadro de cada dato del encabezado (orden, #comanda, mesa, reloj, mozo, Prep, N/S). */
export function estiloDatoHeaderTarjetaKds(config = {}, opts = {}) {
  const fuente = ORDEN_COLA_FUENTES.find((f) => f.id === config.headerTarjetaFuente)
    || ORDEN_COLA_FUENTES.find((f) => f.id === HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaFuente)
    || ORDEN_COLA_FUENTES[0];
  const tam = Number.isFinite(Number(opts.tamanoOverride))
    ? Number(opts.tamanoOverride)
    : tamanoLetraHeaderTarjetaKds(config);
  const color = hexValidoOrdenCola(opts.colorOverride)
    ? opts.colorOverride
    : (hexValidoOrdenCola(config.headerTarjetaColor)
      ? config.headerTarjetaColor
      : HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaColor);
  const omitirFondo = opts.omitirFondo === true;
  const fondo = omitirFondo
    ? null
    : (hexValidoOrdenCola(opts.fondoOverride)
      ? opts.fondoOverride
      : (hexValidoOrdenCola(config.headerTarjetaFondo)
        ? config.headerTarjetaFondo
        : HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaFondo));
  const contorno = hexValidoOrdenCola(config.headerTarjetaContorno)
    ? config.headerTarjetaContorno
    : HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaContorno;
  const padX = omitirFondo ? 0 : Math.max(4, Math.round(tam * 0.32));
  const padY = omitirFondo ? 0 : Math.max(1, Math.round(tam * 0.12));
  const estilo = {
    fontFamily: fuente.css,
    fontSize: `${tam}px`,
    color,
    fontWeight: opts.peso || 700,
    lineHeight: 1.15,
    display: 'inline-flex',
    alignItems: 'center',
    gap: `${Math.max(2, Math.round(tam * 0.18))}px`,
    paddingLeft: `${padX}px`,
    paddingRight: `${padX}px`,
    paddingTop: `${padY}px`,
    paddingBottom: `${padY}px`,
    borderRadius: '6px',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
  };
  if (fondo) {
    estilo.backgroundColor = fondo;
    estilo.border = `2px solid ${contorno}`;
  }
  return estilo;
}
