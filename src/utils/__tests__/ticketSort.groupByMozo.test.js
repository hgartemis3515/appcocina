import { groupTicketsByMozo, getMozoNombre } from '../ticketSort';

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
