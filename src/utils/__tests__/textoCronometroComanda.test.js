const { textoCronometroComanda } = require('../textoCronometroComanda');

describe('textoCronometroComanda', () => {
  test('sin hora queda en minutos y segundos', () => {
    expect(textoCronometroComanda(0)).toBe('00:00');
    expect(textoCronometroComanda(10 * 60)).toBe('10:00');
    expect(textoCronometroComanda(45)).toBe('00:45');
  });

  test('con hora se conserva', () => {
    expect(textoCronometroComanda(3600 + 10 * 60)).toBe('1:10:00');
    expect(textoCronometroComanda(2 * 3600 + 5)).toBe('2:00:05');
  });
});
