import React, { useEffect, useMemo, useState } from 'react';
import { FaMoneyBill } from 'react-icons/fa';
import { formatCurrency } from '../../utils/ticketAprobacionUi';

function parseMonto(str) {
  if (str == null || str === '') return 0;
  const n = parseFloat(String(str).replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default function ForzarPagoTicketModal({ ticket, loading, onClose, onConfirm }) {
  const [metodo, setMetodo] = useState('efectivo');
  const total = Number(ticket?.total) || 0;
  const [montoRecibidoStr, setMontoRecibidoStr] = useState(() => (total > 0 ? total.toFixed(2) : ''));

  useEffect(() => {
    const t = Number(ticket?.total) || 0;
    setMetodo('efectivo');
    setMontoRecibidoStr(t > 0 ? t.toFixed(2) : '');
  }, [ticket?._id, ticket?.total]);

  const recibido = useMemo(() => Math.round(parseMonto(montoRecibidoStr) * 100) / 100, [montoRecibidoStr]);
  const vuelto = useMemo(() => Math.max(0, Math.round((recibido - total) * 100) / 100), [recibido, total]);
  const efectivoOk = metodo !== 'efectivo' || recibido + 0.001 >= total;

  if (!ticket) return null;

  const confirmar = () => {
    if (metodo === 'efectivo') {
      if (!efectivoOk) return;
      onConfirm({ metodoPago: metodo, montoRecibido: recibido, vuelto });
      return;
    }
    onConfirm({ metodoPago: metodo, montoRecibido: null, vuelto: null });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-2 text-white font-semibold mb-2">
          <FaMoneyBill className="text-amber-400" />
          Forzar pago
        </div>
        <p className="text-sm text-gray-300 mb-3">
          Mesa {ticket.numMesa || '?'} · {formatCurrency(total)}. Se registra el cobro como pago adelantado. El mozo libera la mesa cuando entregue.
        </p>
        <label className="block text-xs text-gray-400 mb-1">Método</label>
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-2 py-2 text-sm text-white mb-3"
        >
          <option value="efectivo">Efectivo</option>
          <option value="digital">YAPE/PLIN</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
        {metodo === 'efectivo' && (
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">¿Con cuánto paga el cliente?</label>
            <input
              type="number"
              min={total}
              step="0.01"
              value={montoRecibidoStr}
              onChange={(e) => setMontoRecibidoStr(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-2 py-2 text-sm text-white"
            />
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-gray-400">Vuelto</span>
              <span className={`font-semibold ${efectivoOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(vuelto)}
              </span>
            </div>
            {!efectivoOk && (
              <p className="text-[11px] text-red-400 mt-1">El monto recibido no puede ser menor al total</p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || !efectivoOk}
            onClick={confirmar}
            className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white text-sm font-medium"
          >
            {loading ? 'Cobrando…' : 'Cobrar y aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}
