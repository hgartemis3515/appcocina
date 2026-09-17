import React from 'react';

export default function EtiquetasTipoKds({ etiquetas }) {
  if (!Array.isArray(etiquetas) || etiquetas.length === 0) return null;
  return (
    <span className="ml-auto flex items-center gap-1 shrink-0 max-w-[55%] justify-end flex-wrap">
      {etiquetas.map((e) => (
        <span
          key={e.slug}
          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide leading-none"
          style={{ backgroundColor: e.colorFondo, color: e.colorLetra }}
          title={e.nombre}
        >
          {e.nombre}
        </span>
      ))}
    </span>
  );
}
