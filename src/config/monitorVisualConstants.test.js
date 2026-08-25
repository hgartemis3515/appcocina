const { clampColumnas, columnasQueCaben } = require('./monitorVisualConstants');

describe('clampColumnas', () => {
  test('honra 1–10 para Personalizar vista (sin recortar por ancho de monitor)', () => {
    expect(clampColumnas(1)).toBe(1);
    expect(clampColumnas(4)).toBe(4);
    expect(clampColumnas(8)).toBe(8);
    expect(clampColumnas(10)).toBe(10);
    expect(clampColumnas('6')).toBe(6);
    expect(clampColumnas(99)).toBe(10);
    expect(clampColumnas(0)).toBe(1);
  });
});

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
