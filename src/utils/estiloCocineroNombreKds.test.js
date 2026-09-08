const {
  estiloCocineroNombreKds,
  textoNombreCocineroKds,
  COCINERO_NOMBRE_DEFAULT,
} = require('./estiloCocineroNombreKds');

describe('estiloCocineroNombreKds', () => {
  test('usa colores de Vista y alertas', () => {
    const st = estiloCocineroNombreKds({
      cocineroNombreColor: '#111111',
      cocineroNombreFondo: '#facc15',
    });
    expect(st.color).toBe('#111111');
    expect(st.backgroundColor).toBe('#facc15');
  });

  test('cae al default si el hex no vale', () => {
    const st = estiloCocineroNombreKds({ cocineroNombreColor: 'rojo', cocineroNombreFondo: '' });
    expect(st.color).toBe(COCINERO_NOMBRE_DEFAULT.cocineroNombreColor);
    expect(st.backgroundColor).toBe(COCINERO_NOMBRE_DEFAULT.cocineroNombreFondo);
  });
});

describe('textoNombreCocineroKds', () => {
  const proc = {
    cocineroId: 'c3',
    nombre: 'Luis',
    alias: 'Chef 3',
    pronombre: 'C3',
  };

  test('Tú si es el usuario actual', () => {
    expect(textoNombreCocineroKds(proc, { usuarioActualId: 'c3' })).toBe('Tú');
  });

  test('pronombre de cocineros.html si el flag está on', () => {
    expect(textoNombreCocineroKds(proc, { usuarioActualId: 'otro', usarPronombre: true })).toBe('C3');
  });

  test('alias si el flag está off', () => {
    expect(textoNombreCocineroKds(proc, { usuarioActualId: 'otro', usarPronombre: false })).toBe('Chef 3');
  });
});
