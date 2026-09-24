import React, { useState } from 'react';
import { formatCurrency } from '../../utils/ticketAprobacionUi';

export default function TotalCuentaCobro({ vista, neto, montoDesc = 0 }) {
  const [historial, setHistorial] = useState(false);
  if (!vista) {
    return (
      <>
        {formatCurrency(neto)}
        {montoDesc > 0 && (
          <div className="text-[10px] text-red-400 font-normal">-{formatCurrency(montoDesc)}</div>
        )}
      </>
    );
  }
  return (
    <div className="text-right">
      <div className="text-white font-bold">{formatCurrency(vista.bill)}</div>
      {vista.mostrarAbonos && vista.abonos.map((a) => (
        <div key={a.id} className="text-[11px] text-red-400 font-semibold leading-tight">
          -{formatCurrency(a.monto)} PA
          {a.ticketNumber != null ? ` · Ticket #${a.ticketNumber}` : ''}
          {a.metodo ? ` · ${a.metodo}` : ''}
        </div>
      ))}
      {vista.mostrarAbonos && (
        <div className="text-[11px] text-amber-200 font-semibold">
          Restante a cobrar {formatCurrency(vista.restante)}
        </div>
      )}
      {vista.mostrarHistorial && (
        <button
          type="button"
          className="mt-1 text-[11px] text-violet-300 underline"
          onClick={(e) => { e.stopPropagation(); setHistorial(true); }}
        >
          Historial
        </button>
      )}
      {historial && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setHistorial(false)}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-full max-w-sm text-left" onClick={(e) => e.stopPropagation()}>
            <div className="text-white font-bold mb-2">Historial de pagos</div>
            {vista.pagos.map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-1 border-b border-gray-800">
                <span className="text-gray-300">
                  {p.abono ? 'PA' : 'Cobro'}
                  {p.ticketNumber != null ? ` #${p.ticketNumber}` : ''}
                  {p.metodo ? ` · ${p.metodo}` : ''}
                </span>
                <span className="text-white font-semibold">{formatCurrency(p.monto)}</span>
              </div>
            ))}
            <button type="button" className="mt-3 text-sm text-gray-300" onClick={() => setHistorial(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
