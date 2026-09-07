import React from 'react';
import useConfiguracionCocina from '../../hooks/useConfiguracionCocina';
import { getMozoNombre } from '../../utils/ticketSort';
import {
  estiloMozoNombreKds,
  resolverFondoNombreMozo,
  colorPerfilDeTicket,
} from '../../utils/estiloMozoNombreKds';

/**
 * Recuadro de color solo si el mozo eligió color de perfil o se fuerza uno único.
 * Sin color personalizado: el nombre se ve como antes (texto plano).
 */
export default function BadgeNombreMozo({
  nombre,
  colorPerfil,
  ticket,
  prefix = '',
  className = '',
}) {
  const cocina = useConfiguracionCocina();
  const perfil = colorPerfil || (ticket ? colorPerfilDeTicket(ticket) : null);
  const texto = nombre || (ticket ? getMozoNombre(ticket) : '');
  const fondo = resolverFondoNombreMozo({
    colorPerfil: perfil,
    configCocina: cocina,
  });
  if (!fondo) {
    return (
      <span className={className}>
        {prefix}{texto}
      </span>
    );
  }
  const estilo = estiloMozoNombreKds({}, { fondoOverride: fondo });
  return (
    <span className={className} style={estilo}>
      {prefix}{texto}
    </span>
  );
}
