/**
 * Snapshot de Vista y alertas de las tablas KDS.
 * Siempre se guarda en este dispositivo. Si el servidor está encendido,
 * también se copia (tipo tablas_kds) para verse en otros equipos.
 */

import { STORAGE_KEYS, DEFAULT_KDS_CONFIG } from '../config/kdsConfigConstants';

export const TIPO_PERFIL_TABLAS_KDS = 'tablas_kds';

export const KDS_PERFIL_VISTA_KEYS = [
  'tamanoFuente',
  'tamanoFuentePlatos',
  'nombrePlatoFuente',
  'nombrePlatoColor',
  'nombrePlatoFondo',
  'nombreComplementoFuente',
  'nombreComplementoTamano',
  'nombreComplementoColor',
  'nombreComplementoFondo',
  'tamanoTarjeta',
  'columnasGrid',
  'filasGrid',
  'ordenamientoDefault',
  'modoVista',
  'mostrarBadgeGuarnicion',
  'juntarGuarnicionesVisualKds',
  'usarNombreCocinaEnTablaKds',
  'ordenColaFuente',
  'ordenColaTamano',
  'ordenColaColor',
  'ordenColaMostrarHash',
  'ordenColaCuadroColor',
  'ordenColaCuadroTamano',
  'cantidadPlatoColor',
  'cantidadPlatoFondo',
  'cantidadPlatoTamano',
  'mozoNombreFuente',
  'mozoNombreTamano',
  'mozoNombreColor',
  'mozoNombreFondo',
  'fondoConjuntoTarjetas',
  'fondoConjuntoTarjetasClaro',
  'alertYellowMinutes',
  'alertRedMinutes',
  'alertCriticalMinutes',
  'timbreClave',
  'timbreVolumen',
  'sonidoNuevaComanda',
  'sonidoFinalizar',
  'sonidoEntregar',
  'timbreFinalizarClave',
  'timbreEntregarClave',
];

export function snapshotPerfilVista(config = {}) {
  const out = {};
  KDS_PERFIL_VISTA_KEYS.forEach((k) => {
    if (config[k] !== undefined) out[k] = config[k];
    else if (DEFAULT_KDS_CONFIG[k] !== undefined) out[k] = DEFAULT_KDS_CONFIG[k];
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
        tipo: TIPO_PERFIL_TABLAS_KDS,
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

export function esIdPerfilLocal(id) {
  return String(id || '').startsWith('local-');
}

export function nuevoIdPerfilLocal() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mergePerfilesVista(locales, servidor) {
  const map = new Map();
  (Array.isArray(locales) ? locales : []).forEach((p) => {
    if (p?.id) map.set(String(p.id), { ...p, tipo: TIPO_PERFIL_TABLAS_KDS });
  });
  (Array.isArray(servidor) ? servidor : []).forEach((p) => {
    if (p?.id) map.set(String(p.id), p);
  });
  return Array.from(map.values());
}

export function perfilVistaDifiere(configActual, snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  return KDS_PERFIL_VISTA_KEYS.some((k) => {
    if (snapshot[k] === undefined) return false;
    return configActual[k] !== snapshot[k];
  });
}
