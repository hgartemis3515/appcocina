/**
 * Estilos de badges del monitor Ver Cocina:
 * - Número secuencial global (#N) en temporizadores
 * - Cantidad de unidades (×N) en tarjetas de plato
 */

const DEFAULT_NUMERO_SEC = {
  color: '#22c55e',
  contorno: '#22c55e',
  // Fondo sólido oscuro-verde (legible con texto verde; no transparente)
  fondo: '#14532d',
  forma: 'redondeado',
  tamanio: 'auto',
  peso: '900',
  prefijo: true,
  glow: true,
};

const DEFAULT_CANTIDAD = {
  color: '#ffffff',
  contorno: '#ffffff',
  fondo: '#0d0612',
  tamanio: 'auto',
  grosor: 2,
  radio: 10,
  peso: '900',
};

/**
 * @param {'circulo'|'redondeado'|'cuadrado'|'pildora'} forma
 * @param {boolean} esUnido
 */
export function borderRadiusNumeroSec(forma, esUnido = false) {
  switch (forma) {
    case 'circulo':
      return '50%';
    case 'cuadrado':
      return 0;
    case 'pildora':
      return '999px';
    case 'redondeado':
    default:
      return esUnido ? '4px' : '10px';
  }
}

/**
 * Estilo inline del badge #N (número secuencial).
 * @param {object} configVisual
 * @param {{ esCritico?: boolean }} [opts]
 */
export function estiloNumeroSecuencial(configVisual = {}, opts = {}) {
  const tamanioPlato = configVisual.tamanioFuentePlato || 38;
  const esUnido = configVisual.espaciadoFilas === 'unido';
  const forma = configVisual.numeroSecForma || DEFAULT_NUMERO_SEC.forma;
  const color = configVisual.numeroSecColor || DEFAULT_NUMERO_SEC.color;
  const contorno = configVisual.numeroSecContorno || DEFAULT_NUMERO_SEC.contorno;
  // Usar el color elegido tal cual (sólido). Si viene con alpha 8 dígitos, respetarlo.
  const fondoRaw = configVisual.numeroSecFondo || DEFAULT_NUMERO_SEC.fondo;
  const fondo =
    typeof fondoRaw === 'string' && fondoRaw.length >= 7
      ? fondoRaw.slice(0, 7)
      : (fondoRaw || DEFAULT_NUMERO_SEC.fondo);
  const peso = configVisual.numeroSecPeso || DEFAULT_NUMERO_SEC.peso;
  const glow = configVisual.numeroSecGlow !== false;
  const tamanioCfg = configVisual.numeroSecTamanio;

  const fontSize =
    tamanioCfg === 'auto' || tamanioCfg == null || tamanioCfg === ''
      ? Math.max(18, tamanioPlato * 0.55)
      : Math.max(10, Number(tamanioCfg) || Math.max(18, tamanioPlato * 0.55));

  const box = Math.max(36, fontSize * 1.35);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: `${box}px`,
    height: `${box}px`,
    padding: '2px 8px',
    borderRadius: borderRadiusNumeroSec(forma, esUnido),
    backgroundColor: fondo,
    background: fondo,
    border: `2px solid ${contorno}`,
    color,
    fontSize: `${fontSize}px`,
    fontWeight: Number(peso) || 900,
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    lineHeight: 1,
    boxShadow: glow ? `0 0 6px ${contorno}55` : 'none',
    // Por encima del fondo del chip del temporizador
    position: 'relative',
    zIndex: 2,
    isolation: 'isolate',
  };
}

/**
 * Texto del número secuencial (# opcional).
 */
export function textoNumeroSecuencial(numero, configVisual = {}) {
  const prefijo = configVisual.numeroSecPrefijo !== false;
  return `${prefijo ? '#' : ''}${numero}`;
}

/**
 * Estilo inline del badge ×N (cantidad).
 * @param {object} configVisual
 */
export function estiloCantidadBadge(configVisual = {}) {
  const tamanioPlato = configVisual.tamanioFuentePlato || 38;
  const esUnido = configVisual.espaciadoFilas === 'unido';
  const color = configVisual.cantidadColor || DEFAULT_CANTIDAD.color;
  const contorno = configVisual.cantidadContorno || DEFAULT_CANTIDAD.contorno;
  const fondo = configVisual.cantidadFondo || DEFAULT_CANTIDAD.fondo;
  const grosor = Math.min(4, Math.max(1, Number(configVisual.cantidadGrosorContorno) || DEFAULT_CANTIDAD.grosor));
  const radioCfg = configVisual.cantidadRadio;
  const radio =
    radioCfg == null || radioCfg === ''
      ? (esUnido ? 4 : DEFAULT_CANTIDAD.radio)
      : Math.min(20, Math.max(0, Number(radioCfg)));
  const peso = configVisual.cantidadPeso || DEFAULT_CANTIDAD.peso;
  const tamanioCfg = configVisual.cantidadTamanio;

  const fontSize =
    tamanioCfg === 'auto' || tamanioCfg == null || tamanioCfg === ''
      ? Math.max(14, tamanioPlato * 0.6)
      : Math.max(10, Number(tamanioCfg) || Math.max(14, tamanioPlato * 0.6));

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '46px',
    padding: '4px 12px',
    borderRadius: `${radio}px`,
    background: fondo,
    border: `${grosor}px solid ${contorno}`,
    color,
    fontSize: `${fontSize}px`,
    fontWeight: Number(peso) || 900,
    flexShrink: 0,
    boxShadow: `0 0 8px ${contorno}33`,
  };
}

/** Tokens default para DEFAULT_CONFIG del layout */
export const BADGE_DEFAULTS = {
  numeroSecColor: DEFAULT_NUMERO_SEC.color,
  numeroSecContorno: DEFAULT_NUMERO_SEC.contorno,
  numeroSecFondo: DEFAULT_NUMERO_SEC.fondo,
  numeroSecForma: DEFAULT_NUMERO_SEC.forma,
  numeroSecTamanio: DEFAULT_NUMERO_SEC.tamanio,
  numeroSecPeso: DEFAULT_NUMERO_SEC.peso,
  numeroSecPrefijo: DEFAULT_NUMERO_SEC.prefijo,
  numeroSecGlow: DEFAULT_NUMERO_SEC.glow,
  cantidadColor: DEFAULT_CANTIDAD.color,
  cantidadContorno: DEFAULT_CANTIDAD.contorno,
  cantidadFondo: DEFAULT_CANTIDAD.fondo,
  cantidadTamanio: DEFAULT_CANTIDAD.tamanio,
  cantidadGrosorContorno: DEFAULT_CANTIDAD.grosor,
  cantidadRadio: DEFAULT_CANTIDAD.radio,
  cantidadPeso: DEFAULT_CANTIDAD.peso,
  cantidadSeguirAlerta: false,
};

export { DEFAULT_NUMERO_SEC, DEFAULT_CANTIDAD };
