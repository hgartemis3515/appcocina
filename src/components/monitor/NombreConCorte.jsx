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
export default function NombreConCorte({ texto, activo, style }) {
  const ref = useRef(null);
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
      setLineas(partirTextoConGuion(texto, (s) => medir(s) <= ancho + 0.5));
    };
    pintar();
    const ro = new ResizeObserver(pintar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [texto, activo]);

  if (!activo) {
    return <span style={style}>{texto}</span>;
  }
  return (
    <span
      ref={ref}
      style={{
        ...style,
        display: 'block',
        minWidth: 0,
        maxWidth: '100%',
        whiteSpace: 'pre-line',
        wordBreak: 'normal',
        overflowWrap: 'normal',
      }}
    >
      {lineas ? lineas.join('\n') : texto}
    </span>
  );
}
