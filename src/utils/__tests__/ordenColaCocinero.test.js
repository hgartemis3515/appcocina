import {
  calcularNumerosColaPorCocinero,
  filtrarLoteRespetandoOrden,
  comandaOmiteOrdenSecuencial,
} from '../ordenColaCocinero';

const platoEnCola = (cocineroId, ts) => ({
  estado: 'en_espera',
  procesandoPor: { cocineroId, timestamp: ts },
});

describe('comandaOmiteOrdenSecuencial', () => {
  test('reserva y omitirOrdenEntrega no entran a la cola', () => {
    expect(comandaOmiteOrdenSecuencial({ origenCreacion: 'reserva' })).toBe(true);
    expect(comandaOmiteOrdenSecuencial({ origenReserva: 'r1' })).toBe(true);
    expect(comandaOmiteOrdenSecuencial({ omitirOrdenEntrega: true })).toBe(true);
    expect(comandaOmiteOrdenSecuencial({ origenCreacion: 'mozos' })).toBe(false);
  });
});

describe('cola KDS omite reservas', () => {
  test('plato de reserva no ocupa #1; la otra comanda queda #1', () => {
    const reserva = {
      _id: 'res',
      origenCreacion: 'reserva',
      platos: [platoEnCola('c1', 1)],
    };
    const normal = {
      _id: 'nor',
      origenCreacion: 'mozos',
      platos: [platoEnCola('c1', 2)],
    };
    const mapa = calcularNumerosColaPorCocinero([reserva, normal]);
    expect(mapa.get('res-0')).toBeUndefined();
    expect(mapa.get('nor-0')).toBe(1);
  });

  test('finalizar reserva no queda bloqueada por orden', () => {
    const reserva = {
      _id: 'res',
      origenCreacion: 'reserva',
      platos: [platoEnCola('c1', 1)],
    };
    const normal = {
      _id: 'nor',
      origenCreacion: 'mozos',
      platos: [platoEnCola('c1', 2)],
    };
    const { finalizables, bloqueados } = filtrarLoteRespetandoOrden(
      [{ comandaId: 'res', platoIndex: 0, plato: reserva.platos[0], comanda: reserva }],
      [reserva, normal]
    );
    expect(bloqueados).toHaveLength(0);
    expect(finalizables).toHaveLength(1);
  });
});
