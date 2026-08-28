const {
  textoNumeroOrdenKds,
  estiloNumeroOrdenKds,
  hexParaColorPicker,
  ORDEN_COLA_DEFAULT,
} = require('./estiloNumeroOrdenKds');

describe('estiloNumeroOrdenKds', () => {
  test('incluye # por default y lo quita si se pide', () => {
    expect(textoNumeroOrdenKds(1, {})).toBe('#1');
    expect(textoNumeroOrdenKds(2, { ordenColaMostrarHash: true })).toBe('#2');
    expect(textoNumeroOrdenKds(3, { ordenColaMostrarHash: false })).toBe('3');
  });

  test('aplica fuente, tamaño y color de letra', () => {
    const st = estiloNumeroOrdenKds({
      ordenColaFuente: 'arial',
      ordenColaTamano: 16,
      ordenColaColor: '#ffcc00',
    });
    expect(st.fontFamily).toMatch(/Arial/);
    expect(st.fontSize).toBe('16px');
    expect(st.color).toBe('#ffcc00');
  });

  test('aplica color y tamaño del cuadro aparte de la letra', () => {
    const st = estiloNumeroOrdenKds({
      ordenColaColor: '#ffffff',
      ordenColaCuadroColor: '#dc2626',
      ordenColaCuadroTamano: 28,
    });
    expect(st.color).toBe('#ffffff');
    expect(st.backgroundColor).toBe('#dc2626');
    expect(st.minWidth).toBe('28px');
    expect(st.minHeight).toBe('28px');
  });

  test('cae a default si el color no es hex', () => {
    const st = estiloNumeroOrdenKds({ ordenColaColor: 'rojo', ordenColaCuadroColor: 'verde' });
    expect(st.color).toBe(ORDEN_COLA_DEFAULT.ordenColaColor);
    expect(st.backgroundColor).toBe(ORDEN_COLA_DEFAULT.ordenColaCuadroColor);
  });

  test('hexParaColorPicker expande #rgb', () => {
    expect(hexParaColorPicker('#0f0', '#000000')).toBe('#00ff00');
    expect(hexParaColorPicker('no', '#065f46')).toBe('#065f46');
  });
});
