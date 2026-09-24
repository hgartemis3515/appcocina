/**
 * Tests BUG_PAGO_PARCIAL_TABLA (Jose Gambu #2087):
 * la tabla de cocina debe mostrar el saldo por cobrar real (p.ej. 383), no la
 * suma de snapshots de tickets (338).
 */
const {
  saldoPendienteTicket,
  saldoPendienteTicketsUnicos,
  resumenKpisTickets,
} = require('../ticketTotales');

const comanda = (id, pendienteCobro) => ({ _id: id, pendienteCobro });

describe('saldoPendienteTicket', () => {
  test('suma pendienteCobro de las comandas del ticket', () => {
    const t = {
      comandas: [
        { _id: 'c1', pendienteCobro: 0 },
        { _id: 'c2', pendienteCobro: 111 },
      ],
    };
    expect(saldoPendienteTicket(t)).toBe(111);
  });

  test('devuelve null si el backend no adjuntó saldo', () => {
    expect(saldoPendienteTicket({ comandas: [{ _id: 'c1' }] })).toBeNull();
    expect(saldoPendienteTicket(null)).toBeNull();
  });
});

describe('saldoPendienteTicketsUnicos', () => {
  test('comanda con varios tickets cuenta el saldo UNA vez (máx por comanda)', () => {
    // Comanda 2087: ticket comanda_completa (177) + 2 parciales (33 c/u) — todos
    // llevan el mismo pendienteCobro vivo (111 tras cobrar 2 pollos).
    const tickets = [
      { comandas: [{ _id: 'c2087', pendienteCobro: 111 }] },
      { comandas: [{ _id: 'c2087', pendienteCobro: 111 }] },
    ];
    expect(saldoPendienteTicketsUnicos(tickets)).toBe(111);
  });

  test('grupo del pedido Jose Gambu: 2084 (0) + 2085 (0) + 2086 (0) + 2087 (111) = 111', () => {
    const tickets = [
      { comandas: [{ _id: 'c2084', pendienteCobro: 0 }] },
      { comandas: [{ _id: 'c2085', pendienteCobro: 0 }] },
      { comandas: [{ _id: 'c2086', pendienteCobro: 0 }] },
      { comandas: [{ _id: 'c2087', pendienteCobro: 111 }] },
    ];
    expect(saldoPendienteTicketsUnicos(tickets)).toBe(111);
  });

  test('sin saldo adjunto → null', () => {
    expect(saldoPendienteTicketsUnicos([{ comandas: [{ _id: 'c1' }] }])).toBeNull();
  });
});

describe('resumenKpisTickets con saldo por cobrar', () => {
  test('pedido Jose Gambu: KPI pendiente = 383 (saldo vivo), no 338 (snapshots)', () => {
    const tickets = [
      { _id: 'a', comandas: [{ _id: 'c2084', pendienteCobro: 77 }], estado: 'pendiente_aprobacion', tipo: 'comanda_completa', total: 77, platos: [{ subtotal: 77, cantidad: 1 }] },
      { _id: 'b', comandas: [{ _id: 'c2085', pendienteCobro: 45 }], estado: 'pendiente_aprobacion', tipo: 'comanda_completa', total: 45, platos: [{ subtotal: 45, cantidad: 1 }] },
      { _id: 'c', comandas: [{ _id: 'c2086', pendienteCobro: 150 }], estado: 'pendiente_aprobacion', tipo: 'comanda_completa', total: 150, platos: [{ subtotal: 150, cantidad: 1 }] },
      // Parciales duplicados de 2087: solo el más nuevo cuenta (ultimoTicketPorComanda)
      { _id: 'd1', createdAt: '2026-09-23T21:19:43Z', comandas: [{ _id: 'c2087', pendienteCobro: 111 }], estado: 'pendiente_aprobacion', tipo: 'pago_parcial', total: 33, platos: [{ subtotal: 33, cantidad: 1 }] },
      { _id: 'd2', createdAt: '2026-09-23T21:20:44Z', comandas: [{ _id: 'c2087', pendienteCobro: 111 }], estado: 'pendiente_aprobacion', tipo: 'pago_parcial', total: 33, platos: [{ subtotal: 33, cantidad: 1 }] },
    ];
    const k = resumenKpisTickets(tickets);
    // 77 + 45 + 150 + 111 (saldo vivo de 2087: 3 pollos + tamal) = 383
    expect(k.pendiente).toBe(383);
  });

  test('parcial aprobado con resto: el resto sigue pendiente', () => {
    const k = resumenKpisTickets([
      {
        _id: 'x',
        estado: 'aprobado',
        tipo: 'pago_parcial',
        total: 33,
        platos: [{ subtotal: 33, cantidad: 1 }],
        comandas: [{ _id: 'c2087', pendienteCobro: 144 }],
      },
    ]);
    expect(k.aprobados).toBe(33);
    expect(k.pendiente).toBe(111); // 144 - 33 ya contado como cobrado
  });

  test('sin pendienteCobro el KPI sigue usando el snapshot (compat)', () => {
    const k = resumenKpisTickets([
      { _id: 'y', estado: 'pendiente_aprobacion', tipo: 'comanda_completa', total: 77, platos: [{ subtotal: 77, cantidad: 1 }] },
    ]);
    expect(k.pendiente).toBe(77);
  });
});