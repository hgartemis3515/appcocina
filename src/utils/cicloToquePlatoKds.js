/**
 * Ciclo visual de toques en tablas KDS.
 *
 * Plato libre: normal → procesando (amarillo) → seleccionado (verde) → normal
 * Plato asignado/tomado (en proceso): un toque selecciona, otro deselecciona.
 * No hay segundo toque a rojo: cambiar plato es un botón de la barra.
 */

export function siguienteEstadoToquePlato(estadoActual, opts = {}) {
  const actual = estadoActual || 'normal';
  const tomado = !!opts.tomado;

  if (!tomado) {
    if (actual === 'normal') return 'procesando';
    if (actual === 'procesando') return 'seleccionado';
    return 'normal';
  }

  if (actual === 'seleccionado' || actual === 'dejar' || actual === 'entregando') return 'procesando';
  return 'seleccionado';
}
