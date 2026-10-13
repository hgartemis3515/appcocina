/**
 * Parte el nombre cuando no cabe la siguiente letra.
 * La línea cierra con "-" y el resto sigue abajo.
 * "Arroz con pollo" en un renglón corto → "Arr-" / "oz con poll-" / "o".
 */
export function partirTextoConGuion(texto, cabe) {
  const chars = Array.from(String(texto || ''));
  if (!chars.length) return [''];
  if (typeof cabe !== 'function') return [String(texto)];
  const lineas = [];
  let actual = '';
  const cerrar = (s) => {
    const t = String(s || '').replace(/[ \t]+$/g, '');
    if (t) lineas.push(t);
  };
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (ch === '\n') {
      cerrar(actual);
      actual = '';
      continue;
    }
    if (cabe(actual + ch)) {
      actual += ch;
      continue;
    }
    if (!actual) {
      actual = ch;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      cerrar(actual);
      actual = '';
      continue;
    }
    const sp = Math.max(actual.lastIndexOf(' '), actual.lastIndexOf('\t'));
    if (sp > 0) {
      cerrar(actual.slice(0, sp));
      actual = actual.slice(sp + 1);
      i -= 1;
      continue;
    }
    if (cabe(`${actual}-`)) {
      lineas.push(`${actual}-`);
      actual = ch;
      continue;
    }
    const ultimo = actual.slice(-1);
    const base = actual.slice(0, -1);
    if (base && cabe(`${base}-`)) {
      lineas.push(`${base}-`);
      actual = ultimo + ch;
      if (!cabe(actual) && cabe(`${ultimo}-`)) {
        lineas.push(`${ultimo}-`);
        actual = ch;
      }
      continue;
    }
    lineas.push(`${actual}-`);
    actual = ch;
  }
  cerrar(actual);
  return lineas.length ? lineas : [''];
}

export function cortarNombreConGuionActivo(configVisual = {}) {
  return configVisual.cortarNombreConGuion === true;
}
