const { mergeDatosImprimibles } = require('../comandaPrint/comandaPrintWeb');

describe('mergeDatosImprimibles', () => {
  test('junta productos y suma totales de varias comandas', () => {
    const merged = mergeDatosImprimibles([
      {
        ticketId: '1',
        productos: [{ nombre: 'Lomo', cantidad: 1, precio: 40, subtotal: 40 }],
        comandasNumbers: [81],
        subtotal: 40,
        total: 35,
        montoDescuento: 5,
        tipoPago: 'Pendiente',
      },
      {
        ticketId: '2',
        productos: [{ nombre: 'Ceviche', cantidad: 2, precio: 30, subtotal: 60 }],
        comandasNumbers: [82],
        subtotal: 60,
        total: 60,
        montoDescuento: 0,
        tipoPago: 'Efectivo',
      },
    ]);
    expect(merged.productos).toHaveLength(2);
    expect(merged.comandasNumbers).toEqual([81, 82]);
    expect(merged.cantidadComandas).toBe(2);
    expect(merged.subtotal).toBe(100);
    expect(merged.total).toBe(95);
    expect(merged.montoDescuento).toBe(5);
  });
});
