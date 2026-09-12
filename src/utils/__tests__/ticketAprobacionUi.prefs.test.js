import {
  DEFAULT_TICKETS_TABLA_PREFS,
  loadTicketsTablaPrefs,
  saveTicketsTablaPrefs,
  ticketEsParaLlevar,
} from '../ticketAprobacionUi';
import { TICKETS_TABLA_VISUAL_DEFAULT } from '../estiloTicketsTabla';

describe('tickets tabla prefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('load usa defaults si no hay nada guardado', () => {
    expect(loadTicketsTablaPrefs()).toEqual(DEFAULT_TICKETS_TABLA_PREFS);
  });

  test('save y load redondean a booleanos y conservan visual', () => {
    const saved = saveTicketsTablaPrefs({
      ocultarGuarniciones: 1,
      imprimirSinGuarniciones: true,
    });
    expect(saved).toEqual({
      ocultarGuarniciones: true,
      imprimirSinGuarniciones: true,
      ...TICKETS_TABLA_VISUAL_DEFAULT,
    });
    expect(loadTicketsTablaPrefs()).toEqual(saved);
  });

  test('JSON viejo sin colores mergea defaults visuales', () => {
    localStorage.setItem('cocinaTicketsTablaPrefs', JSON.stringify({ ocultarGuarniciones: true }));
    const loaded = loadTicketsTablaPrefs();
    expect(loaded.ocultarGuarniciones).toBe(true);
    expect(loaded.paraLlevarFondo).toBe(TICKETS_TABLA_VISUAL_DEFAULT.paraLlevarFondo);
    expect(loaded.textoFondo).toBe('');
  });

  test('JSON inválido vuelve a defaults', () => {
    localStorage.setItem('cocinaTicketsTablaPrefs', '{no-json');
    expect(loadTicketsTablaPrefs()).toEqual(DEFAULT_TICKETS_TABLA_PREFS);
  });

  test('persiste color para llevar y letras', () => {
    const saved = saveTicketsTablaPrefs({
      paraLlevarFondo: '#4c1d95',
      paraLlevarContorno: '#5b21b6',
      textoPlatosColor: '#fde68a',
      textoTotalColor: '#fef08a',
      textoRestoColor: '#e9d5ff',
      textoTamano: 18,
      textoFondo: '#1e1b4b',
    });
    expect(saved.paraLlevarFondo).toBe('#4c1d95');
    expect(saved.textoTamano).toBe(18);
    expect(saved.textoFondo).toBe('#1e1b4b');
    expect(loadTicketsTablaPrefs().textoPlatosColor).toBe('#fde68a');
  });
});

describe('ticketEsParaLlevar', () => {
  test('sinMesa', () => {
    expect(ticketEsParaLlevar({ sinMesa: true, platos: [] })).toBe(true);
  });

  test('todos los platos para_llevar', () => {
    expect(ticketEsParaLlevar({
      numMesa: 4,
      platos: [
        { nombre: 'A', tipoServicio: 'para_llevar' },
        { nombre: 'B', paraLlevar: true },
      ],
    })).toBe(true);
  });

  test('no pinta extra_llevar suelto ni mixto', () => {
    expect(ticketEsParaLlevar({
      numMesa: 4,
      mesa: { _id: 'm1', nummesa: 4 },
      platos: [{ tipoServicio: 'extra_llevar' }],
    })).toBe(false);
    expect(ticketEsParaLlevar({
      numMesa: 4,
      mesa: { _id: 'm1', nummesa: 4 },
      platos: [
        { tipoServicio: 'mesa' },
        { tipoServicio: 'para_llevar' },
      ],
    })).toBe(false);
  });

  test('comandas sin mesa', () => {
    expect(ticketEsParaLlevar({
      numMesa: 1,
      comandas: [{ sinMesa: true, platos: [{ tipoServicio: 'para_llevar' }] }],
    })).toBe(true);
  });
});
