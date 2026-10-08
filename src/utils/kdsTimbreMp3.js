/**
 * MP3 del timbre de nueva comanda. Vive en IndexedDB de esta computadora.
 */
export const TIMBRE_MP3 = 'mp3_personal';
const DB = 'kds-timbre-local';
const STORE = 'mp3';
const KEY = 'nueva';
const MAX_BYTES = 8 * 1024 * 1024;

let blobCache = null;
let nombreCache = '';
let audio = null;
let objectUrl = '';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function nombreTimbreMp3() {
  return nombreCache;
}

export async function leerTimbreMp3() {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).get(KEY);
  const doc = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  if (doc?.blob) {
    blobCache = doc.blob;
    nombreCache = String(doc.nombre || 'sonido.mp3');
  }
  return doc || null;
}

export async function guardarTimbreMp3(file) {
  if (!file) throw new Error('Elige un archivo MP3');
  const nombre = String(file.name || '');
  const tipo = String(file.type || '').toLowerCase();
  const esMp3 = tipo === 'audio/mpeg' || tipo === 'audio/mp3' || /\.mp3$/i.test(nombre);
  if (!esMp3) throw new Error('El archivo tiene que ser MP3');
  if (file.size > MAX_BYTES) throw new Error('El MP3 pasa de 8 MB');
  const blob = file.slice(0, file.size, file.type || 'audio/mpeg');
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ blob, nombre: nombre || 'sonido.mp3' }, KEY);
  await txDone(tx);
  db.close();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = '';
  audio = null;
  blobCache = blob;
  nombreCache = nombre || 'sonido.mp3';
  return nombreCache;
}

export async function quitarTimbreMp3() {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(KEY);
  await txDone(tx);
  db.close();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = '';
  audio = null;
  blobCache = null;
  nombreCache = '';
}

export async function prepararTimbreMp3() {
  if (blobCache) return true;
  try {
    const doc = await leerTimbreMp3();
    return !!doc?.blob;
  } catch {
    return false;
  }
}

/** volume01: 0–1. Si el archivo aún no está en memoria, devuelve false. */
export function reproducirTimbreMp3(volume01) {
  if (!blobCache) return false;
  if (!objectUrl) objectUrl = URL.createObjectURL(blobCache);
  if (!audio) audio = new Audio(objectUrl);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, Number(volume01) || 0));
  audio.play().catch(() => {});
  return true;
}
