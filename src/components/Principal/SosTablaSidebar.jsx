import React, { useEffect, useRef } from 'react';

const SosTablaSidebar = ({
  grupos = [],
  nightMode = true,
  highlightComandaId = null,
  highlightPlatoIndex = null,
  familiasAbiertas = {},
  onSelectGrupo,
  onDobleGrupo,
  onCerrar,
}) => {
  const total = grupos.reduce((s, g) => s + (Number(g.cantidad) || 0), 0);
  const pending = useRef(null);
  const bg = nightMode ? 'bg-gray-950' : 'bg-gray-100';
  const border = nightMode ? 'border-gray-700' : 'border-gray-300';
  const text = nightMode ? 'text-white' : 'text-gray-900';
  const sub = nightMode ? 'text-gray-400' : 'text-gray-600';
  const rowIdle = nightMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200';
  const rowPrimero = nightMode
    ? 'bg-green-600/45 text-green-50 hover:bg-green-600/55'
    : 'bg-green-500/35 text-green-900 hover:bg-green-500/45';
  const rowOn = nightMode ? 'bg-red-950/80 ring-1 ring-red-500' : 'bg-red-100 ring-1 ring-red-400';

  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current.t);
  }, []);

  const onRow = (g) => {
    if (pending.current?.clave === g.clave) {
      clearTimeout(pending.current.t);
      pending.current = null;
      if (g.familia && onDobleGrupo) onDobleGrupo(g);
      else if (onSelectGrupo) onSelectGrupo(g);
      return;
    }
    if (pending.current) {
      clearTimeout(pending.current.t);
      const previo = pending.current.grupo;
      pending.current = null;
      if (onSelectGrupo) onSelectGrupo(previo);
    }
    const t = setTimeout(() => {
      pending.current = null;
      if (onSelectGrupo) onSelectGrupo(g);
    }, 300);
    pending.current = { clave: g.clave, grupo: g, t };
  };

  const fila = (g, hijo) => {
    const mismoPlato = highlightPlatoIndex == null
      || Number(g.platoIndexMasAntigua) === Number(highlightPlatoIndex);
    const activo = highlightComandaId
      && String(g.comandaIdMasAntigua) === String(highlightComandaId)
      && mismoPlato;
    const abierta = !!(g.familia && !g.porCantidad && familiasAbiertas[g.clave]);
    return (
      <button
        key={g.clave}
        type="button"
        onClick={() => onRow(g)}
        className={`w-full text-left pr-3 py-3 border-b ${border} min-h-[56px] flex items-center gap-2 ${abierta || activo ? rowOn : g.primero ? rowPrimero : rowIdle}`}
        style={{ paddingLeft: 12 + hijo * 16 }}
      >
        <span className="flex-1 min-w-0 font-semibold leading-tight line-clamp-2">
          {g.prioridad ? '🚀 ' : ''}{g.nombre}
        </span>
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-lg font-black tabular-nums">
          {g.familia ? (
            <span aria-hidden className="text-base leading-none">{abierta ? '▾' : '▸'}</span>
          ) : null}
          ×{g.cantidad}
        </span>
      </button>
    );
  };

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
          grupos.map((g) => (
            <BloqueGrupo
              key={g.clave}
              g={g}
              profundidad={0}
              familiasAbiertas={familiasAbiertas}
              fila={fila}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default SosTablaSidebar;

function BloqueGrupo({ g, profundidad, familiasAbiertas, fila }) {
  const abierta = !!(g.familia && !g.porCantidad && familiasAbiertas[g.clave]);
  const tipos = abierta ? (g.tipos || []) : [];
  return (
    <div className="relative">
      {tipos.length > 0 && (
        <span
          className="absolute w-0.5 bg-yellow-400 pointer-events-none"
          style={{ left: 10 + profundidad * 12, top: 28, bottom: 0 }}
          aria-hidden
        />
      )}
      {fila(g, profundidad)}
      {tipos.map((t) => (
        <BloqueGrupo
          key={t.clave}
          g={t}
          profundidad={profundidad + 1}
          familiasAbiertas={familiasAbiertas}
          fila={fila}
        />
      ))}
    </div>
  );
}
