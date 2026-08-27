const { siguienteEstadoToquePlato } = require('./cicloToquePlatoKds');

describe('siguienteEstadoToquePlato', () => {
  test('libre: 2 toques a verde', () => {
    expect(siguienteEstadoToquePlato('normal', { tomado: false })).toBe('procesando');
    expect(siguienteEstadoToquePlato('procesando', { tomado: false })).toBe('seleccionado');
  });

  test('asignado default: amarillo → rojo → verde', () => {
    const opts = { tomado: true, primerToqueFinalizar: false };
    expect(siguienteEstadoToquePlato('procesando', opts)).toBe('dejar');
    expect(siguienteEstadoToquePlato('dejar', opts)).toBe('seleccionado');
    expect(siguienteEstadoToquePlato('seleccionado', opts)).toBe('procesando');
  });

  test('asignado invertido: amarillo → verde → rojo', () => {
    const opts = { tomado: true, primerToqueFinalizar: true };
    expect(siguienteEstadoToquePlato('procesando', opts)).toBe('seleccionado');
    expect(siguienteEstadoToquePlato('seleccionado', opts)).toBe('dejar');
    expect(siguienteEstadoToquePlato('dejar', opts)).toBe('procesando');
  });
});
