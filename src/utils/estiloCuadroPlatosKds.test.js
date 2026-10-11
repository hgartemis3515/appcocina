import { grosorScrollPlatosKds, varsScrollPlatosKds } from './estiloCuadroPlatosKds';

describe('varsScrollPlatosKds', () => {
  test('usa el gris y el negro del modo oscuro', () => {
    const v = varsScrollPlatosKds({
      scrollPlatosColor: '#aaaaaa',
      scrollPlatosRiel: '#111111',
      scrollPlatosContorno: '#ff0000',
      scrollPlatosGrosor: 2,
    }, true);
    expect(v['--kds-scroll-thumb']).toBe('#aaaaaa');
    expect(v['--kds-scroll-track']).toBe('#111111');
    expect(v['--kds-scroll-contorno']).toBe('#ff0000');
    expect(v['--kds-scroll-grosor']).toBe('2px');
  });

  test('en claro toma las claves claras y limita el grosor', () => {
    const v = varsScrollPlatosKds({ scrollPlatosColorClaro: '#eeeeee', scrollPlatosGrosor: 20 }, false);
    expect(v['--kds-scroll-thumb']).toBe('#eeeeee');
    expect(grosorScrollPlatosKds(20)).toBe(6);
    expect(v['--kds-scroll-grosor']).toBe('6px');
  });
});
