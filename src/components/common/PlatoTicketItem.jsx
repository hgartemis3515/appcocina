import React from 'react';
import { getComplementosDePlato, formatComplementoTexto } from '../../utils/platoComplementos';

const formatCurrency = (amount) => `S/. ${Number(amount || 0).toFixed(2)}`;

/**
 * Línea de plato en tickets de comandas / pagos adelantados.
 * Muestra nombre, cantidad, tipo servicio, complementos y nota especial.
 */
export default function PlatoTicketItem({
  plato,
  size = 'sm',
  showSubtotal = true,
  className = '',
}) {
  if (!plato) return null;

  const complementos = getComplementosDePlato(plato);
  const nota = (plato.notaEspecial || '').trim();
  const isCompact = size === 'xs';
  const nombreClass = isCompact ? 'text-gray-200 text-xs' : 'text-gray-200 text-sm';
  const metaClass = isCompact ? 'text-[10px]' : 'text-xs';

  return (
    <div className={`py-1 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <span className={`text-gray-400 flex-shrink-0 ${metaClass}`}>
            {plato.cantidad}x
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`${nombreClass} truncate`}>
                {plato.nombre}
              </span>
              {plato.tipoServicio === 'para_llevar' && (
                <span className={`${metaClass} bg-amber-600/30 text-amber-300 px-1 rounded flex-shrink-0`}>
                  {isCompact ? 'Llevar' : 'Para llevar'}
                </span>
              )}
            </div>

            {complementos.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {complementos.map((comp, i) => (
                  <div
                    key={comp.key || i}
                    className={`${metaClass} leading-tight pl-0.5 text-gray-400`}
                  >
                    <span className="text-gray-500">└ </span>
                    {comp.grupo ? (
                      <>
                        <span className="text-gray-500 font-medium">{comp.grupo}:</span>{' '}
                        <span className="text-gray-300">{comp.opcion}</span>
                        <span className="text-gray-500"> x{comp.cantidad || 1}</span>
                      </>
                    ) : (
                      <span className="text-gray-300">
                        · {formatComplementoTexto(comp)}
                      </span>
                    )}
                    {comp.precio != null && comp.precio > 0 && (
                      <span className="text-gray-500"> ({formatCurrency(comp.precio)})</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {nota && (
              <p className={`${metaClass} text-amber-400/90 mt-0.5 leading-tight`}>
                📌 {nota}
              </p>
            )}
          </div>
        </div>

        {showSubtotal && (
          <span className={`text-gray-400 flex-shrink-0 ${metaClass}`}>
            {formatCurrency(plato.subtotal)}
          </span>
        )}
      </div>
    </div>
  );
}
