import {
  agruparPlatosSosTabla,
  claveNombreSos,
  instantePedidoSos,
  paginaDeComanda,
  platoVisibleEnTablaKds,
  platoVisibleSos,
  qtyLineaSos,
} from './sosTablaKds';

describe('sosTablaKds', () => {
  test('clave normaliza mayúsculas y vacío', () => {
    expect(claveNombreSos('  Lomo  ')).toBe('LOMO');
    expect(claveNombreSos('')).toBe('SIN NOMBRE');
  });

  test('qty usa cantidades[i] y cae a plato.cantidad', () => {
    expect(qtyLineaSos({ cantidades: [2, 3] }, 1, { cantidad: 9 })).toBe(3);
    expect(qtyLineaSos({}, 0, { cantidad: 4 })).toBe(4);
    expect(qtyLineaSos({}, 0, {})).toBe(1);
  });

  test('oculta eliminados y anulados', () => {
    expect(platoVisibleSos({ nombre: 'A' })).toBe(true);
    expect(platoVisibleSos({ eliminado: true })).toBe(false);
    expect(platoVisibleSos({ anulado: true })).toBe(false);
  });

  test('reserva no usa createdAt de armado', () => {
    const ts = instantePedidoSos(
      {},
      { origenCreacion: 'reserva', createdAt: '2026-01-01T00:00:00.000Z', prioridadOrden: '2026-09-21T12:00:00.000Z' }
    );
    expect(ts).toBe(new Date('2026-09-21T12:00:00.000Z').getTime());
  });

  test('5 comandas / 10 platos agrupan Lomo ×6 y Pollo ×4; clic al más antiguo', () => {
    const t0 = '2026-09-21T10:00:00.000Z';
    const t1 = '2026-09-21T10:05:00.000Z';
    const comandas = [
      {
        _id: 'c1',
        createdAt: t0,
        platos: [
          { _id: 'p1', nombre: 'Lomo', tiempos: { pedido: t0 } },
          { _id: 'p2', nombre: 'Lomo', tiempos: { pedido: t0 } },
        ],
        cantidades: [2, 1],
      },
      {
        _id: 'c2',
        createdAt: t1,
        platos: [{ _id: 'p3', nombre: 'lomo', tiempos: { pedido: t1 } }],
        cantidades: [2],
      },
      {
        _id: 'c3',
        createdAt: t1,
        platos: [
          { _id: 'p4', nombre: 'Pollo', tiempos: { pedido: t1 } },
          { _id: 'p5', nombre: 'Pollo', tiempos: { pedido: t0 } },
        ],
        cantidades: [1, 2],
      },
      {
        _id: 'c4',
        createdAt: t1,
        platos: [{ _id: 'p6', nombre: 'Pollo', tiempos: { pedido: t1 } }],
        cantidades: [1],
      },
      {
        _id: 'c5',
        createdAt: t1,
        platos: [{ _id: 'p7', nombre: 'Lomo', tiempos: { pedido: t1 } }],
        cantidades: [1],
      },
    ];
    const grupos = agruparPlatosSosTabla(comandas);
    expect(grupos.reduce((s, g) => s + g.cantidad, 0)).toBe(10);
    const lomo = grupos.find((g) => g.clave === 'LOMO');
    const pollo = grupos.find((g) => g.clave === 'POLLO');
    expect(lomo.cantidad).toBe(6);
    expect(pollo.cantidad).toBe(4);
    expect(lomo.comandaIdMasAntigua).toBe('c1');
    expect(pollo.comandaIdMasAntigua).toBe('c3');
    expect(grupos[0].clave).toBe('LOMO');
  });

  test('no cuenta salio, entregado ni pendiente: no salen en la tarjeta', () => {
    const comandas = [{
      _id: 'c1',
      platos: [
        { _id: 'a', nombre: 'Lomo', estado: 'en_espera' },
        { _id: 'b', nombre: 'Lomo', estado: 'salio' },
        { _id: 'c', nombre: 'Sopa', estado: 'entregado' },
        { _id: 'd', nombre: 'Causa', estado: 'pendiente' },
        { _id: 'e', nombre: 'Pollo', estado: 'recoger' },
      ],
      cantidades: [1, 2, 1, 1, 1],
    }];
    const grupos = agruparPlatosSosTabla(comandas);
    expect(grupos.map((g) => g.clave).sort()).toEqual(['LOMO', 'POLLO']);
    expect(grupos.find((g) => g.clave === 'LOMO').cantidad).toBe(1);
    expect(platoVisibleEnTablaKds({ estado: 'salio' })).toBe(false);
    expect(platoVisibleEnTablaKds({ estado: 'recoger' })).toBe(true);
  });

  test('paginaDeComanda respeta cols×rows', () => {
    const cmds = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }];
    expect(paginaDeComanda(cmds, 'c', 2)).toBe(1);
    expect(paginaDeComanda(cmds, 'a', 5)).toBe(0);
  });
});
