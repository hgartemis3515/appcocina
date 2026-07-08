import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaSearch, FaTimes, FaLightbulb, FaUtensils, FaFont, FaSpinner } from 'react-icons/fa';

/**
 * SearchBar - Barra de búsqueda de platos con sugerencias inteligentes
 *
 * Mejoras:
 * - Indicador animado mientras está buscando (spinner + borde pulsante)
 * - Lupa presionable opcional (dispara búsqueda manual sin Esperar debounce)
 * - Sugerencias por nombre y código
 * - Variante "monitor" con estilos inline (tema oscuro del monitor Ver Cocina)
 *
 * Props:
 * - onSearch: función llamada con el término de búsqueda
 * - totalPlatosEncontrados: número de platos que coinciden
 * - totalComandasEncontradas: número de comandas que coinciden
 * - hayFiltroActivo: booleano indicando si hay búsqueda activa
 * - sugerencias: array de sugerencias [{ texto, tipo, relevancia }]
 * - onSugerenciaClick: función llamada al seleccionar sugerencia
 *
 * Variante monitor (props opcionales):
 * - variant: 'kds' (default, Tailwind) | 'monitor' (inline styles)
 * - monitorTheme: { colorFondo, colorTextoPrincipal, colorTextoSecundario,
 *                   colorAcento, colorAlertaAmarilla }
 * - placeholder: string (default por variante)
 * - compact: boolean (monitor: padding reducido, sin borde grueso)
 */
const SearchBar = ({
  onSearch,
  totalPlatosEncontrados = 0,
  totalComandasEncontradas = 0,
  hayFiltroActivo = false,
  sugerencias = [],
  onSugerenciaClick,
  variant = 'kds',
  monitorTheme = null,
  placeholder,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimerRef = useRef(null);

  const handleChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch(value);
    setShowSuggestions(value.length >= 1 && sugerencias.length > 0);
    setSelectedIndex(-1);

    // Activar indicador de "buscando" y apagarlo tras 450ms sin escribir
    setIsSearching(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value) {
      setIsSearching(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => setIsSearching(false), 450);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setIsSearching(false);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (sugerencia) => {
    setSearchTerm(sugerencia.texto);
    onSugerenciaClick?.(sugerencia.texto);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  // Lupa presionable opcional: re-dispara la búsqueda con el término actual
  const handleSearchClick = useCallback(() => {
    if (searchTerm) {
      setIsSearching(true);
      onSearch(searchTerm);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => setIsSearching(false), 450);
    }
    inputRef.current?.focus();
  }, [searchTerm, onSearch]);

  // Navegación con teclado
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !showSuggestions) {
      handleSearchClick();
      return;
    }
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

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

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

  // ===== Variante MONITOR: estilos inline, tema oscuro del monitor Ver Cocina =====
  if (variant === 'monitor') {
    const t = monitorTheme || {};
    const colorFondo = t.colorFondo || '#0a0a0f';
    const colorTextoPrincipal = t.colorTextoPrincipal || '#ffffff';
    const colorTextoSecundario = t.colorTextoSecundario || '#9ca3af';
    const colorAcento = t.colorAcento || '#d4af37';
    const colorAlertaAmarilla = t.colorAlertaAmarilla || '#fbbf24';

    const phText = placeholder || 'Buscar plato...';
    const inputHeight = compact ? '38px' : '42px';

    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 auto',
              minWidth: 0,
              height: inputHeight,
              padding: '0 10px',
              borderRadius: '8px',
              border: `1.5px solid ${isSearching ? colorAcento : `${colorAcento}55`}`,
              background: `${colorFondo}ee`,
              boxShadow: isSearching ? `0 0 0 1px ${colorAcento}55` : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <button
              type="button"
              onClick={handleSearchClick}
              title="Buscar"
              aria-label="Buscar"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 6px 0 0',
                color: isSearching ? colorAcento : colorTextoSecundario,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch size={13} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder={phText}
              value={searchTerm}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchTerm.length >= 1 && sugerencias.length > 0) setShowSuggestions(true);
              }}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: colorTextoPrincipal,
                fontSize: '14px',
                fontFamily: 'inherit',
                padding: '0 4px',
                height: '100%',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                title="Limpiar búsqueda"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 0 0 6px',
                  color: colorTextoSecundario,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FaTimes size={13} />
              </button>
            )}
          </div>

          {hayFiltroActivo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                flexShrink: 0,
                minWidth: '90px',
                justifyContent: 'flex-end',
              }}
            >
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: totalPlatosEncontrados > 0 ? `${colorAcento}22` : `${colorAlertaAmarilla}22`,
                  color: totalPlatosEncontrados > 0 ? colorAcento : colorAlertaAmarilla,
                  border: `1px solid ${totalPlatosEncontrados > 0 ? colorAcento : colorAlertaAmarilla}55`,
                }}
              >
                {totalPlatosEncontrados > 0
                  ? `${totalPlatosEncontrados} plato${totalPlatosEncontrados !== 1 ? 's' : ''}`
                  : (isSearching ? 'Buscando...' : 'Sin resultados')}
              </span>
            </div>
          )}
        </div>

        {/* Sugerencias (igual lógica que KDS, tema monitor) */}
        {showSuggestions && sugerencias.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: colorFondo,
              border: `1.5px solid ${colorAcento}55`,
              borderRadius: '8px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: colorTextoSecundario,
                borderBottom: `1px solid ${colorAcento}22`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: `${colorFondo}cc`,
              }}
            >
              <FaLightbulb style={{ color: colorAlertaAmarilla }} />
              <span>
                {totalPlatosEncontrados === 0 ? '¿Quisiste decir?' : 'Sugerencias:'}
              </span>
              <span style={{ marginLeft: 'auto', color: colorTextoSecundario, fontSize: '11px' }}>
                ↑↓ navegar • Enter seleccionar • Esc cerrar
              </span>
            </div>
            <ul ref={suggestionsRef} style={{ maxHeight: '256px', overflowY: 'auto', margin: 0, padding: '4px', listStyle: 'none' }}>
              {sugerencias.map((sugerencia, idx) => {
                const resaltadoItem = idx === selectedIndex;
                const activo = idx === selectedIndex;
                const colorIcono =
                  sugerencia.tipo === 'nombre_completo' ? colorAcento :
                  sugerencia.tipo === 'similar' ? colorAlertaAmarilla :
                  colorTextoSecundario;
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(sugerencia)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        background: activo ? `${colorAcento}22` : 'transparent',
                        color: activo ? colorAcento : colorTextoPrincipal,
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FaSearch size={11} style={{ color: colorIcono, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sugerencia.texto}
                        </span>
                      </span>
                      {getSuggestionBadge(sugerencia.tipo) && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: `${colorIcono}22`,
                            color: colorIcono,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {sugerencia.tipo === 'nombre_completo' ? 'Plato' :
                           sugerencia.tipo === 'similar' ? 'Similar' : 'Palabra'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ===== Variante KDS (default): Tailwind, sin cambios =====
  return (
    <div className="flex justify-center w-full" ref={containerRef}>
      <div className="flex flex-col items-center w-full max-w-2xl gap-2 relative">
        <div className="flex items-center gap-3 w-full">
          <div
            className={`flex items-center rounded-lg border-2 flex-1 transition-colors ${
              isSearching
                ? 'border-blue-400 animate-pulse bg-gray-700'
                : 'border-gray-600 bg-gray-700 focus-within:border-blue-500'
            }`}
          >
            {/* Lupa presionable opcional */}
            <button
              onClick={handleSearchClick}
              className={`mx-3 transition-colors ${
                isSearching
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-blue-400 cursor-pointer'
              }`}
              title="Buscar"
              aria-label="Buscar"
              type="button"
            >
              {isSearching ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSearch />
              )}
            </button>
            <input
              ref={inputRef}
              className="appearance-none bg-transparent border-none w-full text-white py-3 px-2 leading-tight focus:outline-none rounded-lg text-lg"
              type="text"
              placeholder="Buscar por nombre o código (L1, M23, D345)..."
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
                type="button"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Contador de platos y comandas encontradas (solo si hay búsqueda) */}
          {hayFiltroActivo && (
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className={`px-3 py-1 rounded-full font-medium flex items-center gap-2 whitespace-nowrap ${
                totalPlatosEncontrados > 0
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}>
                {totalPlatosEncontrados > 0 ? (
                  <>
                    <span>✓</span>
                    <span>
                      {totalPlatosEncontrados} plato{totalPlatosEncontrados !== 1 ? 's' : ''}
                      {' · '}
                      {totalComandasEncontradas} comanda{totalComandasEncontradas !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span>✗</span>
                    <span>{isSearching ? 'Buscando...' : 'Sin resultados'}</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Sugerencias cuando no hay resultados */}
        {hayFiltroActivo && sugerencias.length > 0 && totalPlatosEncontrados === 0 && !isSearching && (
          <div className="text-gray-400 text-xs -mt-1">Prueba las sugerencias</div>
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