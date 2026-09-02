const {
  estiloNombreComplementoKds,
  NOMBRE_COMPLEMENTO_DEFAULT,
} = require('./estiloNombreComplementoKds');

describe('estiloNombreComplementoKds', () => {
  test('usa tamaño, fuente, color y cuadro configurados', () => {
    const st = estiloNombreComplementoKds({
      nombreComplementoFuente: 'georgia',
      nombreComplementoTamano: 16,
      nombreComplementoColor: '#fde68a',
      nombreComplementoFondo: '#1f2937',
    });
    expect(st.fontSize).toBe('16px');
    expect(st.color).toBe('#fde68a');
    expect(st.backgroundColor).toBe('#1f2937');
    expect(st.fontFamily).toMatch(/Georgia/);
  });

  test('compacto reduce el tamaño y cae a defaults inválidos', () => {
    const st = estiloNombreComplementoKds(
      { nombreComplementoTamano: 20, nombreComplementoColor: 'rojo' },
      { compact: true }
    );
    expect(st.fontSize).toBe('17px');
    expect(st.color).toBe(NOMBRE_COMPLEMENTO_DEFAULT.nombreComplementoColor);
    expect(st.backgroundColor).toBe(NOMBRE_COMPLEMENTO_DEFAULT.nombreComplementoFondo);
  });
});
