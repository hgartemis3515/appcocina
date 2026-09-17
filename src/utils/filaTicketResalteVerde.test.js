import {
  claveFilaTicketResalte,
  parseFilasTicketVerde,
  loadFilasTicketVerde,
  saveFilasTicketVerde,
  filaTicketResaltadaVerde,
  toggleFilaTicketVerde,
  clasesFilaTicketAvanzado,
  FILAS_TICKET_VERDE_KEY,
} from './filaTicketResalteVerde';

describe('filaTicketResalteVerde', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('clave usa _id del ticket', () => {
    expect(claveFilaTicketResalte({ _id: 'abc' })).toBe('abc');
    expect(claveFilaTicketResalte('abc')).toBe('abc');
    expect(claveFilaTicketResalte(null)).toBe('');
  });

  test('toggle marca y desmarca sin otros efectos', () => {
    let ids = toggleFilaTicketVerde(new Set(), 't1');
    expect(filaTicketResaltadaVerde(ids, 't1')).toBe(true);
    ids = toggleFilaTicketVerde(ids, 't1');
    expect(filaTicketResaltadaVerde(ids, 't1')).toBe(false);
  });

  test('clases pintan verde solo cuando está marcado', () => {
    expect(clasesFilaTicketAvanzado({})).not.toContain('bg-emerald-600/45');
    expect(clasesFilaTicketAvanzado({ resaltadoVerde: true })).toContain('bg-emerald-600/45');
    expect(clasesFilaTicketAvanzado({ resaltadoVerde: true, seleccionado: true })).toContain('bg-rose-900/30');
    expect(clasesFilaTicketAvanzado({ resaltadoVerde: true, seleccionado: true })).not.toContain('bg-emerald-600/45');
  });

  test('save y load persisten las claves', () => {
    saveFilasTicketVerde(new Set(['a', 'b']));
    const loaded = loadFilasTicketVerde();
    expect(loaded.has('a')).toBe(true);
    expect(loaded.has('b')).toBe(true);
    expect(JSON.parse(localStorage.getItem(FILAS_TICKET_VERDE_KEY))).toEqual(['a', 'b']);
  });

  test('JSON inválido no marca filas', () => {
    localStorage.setItem(FILAS_TICKET_VERDE_KEY, '{no');
    expect(loadFilasTicketVerde().size).toBe(0);
    expect(parseFilasTicketVerde(null)).toEqual([]);
  });
});
