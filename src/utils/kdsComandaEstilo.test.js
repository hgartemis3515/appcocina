const {
  platoKdsEstiloCompacto,
  comandaKdsEstiloCompacto,
  textoNumeroSerieKds,
} = require('./kdsComandaEstilo');

describe('kdsComandaEstilo', () => {
  test('compacto solo si todos los platos activos lo marcan', () => {
    const dch = { kdsEstiloCompacto: true };
    const lomo = { kdsEstiloCompacto: false };
    expect(comandaKdsEstiloCompacto({ platos: [dch, { ...dch, nombreCocinaPedido: 'TÉ' }] })).toBe(true);
    expect(comandaKdsEstiloCompacto({ platos: [dch, lomo] })).toBe(false);
    expect(comandaKdsEstiloCompacto({ platos: [{ ...dch, eliminado: true }] })).toBe(false);
    expect(platoKdsEstiloCompacto({ plato: { kdsEstiloCompacto: true } })).toBe(true);
  });

  test('textoNumeroSerieKds', () => {
    expect(textoNumeroSerieKds({ numeroSerie: '07' })).toBe('07');
    expect(textoNumeroSerieKds({ numeroSerie: '1' })).toBe('');
    expect(textoNumeroSerieKds({})).toBe('');
  });
});
