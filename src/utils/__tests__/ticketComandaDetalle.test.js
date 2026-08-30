import { getComandaIdsFromTicket } from '../ticketComandaDisplay';
import { mergePlatosTicketConComandas } from '../ticketTotales';
import { getComplementosDePlato } from '../platoComplementos';

describe('getComandaIdsFromTicket', () => {
  test('une comandas, comandasIds y comandaId de platos', () => {
    const ids = getComandaIdsFromTicket({
      comandas: [{ _id: 'a1' }, 'b2'],
      comandasIds: ['c3'],
      platos: [{ comandaId: 'a1' }, { comandaId: 'd4' }],
    });
    expect(ids.sort()).toEqual(['a1', 'b2', 'c3', 'd4']);
  });
});

describe('mergePlatosTicketConComandas', () => {
  test('conserva cantidad del ticket y trae guarniciones de la comanda', () => {
    const ticket = {
      platos: [{
        platoLineaId: 'p1',
        nombre: 'Lomo',
        cantidad: 2,
        precio: 40,
        subtotal: 80,
        complementosSeleccionados: [],
      }],
    };
    const live = [{
      cantidades: [2],
      platos: [{
        _id: 'p1',
        estado: 'en_espera',
        notaEspecial: 'Sin ají',
        complementosSeleccionados: [{
          grupo: 'Guarnición',
          opcion: 'Papas',
          cantidad: 1,
          pronombre: 'Papas fritas',
          estadoCocina: 'pedido',
        }],
      }],
    }];
    const out = mergePlatosTicketConComandas(ticket, live);
    expect(out[0].cantidad).toBe(2);
    expect(out[0].subtotal).toBe(80);
    expect(out[0].estado).toBe('en_espera');
    expect(out[0].notaEspecial).toBe('Sin ají');
    expect(out[0].complementosSeleccionados[0].pronombre).toBe('Papas fritas');
  });
});

describe('getComplementosDePlato', () => {
  test('incluye pronombre y estado de guarnición', () => {
    const comps = getComplementosDePlato({
      cantidad: 1,
      complementosSeleccionados: [{
        grupo: 'Guarnición',
        opcion: 'Arroz',
        cantidad: 1,
        pronombre: 'Arroz blanco',
        estadoCocina: 'en_espera',
      }],
    });
    expect(comps[0].pronombre).toBe('Arroz blanco');
    expect(comps[0].estadoCocina).toBe('en_espera');
  });
});
