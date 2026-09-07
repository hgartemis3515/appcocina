const {
  resolverHeaderTarjetaEstilo,
  resolverEstiloHeaderTarjetaComanda,
  paddingHeaderTarjetaKds,
  HEADER_TARJETA_DEFAULT,
  HEADER_TARJETA_LETRAS_DEFAULT,
  ocultarPrepHeaderTarjeta,
  estiloDatoHeaderTarjetaKds,
  colorRelojHeaderTarjeta,
} = require('./estiloHeaderTarjetaKds');

describe('estiloHeaderTarjetaKds', () => {
  test('default compacto si falta o es inválido', () => {
    expect(resolverHeaderTarjetaEstilo({})).toBe(HEADER_TARJETA_DEFAULT);
    expect(resolverHeaderTarjetaEstilo({ headerTarjetaEstilo: 'nope' })).toBe('compacto');
  });

  test('acepta los tres estilos', () => {
    expect(resolverHeaderTarjetaEstilo({ headerTarjetaEstilo: 'clasico' })).toBe('clasico');
    expect(resolverHeaderTarjetaEstilo({ headerTarjetaEstilo: 'dosFilas' })).toBe('dosFilas');
    expect(resolverHeaderTarjetaEstilo({ headerTarjetaEstilo: 'compacto' })).toBe('compacto');
  });

  test('clasico usa más padding', () => {
    expect(paddingHeaderTarjetaKds('clasico')).toBe('p-3');
    expect(paddingHeaderTarjetaKds('compacto')).toBe('px-2 py-1.5');
  });

  test('forzarCompacto gana al perfil clásico', () => {
    expect(resolverEstiloHeaderTarjetaComanda(
      { headerTarjetaEstilo: 'clasico' },
      { forzarCompacto: true }
    )).toBe('compacto');
    expect(resolverEstiloHeaderTarjetaComanda(
      { headerTarjetaEstilo: 'clasico' },
      { forzarCompacto: false }
    )).toBe('clasico');
  });

  test('oculta Prep solo si el flag está activo', () => {
    expect(ocultarPrepHeaderTarjeta({})).toBe(false);
    expect(ocultarPrepHeaderTarjeta({ headerTarjetaOcultarPrep: false })).toBe(false);
    expect(ocultarPrepHeaderTarjeta({ headerTarjetaOcultarPrep: true })).toBe(true);
  });

  test('letras del encabezado: tamaño, color, contorno y fondo', () => {
    const st = estiloDatoHeaderTarjetaKds({
      headerTarjetaFuente: 'georgia',
      headerTarjetaTamano: 22,
      headerTarjetaColor: '#fde68a',
      headerTarjetaContorno: '#f59e0b',
      headerTarjetaFondo: '#0f172a',
    });
    expect(st.fontSize).toBe('22px');
    expect(st.color).toBe('#fde68a');
    expect(st.backgroundColor).toBe('#0f172a');
    expect(st.border).toBe('2px solid #f59e0b');
    expect(st.fontFamily).toMatch(/Georgia/);
  });

  test('cae a defaults si los colores no son hex', () => {
    const st = estiloDatoHeaderTarjetaKds({
      headerTarjetaColor: 'rojo',
      headerTarjetaFondo: 'azul',
      headerTarjetaContorno: 'verde',
    });
    expect(st.color).toBe(HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaColor);
    expect(st.backgroundColor).toBe(HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaFondo);
    expect(st.border).toBe(`2px solid ${HEADER_TARJETA_LETRAS_DEFAULT.headerTarjetaContorno}`);
  });

  test('reloj usa amarillo/rojo de alerta y si no el color de letra', () => {
    const cfg = { headerTarjetaColor: '#ffffff' };
    expect(colorRelojHeaderTarjeta(3, 5, 20, cfg)).toBe('#ffffff');
    expect(colorRelojHeaderTarjeta(8, 5, 20, cfg)).toBe('#fde68a');
    expect(colorRelojHeaderTarjeta(21, 5, 20, cfg)).toBe('#fecaca');
  });
});
