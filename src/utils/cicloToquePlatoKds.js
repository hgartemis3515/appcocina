/**
 * Ciclo visual de toques en tablas KDS.
 *
 * Plato libre: normal → procesando (amarillo) → seleccionado (verde) → normal
 * Plato asignado/tomado (empieza en amarillo):
 *   default: procesando → dejar (rojo) → seleccionado (verde) → procesando
 *   primerToqueFinalizar: procesando → seleccionado → dejar → procesando
 */

export function siguienteEstadoToquePlato(estadoActual, opts = {}) {
  const actual = estadoActual || 'normal';
  const tomado = !!opts.tomado;
  const primerToqueFinalizar = !!opts.primerToqueFinalizar;

  if (!tomado) {
    if (actual === 'normal') return 'procesando';
    if (actual === 'procesando') return 'seleccionado';
    return 'normal';
  }

  const primero = primerToqueFinalizar ? 'seleccionado' : 'dejar';
  const segundo = primerToqueFinalizar ? 'dejar' : 'seleccionado';
  if (actual === 'procesando' || actual === 'normal') return primero;
  if (actual === primero) return segundo;
  return 'procesando';
}
