import { getComandasNumbersFromTicket, getComandaDisplayLabel } from '../ticketComandaDisplay';
import { etiquetaMozoTicket, etiquetaMozoDeTickets, partesMozoConColor } from '../numeroComandaMozo';
import { groupTicketsByMozo, ticketParaDetalleGrupo } from '../ticketSort';

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
    expect(etiquetaMozoTicket(ticket)).toBe('Jose 2+1');
  });

  test('si no hay numero del dia usa el snapshot', () => {
    expect(getComandasNumbersFromTicket({ comandasNumbers: [81, 82] })).toEqual([81, 82]);
  });

  test('el grupo no mezcla el historico del plato con el numero del dia', () => {
    const grupo = ticketParaDetalleGrupo([
      {
        _id: 't1',
        comandas: [{ _id: 'a', comandaNumber: 476, numeroComandaDia: 1 }],
        platos: [{ comandaNumber: 476, nombre: 'Chicha' }],
      },
      {
        _id: 't2',
        comandas: [{ _id: 'b', comandaNumber: 477, numeroComandaDia: 2 }],
        platos: [{ comandaNumber: 477, nombre: 'Lomo' }],
      },
      {
        _id: 't3',
        comandas: [{ _id: 'c', comandaNumber: 478, numeroComandaDia: 3 }],
        platos: [{ comandaNumber: 478, nombre: 'Patasca' }],
      },
    ]);
    expect(getComandasNumbersFromTicket(grupo)).toEqual([1, 2, 3]);
    expect(getComandaDisplayLabel(grupo)).toBe('#3+#2+#1');
  });

  test('el grupo de mozos muestra el nombre delante del numero', () => {
    const grupos = groupTicketsByMozo([
      {
        _id: '1',
        nombreMozo: 'Ana',
        comandas: [{ numeroComandaDia: 1, numeroComandaMozo: 5, mozoNombre: 'Ana' }],
      },
    ]);
    expect(grupos[0].nombre).toBe('Ana');
    expect(grupos[0].etiqueta).toBe('Ana 5');
    expect(etiquetaMozoDeTickets(grupos[0].tickets)).toBe('Ana 5');
  });

  test('al juntar comandas conserva el color de perfil del mozo', () => {
    const partes = partesMozoConColor([
      {
        nombreMozo: 'Jose',
        mozo: { name: 'Jose', colorPerfil: '#047857', colorLetraPerfil: '#fde68a' },
        comandas: [{ numeroComandaMozo: 1, mozoNombre: 'Jose' }],
      },
      {
        nombreMozo: 'Jose',
        mozo: '64b0a1',
        comandas: [{ numeroComandaMozo: 2, mozoNombre: 'Jose' }],
      },
    ]);
    expect(partes).toHaveLength(1);
    expect(partes[0].etiqueta).toBe('Jose 1+2');
    expect(partes[0].colorPerfil).toBe('#047857');
    expect(partes[0].colorLetra).toBe('#fde68a');
  });
});
