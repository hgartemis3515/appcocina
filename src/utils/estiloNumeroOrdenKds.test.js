const {
  textoNumeroOrdenKds,
  estiloNumeroOrdenKds,
  ORDEN_COLA_DEFAULT,
} = require('./estiloNumeroOrdenKds');

describe('estiloNumeroOrdenKds', () => {
  test('incluye # por default y lo quita si se pide', () => {
    expect(textoNumeroOrdenKds(1, {})).toBe('#1');
    expect(textoNumeroOrdenKds(2, { ordenColaMostrarHash: true })).toBe('#2');
    expect(textoNumeroOrdenKds(3, { ordenColaMostrarHash: false })).toBe('3');
  });

  test('aplica fuente, tamaño y color', () => {
    const st = estiloNumeroOrdenKds({
      ordenColaFuente: 'arial',
      ordenColaTamano: 16,
      ordenColaColor: '#ffcc00',
    });
    expect(st.fontFamily).toMatch(/Arial/);
    expect(st.fontSize).toBe('16px');
    expect(st.color).toBe('#ffcc00');
  });

  test('cae a default si el color no es hex', () => {
    const st = estiloNumeroOrdenKds({ ordenColaColor: 'rojo' });
    expect(st.color).toBe(ORDEN_COLA_DEFAULT.ordenColaColor);
  });
});
