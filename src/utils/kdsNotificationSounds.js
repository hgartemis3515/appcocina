/**
 * Timbres de nueva comanda (tablas KDS).
 * Web Audio: sin mp3, sin librerías nativas. El beep clásico (800 Hz) queda como default.
 */

export const TIMBRE_DEFAULT = 'beep_clasico';
export const TIMBRE_VOLUMEN_DEFAULT = 70;
export const TIMBRE_VOLUMEN_MIN = 0;
export const TIMBRE_VOLUMEN_MAX = 100;

export const KDS_TIMBRES = [
  { clave: 'beep_clasico', nombre: 'Beep clásico', desc: 'El tono actual (800 Hz)' },
  { clave: 'ding_dong', nombre: 'Ding-dong', desc: 'Timbre de casa' },
  { clave: 'ding_dong_grave', nombre: 'Ding-dong grave', desc: 'Casa, más bajo' },
  { clave: 'campana', nombre: 'Campana', desc: 'Campana con eco' },
  { clave: 'campanilla', nombre: 'Campanilla', desc: 'Campana pequeña' },
  { clave: 'recepcion', nombre: 'Recepción', desc: 'Timbre de mostrador' },
  { clave: 'triple_chime', nombre: 'Tres notas', desc: 'Chime ascendente' },
  { clave: 'cristal', nombre: 'Cristal', desc: 'Toque de vaso' },
  { clave: 'xilofono', nombre: 'Xilófono', desc: 'Notas de madera' },
  { clave: 'digital', nombre: 'Digital', desc: 'Beep cuadrado' },
  { clave: 'oficina', nombre: 'Oficina', desc: 'Timbre de escritorio' },
  { clave: 'gong', nombre: 'Gong', desc: 'Toque metálico grave' },
  { clave: 'cuco', nombre: 'Cuco', desc: 'Dos notas tipo cuco' },
  { clave: 'tren', nombre: 'Tren', desc: 'Campana de andén' },
  { clave: 'ping_doble', nombre: 'Doble ping', desc: 'Dos pings cortos' },
  { clave: 'alerta_aguda', nombre: 'Alerta aguda', desc: 'Aviso alto y claro' },
  { clave: 'alerta_suave', nombre: 'Alerta suave', desc: 'Aviso discreto' },
  { clave: 'buzz', nombre: 'Zumbido', desc: 'Buzz corto' },
  { clave: 'madera', nombre: 'Madera', desc: 'Golpe seco' },
  { clave: 'sirena_corta', nombre: 'Sirena corta', desc: 'Dos tonos rápidos' },
];

const CLAVE_SET = new Set(KDS_TIMBRES.map((t) => t.clave));

let audioCtx = null;
let lastOsc = [];

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function stopPrevious() {
  lastOsc.forEach((n) => {
    try { n.stop(); } catch { /* already stopped */ }
  });
  lastOsc = [];
}

function clampVolumen(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return TIMBRE_VOLUMEN_DEFAULT;
  return Math.max(TIMBRE_VOLUMEN_MIN, Math.min(TIMBRE_VOLUMEN_MAX, n));
}

export function resolverTimbreClave(clave) {
  return CLAVE_SET.has(clave) ? clave : TIMBRE_DEFAULT;
}

function masterGain(volumen) {
  return (clampVolumen(volumen) / 100) * 0.7;
}

function tone(ctx, dest, { freq, type = 'sine', start = 0, dur = 0.25, peak = 1, detune = 0 }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (detune) osc.detune.setValueAtTime(detune, ctx.currentTime);
  const t0 = ctx.currentTime + start;
  const attack = Math.min(0.02, dur * 0.15);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  lastOsc.push(osc);
}

function noiseBurst(ctx, dest, { start = 0, dur = 0.08, peak = 0.25 }) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.2;
  const g = ctx.createGain();
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  lastOsc.push(src);
}

function playRecipe(clave, vol) {
  const ctx = getCtx();
  if (!ctx) return;
  stopPrevious();
  const dest = ctx.createGain();
  dest.gain.value = vol;
  dest.connect(ctx.destination);

  switch (clave) {
    case 'ding_dong':
      tone(ctx, dest, { freq: 659.25, start: 0, dur: 0.38, peak: 0.9 });
      tone(ctx, dest, { freq: 523.25, start: 0.32, dur: 0.55, peak: 0.85 });
      break;
    case 'ding_dong_grave':
      tone(ctx, dest, { freq: 392, start: 0, dur: 0.42, peak: 0.9 });
      tone(ctx, dest, { freq: 311.13, start: 0.36, dur: 0.6, peak: 0.85 });
      break;
    case 'campana':
      tone(ctx, dest, { freq: 523.25, type: 'sine', dur: 1.1, peak: 0.7 });
      tone(ctx, dest, { freq: 1046.5, type: 'triangle', dur: 0.7, peak: 0.25 });
      tone(ctx, dest, { freq: 1569.75, type: 'sine', dur: 0.45, peak: 0.12 });
      break;
    case 'campanilla':
      tone(ctx, dest, { freq: 1318.5, type: 'triangle', dur: 0.35, peak: 0.55 });
      tone(ctx, dest, { freq: 1760, type: 'sine', dur: 0.28, peak: 0.22 });
      tone(ctx, dest, { freq: 1318.5, type: 'triangle', start: 0.18, dur: 0.4, peak: 0.4 });
      break;
    case 'recepcion':
      tone(ctx, dest, { freq: 1760, type: 'sine', dur: 0.18, peak: 0.7 });
      tone(ctx, dest, { freq: 2093, type: 'sine', dur: 0.12, peak: 0.2 });
      tone(ctx, dest, { freq: 1760, type: 'sine', start: 0.22, dur: 0.22, peak: 0.65 });
      break;
    case 'triple_chime':
      tone(ctx, dest, { freq: 523.25, start: 0, dur: 0.22, peak: 0.7 });
      tone(ctx, dest, { freq: 659.25, start: 0.16, dur: 0.22, peak: 0.7 });
      tone(ctx, dest, { freq: 783.99, start: 0.32, dur: 0.4, peak: 0.75 });
      break;
    case 'cristal':
      tone(ctx, dest, { freq: 2093, type: 'sine', dur: 0.7, peak: 0.45 });
      tone(ctx, dest, { freq: 3135.96, type: 'sine', dur: 0.4, peak: 0.15 });
      break;
    case 'xilofono':
      tone(ctx, dest, { freq: 523.25, type: 'triangle', start: 0, dur: 0.16, peak: 0.7 });
      tone(ctx, dest, { freq: 659.25, type: 'triangle', start: 0.12, dur: 0.16, peak: 0.7 });
      tone(ctx, dest, { freq: 783.99, type: 'triangle', start: 0.24, dur: 0.16, peak: 0.7 });
      tone(ctx, dest, { freq: 1046.5, type: 'triangle', start: 0.36, dur: 0.28, peak: 0.75 });
      break;
    case 'digital':
      tone(ctx, dest, { freq: 1200, type: 'square', dur: 0.12, peak: 0.28 });
      tone(ctx, dest, { freq: 900, type: 'square', start: 0.14, dur: 0.16, peak: 0.28 });
      break;
    case 'oficina':
      tone(ctx, dest, { freq: 640, type: 'square', dur: 0.09, peak: 0.22 });
      tone(ctx, dest, { freq: 640, type: 'square', start: 0.14, dur: 0.18, peak: 0.22 });
      break;
    case 'gong':
      tone(ctx, dest, { freq: 110, type: 'sine', dur: 1.4, peak: 0.85 });
      tone(ctx, dest, { freq: 220, type: 'triangle', dur: 1.0, peak: 0.35 });
      tone(ctx, dest, { freq: 330, type: 'sine', dur: 0.7, peak: 0.18 });
      break;
    case 'cuco':
      tone(ctx, dest, { freq: 523.25, type: 'triangle', start: 0, dur: 0.22, peak: 0.65 });
      tone(ctx, dest, { freq: 392, type: 'triangle', start: 0.24, dur: 0.32, peak: 0.65 });
      break;
    case 'tren':
      tone(ctx, dest, { freq: 880, type: 'sine', start: 0, dur: 0.16, peak: 0.7 });
      tone(ctx, dest, { freq: 880, type: 'sine', start: 0.2, dur: 0.16, peak: 0.7 });
      tone(ctx, dest, { freq: 880, type: 'sine', start: 0.4, dur: 0.22, peak: 0.7 });
      break;
    case 'ping_doble':
      tone(ctx, dest, { freq: 1320, type: 'sine', start: 0, dur: 0.12, peak: 0.7 });
      tone(ctx, dest, { freq: 1320, type: 'sine', start: 0.18, dur: 0.14, peak: 0.55 });
      break;
    case 'alerta_aguda':
      tone(ctx, dest, { freq: 1480, type: 'sine', dur: 0.22, peak: 0.8 });
      tone(ctx, dest, { freq: 1760, type: 'triangle', start: 0.08, dur: 0.2, peak: 0.35 });
      break;
    case 'alerta_suave':
      tone(ctx, dest, { freq: 660, type: 'sine', dur: 0.45, peak: 0.4 });
      break;
    case 'buzz':
      tone(ctx, dest, { freq: 180, type: 'sawtooth', dur: 0.22, peak: 0.22 });
      tone(ctx, dest, { freq: 90, type: 'square', dur: 0.22, peak: 0.08 });
      break;
    case 'madera':
      noiseBurst(ctx, dest, { dur: 0.06, peak: 0.45 });
      tone(ctx, dest, { freq: 420, type: 'triangle', dur: 0.08, peak: 0.45 });
      break;
    case 'sirena_corta':
      tone(ctx, dest, { freq: 740, type: 'sine', start: 0, dur: 0.18, peak: 0.7 });
      tone(ctx, dest, { freq: 980, type: 'sine', start: 0.16, dur: 0.22, peak: 0.7 });
      break;
    case 'beep_clasico':
    default:
      tone(ctx, dest, { freq: 800, type: 'sine', dur: 0.3, peak: 0.43 });
      break;
  }
}

export const KDS_SONIDO_EVENTOS = {
  nuevaComanda: {
    id: 'nuevaComanda',
    enabledKey: 'sonidoNuevaComanda',
    claveKey: 'timbreClave',
    defaultEnabled: true,
  },
  finalizar: {
    id: 'finalizar',
    enabledKey: 'sonidoFinalizar',
    claveKey: 'timbreFinalizarClave',
    defaultEnabled: false,
  },
  entregar: {
    id: 'entregar',
    enabledKey: 'sonidoEntregar',
    claveKey: 'timbreEntregarClave',
    defaultEnabled: false,
  },
};

let liveOpts = {
  clave: TIMBRE_DEFAULT,
  volumen: TIMBRE_VOLUMEN_DEFAULT,
  enabled: true,
  sonidoNuevaComanda: true,
  sonidoFinalizar: false,
  sonidoEntregar: false,
  timbreFinalizarClave: TIMBRE_DEFAULT,
  timbreEntregarClave: TIMBRE_DEFAULT,
};

function flagEvento(value, defaultEnabled) {
  if (value === undefined) return defaultEnabled;
  return defaultEnabled ? value !== false : value === true;
}

export function debeReproducirSonidoEvento(config = {}, evento) {
  if (config.soundEnabled === false) return false;
  const meta = KDS_SONIDO_EVENTOS[evento];
  if (!meta) return config.soundEnabled !== false;
  return flagEvento(config[meta.enabledKey], meta.defaultEnabled);
}

export function claveTimbreEvento(config = {}, evento) {
  const meta = KDS_SONIDO_EVENTOS[evento];
  const propia = meta ? config[meta.claveKey] : null;
  return resolverTimbreClave(propia || config.timbreClave);
}

export function syncKdsNotificationSound(config = {}) {
  liveOpts = {
    clave: resolverTimbreClave(config.timbreClave),
    volumen: clampVolumen(config.timbreVolumen),
    enabled: config.soundEnabled !== false,
    sonidoNuevaComanda: flagEvento(config.sonidoNuevaComanda, true),
    sonidoFinalizar: flagEvento(config.sonidoFinalizar, false),
    sonidoEntregar: flagEvento(config.sonidoEntregar, false),
    timbreFinalizarClave: resolverTimbreClave(config.timbreFinalizarClave || config.timbreClave),
    timbreEntregarClave: resolverTimbreClave(config.timbreEntregarClave || config.timbreClave),
  };
}

/**
 * @param {object} [override]
 * @param {string} [override.clave]
 * @param {number} [override.volumen]
 * @param {boolean} [override.force] — preview aunque el sonido esté desactivado
 */
export function playKdsNotificationSound(override = {}) {
  const enabled = override.force === true ? true : liveOpts.enabled;
  if (!enabled) return;
  const clave = resolverTimbreClave(override.clave ?? liveOpts.clave);
  const vol = masterGain(override.volumen ?? liveOpts.volumen);
  if (vol <= 0.001) return;
  try {
    playRecipe(clave, vol);
  } catch (error) {
    console.log('[kdsNotificationSounds] No se pudo reproducir el timbre:', error);
  }
}

export function playKdsEventSound(evento, override = {}) {
  const meta = KDS_SONIDO_EVENTOS[evento] || KDS_SONIDO_EVENTOS.nuevaComanda;
  const force = override.force === true;
  if (!force) {
    if (!liveOpts.enabled) return;
    if (liveOpts[meta.enabledKey] !== true) return;
  }
  const claveLive = meta.claveKey === 'timbreClave'
    ? liveOpts.clave
    : (liveOpts[meta.claveKey] || liveOpts.clave);
  playKdsNotificationSound({
    ...override,
    clave: override.clave ?? claveLive,
    force: true,
  });
}

export function playKdsSoundForPlatoEstado(nuevoEstado) {
  if (nuevoEstado === 'recoger') {
    playKdsEventSound('finalizar');
    return;
  }
  if (nuevoEstado === 'salio' || nuevoEstado === 'entregado') {
    playKdsEventSound('entregar');
  }
}

export function playNotificationSound() {
  playKdsEventSound('nuevaComanda');
}
