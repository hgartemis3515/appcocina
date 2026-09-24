import React, { useCallback, useEffect, useState } from 'react';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Teclado de 3 dígitos para autorizar una entrega fuera del orden #1.
 */
export default function AutorizacionOrdenPad({ abierto, onCerrar, onConfirmar }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setPin('');
      setError('');
      setEnviando(false);
    }
  }, [abierto]);

  const confirmar = useCallback(async (digits) => {
    if (enviando || !/^\d{3}$/.test(digits)) return;
    setEnviando(true);
    setError('');
    try {
      await onConfirmar(digits);
    } catch (e) {
      setError(e.message || 'Combinación incorrecta');
      setPin('');
      setEnviando(false);
    }
  }, [enviando, onConfirmar]);

  const agregar = useCallback((d) => {
    if (enviando) return;
    setError('');
    setPin((prev) => {
      if (prev.length >= 3) return prev;
      const next = `${prev}${d}`;
      if (next.length === 3) setTimeout(() => confirmar(next), 40);
      return next;
    });
  }, [confirmar, enviando]);

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        agregar(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCerrar();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [abierto, agregar, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
      <div className="w-[280px] rounded-2xl bg-zinc-950 border border-red-700 px-5 py-6 text-center">
        <div className="text-red-500 font-black tracking-widest text-sm">AUTORIZACION</div>
        <p className="text-zinc-400 text-xs mt-2">3 dígitos para entregar fuera de orden</p>
        <div className="mt-4 flex justify-center gap-3 text-2xl tracking-[0.4em] text-white font-mono">
          {[0, 1, 2].map((i) => (
            <span key={i}>{pin[i] ? '•' : '–'}</span>
          ))}
        </div>
        {error ? <p className="text-red-400 text-xs mt-2">{error}</p> : null}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {TECLAS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={enviando}
              onClick={() => agregar(d)}
              className="h-12 rounded-lg bg-zinc-800 text-white text-lg font-bold"
            >
              {d}
            </button>
          ))}
          <button type="button" onClick={onCerrar} className="h-12 rounded-lg bg-zinc-800 text-zinc-400 text-xs">
            Cerrar
          </button>
          <button type="button" disabled={enviando} onClick={() => agregar('0')} className="h-12 rounded-lg bg-zinc-800 text-white text-lg font-bold">
            0
          </button>
          <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className="h-12 rounded-lg bg-zinc-800 text-zinc-300 text-xs">
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
}
