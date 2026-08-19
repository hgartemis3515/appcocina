/**
 * Notas del mozo en Ver Cocina Completo.
 * Formato: "- Piña para el bistec (Bistec) C1"
 *
 * C1 es el pronombre del cocinero del **plato principal**.
 * No se pinta si el que mira / atiende la línea es ese mismo cocinero.
 */

export function idCocineroDe(cocinero) {
  if (cocinero == null || cocinero === '') return '';
  if (typeof cocinero === 'string' || typeof cocinero === 'number') return String(cocinero);
  return String(cocinero.id || cocinero.cocineroId || cocinero._id || '').trim();
}

export function pronombreCocineroDe(cocinero, mapa = null) {
  if (!cocinero && !mapa) return '';
  const snap = String(cocinero?.pronombre || '').trim();
  if (snap) return snap;
  const id = idCocineroDe(cocinero);
  if (mapa && id) {
    const found = typeof mapa.get === 'function' ? mapa.get(String(id)) : mapa[String(id)];
    if (typeof found === 'string') return found.trim();
    return String(found?.pronombre || '').trim();
  }
  return '';
}

export function cocineroDesdeProcesandoPor(pp, mapa = null) {
  if (!pp || !pp.cocineroId) return null;
  const id = String(pp.cocineroId);
  return {
    id,
    cocineroId: id,
    alias: pp.alias || pp.nombre || '',
    nombre: pp.nombre || pp.alias || '',
    pronombre: String(pp.pronombre || '').trim() || (mapa && mapa.get ? (mapa.get(id) || '') : ''),
  };
}

/**
 * Pronombre del cocinero del plato principal para pintar junto a (Bistec).
 * Vacío si el flag está OFF o si coincide con algún id de `ocultarSiIds` (el mismo cocinero).
 */
export function pronombreReferenciaPrincipal(principal, opts = {}) {
  const { mapaCocineros = null, ocultarSiIds = [], mostrar = true } = opts;
  if (mostrar === false) return '';
  const texto = pronombreCocineroDe(principal, mapaCocineros);
  if (!texto) return '';
  const pid = idCocineroDe(principal);
  if (!pid) return texto;
  const hide = (Array.isArray(ocultarSiIds) ? ocultarSiIds : [ocultarSiIds])
    .map(idCocineroDe)
    .filter(Boolean);
  if (hide.some((id) => id === pid)) return '';
  return texto;
}

export function lineaNotaMonitor({ texto, nombrePlato, pronombreCocinero } = {}) {
  const t = String(texto || '').trim();
  if (!t) return '';
  const ref = nombrePlato ? `(${String(nombrePlato).trim()})` : '';
  const c = String(pronombreCocinero || '').trim();
  return ['-', t, ref, c].filter(Boolean).join(' ');
}

export function textoFranjaNotas(lineas, titulo = 'Notas:') {
  if (!Array.isArray(lineas) || lineas.length === 0) return '';
  const pref = String(titulo || 'Notas:').trim() || 'Notas:';
  return `${pref} ${lineas.join(' ')}`;
}

function nombreComandaRef(comanda) {
  const n = comanda?.comandaNumber || comanda?.numero || comanda?.numeroMesa;
  return n ? `Comanda ${n}` : 'Comanda';
}

/**
 * Recorre grupos de Ver Cocina ({ platos: [{ plato, comanda, cocinero }] }).
 */
export function recolectarNotasMonitor(grupos, opts = {}) {
  const {
    mapaCocineros = null,
    nombrePlatoFn,
    mostrarPronombre = true,
    ocultarSiCocineroId = null,
  } = opts;
  const lineas = [];
  const seenPlato = new Set();
  const seenComanda = new Set();
  const list = Array.isArray(grupos) ? grupos : [];

  for (const g of list) {
    const rows = Array.isArray(g?.platos) && g.platos.length
      ? g.platos
      : [{ plato: g?.plato, comanda: g?.comanda, cocinero: g?.cocinero, cocineroPrincipal: g?.cocineroPrincipal }];
    for (const row of rows) {
      const plato = row?.plato || row;
      if (!plato) continue;
      const comanda = row?.comanda || g?.comanda;
      const lineaCook = row?.cocinero || g?.cocinero;
      const principal = g?.cocineroPrincipal
        || row?.cocineroPrincipal
        || cocineroDesdeProcesandoPor(plato.procesandoPor, mapaCocineros)
        || plato.procesandoPor
        || lineaCook;
      const nombre = (nombrePlatoFn ? nombrePlatoFn(plato) : null)
        || plato.nombreCocina
        || plato.nombre
        || plato.plato?.nombre
        || 'Plato';
      const pron = pronombreReferenciaPrincipal(principal, {
        mapaCocineros,
        mostrar: mostrarPronombre,
        ocultarSiIds: [ocultarSiCocineroId],
      });
      const nota = String(plato.notaEspecial || '').trim();
      const pid = String(plato._id || plato.platoId || `${comanda?._id || ''}:${nombre}`);
      if (nota && !seenPlato.has(pid)) {
        seenPlato.add(pid);
        const ln = lineaNotaMonitor({ texto: nota, nombrePlato: nombre, pronombreCocinero: pron });
        if (ln) lineas.push(ln);
      }
      const obs = String(comanda?.observaciones || '').trim();
      const cid = String(comanda?._id || comanda?.id || '');
      if (obs && cid && !seenComanda.has(cid)) {
        seenComanda.add(cid);
        const ln = lineaNotaMonitor({
          texto: obs,
          nombrePlato: nombreComandaRef(comanda),
          pronombreCocinero: pron,
        });
        if (ln) lineas.push(ln);
      }
    }
  }
  return lineas;
}
