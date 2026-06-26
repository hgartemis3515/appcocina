import React from 'react';

/**
 * Estado vacío del monitor Ver Cocina.
 * v2.1: Mensaje positivo: "No hay platos tomados por cocineros pendientes".
 */
const MonitorEmptyState = ({ nombreVista = 'la estación' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="text-center px-8">
        <div className="text-7xl mb-6">✓</div>
        <h2
          className="font-bold mb-2"
          style={{ fontSize: '40px', color: '#34d399' }}
        >
          Sin platos por preparar
        </h2>
        <p
          className="opacity-60"
          style={{ fontSize: '24px' }}
        >
          No hay platos tomados pendientes en {nombreVista}.
        </p>
        <p
          className="opacity-40 mt-3"
          style={{ fontSize: '18px' }}
        >
          Los platos aparecerán cuando un cocinero los tome en el KDS.
        </p>
      </div>
    </div>
  );
};

export default MonitorEmptyState;