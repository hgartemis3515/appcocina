import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaChevronDown, FaUser, FaUsers } from 'react-icons/fa';

/**
 * CocineroSelectorDropdown - Selector compacto de cocinero para el monitor.
 *
 * Reemplaza los pills por un cuadro tipo dropdown que muestra solo el
 * cocinero activo, ocupando una sola fila de ancho fijo. Mantiene la misma
 * lógica funcional del selector de pills (valor null = "General").
 *
 * Props:
 * - cocineros: Array<{ _id, alias, name, nombre, fotoUrl? }>
 * - valor: string | null   // id del cocinero seleccionado (null = General)
 * - onChange: (id: string | null) => void
 * - loading: boolean       // lista de cocineros cargando
 * - conteosPorCocinero: Map<string, number> | undefined  // opcional: "Juan (12)"
 * - colorFondo, colorTextoPrincipal, colorTextoSecundario, colorAcento
 * - disabled: boolean      // modo kiosk (cocineroIdFijo)
 * - ancho: number | string // ancho del control (default 220)
 */
const CocineroSelectorDropdown = ({
  cocineros = [],
  valor = null,
  onChange,
  loading = false,
  conteosPorCocinero = null,
  colorFondo = '#0a0a0f',
  colorTextoPrincipal = '#ffffff',
  colorTextoSecundario = '#9ca3af',
  colorAcento = '#d4af37',
  disabled = false,
  ancho = 220,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  const contenedorRef = useRef(null);
  const listaRef = useRef(null);

  // Etiqueta visible en el trigger
  const etiquetaActiva = useMemo(() => {
    if (!valor) return 'General';
    const c = cocineros.find(x => String(x._id) === String(valor));
    if (!c) return 'General';
    return c.alias || c.name || c.nombre || 'Cocinero';
  }, [valor, cocineros]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
        setResaltado(-1);
      }
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        setResaltado(-1);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [abierto]);

  // Reset resaltado al abrir
  useEffect(() => {
    if (abierto) {
      const idx = valor
        ? cocineros.findIndex(c => String(c._id) === String(valor))
        : -1;
      setResaltado(idx); // General = -1, primer cocinero = 0
    }
  }, [abierto, valor, cocineros]);

  // Scroll al item resaltado
  useEffect(() => {
    if (!abierto || !listaRef.current) return;
    const el = listaRef.current.children[resaltado + 1];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [resaltado, abierto]);

  const opciones = useMemo(() => [
    { _id: null, etiqueta: 'General' },
    ...cocineros.map(c => ({
      _id: c._id,
      etiqueta: c.alias || c.name || c.nombre || 'Cocinero',
    })),
  ], [cocineros]);

  const elegir = (id) => {
    onChange?.(id);
    setAbierto(false);
    setResaltado(-1);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!abierto && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setAbierto(true);
      return;
    }
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltado(prev => Math.min(prev + 1, opciones.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opcion = opciones[resaltado + 1] || opciones[0];
      elegir(opcion?._id ?? null);
    }
  };

  const renderConteo = (id) => {
    if (!conteosPorCocinero || !id) return null;
    const n = conteosPorCocinero.get(String(id));
    if (!n) return null;
    return (
      <span
        style={{
          marginLeft: '8px',
          fontSize: '12px',
          color: colorTextoSecundario,
          background: `${colorAcento}22`,
          padding: '1px 8px',
          borderRadius: '999px',
          fontWeight: 600,
        }}
      >
        {n}
      </span>
    );
  };

  const bordeTrigger = abierto ? colorAcento : `${colorAcento}55`;

  return (
    <div
      ref={contenedorRef}
      style={{ position: 'relative', width: typeof ancho === 'number' ? `${ancho}px` : ancho }}
    >
      {/* Trigger (cuadro selector) */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => !disabled && setAbierto(v => !v)}
        onKeyDown={onKeyDown}
        title={disabled ? 'Cocinero bloqueado en modo kiosk' : 'Seleccionar cocinero'}
        style={{
          width: '100%',
          height: '38px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: `${colorFondo}ee`,
          color: colorTextoPrincipal,
          border: `1.5px solid ${bordeTrigger}`,
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.6 : 1,
          outline: abierto ? 'none' : undefined,
          fontFamily: 'inherit',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {valor ? (
            <FaUser style={{ color: colorAcento, flexShrink: 0 }} size={12} />
          ) : (
            <FaUsers style={{ color: colorAcento, flexShrink: 0 }} size={12} />
          )}
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {loading ? 'Cargando...' : etiquetaActiva}
          </span>
          {!valor && conteosPorCocinero ? renderConteo(null) : null}
        </span>
        <FaChevronDown
          size={12}
          style={{
            color: colorTextoSecundario,
            transition: 'transform 0.2s',
            transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Lista de opciones */}
      {abierto && !disabled && (
        <div
          ref={listaRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '320px',
            overflowY: 'auto',
            background: colorFondo,
            border: `1.5px solid ${colorAcento}55`,
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            zIndex: 100,
            padding: '4px',
          }}
        >
          {/* Separador entre General y cocineros */}
          {opciones.map((op, idx) => {
            const esGeneral = op._id === null;
            const activo = esGeneral
              ? !valor
              : valor && String(op._id) === String(valor);
            const resaltadoItem = idx === resaltado + 1;
            const showDivider = esGeneral && cocineros.length > 0;

            return (
              <React.Fragment key={op._id ?? 'general'}>
                <button
                  type="button"
                  onClick={() => elegir(op._id)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: activo
                      ? `${colorAcento}22`
                      : resaltadoItem
                        ? `${colorTextoSecundario}18`
                        : 'transparent',
                    color: activo ? colorAcento : colorTextoPrincipal,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: activo ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activo && <span style={{ color: colorAcento }}>✓</span>}
                    <span>{op.etiqueta}</span>
                  </span>
                  {renderConteo(op._id)}
                </button>
                {showDivider && (
                  <div
                    style={{
                      height: '1px',
                      background: `${colorAcento}22`,
                      margin: '4px 8px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {cocineros.length === 0 && !loading && (
            <div
              style={{
                padding: '12px',
                fontSize: '13px',
                color: colorTextoSecundario,
                textAlign: 'center',
              }}
            >
              Sin cocineros activos
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CocineroSelectorDropdown;
