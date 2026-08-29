const { aplicarComandaActualizadaMonitor } = require('./useCocinaMonitorData');

describe('aplicarComandaActualizadaMonitor (reservas → Ver Cocina)', () => {
  const comandaReserva = {
    _id: 'res1',
    IsActive: true,
    programadaPorReserva: false,
    platos: [{ _id: 'p1', estado: 'pedido', procesandoPor: { cocineroId: 'c1' } }],
  };

  test('inserta la comanda si no estaba en la lista (activación T−20)', () => {
    const next = aplicarComandaActualizadaMonitor([], { comanda: comandaReserva });
    expect(next).toHaveLength(1);
    expect(next[0]._id).toBe('res1');
    expect(next[0].platos[0].estado).toBe('pedido');
  });

  test('no inserta reservas aún programadas (bandeja Reservas)', () => {
    const next = aplicarComandaActualizadaMonitor([], {
      comanda: { ...comandaReserva, programadaPorReserva: true },
    });
    expect(next).toHaveLength(0);
  });

  test('fusiona si ya existía, sin duplicar', () => {
    const prev = [{ _id: 'res1', platos: [{ _id: 'p1', estado: 'pedido' }] }];
    const next = aplicarComandaActualizadaMonitor(prev, {
      comanda: {
        ...comandaReserva,
        platos: [{ _id: 'p1', estado: 'pedido', procesandoPor: { cocineroId: 'c1', alias: 'Ana' } }],
      },
    });
    expect(next).toHaveLength(1);
    expect(next[0].platos[0].procesandoPor.alias).toBe('Ana');
  });

  test('el map anterior no añadía: una comanda distinta no desaparece', () => {
    const prev = [{ _id: 'otra', platos: [{ _id: 'x', estado: 'pedido' }] }];
    const next = aplicarComandaActualizadaMonitor(prev, { comanda: comandaReserva });
    expect(next.map((c) => c._id).sort()).toEqual(['otra', 'res1']);
  });
});
