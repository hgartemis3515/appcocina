const { siguienteEstadoToquePlato } = require('./cicloToquePlatoKds');

describe('siguienteEstadoToquePlato', () => {
  test('libre: 2 toques a verde', () => {
    expect(siguienteEstadoToquePlato('normal', { tomado: false })).toBe('procesando');
    expect(siguienteEstadoToquePlato('procesando', { tomado: false })).toBe('seleccionado');
  });

  test('asignado: un toque selecciona y otro deselecciona', () => {
    const opts = { tomado: true };
    expect(siguienteEstadoToquePlato('procesando', opts)).toBe('seleccionado');
    expect(siguienteEstadoToquePlato('seleccionado', opts)).toBe('procesando');
    expect(siguienteEstadoToquePlato('dejar', opts)).toBe('procesando');
  });
});
