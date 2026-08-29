const {
  prefijoCantidadBadge,
  textoCantidadBadge,
  BADGE_DEFAULTS,
} = require('./monitorBadgeStyles');

describe('textoCantidadBadge / prefijoCantidadBadge', () => {
  test('default es ×N', () => {
    expect(prefijoCantidadBadge({})).toBe('×');
    expect(textoCantidadBadge(2, {})).toBe('×2');
    expect(BADGE_DEFAULTS.cantidadPrefijo).toBe('×');
  });

  test('Ninguno (vacío) deja solo el número', () => {
    expect(textoCantidadBadge(3, { cantidadPrefijo: '' })).toBe('3');
  });

  test('permite cambiar el símbolo', () => {
    expect(textoCantidadBadge(4, { cantidadPrefijo: 'x' })).toBe('x4');
    expect(textoCantidadBadge(4, { cantidadPrefijo: 'X' })).toBe('X4');
    expect(textoCantidadBadge(1, { cantidadPrefijo: '*' })).toBe('*1');
  });

  test('false legado oculta el símbolo', () => {
    expect(textoCantidadBadge(2, { cantidadPrefijo: false })).toBe('2');
  });

  test('true legado usa ×', () => {
    expect(textoCantidadBadge(2, { cantidadPrefijo: true })).toBe('×2');
  });
});
