import React from 'react';
import useConfiguracionCocina from '../../hooks/useConfiguracionCocina';
import { getMozoNombre } from '../../utils/ticketSort';
import { etiquetaMozoTicket } from '../../utils/numeroComandaMozo';
import {
  estiloBadgeNombreMozo,
  colorPerfilDeTicket,
  colorLetraDeTicket,
} from '../../utils/estiloMozoNombreKds';

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
  const texto = (ticket ? etiquetaMozoTicket(ticket) : '') || nombre || (ticket ? getMozoNombre(ticket) : '');
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
