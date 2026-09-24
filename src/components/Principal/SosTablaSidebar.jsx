import React, { useMemo } from 'react';

const SosTablaSidebar = ({
  grupos = [],
  nightMode = true,
  highlightComandaId = null,
  highlightPlatoIndex = null,
  onSelectGrupo,
  onCerrar,
}) => {
  const total = useMemo(
    () => grupos.reduce((s, g) => s + (Number(g.cantidad) || 0), 0),
    [grupos]
  );
  const bg = nightMode ? 'bg-gray-950' : 'bg-gray-100';
  const border = nightMode ? 'border-gray-700' : 'border-gray-300';
  const text = nightMode ? 'text-white' : 'text-gray-900';
  const sub = nightMode ? 'text-gray-400' : 'text-gray-600';
  const rowIdle = nightMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200';
  const rowPrimero = nightMode
    ? 'bg-green-600/45 text-green-50 hover:bg-green-600/55'
    : 'bg-green-500/35 text-green-900 hover:bg-green-500/45';
  const rowOn = nightMode ? 'bg-red-950/80 ring-1 ring-red-500' : 'bg-red-100 ring-1 ring-red-400';

  return (
    <aside
      className={`w-[300px] flex-shrink-0 h-full min-h-0 flex flex-col border-l ${border} ${bg} ${text}`}
      aria-label="SOS TABLA"
    >
      <div className={`flex items-center justify-between px-3 py-2 border-b ${border} flex-shrink-0`}>
        <div>
          <div className="text-red-500 font-black tracking-widest text-sm">SOS TABLA</div>
          <div className={`${sub} text-xs`}>{total} plato{total === 1 ? '' : 's'}</div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className={`min-h-[44px] min-w-[44px] rounded ${rowIdle} ${sub}`}
          title="Quitar SOS TABLA"
          aria-label="Cerrar SOS TABLA"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {grupos.length === 0 ? (
          <p className={`${sub} text-sm p-4`}>No hay platos en el tablero</p>
        ) : (
          grupos.map((g) => {
            const mismoPlato = highlightPlatoIndex == null
              || Number(g.platoIndexMasAntigua) === Number(highlightPlatoIndex);
            const activo = highlightComandaId
              && String(g.comandaIdMasAntigua) === String(highlightComandaId)
              && mismoPlato;
            return (
              <button
                key={g.clave}
                type="button"
                onClick={() => onSelectGrupo(g)}
                className={`w-full text-left px-3 py-3 border-b ${border} min-h-[56px] flex items-center gap-2 ${activo ? rowOn : g.primero ? rowPrimero : rowIdle}`}
              >
                <span className="flex-1 min-w-0 font-semibold leading-tight line-clamp-2">
                  {g.prioridad ? '🚀 ' : ''}{g.nombre}
                </span>
                <span className="flex-shrink-0 text-lg font-black tabular-nums">
                  ×{g.cantidad}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default SosTablaSidebar;
