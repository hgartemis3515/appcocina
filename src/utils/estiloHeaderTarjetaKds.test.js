const {
  resolverHeaderTarjetaEstilo,
  resolverEstiloHeaderTarjetaComanda,
  paddingHeaderTarjetaKds,
  HEADER_TARJETA_DEFAULT,
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
});
