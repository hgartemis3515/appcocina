/**
 * Match KDS de regla de asignación + siguiente backup.
 * Misma semántica que el backend (encontrarRegla / elegirSiguienteBackup).
 */

export function elegirSiguienteBackup(regla, cocineroActualId) {
  if (!regla) return null;
  const actual = cocineroActualId != null ? String(cocineroActualId) : '';
  const backups = (regla.backups || [])
    .filter((b) => b && b.cocineroId)
    .slice()
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  if (!backups.length) return null;
  const idx = backups.findIndex((b) => String(b.cocineroId) === actual);
  if (idx === -1) return backups[0];
  return backups[idx + 1] || null;
}

export function extraerFuentePerfil(resp) {
  if (!resp || typeof resp !== 'object') return null;
  const data = resp.data != null ? resp.data : resp;
  if (!data || typeof data !== 'object') return null;
  const perfilId = resp.perfilActivoAhora?.perfilId;
  const perfiles = Array.isArray(data.perfiles) ? data.perfiles : [];
  if (perfilId) {
    const p = perfiles.find((x) => x && String(x.id) === String(perfilId));
    if (p) return p;
  }
  const activo = perfiles.find((p) => p && p.activo !== false);
  return activo || data;
}

function isReglaAsignada(regla) {
  if (!regla) return false;
  if (regla.activo === false) return false;
  const tienePrimario = !!regla.cocineroPrimarioId;
  const backupsValidos = Array.isArray(regla.backups) && regla.backups.some((b) => b && b.cocineroId);
  return tienePrimario || backupsValidos;
}

function idCatalogoPlato(plato) {
  if (!plato || typeof plato !== 'object') return null;
  const nested = plato.plato && typeof plato.plato === 'object' && !Array.isArray(plato.plato)
    ? plato.plato
    : null;
  const candidates = [plato.platoId, plato.id, nested && nested.id, nested && nested.platoId];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    if (typeof c === 'object') continue;
    const s = String(c);
    if (/^[a-fA-F0-9]{24}$/.test(s)) continue;
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function platoIdNumerico(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizarGuarnicionKey(grupo, opcion) {
  const g = (grupo || '').toString().trim().toLowerCase();
  const o = (opcion || '').toString().trim().toLowerCase();
  return `${g}::${o}`;
}

export function encontrarReglaPlato(fuente, plato) {
  if (!fuente || !plato) return null;
  const platoId = idCatalogoPlato(plato);
  const reglasPlato = fuente.reglasPorPlato || [];
  const reglasCat = fuente.reglasPorCategoria || [];

  const reglaPlato = platoId != null
    ? reglasPlato.find((r) => Number(r.platoId) === platoId && r.activo !== false)
    : null;
  if (isReglaAsignada(reglaPlato)) return { tipo: 'plato', regla: reglaPlato };

  const categoria = plato.categoria || (plato.plato && plato.plato.categoria);
  if (categoria) {
    const reglaCat = reglasCat.find((r) => r.categoria === categoria && r.activo !== false);
    if (isReglaAsignada(reglaCat)) return { tipo: 'categoria', regla: reglaCat };
  }
  return null;
}

function textoOpcionComp(comp) {
  if (!comp) return '';
  const o = comp.opcion != null ? comp.opcion : comp.nombre;
  if (Array.isArray(o)) return o.filter(Boolean).join(', ');
  return (o || '').toString();
}

export function encontrarReglaGuarnicionKds(fuente, unit) {
  if (!fuente || !unit) return null;
  const comp = unit.comp || unit;
  const grupo = (comp.grupo || '').toString().trim();
  const opcion = textoOpcionComp(comp).trim();
  const key = normalizarGuarnicionKey(grupo, opcion);
  const padre = unit.plato || {};
  const pid = platoIdNumerico(padre.platoId)
    || platoIdNumerico(padre.plato && padre.plato.id)
    || platoIdNumerico(padre.plato && padre.plato.platoId);
  const reglas = fuente.reglasPorGuarnicion || [];
  const conCocinero = (r) => r && r.activo !== false && (r.cocineroPrimarioId || (Array.isArray(r.backups) && r.backups.some((b) => b && b.cocineroId)));
  const keyMatch = (r, k) => String(r.guarnicionKey || '') === String(k);

  if (pid != null) {
    const keyPrefijada = `${pid}::${key}`;
    const reglaG = reglas.find((r) =>
      conCocinero(r) && platoIdNumerico(r.platoId) === pid && (keyMatch(r, key) || keyMatch(r, keyPrefijada))
    );
    if (reglaG) return { tipo: 'guarnicion', regla: reglaG };
    return null;
  }

  const reglaG = reglas.find((r) => conCocinero(r) && keyMatch(r, key) && platoIdNumerico(r.platoId) == null);
  if (reglaG) return { tipo: 'guarnicion', regla: reglaG };
  const grupoNorm = String(grupo || '').trim().toLowerCase();
  if (grupoNorm) {
    const reglaGr = (fuente.reglasPorGrupo || []).find((r) =>
      String(r.grupo || '').trim().toLowerCase() === grupoNorm && r.activo !== false
    );
    if (reglaGr && (reglaGr.cocineroPrimarioId || (Array.isArray(reglaGr.backups) && reglaGr.backups.some((b) => b && b.cocineroId)))) {
      return { tipo: 'grupo', regla: reglaGr };
    }
  }
  return null;
}

function cocineroIdDeUnidad(unit) {
  return unit?.procesandoPor?.cocineroId
    || unit?.comp?.procesandoPor?.cocineroId
    || unit?.plato?.procesandoPor?.cocineroId
    || null;
}

/** Hay un siguiente cocinero en la cadena de backups de la regla. */
export function unidadTieneSiguienteBackup(unit, snapshot) {
  if (!unit || !snapshot) return false;
  const esG = unit.tipo === 'guarnicion' || !!unit.comp;
  const match = esG
    ? encontrarReglaGuarnicionKds(snapshot.guarniciones, unit)
    : encontrarReglaPlato(snapshot.platos, unit.plato || unit);
  if (!match?.regla) return false;
  return elegirSiguienteBackup(match.regla, cocineroIdDeUnidad(unit)) != null;
}
