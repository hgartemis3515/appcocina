/**
 * Claves de plato en KDS: `${comandaId}-${platoIndex}` o `${comandaId}-${platoIndex}-g-${compId}`.
 * No usar split('-'): el índice va al final.
 */

export function parseClavePlatoKds(key) {
  if (key == null || key === '') return null;
  const raw = String(key);
  const base = raw.includes('-g-') ? raw.split('-g-')[0] : raw;
  const lastDash = base.lastIndexOf('-');
  if (lastDash <= 0) return null;
  const comandaId = base.substring(0, lastDash);
  const platoIndex = parseInt(base.substring(lastDash + 1), 10);
  if (!comandaId || Number.isNaN(platoIndex) || platoIndex < 0) return null;
  return { comandaId, platoIndex };
}

function recorrerClavesMarcadas(platosChecked, platoStates, visit) {
  (platosChecked || new Map()).forEach((checked, key) => {
    if (checked) visit(key);
  });
  (platoStates || new Map()).forEach((estado, key) => {
    if (estado === 'seleccionado' || estado === 'procesando' || estado === 'entregando' || estado === 'dejar') {
      visit(key);
    }
  });
}

export function indicesPlatosMarcadosKds(platosChecked, platoStates, comandaId) {
  const indices = new Set();
  recorrerClavesMarcadas(platosChecked, platoStates, (key) => {
    const parsed = parseClavePlatoKds(key);
    if (!parsed) return;
    if (comandaId != null && String(parsed.comandaId) !== String(comandaId)) return;
    indices.add(parsed.platoIndex);
  });
  return [...indices].sort((a, b) => a - b);
}

export function comandaIdDesdePlatosMarcados(platosChecked, platoStates) {
  const ids = new Set();
  recorrerClavesMarcadas(platosChecked, platoStates, (key) => {
    const parsed = parseClavePlatoKds(key);
    if (parsed) ids.add(String(parsed.comandaId));
  });
  if (ids.size === 1) return [...ids][0];
  return null;
}
