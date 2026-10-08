/** 0 = sin letra, 1 = b, 2 = c. La misma regla del ticket de cocina. */
export function letraRevisionTicket(n) {
  const k = Math.floor(Number(n) || 0);
  if (k < 1) return '';
  let x = k + 1;
  let s = '';
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(97 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}
