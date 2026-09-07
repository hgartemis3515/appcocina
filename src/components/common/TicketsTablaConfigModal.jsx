import React from 'react';
import { motion } from 'framer-motion';
import { FaCog, FaTimes } from 'react-icons/fa';

function ToggleRow({ id, label, hint, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/70 border border-gray-700 cursor-pointer hover:border-amber-500/40"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-amber-500 flex-shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-white text-sm font-medium">{label}</span>
        {hint ? <span className="block text-gray-400 text-xs mt-0.5 leading-snug">{hint}</span> : null}
      </span>
    </label>
  );
}

export default function TicketsTablaConfigModal({ prefs, onChange, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.94 }}
        className="bg-gray-800 rounded-xl p-5 max-w-md w-full border border-gray-600 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FaCog className="text-amber-400" />
            <h4 className="text-white font-bold text-lg">Personalizar tabla</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:text-white"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <p className="text-gray-400 text-xs mb-4">
          Aplica a Básico, Avanzado y Mozos pendientes. Se guarda en este dispositivo.
        </p>

        <div className="space-y-4">
          <section>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Visualización</p>
            <ToggleRow
              id="tickets-ocultar-guarniciones"
              label="Ocultar guarniciones"
              hint="Las comandas muestran solo platos, sin complementos ni guarniciones."
              checked={!!prefs.ocultarGuarniciones}
              onChange={(v) => onChange({ ocultarGuarniciones: v })}
            />
          </section>
          <section>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Impresión</p>
            <ToggleRow
              id="tickets-imprimir-sin-guarniciones"
              label="No imprimir guarniciones"
              hint="Al imprimir la comanda se listan solo los platos."
              checked={!!prefs.imprimirSinGuarniciones}
              onChange={(v) => onChange({ imprimirSinGuarniciones: v })}
            />
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold"
        >
          Listo
        </button>
      </motion.div>
    </motion.div>
  );
}
