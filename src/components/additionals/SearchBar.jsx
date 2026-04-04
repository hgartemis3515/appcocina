import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

/**
 * SearchBar - Barra de búsqueda de platos
 * 
 * Props:
 * - onSearch: función llamada con el término de búsqueda
 * - totalPlatosEncontrados: número de platos que coinciden (opcional)
 * - hayFiltroActivo: booleano indicando si hay búsqueda activa (opcional)
 */
const SearchBar = ({ onSearch, totalPlatosEncontrados = 0, hayFiltroActivo = false }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="flex justify-center w-full">
      <div className="flex flex-col items-center w-full max-w-2xl gap-2">
        <div className="flex items-center rounded-lg border-2 border-gray-600 bg-gray-700 w-full">
          <FaSearch className="text-gray-400 mx-3" />
          <input
            className="appearance-none bg-transparent border-none w-full text-white py-3 px-2 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-lg"
            type="text"
            placeholder="Buscar por nombre de plato..."
            value={searchTerm}
            onChange={handleChange}
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-white mr-3 transition-colors"
              title="Limpiar búsqueda"
            >
              <FaTimes />
            </button>
          )}
        </div>
        
        {/* Contador de platos encontrados */}
        {hayFiltroActivo && (
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full font-medium">
              {totalPlatosEncontrados} plato{totalPlatosEncontrados !== 1 ? 's' : ''} encontrado{totalPlatosEncontrados !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
