import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCog, FaTimes } from 'react-icons/fa';
import { hexParaColorPicker, hexValidoOrdenCola } from '../../utils/estiloNumeroOrdenKds';
import {
  TICKETS_TABLA_VISUAL_DEFAULT,
  TICKETS_TABLA_TEXTO_TAMANO_MIN,
  TICKETS_TABLA_TEXTO_TAMANO_MAX,
} from '../../utils/estiloTicketsTabla';

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

function ColorField({ label, value, fallback, onChange, allowEmpty }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  const picker = hexParaColorPicker(value, fallback);
  const commit = (v) => {
    setText(v);
    if (allowEmpty && (v === '' || v === 'none' || v === 'transparent')) {
      onChange('');
      return;
    }
    if (hexValidoOrdenCola(v)) onChange(v);
  };
  return (
    <label className="block">
      <span className="block text-gray-300 text-xs font-semibold mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={picker}
          onChange={(e) => commit(e.target.value)}
          className="h-9 w-11 rounded border border-gray-500 bg-transparent cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={text}
          placeholder={allowEmpty ? 'Sin fondo' : fallback}
          onChange={(e) => commit(e.target.value)}
          className="flex-1 bg-gray-900 text-gray-200 p-2 rounded-lg border border-gray-600 font-mono text-xs min-w-0"
          maxLength={7}
          spellCheck={false}
        />
        {allowEmpty && value ? (
          <button
            type="button"
            onClick={() => commit('')}
            className="text-[10px] text-gray-400 hover:text-white px-1.5 py-1 rounded border border-gray-600 flex-shrink-0"
          >
            Quitar
          </button>
        ) : null}
      </div>
    </label>
  );
}

export default function TicketsTablaConfigModal({ prefs, onChange, onClose }) {
  const tam = Number(prefs.textoTamano) || TICKETS_TABLA_VISUAL_DEFAULT.textoTamano;
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
        className="bg-gray-800 rounded-xl p-5 max-w-lg w-full border border-gray-600 shadow-2xl max-h-[90vh] overflow-y-auto"
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
          Guarniciones: Básico, Avanzado y Mozos. Colores PARA LLEVAR y letras: vista Básico. Se guarda en este dispositivo.
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
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">PARA LLEVAR (Básico)</p>
              <button
                type="button"
                className="text-[10px] text-amber-400 hover:text-amber-300"
                onClick={() => onChange({ ...TICKETS_TABLA_VISUAL_DEFAULT })}
              >
                Restablecer colores
              </button>
            </div>
            <p className="text-gray-500 text-[11px] mb-2 leading-snug">
              Pinta platos, total y cliente. El recuadro de comanda / ticket / mesa / mozo / fecha no cambia.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorField
                label="Fondo"
                value={prefs.paraLlevarFondo}
                fallback={TICKETS_TABLA_VISUAL_DEFAULT.paraLlevarFondo}
                onChange={(v) => onChange({ paraLlevarFondo: v })}
              />
              <ColorField
                label="Contorno"
                value={prefs.paraLlevarContorno}
                fallback={TICKETS_TABLA_VISUAL_DEFAULT.paraLlevarContorno}
                onChange={(v) => onChange({ paraLlevarContorno: v })}
              />
            </div>
          </section>
          <section>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Letras (Básico)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorField
                label="Platos"
                value={prefs.textoPlatosColor}
                fallback={TICKETS_TABLA_VISUAL_DEFAULT.textoPlatosColor}
                onChange={(v) => onChange({ textoPlatosColor: v })}
              />
              <ColorField
                label="Total"
                value={prefs.textoTotalColor}
                fallback={TICKETS_TABLA_VISUAL_DEFAULT.textoTotalColor}
                onChange={(v) => onChange({ textoTotalColor: v })}
              />
              <ColorField
                label="Cliente y resto"
                value={prefs.textoRestoColor}
                fallback={TICKETS_TABLA_VISUAL_DEFAULT.textoRestoColor}
                onChange={(v) => onChange({ textoRestoColor: v })}
              />
              <ColorField
                label="Fondo de las letras"
                value={prefs.textoFondo}
                fallback="#111827"
                allowEmpty
                onChange={(v) => onChange({ textoFondo: v })}
              />
            </div>
            <label className="block mt-3">
              <span className="block text-gray-300 text-xs font-semibold mb-1">
                Tamaño de letras ({tam}px)
              </span>
              <input
                type="range"
                min={TICKETS_TABLA_TEXTO_TAMANO_MIN}
                max={TICKETS_TABLA_TEXTO_TAMANO_MAX}
                value={tam}
                onChange={(e) => onChange({ textoTamano: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </label>
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
