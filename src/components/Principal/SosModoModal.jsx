import React, { useEffect, useState } from 'react';

/**
 * Modal SOS: dos marcas independientes (TABLA local, COCINERAS global).
 */
const SosModoModal = ({
  open,
  nightMode = true,
  tablaOn,
  cocinerasOn,
  saving = false,
  error = null,
  onClose,
  onAplicar,
}) => {
  const [draftTabla, setDraftTabla] = useState(!!tablaOn);
  const [draftCocineras, setDraftCocineras] = useState(!!cocinerasOn);

  useEffect(() => {
    if (!open) return;
    setDraftTabla(!!tablaOn);
    setDraftCocineras(!!cocinerasOn);
  }, [open, tablaOn, cocinerasOn]);

  if (!open) return null;

  const bg = nightMode ? 'bg-gray-900' : 'bg-white';
  const text = nightMode ? 'text-white' : 'text-gray-900';
  const sub = nightMode ? 'text-gray-400' : 'text-gray-600';
  const row = nightMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200';

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${bg} ${text} rounded-2xl p-6 max-w-md w-full shadow-2xl border ${nightMode ? 'border-gray-700' : 'border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="sos-modal-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="sos-modal-title" className="text-xl font-black tracking-widest text-red-500">
            SOS
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${sub} hover:${text} p-2 min-h-[44px] min-w-[44px]`}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className={`${sub} text-sm mb-4`}>
          Marca qué modo activar. Se pueden usar los dos a la vez.
        </p>
        <label className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer mb-3 ${row}`}>
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-red-600"
            checked={draftTabla}
            onChange={(e) => setDraftTabla(e.target.checked)}
          />
          <span>
            <span className="font-bold block">SOS TABLA</span>
            <span className={`${sub} text-sm`}>
              Lista de platos del tablero KDS (barra derecha). Clic salta a la comanda más antigua.
            </span>
          </span>
        </label>
        <label className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer ${row}`}>
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-red-600"
            checked={draftCocineras}
            onChange={(e) => setDraftCocineras(e.target.checked)}
          />
          <span>
            <span className="font-bold block">SOS COCINERAS</span>
            <span className={`${sub} text-sm`}>
              Ver Cocina en cantidades (sin cronómetros), tipo tabla escolar, en todas las TVs.
            </span>
          </span>
        </label>
        {error && (
          <p className="text-red-400 text-sm mt-3">{error}</p>
        )}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`flex-1 py-3 rounded-lg min-h-[44px] ${nightMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => onAplicar({ tabla: draftTabla, cocineras: draftCocineras })}
            disabled={saving}
            className="flex-1 py-3 rounded-lg min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {saving ? 'Guardando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SosModoModal;
