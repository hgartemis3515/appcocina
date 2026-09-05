import { useEffect, useState } from 'react';
import { apiGet } from '../config/apiClient';
import { parseReglasTiposMenu } from '../utils/tipoPlatoReglasCocina';

const VACIO = {
  soloContador: new Set(),
  contadorGuarnicion: new Set(),
  particion: new Set(),
  particionGuarnicion: new Set(),
  particionNombres: [],
  particionGuarnicionNombres: [],
};
const EVT_SOCKET = 'tipos-plato-reglas-actualizadas';
const EVT_STATE = 'tipos-plato-reglas-state';
const STALE_MS = 2500;

let cache = VACIO;
let loaded = false;
let inflight = null;
let fetchedAt = 0;
let bound = false;

function aplicarLista(list) {
  cache = parseReglasTiposMenu(Array.isArray(list) ? list : []);
  loaded = true;
  fetchedAt = Date.now();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVT_STATE, { detail: cache }));
  }
  return cache;
}

function listaDesdePayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tipos)) return data.tipos;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function aplicarDesdeSocket(data) {
  const list = listaDesdePayload(data);
  if (Array.isArray(data?.tipos) || list.length) aplicarLista(list);
  else fetchReglas({ force: true });
}

function fetchReglas({ force } = {}) {
  if (inflight) return inflight;
  if (!force && loaded && Date.now() - fetchedAt < STALE_MS) {
    return Promise.resolve(cache);
  }
  inflight = apiGet('/api/tipos-plato/menu')
    .then((data) => aplicarLista(listaDesdePayload(data)))
    .catch(() => cache)
    .finally(() => { inflight = null; });
  return inflight;
}

function bindWindow() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  window.addEventListener(EVT_SOCKET, (e) => aplicarDesdeSocket(e.detail));
}

bindWindow();

/**
 * Reglas de tipos de plato (Ver cocina + tabla KDS).
 * Una sola carga compartida; se actualiza al vuelo cuando el admin guarda en tipos-de-platos.html.
 */
export default function useTiposPlatoReglas() {
  const [reglas, setReglas] = useState(cache);

  useEffect(() => {
    bindWindow();
    const onState = (e) => setReglas(e.detail || cache);
    window.addEventListener(EVT_STATE, onState);
    setReglas(cache);
    fetchReglas().then(() => setReglas(cache));
    return () => window.removeEventListener(EVT_STATE, onState);
  }, []);

  return reglas;
}
