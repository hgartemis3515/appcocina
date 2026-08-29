const {
  estiloMozoNombreKds,
  MOZO_NOMBRE_DEFAULT,
} = require('./estiloMozoNombreKds');

describe('estiloMozoNombreKds', () => {
  test('aplica fuente, tamaño, color y fondo', () => {
    const st = estiloMozoNombreKds({
      mozoNombreFuente: 'georgia',
      mozoNombreTamano: 16,
      mozoNombreColor: '#fbbf24',
      mozoNombreFondo: '#1d4ed8',
    });
    expect(st.fontSize).toBe('16px');
    expect(st.color).toBe('#fbbf24');
    expect(st.backgroundColor).toBe('#1d4ed8');
    expect(st.fontFamily).toMatch(/Georgia/);
  });

  test('cae a default si el color no es hex', () => {
    const st = estiloMozoNombreKds({
      mozoNombreColor: 'amarillo',
      mozoNombreFondo: 'azul',
      mozoNombreFuente: 'no-existe',
    });
    expect(st.color).toBe(MOZO_NOMBRE_DEFAULT.mozoNombreColor);
    expect(st.backgroundColor).toBe(MOZO_NOMBRE_DEFAULT.mozoNombreFondo);
    expect(st.fontSize).toBe(`${MOZO_NOMBRE_DEFAULT.mozoNombreTamano}px`);
    expect(st.fontFamily).toMatch(/Arial/);
  });
});
