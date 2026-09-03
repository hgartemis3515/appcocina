import { groupTicketsByMozo, getMozoNombre, groupTicketsComoComandasHtml } from '../ticketSort';

describe('groupTicketsByMozo', () => {
  test('agrupa por nombre y ordena alfabéticamente', () => {
    const tickets = [
      { _id: '1', nombreMozo: 'Pepe', total: 10 },
      { _id: '2', mozoNombre: 'Ana', total: 20 },
      { _id: '3', nombreMozo: 'Pepe', total: 5 },
    ];
    const grupos = groupTicketsByMozo(tickets);
    expect(grupos.map((g) => g.nombre)).toEqual(['Ana', 'Pepe']);
    expect(grupos[1].tickets.map((t) => t._id)).toEqual(['1', '3']);
    expect(getMozoNombre({})).toBe('Sin mozo');
  });
});

describe('groupTicketsComoComandasHtml', () => {
  test('agrupa por pedidoId y deja sueltos los de otra mesa sin cliente', () => {
    const tickets = [
      { _id: 'c', numMesa: 3, pedido: 'aaaaaaaaaaaaaaaaaaaaaaaa', comandasNumbers: [82], createdAt: '2026-09-02T12:10:00Z' },
      { _id: 'a', numMesa: 3, pedido: 'aaaaaaaaaaaaaaaaaaaaaaaa', comandasNumbers: [81], createdAt: '2026-09-02T12:00:00Z' },
      { _id: 'b', numMesa: 5, createdAt: '2026-09-02T12:05:00Z' },
    ];
    const filas = groupTicketsComoComandasHtml(tickets);
    expect(filas[0].tipo).toBe('grupo');
    expect(filas[0].label).toBe('#81+#82');
    expect(filas[0].tickets.map((t) => t._id)).toEqual(['a', 'c']);
    expect(filas[1].tipo).toBe('individual');
    expect(filas[1].tickets[0]._id).toBe('b');
  });

  test('fallback: mismo cliente + mesa', () => {
    const cid = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const tickets = [
      { _id: '1', numMesa: 2, cliente: cid, clienteNombre: 'Luis', comandasNumbers: [10], createdAt: '2026-09-02T12:00:00Z' },
      { _id: '2', numMesa: 2, cliente: cid, clienteNombre: 'Luis', comandasNumbers: [11], createdAt: '2026-09-02T12:01:00Z' },
      { _id: '3', numMesa: 2, comandasNumbers: [12], createdAt: '2026-09-02T12:02:00Z' },
    ];
    const filas = groupTicketsComoComandasHtml(tickets);
    const grupo = filas.find((f) => f.tipo === 'grupo');
    const solo = filas.find((f) => f.tipo === 'individual');
    expect(grupo.tickets.map((t) => t._id)).toEqual(['1', '2']);
    expect(solo.tickets[0]._id).toBe('3');
  });
});
