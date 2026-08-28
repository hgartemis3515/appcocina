/**
 * Snapshot de Vista y alertas de las tablas KDS.
 * Los perfiles con nombre se guardan en el servidor (misma colección que Ver Cocina,
 * tipo tablas_kds) para verse en cualquier dispositivo.
 */

import { STORAGE_KEYS } from '../config/kdsConfigConstants';

export const TIPO_PERFIL_TABLAS_KDS = 'tablas_kds';

export const KDS_PERFIL_VISTA_KEYS = [
  'tamanoFuente',
  'tamanoFuentePlatos',
  'tamanoTarjeta',
  'columnasGrid',
  'filasGrid',
  'ordenamientoDefault',
  'modoVista',
  'mostrarBadgeGuarnicion',
  'usarNombreCocinaEnTablaKds',
  'ordenColaFuente',
  'ordenColaTamano',
  'ordenColaColor',
  'ordenColaMostrarHash',
  'alertYellowMinutes',
  'alertRedMinutes',
  'alertCriticalMinutes',
  'timbreClave',
  'timbreVolumen',
];

export function snapshotPerfilVista(config = {}) {
  const out = {};
  KDS_PERFIL_VISTA_KEYS.forEach((k) => {
    if (config[k] !== undefined) out[k] = config[k];
  });
  return out;
}

export function aplicarSnapshotVista(current = {}, snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') return { ...current };
  const next = { ...current };
  KDS_PERFIL_VISTA_KEYS.forEach((k) => {
    if (snapshot[k] !== undefined) next[k] = snapshot[k];
  });
  return next;
}

export function sanitizarNombrePerfil(nombre) {
  return String(nombre || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

export function nombrePerfilDisponible(lista, nombre, exceptId = null) {
  const n = sanitizarNombrePerfil(nombre).toLowerCase();
  if (!n) return false;
  return !(Array.isArray(lista) ? lista : []).some(
    (p) => p && p.id !== exceptId && String(p.nombre || '').trim().toLowerCase() === n
  );
}

export function mapPerfilVistaDesdeApi(p) {
  if (!p) return null;
  if (p.tipo !== TIPO_PERFIL_TABLAS_KDS) return null;
  const id = String(p._id || p.id || '').trim();
  const nombre = sanitizarNombrePerfil(p.nombre);
  if (!id || !nombre) return null;
  return {
    id,
    nombre,
    tipo: TIPO_PERFIL_TABLAS_KDS,
    config: snapshotPerfilVista(p.config || {}),
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,
  };
}

export function leerPerfilesVista() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PERFILES_VISTA);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && p.id && sanitizarNombrePerfil(p.nombre))
      .map((p) => ({
        id: String(p.id),
        nombre: sanitizarNombrePerfil(p.nombre),
        config: snapshotPerfilVista(p.config || {}),
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || null,
      }));
  } catch {
    return [];
  }
}

export function guardarPerfilesVista(lista) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.PERFILES_VISTA,
      JSON.stringify(Array.isArray(lista) ? lista : [])
    );
  } catch (e) {
    console.warn('[kdsPerfilesVista] No se pudo guardar:', e);
  }
}

export function perfilVistaDifiere(configActual, snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  return KDS_PERFIL_VISTA_KEYS.some((k) => {
    if (snapshot[k] === undefined) return false;
    return configActual[k] !== snapshot[k];
  });
}
