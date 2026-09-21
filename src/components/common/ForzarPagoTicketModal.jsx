import React, { useEffect, useMemo, useState } from 'react';
import { FaMoneyBill } from 'react-icons/fa';
import { formatCurrency } from '../../utils/ticketAprobacionUi';
import { totalesVistaTicket } from '../../utils/ticketTotales';

const MOTIVOS_FORZAR = ['Cliente quiere pagar', 'Mozo ya cobro'];

function parseMonto(str) {
  if (str == null || str === '') return 0;
  const n = parseFloat(String(str).replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default function ForzarPagoTicketModal({ ticket, loading, onClose, onConfirm }) {
  const { bruto, neto, montoDesc } = useMemo(() => totalesVistaTicket(ticket), [ticket]);
  const total = neto;
  const [metodo, setMetodo] = useState('efectivo');
  const [motivo, setMotivo] = useState('');
  const [montoRecibidoStr, setMontoRecibidoStr] = useState(() => (total > 0 ? total.toFixed(2) : ''));

  useEffect(() => {
    setMetodo('efectivo');
    setMotivo('');
    setMontoRecibidoStr(total > 0 ? total.toFixed(2) : '');
  }, [ticket?._id, total]);

  const recibido = useMemo(() => Math.round(parseMonto(montoRecibidoStr) * 100) / 100, [montoRecibidoStr]);
  const vuelto = useMemo(() => Math.max(0, Math.round((recibido - total) * 100) / 100), [recibido, total]);
  const efectivoOk = metodo !== 'efectivo' || recibido + 0.001 >= total;

  if (!ticket) return null;

  const confirmar = () => {
    if (metodo === 'efectivo') {
      if (!efectivoOk) return;
      onConfirm({ metodoPago: metodo, montoRecibido: recibido, vuelto, motivo: motivo.trim() || null });
      return;
    }
    onConfirm({ metodoPago: metodo, montoRecibido: null, vuelto: null, motivo: motivo.trim() || null });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-2 text-white font-semibold mb-2">
          <FaMoneyBill className="text-amber-400" />
          Forzar pago
        </div>
        <p className="text-sm text-gray-300 mb-2">
          {ticket._esGrupoComandas
            ? `Grupo de ${ticket._grupoTickets?.length || 0} comandas · Mesa ${ticket.numMesa || '?'}. Se cobra el total del grupo como pago adelantado. El mozo libera la mesa cuando entregue.`
            : `Mesa ${ticket.numMesa || '?'}. Se registra el cobro como pago adelantado. El mozo libera la mesa cuando entregue.`}
        </p>
        {montoDesc > 0 && (
          <div className="text-xs space-y-0.5 mb-2">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(bruto)}</span>
            </div>
            <div className="text-red-400">Descuento: -{formatCurrency(montoDesc)}</div>
          </div>
        )}
        <div className="flex justify-between text-sm text-white font-semibold mb-3">
          <span>Total a cobrar</span>
          <span>{formatCurrency(total)}</span>
        </div>
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
        <label className="block text-xs text-gray-400 mb-1">Motivo para forzar pago (opcional)</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {MOTIVOS_FORZAR.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setMotivo(label)}
              className={`px-2 py-2 rounded-md text-xs font-semibold border ${
                motivo === label
                  ? 'bg-amber-600 border-amber-400 text-white'
                  : 'bg-gray-900 border-gray-600 text-gray-200 hover:border-amber-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="O escribe un motivo"
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-2 py-2 text-sm text-white mb-3"
        />
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
