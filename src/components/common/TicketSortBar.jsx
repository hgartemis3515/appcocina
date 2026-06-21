import React, { useState, useRef, useEffect } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaUser, FaChevronDown, FaTimes } from 'react-icons/fa';
import { TICKET_SORT_OPTIONS, getDefaultSortDir } from '../../utils/ticketSort';

function MozoFilterButton({ mozoFilter, mozosDisponibles, onMozoFilterChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const mozoActivo = mozosDisponibles.find((m) => m.key === mozoFilter);
  const labelCorto = mozoActivo
    ? (mozoActivo.nombre.length > 12 ? `${mozoActivo.nombre.slice(0, 12)}…` : mozoActivo.nombre)
    : 'Mozo';

  const handleSelect = (key) => {
    onMozoFilterChange(key);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={mozoActivo ? `Filtrando: ${mozoActivo.nombre}` : 'Filtrar por mozo'}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap border
          ${mozoFilter
            ? 'bg-blue-600/80 text-white border-blue-500/50'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border-gray-700'}`}
      >
        <FaUser className="text-[9px]" />
        {labelCorto}
        {mozoFilter ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onMozoFilterChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onMozoFilterChange(null);
              }
            }}
            className="ml-0.5 hover:text-white/80"
            title="Quitar filtro de mozo"
          >
            <FaTimes className="text-[8px]" />
          </span>
        ) : (
          <FaChevronDown className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] max-h-56 overflow-y-auto
          bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-3 py-2 text-xs transition-colors
              ${!mozoFilter ? 'bg-violet-600/30 text-violet-200' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Todos los mozos
          </button>
          {mozosDisponibles.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">Sin mozos en esta vista</p>
          ) : (
            mozosDisponibles.map((mozo) => (
              <button
                key={mozo.key}
                type="button"
                onClick={() => handleSelect(mozo.key)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors
                  ${mozoFilter === mozo.key ? 'bg-blue-600/30 text-blue-200' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                <span className="truncate">{mozo.nombre}</span>
                <span className="text-gray-500 flex-shrink-0">({mozo.count})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Barra de ordenación y filtro por mozo para tickets de comandas / pagos adelantados.
 */
export default function TicketSortBar({
  sortBy,
  sortDir,
  onChange,
  mozoFilter,
  mozosDisponibles = [],
  onMozoFilterChange,
}) {
  const handleClick = (key) => {
    if (sortBy === key) {
      onChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onChange(key, getDefaultSortDir(key));
    }
  };

  const SortIcon = ({ active, dir }) => {
    if (!active) return <FaSort className="text-[9px] opacity-50" />;
    return dir === 'asc'
      ? <FaSortUp className="text-[9px]" />
      : <FaSortDown className="text-[9px]" />;
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-gray-500 text-xs whitespace-nowrap hidden md:inline">Ordenar:</span>
      <div className="flex items-center gap-1 flex-wrap justify-end">
        <MozoFilterButton
          mozoFilter={mozoFilter}
          mozosDisponibles={mozosDisponibles}
          onMozoFilterChange={onMozoFilterChange}
        />
        {TICKET_SORT_OPTIONS.map(({ key, label }) => {
          const active = sortBy === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key)}
              title={`Ordenar por ${label}${active ? ` (${sortDir === 'asc' ? 'ascendente' : 'descendente'})` : ''}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                ${active
                  ? 'bg-violet-600/80 text-white border border-violet-500/50'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'}`}
            >
              {label}
              <SortIcon active={active} dir={sortDir} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
