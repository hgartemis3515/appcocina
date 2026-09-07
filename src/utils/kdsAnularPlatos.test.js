import {
  parseClavePlatoKds,
  indicesPlatosMarcadosKds,
  comandaIdDesdePlatosMarcados,
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
});
