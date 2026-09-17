/**
 * Reglas de tipo de plato en Ver cocina completo.
 * La partición usa el tipo elegido en Mozos (`tipoPedido`), no todos los tipos del catálogo.
 * soloContadorEnCocina → oculta cronómetro y # secuencial en principales (queda xN).
 * contadorGuarnicionesCocina → lo mismo en el panel de guarniciones de ese tipo.
 * particionHorizontalCocina → mitad de abajo para principales de ese tipo.
 * particionHorizontalGuarnicionesCocina → misma partición en el panel de guarniciones.
 * mostrarNombreTipoEnKds → badge con el nombre del tipo a la derecha de EN PREPARACIÓN.
 */
import { itemOcultaCronometroCocina } from './platoFlagsCocina';

export function slugTipoPedido(plato) {
  if (!plato || typeof plato !== 'object') return '';
  const raw = plato.tipoPedido != null && plato.tipoPedido !== ''
    ? plato.tipoPedido
    : (plato.plato && typeof plato.plato === 'object' && !Array.isArray(plato.plato)
      ? plato.plato.tipoPedido
      : null);
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object') {
    return String(raw.slug || raw.tipo || '').toLowerCase().trim();
  }
  return String(raw).toLowerCase().trim();
}

export function slugsTipoDePlato(plato) {
  const pedido = slugTipoPedido(plato);
  if (pedido) return [pedido];

  const out = new Set();
  const add = (v) => {
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      v.forEach(add);
      return;
    }
    if (typeof v === 'object') {
      add(v.slug || v.tipo || v.nombre);
      return;
    }
    const s = String(v).toLowerCase().trim();
    if (s) out.add(s);
  };
  add(plato?.tipos);
  add(plato?.tipo);
  add(plato?.plato?.tipos);
  add(plato?.plato?.tipo);
  return [...out];
}

export function slugsTipoDeGrupo(item) {
  const pedido = slugTipoPedido(item)
    || slugTipoPedido(item?.plato)
    || (item?.platos || [])
      .map((row) => slugTipoPedido(row) || slugTipoPedido(row?.plato))
      .find(Boolean);
  if (pedido) return [pedido];

  const out = new Set(item?.slugsTipo || []);
  slugsTipoDePlato(item).forEach((s) => out.add(s));
  slugsTipoDePlato(item?.plato).forEach((s) => out.add(s));
  for (const row of item?.platos || []) {
    slugsTipoDePlato(row).forEach((s) => out.add(s));
    slugsTipoDePlato(row?.plato).forEach((s) => out.add(s));
  }
  return [...out];
}

const HEX_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function parseHexColorKds(raw, fallback = '') {
  const s = String(raw || '').trim();
  if (!HEX_RE.test(s)) return fallback;
  if (s.length === 4) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  return s.toLowerCase();
}

export function parseReglasTiposMenu(list) {
  const soloContador = new Set();
  const contadorGuarnicion = new Set();
  const particion = new Set();
  const particionGuarnicion = new Set();
  const particionNombres = [];
  const particionGuarnicionNombres = [];
  const etiquetaKds = new Map();
  const arr = Array.isArray(list) ? list : [];
  for (const t of arr) {
    const slug = String(t?.slug || '').toLowerCase().trim();
    if (!slug) continue;
    if (t.soloContadorEnCocina === true) soloContador.add(slug);
    if (t.contadorGuarnicionesCocina === true) contadorGuarnicion.add(slug);
    const nom = String(t.nombreCorto || t.nombre || slug).trim();
    if (t.particionHorizontalCocina === true) {
      particion.add(slug);
      if (nom && !particionNombres.includes(nom)) particionNombres.push(nom);
    }
    if (t.particionHorizontalGuarnicionesCocina === true) {
      particionGuarnicion.add(slug);
      if (nom && !particionGuarnicionNombres.includes(nom)) particionGuarnicionNombres.push(nom);
    }
    if (t.mostrarNombreTipoEnKds === true) {
      etiquetaKds.set(slug, {
        nombre: nom || slug,
        colorFondo: parseHexColorKds(t.colorFondoKds, parseHexColorKds(t.color, '#ffd60a') || '#ffd60a'),
        colorLetra: parseHexColorKds(t.colorLetraKds, '#000000'),
      });
    }
  }
  return { soloContador, contadorGuarnicion, particion, particionGuarnicion, particionNombres, particionGuarnicionNombres, etiquetaKds };
}

export function anotarReglasTipoEnItems(items, reglas, opts = {}) {
  const solo = opts.paraGuarniciones
    ? (reglas?.contadorGuarnicion || new Set())
    : (reglas?.soloContador || new Set());
  const part = opts.paraGuarniciones
    ? (reglas?.particionGuarnicion || new Set())
    : (reglas?.particion || new Set());
  return (items || []).map((item) => {
    const slugs = slugsTipoDeGrupo(item);
    return {
      ...item,
      slugsTipo: slugs,
      soloContadorEnCocina: slugs.some((s) => solo.has(s)),
      ocultarCronometroCocina: itemOcultaCronometroCocina(item),
      particionHorizontalCocina: slugs.some((s) => part.has(s)),
    };
  });
}

export function partirItemsHorizontales(items) {
  const normales = [];
  const especiales = [];
  for (const it of items || []) {
    if (it?.particionHorizontalCocina) especiales.push(it);
    else normales.push(it);
  }
  return { normales, especiales, hayParticion: especiales.length > 0 };
}

export function partirBloquesHorizontales(bloques, asignarNumero) {
  const normales = [];
  const especiales = [];
  const sumQty = (tarjetas) => tarjetas.reduce((s, t) => s + (Number(t.cantidadTotal) || 0), 0);
  const num = typeof asignarNumero === 'function' ? asignarNumero : (x) => x;
  for (const b of bloques || []) {
    const tarN = (b.tarjetas || []).filter((t) => !t.particionHorizontalCocina);
    const tarE = (b.tarjetas || []).filter((t) => t.particionHorizontalCocina);
    if (tarN.length) {
      normales.push({ ...b, tarjetas: num(tarN), totalPlatos: sumQty(tarN) });
    }
    if (tarE.length) {
      especiales.push({ ...b, tarjetas: num(tarE), totalPlatos: sumQty(tarE) });
    }
  }
  return { normales, especiales, hayParticion: especiales.length > 0 };
}

/** Solo contador (principales) o contador de guarniciones, según el tipo pedido en Mozos. */
export function itemAplicaReglaContador(plato, reglas, paraGuarniciones = false) {
  const slugs = slugsTipoDeGrupo(plato);
  const set = paraGuarniciones
    ? (reglas?.contadorGuarnicion || new Set())
    : (reglas?.soloContador || new Set());
  return slugs.some((s) => set.has(s));
}

function colorEtiquetaDesdePlato(plato) {
  const linea = plato && typeof plato === 'object' ? plato : {};
  const cat = linea.plato && typeof linea.plato === 'object' && !Array.isArray(linea.plato)
    ? linea.plato
    : {};
  return {
    fondo: parseHexColorKds(linea.kdsEtiquetaColorFondo, parseHexColorKds(cat.kdsEtiquetaColorFondo, '')),
    letra: parseHexColorKds(linea.kdsEtiquetaColorLetra, parseHexColorKds(cat.kdsEtiquetaColorLetra, '')),
  };
}

/** Badges de tipo (regla mostrarNombreTipoEnKds) para platos en EN PREPARACIÓN. */
export function etiquetasTipoPreparacionKds(platos, reglas) {
  const mapa = reglas?.etiquetaKds;
  if (!mapa || typeof mapa.get !== 'function' || mapa.size === 0) return [];
  const vistos = new Set();
  const out = [];
  for (const plato of platos || []) {
    if (!plato || plato.eliminado || plato.anulado) continue;
    const slugs = slugsTipoDeGrupo(plato);
    const override = colorEtiquetaDesdePlato(plato);
    for (const slug of slugs) {
      if (vistos.has(slug)) continue;
      const meta = mapa.get(slug);
      if (!meta) continue;
      vistos.add(slug);
      out.push({
        slug,
        nombre: meta.nombre,
        colorFondo: override.fondo || meta.colorFondo,
        colorLetra: override.letra || meta.colorLetra,
      });
    }
  }
  return out;
}
