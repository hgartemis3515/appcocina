/**
 * Perfil de tablas KDS por cuenta de cocinero.
 * El snapshot visual (kdsConfig) no debe compartirse entre usuarios del mismo dispositivo.
 */

import {
  DEFAULT_KDS_CONFIG,
  STORAGE_KEYS,
  PERFILES_PREDEFINIDOS,
  aplicarPerfil,
  normalizarConfiguracion,
} from '../config/kdsConfigConstants';
import { aplicarSnapshotVista } from './kdsPerfilesVista';

export const AUTH_COCINA_STORAGE_KEY = 'cocinaAuth';

export function claveConfigKdsUsuario(userId) {
  const id = String(userId || '').trim();
  return id ? `${STORAGE_KEYS.CONFIG}:${id}` : '';
}

export function idUsuarioCocina(user) {
  if (!user || typeof user !== 'object') return '';
  const raw = user.id || user._id || user.usuarioId || '';
  return String(raw).trim();
}

export function sanitizarIdPerfilTablasKds(valor) {
  if (valor == null || valor === '') return null;
  const s = String(valor).trim().slice(0, 80);
  if (!s || !/^[a-zA-Z0-9_-]+$/.test(s)) return null;
  return s;
}

export function leerUserIdSesionCocina() {
  try {
    const raw = localStorage.getItem(AUTH_COCINA_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return idUsuarioCocina(parsed?.usuario || parsed?.user || null);
  } catch {
    return '';
  }
}

function leerObjetoLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function leerMapaPerfilActivoPorUsuario() {
  return leerObjetoLocal(STORAGE_KEYS.PERFIL_ACTIVO_POR_USUARIO) || {};
}

export function leerPerfilActivoUsuario(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  return sanitizarIdPerfilTablasKds(leerMapaPerfilActivoPorUsuario()[id]);
}

export function guardarPerfilActivoUsuario(userId, perfilId) {
  const id = String(userId || '').trim();
  if (!id) return;
  const map = leerMapaPerfilActivoPorUsuario();
  const limpio = sanitizarIdPerfilTablasKds(perfilId);
  if (limpio) map[id] = limpio;
  else delete map[id];
  localStorage.setItem(STORAGE_KEYS.PERFIL_ACTIVO_POR_USUARIO, JSON.stringify(map));
}

export function leerConfigKdsGlobal() {
  return leerObjetoLocal(STORAGE_KEYS.CONFIG);
}

export function leerConfigKdsUsuario(userId) {
  const key = claveConfigKdsUsuario(userId);
  if (!key) return null;
  return leerObjetoLocal(key);
}

export function guardarConfigKdsUsuario(userId, config) {
  const id = String(userId || '').trim();
  if (!id || !config || typeof config !== 'object') return;
  const key = claveConfigKdsUsuario(id);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(config));
  guardarPerfilActivoUsuario(id, config.perfilActivo);
}

export function persistirSnapshotKdsUsuario(userId, config) {
  const id = String(userId || '').trim();
  if (!id || !config || typeof config !== 'object') return;
  guardarConfigKdsUsuario(id, config);
}

export function migrarConfigGlobalAlUsuario(userId, configGlobal) {
  const id = String(userId || '').trim();
  if (!id || !configGlobal || typeof configGlobal !== 'object') return false;
  if (leerConfigKdsUsuario(id)) return false;
  guardarConfigKdsUsuario(id, configGlobal);
  return true;
}

export function leerConfigKdsInicial() {
  const userId = leerUserIdSesionCocina();
  if (userId) {
    const saved = leerConfigKdsUsuario(userId);
    if (saved) return saved;
    const global = leerConfigKdsGlobal();
    if (global) {
      migrarConfigGlobalAlUsuario(userId, global);
      return global;
    }
    return null;
  }
  return leerConfigKdsGlobal();
}

export function construirConfigDesdePerfilTablasKds(perfilId, lista) {
  const id = sanitizarIdPerfilTablasKds(perfilId);
  if (!id) return { ...DEFAULT_KDS_CONFIG };
  const preset = Object.values(PERFILES_PREDEFINIDOS).find((p) => p.id === id);
  if (preset) {
    return aplicarPerfil(id, { ...DEFAULT_KDS_CONFIG });
  }
  const custom = (Array.isArray(lista) ? lista : []).find((p) => String(p.id) === id);
  if (!custom) {
    return { ...DEFAULT_KDS_CONFIG, perfilActivo: id };
  }
  const merged = aplicarSnapshotVista({ ...DEFAULT_KDS_CONFIG }, custom.config);
  return {
    ...normalizarConfiguracion(merged),
    perfilActivo: custom.id,
  };
}
