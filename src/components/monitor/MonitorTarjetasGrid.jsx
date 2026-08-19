import React from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

/**
 * Grid de tarjetas Ver Cocina.
 * - Normal: CSS grid simétrico (misma altura por fila).
 * - aprovecharEspacio + 2+ columnas: columnas independientes (masonry).
 *   Una tarjeta corta no deja hueco; el siguiente plato sube a ese espacio.
 */
export default function MonitorTarjetasGrid({
  columns = 1,
  gap = '12px',
  zoom,
  aprovecharEspacio = false,
  presenceMode,
  stackedStyle,
  children,
}) {
  const items = React.Children.toArray(children);
  const esGrid = columns > 1;
  const masonry = aprovecharEspacio && esGrid;

  if (masonry) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap,
          padding: gap,
          zoom,
        }}
      >
        {Array.from({ length: columns }, (_, colIdx) => (
          <div
            key={colIdx}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap,
            }}
          >
            <LayoutGroup>
              <AnimatePresence initial={false} mode={presenceMode}>
                {items.filter((_, i) => i % columns === colIdx)}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={esGrid ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        padding: gap,
        alignContent: 'start',
        alignItems: aprovecharEspacio ? 'start' : 'stretch',
        zoom,
      } : (stackedStyle || { zoom })}
    >
      <LayoutGroup>
        <AnimatePresence initial={false} mode={presenceMode}>
          {items}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
