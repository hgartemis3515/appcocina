import React from 'react';
import useConfiguracionCocina from '../../hooks/useConfiguracionCocina';
import { getMozoNombre } from '../../utils/ticketSort';
import { etiquetaMozoTicket, partesMozoConColor } from '../../utils/numeroComandaMozo';
import {
  estiloBadgeNombreMozo,
  colorPerfilDeTicket,
  colorLetraDeTicket,
} from '../../utils/estiloMozoNombreKds';

function textoMozoVisible(texto, verNumeros) {
  const raw = String(texto || '');
  if (verNumeros) return raw;
  return raw.replace(/\s+\d+(?:\+\d+)*/g, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Recuadro de color: perfil del mozo, color forzado, o config de Personalizar tabla
 * (vista Básico: fondo, letra y tamaño).
 */
export default function BadgeNombreMozo({
  nombre,
  colorPerfil,
  colorLetra,
  ticket,
  prefix = '',
  className = '',
  configVista,
}) {
  const cocina = useConfiguracionCocina();
  const perfil = colorPerfil || (ticket ? colorPerfilDeTicket(ticket) : null);
  const letra = colorLetra || (ticket ? colorLetraDeTicket(ticket) : null);
  const crudo = (ticket ? etiquetaMozoTicket(ticket) : '') || nombre || (ticket ? getMozoNombre(ticket) : '');
  const texto = textoMozoVisible(crudo, configVista?.verNumerosMozo === true);
  const estilo = estiloBadgeNombreMozo({
    configVista,
    colorPerfil: perfil,
    colorLetra: letra,
    configCocina: cocina,
  });
  if (!estilo) {
    return (
      <span className={className}>
        {prefix}{texto}
      </span>
    );
  }
  return (
    <span className={className} style={estilo}>
      {prefix}{texto}
    </span>
  );
}

export function NombreClienteResalte({ nombres, className = '' }) {
  const lista = (nombres || []).map((n) => String(n || '').trim()).filter(Boolean);
  if (!lista.length) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {lista.map((n) => (
        <span
          key={n}
          className="px-2 py-0.5 rounded-md bg-[#6d28d9] text-white text-xs font-extrabold leading-tight shadow-sm"
          title={n}
        >
          {n}
        </span>
      ))}
    </span>
  );
}

/** Nombres del grupo de comandas, cada mozo con su color de perfil. */
export function BadgesMozoDeTickets({ tickets, configVista, className = '' }) {
  const partes = partesMozoConColor(tickets);
  if (partes.length === 0) {
    return <BadgeNombreMozo configVista={configVista} className={className} />;
  }
  if (partes.length === 1) {
    const p = partes[0];
    return (
      <BadgeNombreMozo
        nombre={p.etiqueta}
        colorPerfil={p.colorPerfil}
        colorLetra={p.colorLetra}
        configVista={configVista}
        className={className}
      />
    );
  }
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {partes.map((p) => (
        <BadgeNombreMozo
          key={p.etiqueta}
          nombre={p.etiqueta}
          colorPerfil={p.colorPerfil}
          colorLetra={p.colorLetra}
          configVista={configVista}
        />
      ))}
    </span>
  );
}
