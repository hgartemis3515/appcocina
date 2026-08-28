const {
  estiloCantidadPlatoKds,
  CANTIDAD_PLATO_DEFAULT,
} = require('./estiloCantidadPlatoKds');

describe('estiloCantidadPlatoKds', () => {
  test('aplica color, fondo y tamaño', () => {
    const st = estiloCantidadPlatoKds({
      cantidadPlatoColor: '#111111',
      cantidadPlatoFondo: '#facc15',
      cantidadPlatoTamano: 18,
    });
    expect(st.color).toBe('#111111');
    expect(st.backgroundColor).toBe('#facc15');
    expect(st.fontSize).toBe('18px');
    expect(st.minWidth).toBe('24px');
  });

  test('cae a default si el color no es hex', () => {
    const st = estiloCantidadPlatoKds({
      cantidadPlatoColor: 'blanco',
      cantidadPlatoFondo: 'naranja',
    });
    expect(st.color).toBe(CANTIDAD_PLATO_DEFAULT.cantidadPlatoColor);
    expect(st.backgroundColor).toBe(CANTIDAD_PLATO_DEFAULT.cantidadPlatoFondo);
  });
});
