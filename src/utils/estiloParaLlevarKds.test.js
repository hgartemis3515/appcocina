const {
  estiloParaLlevarKds,
  tamanoParaLlevarKds,
  estiloCuadroNombreParaLlevar,
  estiloCuadroNombreReserva,
  PARA_LLEVAR_DEFAULT,
  COLOR_PARA_LLEVAR,
  COLOR_RESERVA,
} = require('./estiloParaLlevarKds');

describe('estiloParaLlevarKds', () => {
  test('usa el tamaño configurado', () => {
    expect(tamanoParaLlevarKds({ paraLlevarTamano: 20 })).toBe(20);
    expect(estiloParaLlevarKds({ paraLlevarTamano: 20 }).fontSize).toBe('20px');
  });

  test('clampa y usa default si es inválido', () => {
    expect(tamanoParaLlevarKds({ paraLlevarTamano: 99 })).toBe(32);
    expect(tamanoParaLlevarKds({ paraLlevarTamano: 2 })).toBe(8);
    expect(tamanoParaLlevarKds({})).toBe(PARA_LLEVAR_DEFAULT.paraLlevarTamano);
  });
});

describe('estiloCuadroNombreParaLlevar', () => {
  test('usa el morado de PARA LLEVAR', () => {
    const st = estiloCuadroNombreParaLlevar(36);
    expect(st.backgroundColor).toBe(COLOR_PARA_LLEVAR);
  });

  test('el recuadro de reserva es rosado', () => {
    expect(estiloCuadroNombreReserva(36).backgroundColor).toBe(COLOR_RESERVA);
  });

  test('el recuadro crece con el tamaño de letra del plato', () => {
    const chico = estiloCuadroNombreParaLlevar(20);
    const grande = estiloCuadroNombreParaLlevar(72);
    const padChico = parseInt(chico.padding, 10);
    const padGrande = parseInt(grande.padding, 10);
    expect(padGrande).toBeGreaterThan(padChico);
    expect(parseInt(grande.borderRadius, 10)).toBeGreaterThan(parseInt(chico.borderRadius, 10));
  });
});
