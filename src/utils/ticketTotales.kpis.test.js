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
});
