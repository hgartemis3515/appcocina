/**
 * ¿Este aviso de noticias.html debe verse en esta superficie de cocina?
 * - kds: tabla de comandas
 * - monitor: Ver cocina completa abierto por Distribuir (modo=completo-fijo / kiosk)
 * - caja: tickets
 */

function alcanceDe(aviso) {
  const canal = aviso?.canal;
  if (canal === 'kds' || canal === 'pantallas' || canal === 'todas' || canal === 'caja') return canal;
  const alcance = aviso?.cocinaAlcance;
  if (alcance === 'kds' || alcance === 'pantallas' || alcance === 'todas' || alcance === 'caja' || alcance === 'ninguna') {
    return alcance;
  }
  return 'todas';
}

function idsDe(valor) {
  if (valor == null || valor === '') return [];
  if (Array.isArray(valor)) return valor.flatMap(idsDe);
  return String(valor).split(',').map((s) => s.trim()).filter(Boolean);
}

function numerosDe(lista) {
  return (Array.isArray(lista) ? lista : [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
}

function pantallaCoincide(aviso, superficie) {
  const pantallas = numerosDe(aviso?.pantallas);
  if (pantallas.length) {
    const numero = Number(superficie?.numeroPantalla);
    return Number.isFinite(numero) && pantallas.includes(numero);
  }
  const cocineros = idsDe(aviso?.cocinaCocineroIds);
  const mios = idsDe(superficie?.cocineroId);
  return cocineros.length > 0 && mios.some((id) => cocineros.includes(id));
}

/** La tabla KDS suena aunque el aviso solo se pinte en un monitor o en caja. */
export function noticiaSuenaEnTablaKds(aviso) {
  const destinos = Array.isArray(aviso?.destinos) ? aviso.destinos : [];
  const alcance = alcanceDe(aviso);
  if (destinos.includes('caja') || alcance === 'caja') return true;
  if (alcance === 'ninguna') return false;
  if (destinos.length && !destinos.includes('cocina')) return false;
  return alcance === 'kds' || alcance === 'pantallas' || alcance === 'todas';
}

export function noticiaAplicaEnPantalla(aviso, superficie) {
  const tipo = superficie?.tipo || 'kds';
  const destinos = Array.isArray(aviso?.destinos) ? aviso.destinos : [];
  const alcance = alcanceDe(aviso);
  const esCaja = destinos.includes('caja') || alcance === 'caja';

  if (tipo === 'caja') return esCaja;
  if (esCaja || alcance === 'ninguna' || alcance === 'caja') return false;
  if (destinos.length && !destinos.includes('cocina')) return false;

  if (alcance === 'kds') return tipo === 'kds';
  if (alcance === 'pantallas') return tipo === 'monitor' && pantallaCoincide(aviso, superficie);
  return true;
}
