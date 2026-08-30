const {
  estiloNombrePlatoKds,
  NOMBRE_PLATO_DEFAULT,
} = require('./estiloNombrePlatoKds');

describe('estiloNombrePlatoKds', () => {
  test('usa tamaño, fuente y color configurados', () => {
    const st = estiloNombrePlatoKds({
      nombrePlatoFuente: 'georgia',
      tamanoFuentePlatos: 22,
      nombrePlatoColor: '#fde68a',
    });
    expect(st.fontSize).toBe('22px');
    expect(st.color).toBe('#fde68a');
    expect(st.fontFamily).toMatch(/Georgia/);
  });

  test('compacto reduce el tamaño y cae a defaults inválidos', () => {
    const st = estiloNombrePlatoKds({ tamanoFuentePlatos: 20, nombrePlatoColor: 'rojo' }, { compact: true });
    expect(st.fontSize).toBe('16px');
    expect(st.color).toBe(NOMBRE_PLATO_DEFAULT.nombrePlatoColor);
  });
});
