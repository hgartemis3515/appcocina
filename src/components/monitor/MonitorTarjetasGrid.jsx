import React from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

/**
 * Grid de tarjetas Ver Cocina.
 * - 1 columna: lista vertical con gap (orden de cola, sin solape).
 * - 2+ columnas: CSS grid simétrico (misma altura por fila) o masonry.
 * - Masonry solo si aprovecharEspacio y masonryEnabled (off en portrait:
 *   rellenar huecos reordena visualmente y un plato “salta” encima de otro).
 */
export default function MonitorTarjetasGrid({
  columns = 1,
  gap = '12px',
  zoom,
  aprovecharEspacio = false,
  presenceMode,
  stackedStyle,
  masonryEnabled = true,
  children,
}) {
  const items = React.Children.toArray(children);
  const esGrid = columns > 1;
  const masonry = masonryEnabled && aprovecharEspacio && esGrid;

  const defaultStacked = {
    display: 'flex',
    flexDirection: 'column',
    gap,
    padding: gap,
    alignItems: 'stretch',
    zoom,
  };

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
        width: '100%',
        minWidth: 0,
      } : (stackedStyle || defaultStacked)}
    >
      <LayoutGroup>
        <AnimatePresence initial={false} mode={presenceMode}>
          {items}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
