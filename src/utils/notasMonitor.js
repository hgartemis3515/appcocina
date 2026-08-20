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

/** Color / tamaño / fuente del C1 junto a (Bistec). Por defecto hereda el plato referencial. */
export function tokensEstiloPronombreGuarnicion(configVisual, base = {}) {
  const heredar = configVisual?.heredarEstiloPronombrePadre !== false;
  const color = base.color;
  const fontSize = base.fontSize;
  const fontFamily = base.fontFamily;
  if (heredar) return { color, fontSize, fontFamily };
  const tam = configVisual?.tamanioFuentePronombreGuarnicion;
  return {
    color: configVisual?.colorTextoPronombreGuarnicion || color,
    fontSize: (tam != null && tam !== '') ? Number(tam) : fontSize,
    fontFamily: configVisual?.fuenteFamiliaPronombreGuarnicion || fontFamily,
  };
}

/** Texto de nota en tarjeta / lista: "-Nota: Pepe" */
export function formatoNotaEnCuadro(texto) {
  const t = String(texto || '').trim();
  if (!t) return '';
  if (/^-\s*nota\s*:/i.test(t)) {
    return t.replace(/^-\s*nota\s*:/i, '-Nota:');
  }
  const limpio = t.replace(/^-\s+/, '').trim();
  return limpio ? `-Nota: ${limpio}` : '';
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

/** Textos crudos (nota especial + observación) de un grupo, sin el formato de franja. */
export function textosNotasDeGrupo(grupo) {
  const seen = new Set();
  const out = [];
  for (const item of (grupo?.platos || [])) {
    const plato = item?.plato || item;
    const comanda = item?.comanda;
    const nota = String(plato?.notaEspecial || plato?.nota || '').trim();
    if (nota && !seen.has(`n:${nota}`)) {
      seen.add(`n:${nota}`);
      out.push(nota);
    }
    const obs = String(comanda?.observaciones || '').trim();
    if (obs && !seen.has(`o:${obs}`)) {
      seen.add(`o:${obs}`);
      out.push(obs);
    }
  }
  return out;
}

export function clavePadreMonitor(comandaId, platoIndex) {
  if (comandaId == null || comandaId === '' || platoIndex == null || platoIndex === '' || platoIndex < 0) {
    return '';
  }
  return `${String(comandaId)}:${platoIndex}`;
}

export function clavesPadreDeItemMonitor(item) {
  const s = new Set();
  if (!item) return s;
  const propia = clavePadreMonitor(item.comandaId, item.platoIndex);
  if (propia) s.add(propia);
  for (const t of item.timers || []) {
    const k = clavePadreMonitor(t.comandaId, t.platoIndex);
    if (k) s.add(k);
  }
  return s;
}

/**
 * En platos: la nota va al cuadro solo si ese plato no tiene guarnición en el panel derecho.
 * hayNotaCuadro queda siempre (sirve para forzar marco con cuadros apagados).
 */
export function anexarNotasCuadroItems(items, clavesGuarnicion, mostrarEnTarjeta) {
  const setG = clavesGuarnicion instanceof Set ? clavesGuarnicion : new Set(clavesGuarnicion || []);
  return (Array.isArray(items) ? items : []).map((item) => {
    const notas = textosNotasDeGrupo(item);
    const hayNotaCuadro = notas.length > 0;
    if (!hayNotaCuadro) return item;
    const keys = clavesPadreDeItemMonitor(item);
    const tieneGuarnicion = keys.size > 0 && [...keys].some((k) => setG.has(k));
    const notasCuadro = (mostrarEnTarjeta && !tieneGuarnicion) ? notas.join(' · ') : '';
    return { ...item, hayNotaCuadro, notasCuadro };
  });
}
