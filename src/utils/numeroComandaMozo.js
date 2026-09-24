import { numeroComandaVisible } from './numeroComandaVisible';

function nombreDe(c) {
  return String(
    c?.mozos?.name
    || c?.mozoNombre
    || c?.nombreMozo
    || (typeof c?.mozo === 'string' ? c.mozo : c?.mozo?.name)
    || ''
  ).trim();
}

/** `1 Jose` o `1+2 Jose · 3 Ana`. */
export function etiquetaMozosComandas(comandas) {
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
  return [...grupos.entries()]
    .map(([nombre, nums]) => (nums.length ? `${nums.join('+')} ${nombre}` : nombre))
    .join(' · ');
}

export function etiquetaMozoTicket(ticket) {
  if (!ticket) return '';
  const embebidas = (ticket.comandas || []).filter((c) => c && typeof c === 'object');
  if (embebidas.length) {
    const et = etiquetaMozosComandas(embebidas);
    if (et) return et;
  }
  const nombre = nombreDe(ticket) || 'Sin mozo';
  const n = Number(ticket.numeroComandaMozo);
  if (Number.isFinite(n) && n > 0) return `${n} ${nombre}`;
  return nombre;
}

export function etiquetaMozoDeTickets(tickets) {
  const docs = [];
  for (const t of tickets || []) {
    const embebidas = (t?.comandas || []).filter((c) => c && typeof c === 'object');
    if (embebidas.length) docs.push(...embebidas);
    else if (t) docs.push(t);
  }
  return etiquetaMozosComandas(docs);
}
