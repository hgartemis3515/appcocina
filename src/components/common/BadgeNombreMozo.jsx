import React from 'react';
import useConfiguracionCocina from '../../hooks/useConfiguracionCocina';
import { getMozoNombre } from '../../utils/ticketSort';
import {
  estiloMozoNombreKds,
  resolverFondoNombreMozo,
  colorPerfilDeTicket,
  colorLetraDeTicket,
} from '../../utils/estiloMozoNombreKds';

/**
 * Recuadro de color solo si el mozo eligió color de perfil o se fuerza uno único.
 * La letra usa colorLetraPerfil de Usuarios si existe.
 */
export default function BadgeNombreMozo({
  nombre,
  colorPerfil,
  colorLetra,
  ticket,
  prefix = '',
  className = '',
}) {
  const cocina = useConfiguracionCocina();
  const perfil = colorPerfil || (ticket ? colorPerfilDeTicket(ticket) : null);
  const letra = colorLetra || (ticket ? colorLetraDeTicket(ticket) : null);
  const texto = nombre || (ticket ? getMozoNombre(ticket) : '');
  const fondo = resolverFondoNombreMozo({
    colorPerfil: perfil,
    configCocina: cocina,
  });
  if (!fondo && !letra) {
    return (
      <span className={className}>
        {prefix}{texto}
      </span>
    );
  }
  const estilo = estiloMozoNombreKds({}, {
    fondoOverride: fondo,
    colorOverride: letra,
  });
  return (
    <span className={className} style={estilo}>
      {prefix}{texto}
    </span>
  );
}
