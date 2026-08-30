import React, { useState } from 'react';
import { FaMoneyBill } from 'react-icons/fa';
import { formatCurrency } from '../../utils/ticketAprobacionUi';

export default function ForzarPagoTicketModal({ ticket, loading, onClose, onConfirm }) {
  const [metodo, setMetodo] = useState('efectivo');
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-2 text-white font-semibold mb-2">
          <FaMoneyBill className="text-amber-400" />
          Forzar pago
        </div>
        <p className="text-sm text-gray-300 mb-3">
          Mesa {ticket.numMesa || '?'} · {formatCurrency(ticket.total)}. Se registra el cobro y el ticket queda aprobado. El mozo libera la mesa cuando entregue.
        </p>
        <label className="block text-xs text-gray-400 mb-1">Método</label>
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-2 py-2 text-sm text-white mb-4"
        >
          <option value="efectivo">Efectivo</option>
          <option value="digital">YAPE/PLIN</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
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
            disabled={loading}
            onClick={() => onConfirm(metodo)}
            className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white text-sm font-medium"
          >
            {loading ? 'Cobrando…' : 'Cobrar y aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}
