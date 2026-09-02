import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaLock } from 'react-icons/fa';
import { usePantallaBloqueo } from '../../contexts/PantallaBloqueoContext';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Overlay de bloqueo táctil: teclado 1–9 + 0, PIN de 4 dígitos mostrado como *.
 */
export default function PantallaBloqueoOverlay() {
  const { bloqueada, verificarPin } = usePantallaBloqueo();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (!bloqueada) {
      setPin('');
      setError('');
      enviandoRef.current = false;
    }
  }, [bloqueada]);

  const intentarDesbloquear = useCallback(async (digits) => {
    if (enviandoRef.current) return;
    if (!/^\d{4}$/.test(digits)) return;
    enviandoRef.current = true;
    setVerificando(true);
    const res = await verificarPin(digits);
    setVerificando(false);
    if (!res.ok) {
      setError(res.error || 'Clave incorrecta');
      setPin('');
      enviandoRef.current = false;
    }
  }, [verificarPin]);

  const agregarDigito = useCallback((d) => {
    if (verificando) return;
    setError('');
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = `${prev}${d}`;
      if (next.length === 4) {
        setTimeout(() => intentarDesbloquear(next), 40);
      }
      return next;
    });
  }, [intentarDesbloquear, verificando]);

  const borrar = useCallback(() => {
    if (verificando) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, [verificando]);

  useEffect(() => {
    if (!bloqueada) return undefined;
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        agregarDigito(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        borrar();
      } else if (e.key === 'Enter' && pin.length === 4) {
        e.preventDefault();
        intentarDesbloquear(pin);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [bloqueada, agregarDigito, borrar, intentarDesbloquear, pin, verificando]);

  if (!bloqueada) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/95"
      style={{ zIndex: 40000 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-sm px-6 select-none">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center mb-4">
            <FaLock className="text-amber-400 text-2xl" />
          </div>
          <h2 className="text-white text-xl font-bold">Pantalla bloqueada</h2>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Ingresa la clave de 4 dígitos (teclado o toque)
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-8" aria-label="Clave ingresada">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
                pin.length > i
                  ? 'border-amber-400 bg-gray-800 text-amber-300'
                  : 'border-gray-600 bg-gray-900 text-transparent'
              }`}
            >
              {pin.length > i ? '*' : '·'}
            </div>
          ))}
        </div>

        {error ? (
          <p className="text-red-400 text-sm text-center mb-4 min-h-[1.25rem]">{error}</p>
        ) : (
          <p className="text-transparent text-sm text-center mb-4 min-h-[1.25rem]">.</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {TECLAS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={verificando}
              onClick={() => agregarDigito(n)}
              className="min-h-[64px] rounded-2xl bg-gray-800 hover:bg-gray-700 active:bg-amber-700 text-white text-2xl font-bold border border-gray-600 active:border-amber-400 transition-colors"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={verificando}
            onClick={borrar}
            className="min-h-[64px] rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-lg font-semibold border border-gray-600"
          >
            ⌫
          </button>
          <button
            type="button"
            disabled={verificando}
            onClick={() => agregarDigito('0')}
            className="min-h-[64px] rounded-2xl bg-gray-800 hover:bg-gray-700 active:bg-amber-700 text-white text-2xl font-bold border border-gray-600 active:border-amber-400"
          >
            0
          </button>
          <button
            type="button"
            disabled={verificando || pin.length !== 4}
            onClick={() => intentarDesbloquear(pin)}
            className="min-h-[64px] rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-lg font-bold border border-amber-500"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
