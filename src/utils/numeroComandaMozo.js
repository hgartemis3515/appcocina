import { numeroComandaVisible } from './numeroComandaVisible';
import {
  colorLetraDeComanda,
  colorLetraDeTicket,
  colorPerfilDeComanda,
  colorPerfilDeTicket,
} from './estiloMozoNombreKds';

function nombreDe(c) {
  return String(
    c?.mozos?.name
    || c?.mozoNombre
    || c?.nombreMozo
    || (typeof c?.mozo === 'string' ? c.mozo : c?.mozo?.name)
    || ''
  ).trim();
}

function numsMozo(comandas) {
  const nums = [];
  for (const c of comandas || []) {
    const n = Number(c?.numeroComandaMozo);
    if (Number.isFinite(n) && n > 0 && !nums.includes(n)) nums.push(n);
  }
  return nums;
}

/** `Jose 1` o `Jose 1+2 · Ana 3`. El nombre va delante del número del mozo. */
export function etiquetaMozosComandas(comandas, nombreFallback = '') {
  const ordenadas = [...(comandas || [])].sort(
    (a, b) => (Number(numeroComandaVisible(b)) || 0) - (Number(numeroComandaVisible(a)) || 0)
  );
  const grupos = new Map();
  for (const c of ordenadas) {
    const nombre = nombreDe(c);
    if (!nombre || nombre === 'Sin asignar' || nombre === 'Sin mozo') continue;
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    const n = Number(c?.numeroComandaMozo);
    if (Number.isFinite(n) && n > 0) grupos.get(nombre).push(n);
  }
  if (grupos.size) {
    return [...grupos.entries()]
      .map(([nombre, nums]) => (nums.length ? `${nombre} ${nums.join('+')}` : nombre))
      .join(' · ');
  }
  const fb = String(nombreFallback || '').trim();
  const nums = numsMozo(ordenadas);
  if (fb && fb !== 'Sin asignar' && fb !== 'Sin mozo' && nums.length) return `${fb} ${nums.join('+')}`;
  return fb;
}

export function etiquetaMozoTicket(ticket) {
  if (!ticket) return '';
  const embebidas = (ticket.comandas || []).filter((c) => c && typeof c === 'object');
  const nombre = nombreDe(ticket) || 'Sin mozo';
  if (embebidas.length) {
    const et = etiquetaMozosComandas(embebidas, nombre);
    if (et) return et;
  }
  const n = Number(ticket.numeroComandaMozo);
  if (Number.isFinite(n) && n > 0) return `${nombre} ${n}`;
  return nombre;
}

export function etiquetaMozoDeTickets(tickets) {
  const docs = [];
  for (const t of tickets || []) {
    const embebidas = (t?.comandas || []).filter((c) => c && typeof c === 'object');
    if (embebidas.length) docs.push(...embebidas);
    else if (t) docs.push(t);
  }
  const et = etiquetaMozosComandas(docs);
  if (et) return et;
  const nombre = (tickets || []).map((t) => nombreDe(t)).find((n) => n && n !== 'Sin asignar' && n !== 'Sin mozo');
  return etiquetaMozosComandas(docs, nombre || '');
}

function anotarColorMozo(map, nombre, perfil, letra) {
  const key = String(nombre || '').trim().toLowerCase();
  if (!key || key === 'sin mozo' || key === 'sin asignar') return;
  const prev = map.get(key) || { colorPerfil: null, colorLetra: null };
  if (!prev.colorPerfil && perfil) prev.colorPerfil = perfil;
  if (!prev.colorLetra && letra) prev.colorLetra = letra;
  map.set(key, prev);
}

/**
 * Una parte por mozo del grupo, con su color de perfil.
 * Al juntar comandas el recuadro sigue el color ya guardado del mozo.
 */
export function partesMozoConColor(tickets) {
  const docs = [];
  const colores = new Map();
  for (const t of tickets || []) {
    anotarColorMozo(colores, nombreDe(t), colorPerfilDeTicket(t), colorLetraDeTicket(t));
    const embebidas = (t?.comandas || []).filter((c) => c && typeof c === 'object');
    if (embebidas.length) {
      docs.push(...embebidas);
      for (const c of embebidas) {
        anotarColorMozo(
          colores,
          nombreDe(c),
          colorPerfilDeComanda(c) || colorPerfilDeTicket(t),
          colorLetraDeComanda(c) || colorLetraDeTicket(t)
        );
      }
    } else if (t) {
      docs.push(t);
    }
  }

  const ordenadas = [...docs].sort(
    (a, b) => (Number(numeroComandaVisible(b)) || 0) - (Number(numeroComandaVisible(a)) || 0)
  );
  const grupos = new Map();
  for (const c of ordenadas) {
    const nombre = nombreDe(c);
    if (!nombre || nombre === 'Sin asignar' || nombre === 'Sin mozo') continue;
    if (!grupos.has(nombre)) grupos.set(nombre, []);
    const n = Number(c?.numeroComandaMozo);
    if (Number.isFinite(n) && n > 0 && !grupos.get(nombre).includes(n)) grupos.get(nombre).push(n);
  }

  const armar = (nombre, nums) => {
    const col = colores.get(String(nombre).trim().toLowerCase()) || {};
    return {
      nombre,
      etiqueta: nums.length ? `${nombre} ${nums.join('+')}` : nombre,
      colorPerfil: col.colorPerfil || null,
      colorLetra: col.colorLetra || null,
    };
  };

  if (grupos.size) {
    return [...grupos.entries()].map(([nombre, nums]) => armar(nombre, nums));
  }

  const nombre = (tickets || []).map((t) => nombreDe(t)).find((n) => n && n !== 'Sin asignar' && n !== 'Sin mozo');
  if (!nombre) return [];
  return [armar(nombre, numsMozo(ordenadas))];
}
