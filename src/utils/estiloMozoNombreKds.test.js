const {
  estiloMozoNombreKds,
  MOZO_NOMBRE_DEFAULT,
} = require('./estiloMozoNombreKds');

describe('estiloMozoNombreKds', () => {
  test('aplica fuente, tamaño y color', () => {
    const st = estiloMozoNombreKds({
      mozoNombreFuente: 'georgia',
      mozoNombreTamano: 16,
      mozoNombreColor: '#fbbf24',
    });
    expect(st.fontSize).toBe('16px');
    expect(st.color).toBe('#fbbf24');
    expect(st.fontFamily).toMatch(/Georgia/);
  });

  test('cae a default si el color no es hex', () => {
    const st = estiloMozoNombreKds({
      mozoNombreColor: 'amarillo',
      mozoNombreFuente: 'no-existe',
    });
    expect(st.color).toBe(MOZO_NOMBRE_DEFAULT.mozoNombreColor);
    expect(st.fontSize).toBe(`${MOZO_NOMBRE_DEFAULT.mozoNombreTamano}px`);
    expect(st.fontFamily).toMatch(/Arial/);
  });
});
