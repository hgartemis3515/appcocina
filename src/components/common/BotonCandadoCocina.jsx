import React from 'react';
import { FaLock } from 'react-icons/fa';
import { usePantallaBloqueo } from '../../contexts/PantallaBloqueoContext';

export default function BotonCandadoCocina({ className = '', compact = false }) {
  const { bloquear, hasPinCocina } = usePantallaBloqueo();

  const onClick = () => {
    const res = bloquear();
    if (!res.ok && res.error) {
      window.alert(res.error);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={hasPinCocina ? 'Bloquear pantalla' : 'Configura una clave de 6 dígitos en Usuarios'}
      aria-label="Bloquear pantalla"
      className={
        className ||
        `inline-flex items-center justify-center gap-1.5 rounded text-white text-xs font-medium transition-all min-h-[44px] min-w-[44px] px-3 py-2 bg-gray-700 hover:bg-amber-700 border border-gray-500 ${
          compact ? '' : ''
        }`
      }
    >
      <FaLock className="text-amber-300" />
      {!compact && <span className="hidden sm:inline">Bloquear</span>}
    </button>
  );
}
