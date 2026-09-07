/**
 * Cómo se ordenan los 6 datos del encabezado de la tarjeta de comanda KDS:
 * orden (posición en el tablero), número de comanda, mesa, cronómetro, mozo, Prep.
 */

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
];

export const HEADER_TARJETA_DEFAULT = 'compacto';

export function resolverHeaderTarjetaEstilo(config) {
  const id = String(config?.headerTarjetaEstilo || '').trim();
  if (HEADER_TARJETA_ESTILOS.some((e) => e.id === id)) return id;
  return HEADER_TARJETA_DEFAULT;
}

/** Platos con kdsEstiloCompacto fuerzan la fila única aunque el perfil sea clásico. */
export function resolverEstiloHeaderTarjetaComanda(config, { forzarCompacto } = {}) {
  if (forzarCompacto) return 'compacto';
  return resolverHeaderTarjetaEstilo(config);
}

export function paddingHeaderTarjetaKds(estilo) {
  return estilo === 'clasico' ? 'p-3' : 'px-2 py-1.5';
}
