const {
  calcularNumerosColaPorCocinero,
  filtrarLoteRespetandoOrden,
  comandaOmiteOrdenSecuencial,
  esComandaTablaUnoODos,
  mapaIndiceTablaKds,
  ordenarComandasTablaKds,
} = require('../ordenColaCocinero');

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
    expect(comandaOmiteOrdenSecuencial({ numeroComandaMozo: 1 })).toBe(false);
    expect(comandaOmiteOrdenSecuencial({ numeroComandaMozo: 2 })).toBe(false);
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

describe('prefijo de cola y puestos 1-2 de la tabla KDS', () => {
  test('1+2 o 1..N finalizan; solo #2 de la tercera comanda queda bloqueado', () => {
    const t1 = { _id: 't1', createdAt: '2026-01-01T12:00:00.000Z', platos: [platoEnCola('c1', 1)] };
    const t2 = { _id: 't2', createdAt: '2026-01-01T12:01:00.000Z', platos: [platoEnCola('c1', 2)] };
    const t3 = {
      _id: 't3',
      createdAt: '2026-01-01T12:02:00.000Z',
      platos: [3, 4, 5, 6].map((ts) => platoEnCola('c1', ts)),
    };
    const comandas = [t1, t2, t3];
    const loteT3 = t3.platos.map((p, i) => ({
      comandaId: 't3',
      platoIndex: i,
      plato: p,
      comanda: t3,
    }));
    const prefijo = filtrarLoteRespetandoOrden([
      { comandaId: 't1', platoIndex: 0, plato: t1.platos[0], comanda: t1 },
      { comandaId: 't2', platoIndex: 0, plato: t2.platos[0], comanda: t2 },
      loteT3[0],
      loteT3[1],
    ], comandas);
    expect(prefijo.bloqueados).toHaveLength(0);
    expect(prefijo.finalizables).toHaveLength(4);
    const solo2tercera = filtrarLoteRespetandoOrden([loteT3[1]], comandas);
    expect(solo2tercera.bloqueados).toHaveLength(1);
  });

  test('puestos 1 y 2 de la tabla (no numeroComandaMozo) nunca se bloquean; el 3 sí', () => {
    const primera = {
      _id: 'm50',
      numeroComandaMozo: 50,
      createdAt: '2026-01-01T10:00:00.000Z',
      platos: [platoEnCola('c1', 10)],
    };
    const segunda = {
      _id: 'm40',
      numeroComandaMozo: 40,
      createdAt: '2026-01-01T10:01:00.000Z',
      platos: [platoEnCola('c1', 11)],
    };
    const tercera = {
      _id: 'm1',
      numeroComandaMozo: 1,
      createdAt: '2026-01-01T10:02:00.000Z',
      platos: [platoEnCola('c1', 12)],
    };
    const lista = [primera, segunda, tercera];
    const mapa = mapaIndiceTablaKds(lista);
    expect(esComandaTablaUnoODos(primera, mapa)).toBe(true);
    expect(esComandaTablaUnoODos(segunda, mapa)).toBe(true);
    expect(esComandaTablaUnoODos(tercera, mapa)).toBe(false);
    const libre50 = filtrarLoteRespetandoOrden(
      [{ comandaId: 'm50', platoIndex: 0, plato: primera.platos[0], comanda: primera }],
      lista
    );
    expect(libre50.bloqueados).toHaveLength(0);
    const pideTercera = filtrarLoteRespetandoOrden(
      [{ comandaId: 'm1', platoIndex: 0, plato: tercera.platos[0], comanda: tercera }],
      lista
    );
    expect(pideTercera.bloqueados).toHaveLength(1);
    expect(ordenarComandasTablaKds(lista).map((c) => c._id)).toEqual(['m50', 'm40', 'm1']);
  });
});
