import {
  esPlatoReversibleKds,
  todosPlatosActivosReversiblesKds,
  filtrarComandasReversiblesKds,
  contarPlatosReversiblesKds,
  ESTADO_DESTINO_REVERTIR_KDS,
  comandaEsDeHoyOperativo,
  filtrarComandasHoyOperativo,
  ymdsCalendarioDiaOperativo,
  listarMozosRevertir,
  listarMesasRevertir,
  filtrarComandasRevertirVista,
  ESTILO_NOMBRE_PLATO_REVERTIR,
} from './kdsRevertirPlatos';

describe('kdsRevertirPlatos', () => {
  test('destino de reversión es pedido', () => {
    expect(ESTADO_DESTINO_REVERTIR_KDS).toBe('pedido');
  });

  test('reversibles: recoger, salio, entregado; no pagado ni anulados', () => {
    expect(esPlatoReversibleKds({ estado: 'recoger' })).toBe(true);
    expect(esPlatoReversibleKds({ estado: 'salio' })).toBe(true);
    expect(esPlatoReversibleKds({ estado: 'entregado' })).toBe(true);
    expect(esPlatoReversibleKds({ estado: 'pedido' })).toBe(false);
    expect(esPlatoReversibleKds({ estado: 'pagado' })).toBe(false);
    expect(esPlatoReversibleKds({ estado: 'salio', anulado: true })).toBe(false);
    expect(esPlatoReversibleKds({ estado: 'entregado', eliminado: true })).toBe(false);
  });

  test('no lista comandas pagadas; cuenta salio y entregado', () => {
    const lista = filtrarComandasReversiblesKds([
      { _id: '1', status: 'pagado', platos: [{ estado: 'entregado' }] },
      { _id: '2', status: 'salio', updatedAt: '2026-01-02', platos: [{ estado: 'salio' }, { estado: 'pedido' }] },
      { _id: '3', status: 'entregado', updatedAt: '2026-01-03', platos: [{ estado: 'entregado' }] },
    ]);
    expect(lista.map((c) => c._id)).toEqual(['3', '2']);
    expect(contarPlatosReversiblesKds(lista)).toBe(2);
    expect(todosPlatosActivosReversiblesKds(lista[0])).toBe(true);
    expect(todosPlatosActivosReversiblesKds(lista[1])).toBe(false);
  });

  test('solo incluye comandas del día operativo HOY (04:00–04:00)', () => {
    const tarde = new Date('2026-09-21T20:00:00.000Z');
    expect(comandaEsDeHoyOperativo({ createdAt: '2026-09-21T10:00:00.000Z' }, tarde)).toBe(true);
    expect(comandaEsDeHoyOperativo({ createdAt: '2026-09-21T06:00:00.000Z' }, tarde)).toBe(false);
    expect(comandaEsDeHoyOperativo({ createdAt: '2026-09-20T20:00:00.000Z' }, tarde)).toBe(false);
    const madrugada = new Date('2026-09-22T07:00:00.000Z');
    expect(comandaEsDeHoyOperativo({ createdAt: '2026-09-22T04:30:00.000Z' }, madrugada)).toBe(true);
    expect(filtrarComandasHoyOperativo([
      { _id: 'vieja', createdAt: '2026-09-20T20:00:00.000Z' },
      { _id: 'hoy', createdAt: '2026-09-21T12:00:00.000Z' },
    ], tarde).map((c) => c._id)).toEqual(['hoy']);
  });

  test('cubre dos fechas calendario cuando el ciclo cruza medianoche', () => {
    expect(ymdsCalendarioDiaOperativo(new Date('2026-09-21T20:00:00.000Z'))).toEqual([
      '2026-09-21',
      '2026-09-22',
    ]);
  });

  test('filtra por mozo y mesa', () => {
    const lista = [
      { mozoNombre: 'Gabriel', mesas: { nummesa: 2 } },
      { mozos: { name: 'Guido' }, mesaNumero: 4 },
      { mozoNombre: 'Gabriel', mesas: { nummesa: 8 } },
    ];
    expect(listarMozosRevertir(lista)).toEqual(['Gabriel', 'Guido']);
    expect(listarMesasRevertir(lista)).toEqual(['2', '4', '8']);
    expect(filtrarComandasRevertirVista(lista, { mozo: 'Gabriel' })).toHaveLength(2);
    expect(filtrarComandasRevertirVista(lista, { mesa: '4' }).map((c) => c.mozos.name)).toEqual(['Guido']);
  });

  test('nombre de plato: fondo negro y letra amarilla', () => {
    expect(ESTILO_NOMBRE_PLATO_REVERTIR.backgroundColor).toBe('#000000');
    expect(ESTILO_NOMBRE_PLATO_REVERTIR.color).toBe('#facc15');
  });
});
