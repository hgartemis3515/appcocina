import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaTimes, FaLightbulb, FaUtensils, FaFont } from 'react-icons/fa';

/**
 * SearchBar - Barra de búsqueda de platos con sugerencias inteligentes
 * 
 * Props:
 * - onSearch: función llamada con el término de búsqueda
 * - totalPlatosEncontrados: número de platos que coinciden
 * - hayFiltroActivo: booleano indicando si hay búsqueda activa
 * - sugerencias: array de sugerencias [{ texto, tipo, relevancia }]
 * - onSugerenciaClick: función llamada al seleccionar sugerencia
 */
const SearchBar = ({ 
  onSearch, 
  totalPlatosEncontrados = 0, 
  hayFiltroActivo = false,
  sugerencias = [],
  onSugerenciaClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const suggestionsRef = useRef(null);

  const handleChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch(value);
    setShowSuggestions(value.length >= 1 && sugerencias.length > 0);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (sugerencia) => {
    setSearchTerm(sugerencia.texto);
    onSugerenciaClick?.(sugerencia.texto);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Navegación con teclado
  const handleKeyDown = (event) => {
    if (!showSuggestions || sugerencias.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < sugerencias.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(sugerencias[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar sugerencias cuando cambian
  useEffect(() => {
    if (searchTerm.length >= 1 && sugerencias.length > 0) {
      setShowSuggestions(true);
    }
  }, [sugerencias, searchTerm.length]);

  // Scroll a sugerencia seleccionada
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Icono según tipo de sugerencia
  const getSuggestionIcon = (tipo) => {
    switch (tipo) {
      case 'nombre_completo':
        return <FaUtensils className="text-orange-400" />;
      case 'similar':
        return <FaLightbulb className="text-yellow-400" />;
      case 'palabra':
        return <FaFont className="text-blue-400" />;
      default:
        return <FaSearch className="text-gray-400" />;
    }
  };

  // Badge según tipo de sugerencia
  const getSuggestionBadge = (tipo) => {
    switch (tipo) {
      case 'nombre_completo':
        return <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Plato</span>;
      case 'similar':
        return <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Similar</span>;
      case 'palabra':
        return <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Palabra</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center w-full" ref={containerRef}>
      <div className="flex flex-col items-center w-full max-w-2xl gap-2 relative">
        <div className="flex items-center rounded-lg border-2 border-gray-600 bg-gray-700 w-full focus-within:border-blue-500 transition-colors">
          <FaSearch className="text-gray-400 mx-3" />
          <input
            ref={inputRef}
            className="appearance-none bg-transparent border-none w-full text-white py-3 px-2 leading-tight focus:outline-none rounded-lg text-lg"
            type="text"
            placeholder="Buscar por nombre de plato..."
            value={searchTerm}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchTerm.length >= 1 && sugerencias.length > 0) {
                setShowSuggestions(true);
              }
            }}
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
            <span className={`px-3 py-1 rounded-full font-medium flex items-center gap-2 ${
              totalPlatosEncontrados > 0 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}>
              {totalPlatosEncontrados > 0 ? (
                <>
                  <span>✓</span>
                  <span>{totalPlatosEncontrados} plato{totalPlatosEncontrados !== 1 ? 's' : ''} encontrado{totalPlatosEncontrados !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <span>✗</span>
                  <span>Sin resultados</span>
                </>
              )}
            </span>
            {sugerencias.length > 0 && totalPlatosEncontrados === 0 && (
              <span className="text-gray-400 text-xs">Prueba las sugerencias</span>
            )}
          </div>
        )}

        {/* Sugerencias de búsqueda */}
        {showSuggestions && sugerencias.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 flex items-center gap-2 bg-gray-900">
              <FaLightbulb className="text-yellow-500" />
              <span>
                {totalPlatosEncontrados === 0 
                  ? '¿Quisiste decir?' 
                  : 'Sugerencias:'}
              </span>
              <span className="ml-auto text-gray-500">
                ↑↓ navegar • Enter seleccionar • Esc cerrar
              </span>
            </div>
            <ul className="max-h-64 overflow-y-auto" ref={suggestionsRef}>
              {sugerencias.map((sugerencia, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => handleSuggestionClick(sugerencia)}
                    className={`w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-3 ${
                      idx === selectedIndex 
                        ? 'bg-blue-600 text-white' 
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getSuggestionIcon(sugerencia.tipo)}
                      <span className="truncate">{sugerencia.texto}</span>
                    </div>
                    {getSuggestionBadge(sugerencia.tipo)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
