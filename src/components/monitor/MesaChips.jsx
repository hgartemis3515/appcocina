import React, { useState } from 'react';

/**
 * MesaChips - Muestra las mesas de un plato como chips compactos.
 *
 * - Una mesa: chip `M12`.
 * - Varias: chips separados por punto medio.
 * - Repetidas: chip con badge de cantidad `M12 ×2`.
 * - Muchas (> maxVisibles): chip `+N mesas` con tooltip que lista todas.
 * - Sin mesa (error de datos): chip gris `Mesa ?`.
 *
 * Props:
 * - timers: [{ mesa, comandaNumero, ... }] (usa timer.mesa)
 * - configVisual: { colorAcento, colorTextoSecundario }
 */
const MesaChips = ({ timers = [], configVisual = {} }) => {
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const colorAcento = configVisual.colorAcento || '#d4af37';
  const colorTextoSecundario = configVisual.colorTextoSecundario || '#9ca3af';
  const maxVisibles = 5;

  // Construir mapa mesa -> count (preserva orden de aparición)
  const ordenadas = [];
  const counts = new Map();
  for (const t of timers) {
    const m = t.mesa;
    if (m == null || m === '') continue;
    const key = String(m);
    if (!counts.has(key)) {
      counts.set(key, 0);
      ordenadas.push(key);
    }
    counts.set(key, counts.get(key) + 1);
  }

  if (ordenadas.length === 0) {
    // Plato sin mesa visible (posible error de datos)
    return (
      <span
        title="Plato sin mesa asignada (revisar comanda)"
        style={{
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: colorTextoSecundario,
          background: 'rgba(120,120,120,0.15)',
          border: '1px solid rgba(120,120,120,0.4)',
        }}
      >
        Mesa ?
      </span>
    );
  }

  const chipStyle = (repetida) => ({
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: repetida ? colorAcento : colorTextoSecundario,
    background: repetida ? `${colorAcento}14` : 'transparent',
    border: `1px solid ${colorAcento}33`,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
  });

  const renderChip = (mesa, count) => (
    <span key={mesa} style={chipStyle(count > 1)}>
      M{mesa}
      {count > 1 && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: colorAcento,
            background: `${colorAcento}22`,
            padding: '0 4px',
            borderRadius: '4px',
          }}
        >
          ×{count}
        </span>
      )}
    </span>
  );

  let visibles = ordenadas;
  let ocultas = 0;
  if (!mostrarTodas && ordenadas.length > maxVisibles) {
    visibles = ordenadas.slice(0, maxVisibles - 1);
    ocultas = ordenadas.length - visibles.length;
  }

  return (
    <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
      {visibles.map(m => renderChip(m, counts.get(m)))}

      {ocultas > 0 && (
        <button
          type="button"
          onClick={() => setMostrarTodas(v => !v)}
          title={`Mesas: ${ordenadas.join(', ')}`}
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: colorTextoSecundario,
            background: `${colorAcento}0a`,
            border: `1px dashed ${colorAcento}55`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {mostrarTodas ? '− menos' : `+${ocultas} mesas`}
        </button>
      )}
    </div>
  );
};

export default MesaChips;