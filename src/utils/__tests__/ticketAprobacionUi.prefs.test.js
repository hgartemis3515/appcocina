import {
  DEFAULT_TICKETS_TABLA_PREFS,
  loadTicketsTablaPrefs,
  saveTicketsTablaPrefs,
} from '../ticketAprobacionUi';

describe('tickets tabla prefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('load usa defaults si no hay nada guardado', () => {
    expect(loadTicketsTablaPrefs()).toEqual(DEFAULT_TICKETS_TABLA_PREFS);
  });

  test('save y load redondean a booleanos', () => {
    const saved = saveTicketsTablaPrefs({
      ocultarGuarniciones: 1,
      imprimirSinGuarniciones: true,
    });
    expect(saved).toEqual({
      ocultarGuarniciones: true,
      imprimirSinGuarniciones: true,
    });
    expect(loadTicketsTablaPrefs()).toEqual(saved);
  });

  test('JSON inválido vuelve a defaults', () => {
    localStorage.setItem('cocinaTicketsTablaPrefs', '{no-json');
    expect(loadTicketsTablaPrefs()).toEqual(DEFAULT_TICKETS_TABLA_PREFS);
  });
});
