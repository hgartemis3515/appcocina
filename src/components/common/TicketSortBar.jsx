import React from 'react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { TICKET_SORT_OPTIONS, getDefaultSortDir } from '../../utils/ticketSort';

/**
 * Barra de ordenación para tickets de comandas / pagos adelantados.
 */
export default function TicketSortBar({ sortBy, sortDir, onChange }) {
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
