const { generarHtmlTicketCocina, filtrarDatosTicketCocina, letraRevisionTicket, tipoCuadroTicket } = require('../comandaPrint/ticketCocinaHtml');

describe('ticket cocina compacto', () => {
  test('sin título de restaurante y con cuadrado de check', () => {
    const { html } = generarHtmlTicketCocina({
      datos: {
        comandaNumeroDisplay: '#10a',
        mozo: 'Ana',
        mesa: 5,
        area: 'Salón',
        fechaPedido: '2026-09-21T22:30:00.000Z',
        productos: [
          { nombre: 'Lomo', cantidad: 2, precio: 25, subtotal: 50 },
        ],
        montoDescuento: 0,
        total: 50,
      },
    });
    expect(html).toContain('#10a');
    expect(html).toContain('Lomo');
    expect(html).toContain('ANA');
    expect(html).toContain('>Tipo<');
    expect(html).toContain('Para Mesa');
    expect(html).not.toContain('Área');
    expect(html).toContain('>COCINA<');
    expect(html).not.toContain('SAN BENITO');
    expect(html).not.toMatch(/>COMANDA</);
    expect(html).toContain('Ticket cocina');
    expect(html).toMatch(/border:1\.6px solid #000/);
  });

  test('filtra platos de una comanda del grupo', () => {
    const out = filtrarDatosTicketCocina({
      comandaNumeroDisplay: '#10+#11',
      productos: [
        { nombre: 'Lomo', comandaNumber: 10, cantidad: 1, precio: 10, subtotal: 10 },
        { nombre: 'Chicha', comandaNumber: 11, cantidad: 1, precio: 8, subtotal: 8 },
      ],
      montoDescuento: 0,
    }, { filtrarComandaNumero: 11, revisionTicket: 1 });
    expect(out.productos).toHaveLength(1);
    expect(out.productos[0].nombre).toBe('Chicha');
    expect(out.comandaNumeroDisplay).toBe('#11b');
  });

  test('letra 1 = b y 2 = c', () => {
    expect(letraRevisionTicket(1)).toBe('b');
    expect(letraRevisionTicket(2)).toBe('c');
  });

  test('el cuadro Tipo distingue mesa, llevar y extra', () => {
    expect(tipoCuadroTicket([{ tipoServicio: 'mesa' }])).toBe('Para Mesa');
    expect(tipoCuadroTicket([{ tipoServicio: 'para_llevar' }], { sinMesa: true })).toBe('Para llevar');
    expect(tipoCuadroTicket([
      { tipoServicio: 'mesa' },
      { tipoServicio: 'extra_llevar' },
    ])).toBe('Mesa extra llevar');
  });
});
