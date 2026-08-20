const { clampColumnas, columnasQueCaben } = require('./monitorVisualConstants');

describe('columnasQueCaben', () => {
  test('portrait 1080 de ancho no abre más columnas de las que caben', () => {
    expect(columnasQueCaben(1080, 8)).toBe(3);
    expect(columnasQueCaben(1080, 1)).toBe(1);
  });

  test('split horizontal ~540px fuerza 1 columna', () => {
    expect(columnasQueCaben(540, 4)).toBe(1);
  });

  test('respeta el tope de clampColumnas', () => {
    expect(columnasQueCaben(4000, 99)).toBe(clampColumnas(99));
  });
});
