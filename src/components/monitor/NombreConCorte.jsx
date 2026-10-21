import React, { useLayoutEffect, useRef, useState } from 'react';
import { partirTextoConGuion } from '../../utils/cortarNombreConGuion';

function medirCon(el) {
  const cs = window.getComputedStyle(el);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.font = font;
  return (s) => ctx.measureText(s).width;
}

/**
 * Si activo, llena el ancho y corta la palabra con "-" cuando la siguiente letra no cabe.
 */
export default function NombreConCorte({ texto, activo, style, prefijo = null }) {
  const ref = useRef(null);
  const prefijoRef = useRef(null);
  const [lineas, setLineas] = useState(null);

  useLayoutEffect(() => {
    if (!activo) {
      setLineas(null);
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;
    const pintar = () => {
      const ancho = el.clientWidth;
      if (!ancho) return;
      const medir = medirCon(el);
      const reserva = prefijoRef.current ? prefijoRef.current.offsetWidth + 8 : 0;
      setLineas(partirTextoConGuion(texto, (s, primera) => {
        const limite = primera ? Math.max(12, ancho - reserva) : ancho;
        return medir(s) <= limite + 0.5;
      }));
    };
    pintar();
    const ro = new ResizeObserver(pintar);
    ro.observe(el);
    if (prefijoRef.current) ro.observe(prefijoRef.current);
    return () => ro.disconnect();
  }, [texto, activo, prefijo]);

  // En línea con el nombre: el renglón siguiente arranca a la izquierda, debajo del cuadro.
  // Un float no lo hace: overflow-wrap deja el texto en columna al lado del cuadro.
  const marca = prefijo ? (
    <span
      ref={prefijoRef}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        marginRight: 8,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {prefijo}
    </span>
  ) : null;

  if (!activo) {
    return (
      <span ref={ref} style={{ display: 'block', width: '100%', minWidth: 0, maxWidth: '100%', ...style }}>
        {marca}
        {texto}
      </span>
    );
  }
  return (
    <span
      ref={ref}
      style={{
        display: 'block',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        whiteSpace: 'pre-line',
        wordBreak: 'normal',
        overflowWrap: 'normal',
        ...style,
      }}
    >
      {marca}
      {lineas ? lineas.join('\n') : texto}
    </span>
  );
}
