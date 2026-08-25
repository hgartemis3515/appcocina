/**
 * Sincroniza la personalización Ver Cocina Completo entre el monitor 1
 * (Distribuir) y las ventanas despegadas (misma app o Monitor Hub).
 */
export const MONITOR_DESIGN_CHANNEL = 'gambusinas-monitor-design';
export const MONITOR_MSG_TYPE = 'gambusinas-monitor-design';
export const MONITOR_PASIVO_MIN = 2;
export const MONITOR_PASIVO_MAX = 9;
export const MONITORES_PASIVOS = [2, 3, 4, 5, 6, 7, 8, 9];

export function storageKeyDisenoMonitor(numero) {
  return `cocinaMonitorDesign:${Number(numero)}`;
}

export function numeroMonitorDesdeUrl() {
  try {
    const n = Number(new URLSearchParams(window.location.search).get('monitor'));
    return Number.isInteger(n) && n >= 1 && n <= 16 ? n : null;
  } catch {
    return null;
  }
}

export function esModoFijoUrl() {
  try {
    const m = new URLSearchParams(window.location.search).get('modo');
    return m === 'completo-fijo' || m === 'fijo';
  } catch {
    return false;
  }
}

let channel;
function getChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    try { channel = new BroadcastChannel(MONITOR_DESIGN_CHANNEL); } catch { return null; }
  }
  return channel;
}

export function publicarDisenoMonitor(numero, config, ventanaHija = null) {
  const msg = {
    type: MONITOR_MSG_TYPE,
    numero: Number(numero),
    config: config && typeof config === 'object' ? config : null,
    ts: Date.now(),
  };
  try { getChannel()?.postMessage(msg); } catch { /* noop */ }
  try {
    localStorage.setItem(storageKeyDisenoMonitor(numero), JSON.stringify({ ts: msg.ts, config: msg.config }));
  } catch { /* noop */ }
  if (ventanaHija && !ventanaHija.closed) {
    try { ventanaHija.postMessage(msg, window.location.origin); } catch { /* noop */ }
  }
  return msg;
}

export function suscribirDisenoMonitor(numero, onConfig) {
  if (typeof window === 'undefined') return () => {};
  const n = Number(numero);
  const aplicar = (config) => {
    onConfig(config && typeof config === 'object' ? config : {});
  };
  const onChannel = (e) => {
    const d = e.data;
    if (!d || d.type !== MONITOR_MSG_TYPE || Number(d.numero) !== n) return;
    aplicar(d.config);
  };
  const onMessage = (e) => {
    if (e.origin !== window.location.origin) return;
    onChannel(e);
  };
  const onStorage = (e) => {
    if (e.key !== storageKeyDisenoMonitor(n) || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      aplicar(parsed?.config);
    } catch { /* noop */ }
  };
  const ch = getChannel();
  if (ch) ch.addEventListener('message', onChannel);
  window.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    if (ch) ch.removeEventListener('message', onChannel);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}
