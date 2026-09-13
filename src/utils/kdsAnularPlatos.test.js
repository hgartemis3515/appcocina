import {
  parseClavePlatoKds,
  indicesPlatosMarcadosKds,
  comandaIdDesdePlatosMarcados,
  PERMISO_ELIMINAR_PLATOS_COCINA,
  esEstadoSeleccionEliminarPlato,
  indicesPlatosSeleccionadosKds,
  comandaIdDesdePlatosSeleccionados,
  haySeleccionEliminarPlatoKds,
  resolverEliminarPlatosKds,
} from './kdsAnularPlatos';

describe('kdsAnularPlatos', () => {
  test('parsea comandaId-index sin romper ObjectId', () => {
    expect(parseClavePlatoKds('507f1f77bcf86cd799439011-3')).toEqual({
      comandaId: '507f1f77bcf86cd799439011',
      platoIndex: 3,
    });
  });

  test('parsea clave de guarnición y apunta al plato padre', () => {
    expect(parseClavePlatoKds('507f1f77bcf86cd799439011-2-g-abc123')).toEqual({
      comandaId: '507f1f77bcf86cd799439011',
      platoIndex: 2,
    });
  });

  test('indicesPlatosMarcadosKds une checks y estados visuales', () => {
    const id = '507f1f77bcf86cd799439011';
    const checks = new Map([[`${id}-1`, true]]);
    const states = new Map([[`${id}-4`, 'seleccionado'], [`${id}-1-g-x`, 'procesando']]);
    expect(indicesPlatosMarcadosKds(checks, states, id)).toEqual([1, 4]);
  });

  test('comandaIdDesdePlatosMarcados solo si hay una comanda', () => {
    const a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const b = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    expect(comandaIdDesdePlatosMarcados(new Map([[`${a}-0`, true]]), new Map())).toBe(a);
    expect(comandaIdDesdePlatosMarcados(
      new Map([[`${a}-0`, true], [`${b}-1`, true]]),
      new Map()
    )).toBeNull();
  });

  test('PERMISO_ELIMINAR_PLATOS_COCINA es el id de roles.html', () => {
    expect(PERMISO_ELIMINAR_PLATOS_COCINA).toBe('eliminar-platos-cocina');
  });

  test('esEstadoSeleccionEliminarPlato: verde, recoger y primer click libre', () => {
    expect(esEstadoSeleccionEliminarPlato('seleccionado', {})).toBe(true);
    expect(esEstadoSeleccionEliminarPlato('entregando', {})).toBe(true);
    expect(esEstadoSeleccionEliminarPlato('procesando', {})).toBe(true);
    expect(esEstadoSeleccionEliminarPlato('procesando', { procesandoPor: { cocineroId: 'x' } })).toBe(false);
    expect(esEstadoSeleccionEliminarPlato('dejar', {})).toBe(false);
    expect(esEstadoSeleccionEliminarPlato('normal', {})).toBe(false);
  });

  test('muestra selección verde/entregando y oculta tomado en amarillo', () => {
    const id = '507f1f77bcf86cd799439011';
    const comandas = [{
      _id: id,
      platos: [
        {},
        { procesandoPor: { cocineroId: 'c1' } },
        {},
        {},
        {},
        { estado: 'recoger' },
      ],
    }];
    const states = new Map([
      [`${id}-4`, 'seleccionado'],
      [`${id}-1`, 'procesando'],
      [`${id}-2`, 'procesando'],
      [`${id}-5`, 'entregando'],
      [`${id}-3`, 'dejar'],
    ]);
    expect(indicesPlatosSeleccionadosKds(new Map(), states, id, comandas)).toEqual([2, 4, 5]);
    expect(haySeleccionEliminarPlatoKds(new Map(), states, comandas)).toBe(true);
    expect(haySeleccionEliminarPlatoKds(new Map(), new Map(), comandas)).toBe(false);
  });

  test('comandaIdDesdePlatosSeleccionados ignora dejar y exige una comanda', () => {
    const a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const b = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const comandas = [{ _id: a, platos: [{}] }, { _id: b, platos: [{}] }];
    expect(comandaIdDesdePlatosSeleccionados(new Map(), new Map([[`${a}-0`, 'procesando']]), comandas)).toBe(a);
    expect(comandaIdDesdePlatosSeleccionados(new Map(), new Map([[`${a}-0`, 'dejar']]), comandas)).toBeNull();
    expect(comandaIdDesdePlatosSeleccionados(
      new Map(),
      new Map([[`${a}-0`, 'seleccionado'], [`${b}-1`, 'seleccionado']]),
      comandas
    )).toBeNull();
  });

  test('resolverEliminarPlatosKds pide un solo pedido con plato clickeado', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(resolverEliminarPlatosKds(new Map(), new Map(), []).ok).toBe(false);
    const ok = resolverEliminarPlatosKds(new Map(), new Map([[`${id}-3`, 'seleccionado']]), [
      { _id: id, platos: [{}, {}, {}, {}] },
    ]);
    expect(ok).toEqual({ ok: true, comandaId: id, indices: [3] });
  });
});
