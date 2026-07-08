import React from 'react';

/**
 * Estado vacío del monitor Ver Cocina.
 *
 * v2.3: Mensaje contextual según:
 *       - Búsqueda activa sin resultados → "Ningún plato coincide con «término»"
 *       - Cocinero seleccionado sin platos → "Juan está al día"
 *       - Caso general → mensaje de la vista
 *
 * Props:
 * - nombreVista: string (default 'la estación')
 * - nombreCocinero: string | null
 * - terminoBusqueda: string | null  → si viene, mensaje de búsqueda sin resultados
 */
const MonitorEmptyState = ({
  nombreVista = 'la estación',
  nombreCocinero = null,
  terminoBusqueda = null,
}) => {
  let titulo, subtitulo, nota, color;

  if (terminoBusqueda) {
    // Búsqueda activa sin coincidencias
    const termino = terminoBusqueda.length > 40
      ? `"${terminoBusqueda.slice(0, 37)}..."`
      : `"${terminoBusqueda}"`;
    const contexto = nombreCocinero ? ` para ${nombreCocinero}` : '';
    titulo = 'Sin coincidencias';
    subtitulo = `Ningún plato tomado coincide con ${termino}${contexto}.`;
    nota = 'Revisa el término, prueba una sugerencia o limpia la búsqueda.';
    color = '#fbbf24';
  } else if (nombreCocinero) {
    // Cocinero seleccionado, sin platos
    titulo = `${nombreCocinero} está al día`;
    subtitulo = `${nombreCocinero} no tiene platos pendientes en este momento.`;
    nota = 'Los platos aparecerán cuando se le asignen en el KDS.';
    color = '#34d399';
  } else {
    // General sin platos
    titulo = 'Sin platos por preparar';
    subtitulo = `No hay platos tomados pendientes en ${nombreVista}.`;
    nota = 'Los platos aparecerán cuando un cocinero los tome en el KDS.';
    color = '#34d399';
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="text-center px-8">
        <div className="text-7xl mb-6">
          {terminoBusqueda ? '🔍' : '✓'}
        </div>
        <h2
          className="font-bold mb-2"
          style={{ fontSize: '40px', color }}
        >
          {titulo}
        </h2>
        <p
          className="opacity-60"
          style={{ fontSize: '24px' }}
        >
          {subtitulo}
        </p>
        <p
          className="opacity-40 mt-3"
          style={{ fontSize: '18px' }}
        >
          {nota}
        </p>
      </div>
    </div>
  );
};

export default MonitorEmptyState;
