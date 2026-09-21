/** Número que ve cocina y mozos. El histórico (comandaNumber) no se muestra aquí. */
export function numeroComandaVisible(comanda) {
  if (!comanda) return null;
  const n = comanda.numeroComandaDia;
  if (n != null && n !== '' && Number.isFinite(Number(n))) return Number(n);
  if (comanda.comandaNumber != null && comanda.comandaNumber !== '') return comanda.comandaNumber;
  return null;
}
