import React from 'react';

/**
 * Estado vacío del monitor Ver Cocina.
 *
 * v2.2: Mensaje contextual por cocinero. Si `nombreCocinero` está presente,
 *       el mensaje indica que ese cocinero no tiene platos pendientes;
 *       si no, mantiene el mensaje general de la vista.
 */
const MonitorEmptyState = ({ nombreVista = 'la estación', nombreCocinero = null }) => {
  const titulo = nombreCocinero
    ? `${nombreCocinero} está al día`
    : 'Sin platos por preparar';
  const subtitulo = nombreCocinero
    ? `${nombreCocinero} no tiene platos pendientes en este momento.`
    : `No hay platos tomados pendientes en ${nombreVista}.`;
  const nota = nombreCocinero
    ? 'Los platos aparecerán cuando se le asignen en el KDS.'
    : 'Los platos aparecerán cuando un cocinero los tome en el KDS.';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="text-center px-8">
        <div className="text-7xl mb-6">✓</div>
        <h2
          className="font-bold mb-2"
          style={{ fontSize: '40px', color: '#34d399' }}
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