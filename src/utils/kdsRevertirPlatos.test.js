import {
  esPlatoReversibleKds,
  todosPlatosActivosReversiblesKds,
  filtrarComandasReversiblesKds,
  contarPlatosReversiblesKds,
  ESTADO_DESTINO_REVERTIR_KDS,
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
});
