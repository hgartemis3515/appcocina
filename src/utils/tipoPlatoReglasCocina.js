/**
 * Reglas de tipo de plato en Ver cocina completo.
 * soloContadorEnCocina → oculta cronómetro y # secuencial (queda xN).
 * particionHorizontalCocina → mitad de abajo para esos platos.
 */

export function slugsTipoDePlato(plato) {
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
  const out = new Set(item?.slugsTipo || []);
  slugsTipoDePlato(item).forEach((s) => out.add(s));
  slugsTipoDePlato(item?.plato).forEach((s) => out.add(s));
  for (const row of item?.platos || []) {
    slugsTipoDePlato(row).forEach((s) => out.add(s));
    slugsTipoDePlato(row?.plato).forEach((s) => out.add(s));
  }
  return [...out];
}

export function parseReglasTiposMenu(list) {
  const soloContador = new Set();
  const particion = new Set();
  const particionNombres = [];
  const arr = Array.isArray(list) ? list : [];
  for (const t of arr) {
    const slug = String(t?.slug || '').toLowerCase().trim();
    if (!slug) continue;
    if (t.soloContadorEnCocina === true) soloContador.add(slug);
    if (t.particionHorizontalCocina === true) {
      particion.add(slug);
      const nom = String(t.nombreCorto || t.nombre || slug).trim();
      if (nom && !particionNombres.includes(nom)) particionNombres.push(nom);
    }
  }
  return { soloContador, particion, particionNombres };
}

export function anotarReglasTipoEnItems(items, reglas) {
  const solo = reglas?.soloContador || new Set();
  const part = reglas?.particion || new Set();
  return (items || []).map((item) => {
    const slugs = slugsTipoDeGrupo(item);
    return {
      ...item,
      slugsTipo: slugs,
      soloContadorEnCocina: slugs.some((s) => solo.has(s)),
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
