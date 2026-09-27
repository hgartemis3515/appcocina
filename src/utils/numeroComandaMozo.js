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

function numsMozo(comandas) {
  const nums = [];
  for (const c of comandas || []) {
    const n = Number(c?.numeroComandaMozo);
    if (Number.isFinite(n) && n > 0 && !nums.includes(n)) nums.push(n);
  }
  return nums;
}

/** `1 Jose` o `1+2 Jose · 3 Ana`. El número del mozo va a la izquierda. */
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
      .map(([nombre, nums]) => (nums.length ? `${nums.join('+')} ${nombre}` : nombre))
      .join(' · ');
  }
  const fb = String(nombreFallback || '').trim();
  const nums = numsMozo(ordenadas);
  if (fb && fb !== 'Sin asignar' && fb !== 'Sin mozo' && nums.length) return `${nums.join('+')} ${fb}`;
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
  const et = etiquetaMozosComandas(docs);
  if (et) return et;
  const nombre = (tickets || []).map((t) => nombreDe(t)).find((n) => n && n !== 'Sin asignar' && n !== 'Sin mozo');
  return etiquetaMozosComandas(docs, nombre || '');
}
