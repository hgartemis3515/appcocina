/**
 * Sesión para ventanas kiosk del Monitor Hub.
 * El Hub abre Chrome con --user-data-dir vacío (sin cocinaAuth).
 * Se pasa el JWT en el hash (#hubAuth=) para no enviarlo al servidor.
 */

const AUTH_STORAGE_KEY = 'cocinaAuth';
const HASH_PREFIX = '#hubAuth=';

function encodeBase64UrlUtf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64UrlUtf8(encoded) {
  const b64 = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '==='.slice((b64.length + 3) % 4);
  const binary = atob(pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function slimAuthJson(raw) {
  if (!raw) return null;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data?.token || !data?.usuario) return null;
  const u = data.usuario;
  return JSON.stringify({
    token: data.token,
    usuario: {
      id: u.id || u._id,
      _id: u._id || u.id,
      name: u.name,
      username: u.username,
      rol: u.rol,
      permisos: u.permisos || [],
      reglas: u.reglas || [],
    },
  });
}

/** Hash para pegar al final de la URL kiosk (`#hubAuth=...`). */
export function getHubAuthHash() {
  try {
    const slim = slimAuthJson(localStorage.getItem(AUTH_STORAGE_KEY));
    if (!slim) return '';
    return HASH_PREFIX + encodeBase64UrlUtf8(slim);
  } catch {
    return '';
  }
}

/** JSON slim de sesión para el payload del Hub (backup si la URL no trae hash). */
export function getHubAuthBundle() {
  try {
    return slimAuthJson(localStorage.getItem(AUTH_STORAGE_KEY)) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Si la URL trae #hubAuth=, guarda cocinaAuth y limpia el hash del historial.
 * Debe correr antes de hidratar AuthContext.
 */
export function consumeHubAuthFromLocation() {
  if (typeof window === 'undefined') return false;
  try {
    const hash = window.location.hash || '';
    if (!hash.includes('hubAuth=')) return false;
    let encoded = '';
    if (hash.startsWith(HASH_PREFIX)) {
      encoded = hash.slice(HASH_PREFIX.length).split('&')[0];
    } else {
      const m = hash.match(/hubAuth=([^&]*)/);
      encoded = m ? m[1] : '';
    }
    if (!encoded) return false;
    const authData = JSON.parse(decodeBase64UrlUtf8(encoded));
    if (!authData?.token || !authData?.usuario) return false;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    return true;
  } catch (err) {
    console.warn('[hubAuth] no se pudo aplicar la sesión del Hub', err);
    return false;
  }
}
