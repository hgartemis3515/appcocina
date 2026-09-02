const { resumenKpisTickets } = require('./ticketTotales');

describe('resumenKpisTickets', () => {
  test('separa pendiente, aprobado, descuento y total venta', () => {
    const k = resumenKpisTickets([
      { estado: 'pendiente_aprobacion', total: 40, montoDescuento: 0 },
      { estado: 'aprobado', total: 80, montoDescuento: 10, totalSinDescuento: 90 },
      { estado: 'reportado', total: 50, montoDescuento: 5 },
    ]);
    expect(k.pendiente).toBe(40);
    expect(k.aprobados).toBe(80);
    expect(k.descuento).toBe(10);
    expect(k.totalVenta).toBe(120);
  });

  test('sin tickets queda en cero', () => {
    expect(resumenKpisTickets([])).toEqual({
      pendiente: 0,
      aprobados: 0,
      descuento: 0,
      totalVenta: 0,
    });
  });

  test('dos tickets aprobados de la misma comanda no duplican pagadas', () => {
    const k = resumenKpisTickets([
      {
        _id: 't1',
        comandas: ['c1'],
        estado: 'aprobado',
        total: 80,
        createdAt: '2026-09-02T10:00:00.000Z',
        ticketNumber: 1,
      },
      {
        _id: 't2',
        comandas: ['c1'],
        estado: 'aprobado',
        total: 80,
        createdAt: '2026-09-02T11:00:00.000Z',
        ticketNumber: 2,
      },
    ]);
    expect(k.aprobados).toBe(80);
    expect(k.totalVenta).toBe(80);
  });

  test('PPA y ticket de comanda: solo el último', () => {
    const k = resumenKpisTickets([
      {
        _id: 'ppa',
        comandas: ['c1'],
        estado: 'aprobado',
        total: 40,
        createdAt: '2026-09-02T10:00:00.000Z',
        ticketNumber: 1,
      },
      {
        _id: 'cmd',
        comandas: ['c1'],
        estado: 'aprobado',
        total: 80,
        createdAt: '2026-09-02T12:00:00.000Z',
        ticketNumber: 4,
      },
    ]);
    expect(k.aprobados).toBe(80);
  });
});
