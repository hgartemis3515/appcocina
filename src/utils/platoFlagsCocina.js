/**
 * Flags de cocina por plato (snapshot de línea o catálogo populado).
 * El catálogo true aplica a tickets abiertos (mismo criterio que complementosUnidosAlPlato).
 */

function catalogoDeLinea(plato) {
  const cat = plato && plato.plato;
  return cat && typeof cat === 'object' && !Array.isArray(cat) ? cat : null;
}

function flagCatalogoOSnapshot(plato, key) {
  if (!plato) return false;
  if (plato[key] === true) return true;
  const cat = catalogoDeLinea(plato);
  return !!(cat && cat[key] === true);
}

export function platoOcultaCronometroCocina(plato) {
  return flagCatalogoOSnapshot(plato, 'ocultarCronometroCocina');
}

export function platoJuntaGuarnicionesEntreVariantes(plato) {
  return flagCatalogoOSnapshot(plato, 'juntarGuarnicionesEntreVariantes');
}

export function idCatalogoPlatoLinea(plato) {
  const cat = catalogoDeLinea(plato);
  return String(plato?.platoId || cat?._id || cat?.id || plato?.plato || '');
}

/** Grupo de Ver cocina completa: ¿ocultar cronómetro por flag de plato? */
export function itemOcultaCronometroCocina(item) {
  if (!item) return false;
  if (item.ocultarCronometroCocina === true) return true;
  const wrap = item.platos;
  if (Array.isArray(wrap) && wrap.some((w) => platoOcultaCronometroCocina(w?.plato || w))) {
    return true;
  }
  return platoOcultaCronometroCocina(item);
}
