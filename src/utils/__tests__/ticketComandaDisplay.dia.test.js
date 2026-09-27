import { getComandasNumbersFromTicket, getComandaDisplayLabel } from '../ticketComandaDisplay';
import { etiquetaMozoTicket, etiquetaMozoDeTickets } from '../numeroComandaMozo';
import { groupTicketsByMozo } from '../ticketSort';

describe('numero del dia en tickets', () => {
  test('prefiere numeroComandaDia y no el historico', () => {
    const ticket = {
      comandasNumbers: [1227, 1230],
      comandas: [
        { _id: 'a', comandaNumber: 1227, numeroComandaDia: 3, numeroComandaMozo: 1, mozoNombre: 'Jose' },
        { _id: 'b', comandaNumber: 1230, numeroComandaDia: 4, numeroComandaMozo: 2, mozoNombre: 'Jose' },
      ],
    };
    expect(getComandasNumbersFromTicket(ticket)).toEqual([3, 4]);
    expect(getComandaDisplayLabel(ticket)).toBe('#4+#3');
    expect(etiquetaMozoTicket(ticket)).toBe('2+1 Jose');
  });

  test('si no hay numero del dia usa el snapshot', () => {
    expect(getComandasNumbersFromTicket({ comandasNumbers: [81, 82] })).toEqual([81, 82]);
  });

  test('el grupo de mozos muestra el numero a la izquierda', () => {
    const grupos = groupTicketsByMozo([
      {
        _id: '1',
        nombreMozo: 'Ana',
        comandas: [{ numeroComandaDia: 1, numeroComandaMozo: 5, mozoNombre: 'Ana' }],
      },
    ]);
    expect(grupos[0].nombre).toBe('Ana');
    expect(grupos[0].etiqueta).toBe('5 Ana');
    expect(etiquetaMozoDeTickets(grupos[0].tickets)).toBe('5 Ana');
  });
});
