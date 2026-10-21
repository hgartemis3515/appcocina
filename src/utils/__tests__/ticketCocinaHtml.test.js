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
    expect(html).not.toContain('>Tipo<');
    expect(html).toContain('Para Mesa');
    expect(html).not.toContain('font-size:9px;font-weight:600');
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

  test('plato eliminado: doble tachado en el nombre y triple en los precios', () => {
    const { html } = generarHtmlTicketCocina({
      datos: {
        comandaNumeroDisplay: '#3b',
        mozo: 'Ana',
        mesa: 2,
        productos: [
          { nombre: 'Lomo', cantidad: 1, precio: 25, subtotal: 25 },
          {
            nombre: 'Ceviche',
            cantidad: 1,
            precio: 28,
            subtotal: 28,
            eliminado: true,
            lineaAnulada: { usuario: 'María', motivo: 'Cliente canceló' },
          },
        ],
        montoDescuento: 0,
        total: 0,
      },
    });
    expect(html).toContain('Ceviche');
    expect(html).toContain('>Anulado<');
    expect(html).toContain('font-size:11px;font-weight:900;');
    expect(html).toContain('María');
    expect(html).not.toContain('>X<');
    expect(html).toContain('28.00');
    expect(html).toContain('top:22%');
    expect(html).toContain('top:50%');
    expect(html).toContain('top:78%');
    expect(html).not.toContain('Cliente canceló');
    expect(html).toContain('top:34%');
    expect(html).toContain('top:64%');
    expect(html).toContain('TOTAL S/.25.00');
    expect(html).not.toContain('ANULADO X');
  });

  test('anulación: nombre del plato y ANULADO a la derecha', () => {
    const { html } = generarHtmlTicketCocina({
      datos: {
        comandaNumeroDisplay: '#4b',
        mozo: 'Ana',
        mesa: 2,
        productos: [
          { plato: { nombre: 'Ceviche', nombreCocina: 'Ceviche' }, cantidad: 1, precio: 28 },
        ],
        anulacion: { usuario: 'Admin', hora: '03/10/2026 12:00', motivo: 'Error' },
        montoDescuento: 0,
        total: 28,
      },
    });
    expect(html).toContain('Ceviche');
    expect(html).toContain('>ANULADO<');
    expect(html).toContain('justify-content:space-between');
    expect(html).toContain('ANULADO X');
  });

  test('PRUEBA solo si la comanda es de prueba', () => {
    const base = {
      comandaNumeroDisplay: '#3',
      mozo: 'Ana',
      mesa: 1,
      productos: [{ nombre: 'Agua', cantidad: 1, precio: 0 }],
      montoDescuento: 0,
      total: 0,
    };
    const sin = generarHtmlTicketCocina({ datos: base }).html;
    const con = generarHtmlTicketCocina({ datos: { ...base, esPrueba: true } }).html;
    expect(sin).not.toContain('>PRUEBA<');
    expect(con).toContain('>PRUEBA<');
  });

  test('el nombre del cliente va encima del tipo y un 20% más grande', () => {
    const { html } = generarHtmlTicketCocina({
      datos: {
        comandaNumeroDisplay: '#8',
        mozo: 'Ana',
        mesa: 'Sin mesa',
        sinMesa: true,
        clienteNombre: 'Rosa',
        productos: [
          { nombre: 'Chicha', cantidad: 1, precio: 5, tipoServicio: 'para_llevar' },
        ],
        montoDescuento: 0,
        total: 5,
      },
    });
    const nombre = html.indexOf('>Rosa<');
    const valor = html.indexOf('Para llevar');
    expect(nombre).toBeGreaterThan(-1);
    expect(nombre).toBeLessThan(valor);
    expect(html).not.toContain('>Tipo<');
    expect(html).toContain('font-size:10.8px');
  });

  test('reserva dice COCINA RESERVA y CAJA RESERVA', () => {
    const datos = {
      reserva: true,
      comandaNumeroDisplay: '#8',
      mozo: 'Ana',
      mesa: 3,
      productos: [{ nombre: 'Lomo', cantidad: 1, precio: 20, subtotal: 20 }],
      montoDescuento: 0,
      total: 20,
    };
    expect(generarHtmlTicketCocina({ datos, cocina: true }).html).toContain('COCINA RESERVA');
    expect(generarHtmlTicketCocina({ datos, cocina: false }).html).toContain('CAJA RESERVA');
    expect(generarHtmlTicketCocina({ datos: { ...datos, reserva: false } }).html).toContain('>COCINA<');
  });

  test('el cuadro Tipo distingue mesa, llevar y extra', () => {
    expect(tipoCuadroTicket([{ tipoServicio: 'mesa' }])).toBe('Para Mesa');
    expect(tipoCuadroTicket([{ tipoServicio: 'para_llevar' }], { sinMesa: true })).toBe('Para llevar');
    expect(tipoCuadroTicket([
      { tipoServicio: 'mesa' },
      { tipoServicio: 'extra_llevar' },
    ])).toBe('Mesa extra llevar');
  });

  test('ticket de eliminados: triple tachado y sin total ni ANULADO X', () => {
    const { html } = generarHtmlTicketCocina({
      datos: {
        comandaNumeroDisplay: '#1b',
        sinTotal: true,
        mozo: 'Ana',
        mesa: 2,
        productos: [{
          nombre: 'Pollo',
          cantidad: 1,
          precio: 22,
          subtotal: 22,
          lineaAnulada: { usuario: 'María', motivo: 'Cliente canceló' },
        }],
        montoDescuento: 5,
        anulacion: { usuario: 'María', hora: '21/10/2026 12:00', motivo: 'no' },
        total: 0,
      },
    });
    expect(html).toContain('#1b');
    expect(html).toContain('Pollo');
    expect(html).toContain('top:22%');
    expect(html).toContain('top:50%');
    expect(html).toContain('top:78%');
    expect(html).not.toContain('TOTAL');
    expect(html).not.toContain('ANULADO X');
    expect(html).not.toContain('Descuento');
  });
});
