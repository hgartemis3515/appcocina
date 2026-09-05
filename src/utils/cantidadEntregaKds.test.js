const {
  recolectarLineaCantidadUnica,
  clampCantidadEntrega,
  anexarCantidadEntrega,
  cantidadEntregaMostrada
} = require('./cantidadEntregaKds');

describe('cantidadEntregaKds', () => {
  const comandas = [{
    _id: 'c1',
    cantidades: [5, 1],
    platos: [
      { _id: 'p1', nombre: 'Pan', estado: 'en_espera' },
      { _id: 'p2', nombre: 'Lomo', estado: 'en_espera' }
    ]
  }];

  test('visible solo con una línea qty > 1', () => {
    const one = new Map([['c1-0', 'seleccionado']]);
    const r = recolectarLineaCantidadUnica(one, comandas);
    expect(r.max).toBe(5);
    expect(r.nombre).toMatch(/Pan/i);

    const two = new Map([['c1-0', 'seleccionado'], ['c1-1', 'seleccionado']]);
    expect(recolectarLineaCantidadUnica(two, comandas)).toBeNull();

    const uno = new Map([['c1-1', 'seleccionado']]);
    expect(recolectarLineaCantidadUnica(uno, comandas)).toBeNull();
  });

  test('ignora guarniciones', () => {
    const g = new Map([['c1-0-g-abc', 'seleccionado']]);
    expect(recolectarLineaCantidadUnica(g, comandas)).toBeNull();
  });

  test('anexar solo si value < max y misma key', () => {
    const lote = [{ comandaId: 'c1', platoIndex: 0, platoId: 'p1' }];
    expect(anexarCantidadEntrega(lote, { visible: true, key: 'c1-0', value: 5, max: 5 })).toEqual(lote);
    expect(anexarCantidadEntrega(lote, { visible: true, key: 'c1-0', value: 2, max: 5 })[0].cantidadEntregar).toBe(2);
  });

  test('clamp', () => {
    expect(clampCantidadEntrega(0, 5)).toBe(1);
    expect(clampCantidadEntrega(9, 5)).toBe(5);
    expect(clampCantidadEntrega(3, 5)).toBe(3);
  });

  test('al seleccionar usa la cantidad más alta hasta que se reste', () => {
    const linea = { key: 'c1-0', max: 5 };
    expect(cantidadEntregaMostrada(linea, null)).toBe(5);
    expect(cantidadEntregaMostrada(linea, { key: null, value: 1 })).toBe(5);
    expect(cantidadEntregaMostrada(linea, { key: 'otra', value: 1 })).toBe(5);
    expect(cantidadEntregaMostrada(linea, { key: 'c1-0', value: 2 })).toBe(2);
  });
});
