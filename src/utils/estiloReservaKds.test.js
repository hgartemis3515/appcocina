import {
  RESERVA_TEXTO_DEFAULT,
  estiloCuadroReservaKds,
  estiloLetraReservaKds,
  estiloLetraHorarioReservaKds,
  estiloCronometroReservaKds,
  ocultarCohetePrioridadKds,
} from './estiloReservaKds';

describe('estiloReservaKds', () => {
  test('cuadro negro y letras por defecto', () => {
    expect(estiloCuadroReservaKds({}).backgroundColor).toBe(RESERVA_TEXTO_DEFAULT.colorReservaCuadro);
    expect(estiloLetraReservaKds({}).color).toBe(RESERVA_TEXTO_DEFAULT.colorReservaTexto);
    expect(estiloLetraHorarioReservaKds({}).color).toBe(RESERVA_TEXTO_DEFAULT.colorReservaHorario);
  });

  test('respeta colores de Vista y alertas', () => {
    const cfg = {
      colorReservaTexto: '#facc15',
      colorReservaHorario: '#38bdf8',
      colorReservaCuadro: '#1e3a8a',
      colorReservaCronometro: '#fff',
      colorReservaCronometroFondo: '#ea580c',
    };
    expect(estiloLetraReservaKds(cfg).color).toBe('#facc15');
    expect(estiloLetraHorarioReservaKds(cfg).color).toBe('#38bdf8');
    expect(estiloCuadroReservaKds(cfg).backgroundColor).toBe('#1e3a8a');
    expect(estiloCronometroReservaKds(cfg).color).toBe('#fff');
    expect(estiloCronometroReservaKds(cfg).backgroundColor).toBe('#ea580c');
  });

  test('ignora hex inválido', () => {
    expect(estiloLetraReservaKds({ colorReservaTexto: 'rojo' }).color).toBe(
      RESERVA_TEXTO_DEFAULT.colorReservaTexto
    );
  });

  test('ocultar cohete', () => {
    expect(ocultarCohetePrioridadKds({})).toBe(false);
    expect(ocultarCohetePrioridadKds({ ocultarCohetePrioridadKds: true })).toBe(true);
  });
});
