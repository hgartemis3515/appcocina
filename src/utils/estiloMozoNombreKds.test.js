const {
  estiloMozoNombreKds,
  resolverFondoNombreMozo,
  colorPerfilDeComanda,
  colorLetraDeComanda,
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
    expect(st.backgroundColor).toBeUndefined();
    expect(st.fontSize).toBe(`${MOZO_NOMBRE_DEFAULT.mozoNombreTamano}px`);
    expect(st.fontFamily).toMatch(/Arial/);
  });

  test('colorOverride gana al color de letra de vista', () => {
    const st = estiloMozoNombreKds(
      { mozoNombreColor: '#ffffff' },
      { colorOverride: '#fde68a' }
    );
    expect(st.color).toBe('#fde68a');
  });

  test('fondoOverride gana al fondo de vista', () => {
    const st = estiloMozoNombreKds(
      { mozoNombreFondo: '#1d4ed8' },
      { fondoOverride: '#be123c' }
    );
    expect(st.backgroundColor).toBe('#be123c');
  });
});

describe('resolverFondoNombreMozo', () => {
  test('forzar usa el color único aunque el mozo tenga perfil', () => {
    expect(resolverFondoNombreMozo({
      colorPerfil: '#047857',
      configCocina: { forzarColorMozoUnico: true, colorMozoForzado: '#b45309' },
      configVista: { mozoNombreFondo: '#1d4ed8' },
    })).toBe('#b45309');
  });

  test('sin forzar usa el color de perfil del mozo', () => {
    expect(resolverFondoNombreMozo({
      colorPerfil: '#047857',
      configCocina: { forzarColorMozoUnico: false },
      configVista: { mozoNombreFondo: '#1d4ed8' },
    })).toBe('#047857');
  });

  test('sin perfil cae al fondo de vista KDS', () => {
    expect(resolverFondoNombreMozo({
      colorPerfil: null,
      configCocina: { forzarColorMozoUnico: false },
      configVista: { mozoNombreFondo: '#1d4ed8' },
    })).toBe('#1d4ed8');
  });

  test('sin perfil y sin vista: no hay recuadro extra', () => {
    expect(resolverFondoNombreMozo({
      colorPerfil: '',
      configCocina: { forzarColorMozoUnico: false },
    })).toBeNull();
  });

  test('ignorar fondo de Vista y alertas deja el color de perfil', () => {
    expect(resolverFondoNombreMozo({
      colorPerfil: '#047857',
      configCocina: { forzarColorMozoUnico: false, ignorarFondoVistaMozo: true },
      configVista: { mozoNombreFondo: '#1d4ed8' },
    })).toBe('#047857');
  });

  test('ignorar fondo de Vista y alertas no pinta el azul de respaldo', () => {
    expect(resolverFondoNombreMozo({
      colorPerfil: null,
      configCocina: { forzarColorMozoUnico: false, ignorarFondoVistaMozo: true },
      configVista: { mozoNombreFondo: '#1d4ed8' },
    })).toBeNull();
  });

  test('fondo de vista vacío no fuerza recuadro', () => {
    const st = estiloMozoNombreKds({ mozoNombreFondo: '' });
    expect(st.backgroundColor).toBeUndefined();
  });
});

describe('colorPerfilDeComanda', () => {
  test('lee colorPerfil del mozo poblado', () => {
    expect(colorPerfilDeComanda({ mozos: { name: 'Ana', colorPerfil: '#047857' } })).toBe('#047857');
  });

  test('acepta lista de mozos', () => {
    expect(colorPerfilDeComanda({
      mozos: [{ name: 'Ana' }, { name: 'Luis', colorPerfil: '#be123c' }],
    })).toBe('#be123c');
  });
});

describe('colorLetraDeComanda', () => {
  test('lee colorLetraPerfil del mozo poblado', () => {
    expect(colorLetraDeComanda({
      mozos: { name: 'Ana', colorLetraPerfil: '#fde68a' },
    })).toBe('#fde68a');
  });
});
